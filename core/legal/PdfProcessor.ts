/**
 * Обработчик PDF документов с OCR и мультимодальным анализом
 * Духовная цель: извлечение истины из сканированных документов
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import pdf from "pdf-parse";
import { fromPath } from "pdf2pic";
import { createWorker, Worker as TesseractWorker } from "tesseract.js";
import { BaseLLM } from "../llm";
import {
    LegalIndexingProgress,
    LegalPage,
    LegalVolume,
    MultimodalAnalysisResult,
    OCRResult,
} from "./types";

export class PdfProcessor {
  private ocrWorker: TesseractWorker | null = null;
  private multimodalModel: BaseLLM | null = null;
  private cacheDir: string;
  private thumbnailsDir: string;
  private textCacheDir: string;

  constructor(
    cacheBaseDir: string,
    multimodalModel?: BaseLLM,
  ) {
    this.cacheDir = path.join(cacheBaseDir, "legal-docs");
    this.thumbnailsDir = path.join(this.cacheDir, "thumbnails");
    this.textCacheDir = path.join(this.cacheDir, "text-cache");
    this.multimodalModel = multimodalModel || null;

    // Создаём директории для кэша
    [this.cacheDir, this.thumbnailsDir, this.textCacheDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Инициализация OCR worker
   */
  async initOcr(language: string = "rus"): Promise<void> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker(language, 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            console.log(`OCR прогресс: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
    }
  }

  /**
   * Закрытие OCR worker
   */
  async terminateOcr(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  /**
   * Получить метаданные PDF файла
   */
  async getVolumeMetadata(pdfPath: string): Promise<LegalVolume> {
    const stats = fs.statSync(pdfPath);
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdf(buffer);

    const volumeNumber = this.extractVolumeNumber(pdfPath);
    const documentType = await this.detectDocumentType(buffer);

    return {
      volumeNumber,
      filePath: pdfPath,
      fileSize: stats.size,
      totalPages: data.numpages,
      documentType,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate
          ? new Date(data.info.CreationDate)
          : undefined,
        modificationDate: data.info?.ModDate
          ? new Date(data.info.ModDate)
          : undefined,
      },
      indexingStatus: "pending",
      indexingProgress: 0,
    };
  }

  /**
   * Извлечь номер тома из имени файла
   */
  private extractVolumeNumber(filePath: string): number {
    const basename = path.basename(filePath, ".pdf");
    // Пытаемся найти число в имени файла
    const match = basename.match(/том[_\s-]*(\d+)|volume[_\s-]*(\d+)|(\d+)/i);
    if (match) {
      return parseInt(match[1] || match[2] || match[3], 10);
    }
    return 0; // Если не нашли, возвращаем 0
  }

  /**
   * Определить тип документа (текстовый или сканированный)
   */
  private async detectDocumentType(
    buffer: Buffer,
  ): Promise<"scanned" | "text" | "mixed"> {
    try {
      const data = await pdf(buffer);
      const textLength = data.text.trim().length;

      // Если текста почти нет, значит это скан
      if (textLength < 100) {
        return "scanned";
      }

      // Если текста много, проверяем соотношение
      const textPerPage = textLength / data.numpages;
      if (textPerPage < 50) {
        return "scanned";
      } else if (textPerPage > 500) {
        return "text";
      } else {
        return "mixed";
      }
    } catch (error) {
      console.error("Ошибка определения типа документа:", error);
      return "scanned"; // По умолчанию считаем сканированным
    }
  }

  /**
   * Извлечь текст из страницы с использованием OCR если нужно
   */
  async extractTextFromPage(
    pdfPath: string,
    pageNumber: number,
    useOcr: boolean = true,
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(pdfPath, pageNumber);
    const cachePath = path.join(this.textCacheDir, `${cacheKey}.txt`);

    // Проверяем кэш
    if (fs.existsSync(cachePath)) {
      const text = fs.readFileSync(cachePath, "utf-8");
      return {
        text,
        confidence: 1.0,
        language: "rus",
        processingTime: Date.now() - startTime,
      };
    }

    try {
      // Сначала пробуем извлечь текст напрямую
      const buffer = fs.readFileSync(pdfPath);
      const data = await pdf(buffer, {
        max: pageNumber,
        pagerender: async (pageData: any) => {
          if (pageData.pageIndex + 1 === pageNumber) {
            return pageData.getTextContent();
          }
          return null;
        },
      });

      let text = "";
      let confidence = 1.0;

      // Если текста мало и включен OCR
      if (data.text.trim().length < 50 && useOcr) {
        if (!this.ocrWorker) {
          await this.initOcr("rus");
        }

        // Конвертируем страницу в изображение
        const imagePath = await this.convertPageToImage(pdfPath, pageNumber);

        // Выполняем OCR
        if (this.ocrWorker) {
          const result = await this.ocrWorker.recognize(imagePath);
          text = result.data.text;
          confidence = result.data.confidence / 100;

          // Удаляем временное изображение
          fs.unlinkSync(imagePath);
        }
      } else {
        text = data.text;
      }

      // Сохраняем в кэш
      fs.writeFileSync(cachePath, text, "utf-8");

      return {
        text,
        confidence,
        language: "rus",
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Ошибка извлечения текста со страницы ${pageNumber}:`, error);
      return {
        text: "",
        confidence: 0,
        language: "rus",
        processingTime: Date.now() - startTime,
        warnings: [`Не удалось извлечь текст: ${error}`],
      };
    }
  }

  /**
   * Конвертировать страницу PDF в изображение
   */
  async convertPageToImage(
    pdfPath: string,
    pageNumber: number,
  ): Promise<string> {
    const options = {
      density: 200,
      saveFilename: `page_${pageNumber}`,
      savePath: this.thumbnailsDir,
      format: "png",
      width: 1200,
      height: 1600,
    };

    const convert = fromPath(pdfPath, options);
    const result = await convert(pageNumber, { responseType: "image" });

    return result.path;
  }

  /**
   * Мультимодальный анализ страницы через MOZGACH108
   */
  async analyzePageMultimodal(
    pdfPath: string,
    pageNumber: number,
  ): Promise<MultimodalAnalysisResult | null> {
    if (!this.multimodalModel) {
      console.warn("Мультимодальная модель не настроена");
      return null;
    }

    try {
      // Конвертируем страницу в изображение
      const imagePath = await this.convertPageToImage(pdfPath, pageNumber);

      // Читаем изображение
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      // Отправляем на анализ в MOZGACH108
      const prompt = `Проанализируй этот документ из уголовного дела. 
Опиши:
1. Тип документа (протокол, показания, постановление и т.д.)
2. Ключевую информацию
3. Подписи и печати (если есть)
4. Любые аномалии или подозрительные элементы

Это важно для поиска истины и справедливости.`;

      // TODO: Реализовать вызов мультимодальной модели
      // const response = await this.multimodalModel.complete({
      //   prompt,
      //   images: [base64Image],
      // });

      return {
        analysis: "TODO: Реализовать вызов MOZGACH108",
        detectedElements: [],
      };
    } catch (error) {
      console.error("Ошибка мультимодального анализа:", error);
      return null;
    }
  }

  /**
   * Обработать весь том (все страницы)
   */
  async* processVolume(
    volume: LegalVolume,
    useOcr: boolean = true,
    useMultimodal: boolean = false,
  ): AsyncGenerator<LegalIndexingProgress, void, unknown> {
    yield {
      status: "scanning",
      currentVolume: volume.volumeNumber,
      totalVolumes: 1,
      processedPages: 0,
      message: `Сканирование тома ${volume.volumeNumber}...`,
    };

    const pages: LegalPage[] = [];

    for (let pageNum = 1; pageNum <= volume.totalPages; pageNum++) {
      yield {
        status: "ocr",
        currentVolume: volume.volumeNumber,
        currentPage: pageNum,
        totalVolumes: 1,
        totalPages: volume.totalPages,
        processedPages: pageNum - 1,
        message: `Обработка страницы ${pageNum}/${volume.totalPages}...`,
      };

      // Извлекаем текст
      const ocrResult = await this.extractTextFromPage(
        volume.filePath,
        pageNum,
        useOcr,
      );

      const page: LegalPage = {
        volumeNumber: volume.volumeNumber,
        pageNumber: pageNum,
        text: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        metadata: {},
      };

      // Мультимодальный анализ (опционально)
      if (useMultimodal && pageNum % 10 === 0) {
        // Анализируем каждую 10-ю страницу для оптимизации
        yield {
          status: "analyzing",
          currentVolume: volume.volumeNumber,
          currentPage: pageNum,
          totalVolumes: 1,
          totalPages: volume.totalPages,
          processedPages: pageNum,
          message: `Мультимодальный анализ страницы ${pageNum}...`,
        };

        const multimodalResult = await this.analyzePageMultimodal(
          volume.filePath,
          pageNum,
        );
        // TODO: Сохранить результаты мультимодального анализа
      }

      pages.push(page);
    }

    yield {
      status: "completed",
      currentVolume: volume.volumeNumber,
      totalVolumes: 1,
      totalPages: volume.totalPages,
      processedPages: volume.totalPages,
      message: `Том ${volume.volumeNumber} обработан полностью`,
    };
  }

  /**
   * Получить ключ кэша для страницы
   */
  private getCacheKey(pdfPath: string, pageNumber: number): string {
    const hash = crypto.createHash("md5");
    hash.update(`${pdfPath}:${pageNumber}`);
    return hash.digest("hex");
  }

  /**
   * Очистить кэш
   */
  async clearCache(): Promise<void> {
    const clearDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(dir, file);
          fs.unlinkSync(filePath);
        });
      }
    };

    clearDir(this.textCacheDir);
    clearDir(this.thumbnailsDir);
  }
}

