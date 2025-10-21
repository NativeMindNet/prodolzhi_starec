/**
 * Сервис сравнения документов для обнаружения копипаста
 * Духовная цель: выявление несправедливости через обнаружение копирования документов
 */

import { distance as levenshteinDistance } from "fastest-levenshtein";
import { BaseLLM } from "../llm";
import { PdfProcessor } from "./PdfProcessor";
import {
    DocumentComparison,
    LegalPage
} from "./types";

export interface ComparisonOptions {
  /** Минимальная длина совпадающего фрагмента (символов) */
  minMatchLength: number;
  /** Порог для определения подозрительности (%) */
  suspiciousTextThreshold: number;
  /** Порог визуального совпадения (%) */
  suspiciousVisualThreshold: number;
  /** Использовать мультимодальный анализ */
  useMultimodal: boolean;
  /** Игнорировать стандартные юридические шаблоны */
  ignoreTemplates: boolean;
}

export class DocumentComparisonService {
  private multimodalModel?: BaseLLM;
  private pdfProcessor?: PdfProcessor;
  
  // Стандартные юридические шаблоны, которые не считаются копипастом
  private readonly LEGAL_TEMPLATES = [
    "в соответствии со статьей",
    "руководствуясь статьей",
    "на основании изложенного",
    "установлено следующее",
    "принимая во внимание",
    "учитывая изложенное",
    "в судебном заседании",
    "выслушав участников",
  ];

  constructor(
    multimodalModel?: BaseLLM,
    pdfProcessor?: PdfProcessor,
  ) {
    this.multimodalModel = multimodalModel;
    this.pdfProcessor = pdfProcessor;
  }

  /**
   * Сравнить два документа и найти совпадения
   */
  async compareDocuments(
    doc1: {
      volumeNumber: number;
      pageRange: [number, number];
      text: string;
      author: string;
      pdfPath?: string;
    },
    doc2: {
      volumeNumber: number;
      pageRange: [number, number];
      text: string;
      author: string;
      pdfPath?: string;
    },
    options: ComparisonOptions,
  ): Promise<DocumentComparison> {
    const comparisonId = `${doc1.volumeNumber}_${doc1.pageRange[0]}_vs_${doc2.volumeNumber}_${doc2.pageRange[0]}`;

    // 1. Очистка текста от шаблонов (если нужно)
    let text1 = doc1.text;
    let text2 = doc2.text;

    if (options.ignoreTemplates) {
      text1 = this.removeTemplates(text1);
      text2 = this.removeTemplates(text2);
    }

    // 2. Нормализация текста
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);

    // 3. Вычисление текстового совпадения
    const textSimilarity = this.calculateTextSimilarity(
      normalized1,
      normalized2,
    );

    // 4. Поиск совпадающих фрагментов
    const matchedFragments = this.findMatchedFragments(
      text1,
      text2,
      options.minMatchLength,
    );

    // 5. Визуальное сравнение (если включено)
    let visualSimilarity: number | undefined;
    if (
      options.useMultimodal &&
      doc1.pdfPath &&
      doc2.pdfPath &&
      this.pdfProcessor &&
      this.multimodalModel
    ) {
      visualSimilarity = await this.compareVisually(
        doc1.pdfPath,
        doc1.pageRange[0],
        doc2.pdfPath,
        doc2.pageRange[0],
      );
    }

    // 6. Определение подозрительности
    const isSuspicious = this.determineSuspiciousness(
      textSimilarity,
      visualSimilarity,
      matchedFragments.length,
      options,
    );

    // 7. Формирование причины подозрительности
    const suspiciousReason = this.generateSuspiciousReason(
      textSimilarity,
      visualSimilarity,
      matchedFragments.length,
      doc1.author,
      doc2.author,
    );

    // 8. Рекомендация для человека
    const humanReview = this.generateHumanReview(
      isSuspicious,
      textSimilarity,
      matchedFragments.length,
      doc1.author,
      doc2.author,
    );

    return {
      id: comparisonId,
      document1: {
        volumeNumber: doc1.volumeNumber,
        pageRange: doc1.pageRange,
        text: doc1.text,
        author: doc1.author,
      },
      document2: {
        volumeNumber: doc2.volumeNumber,
        pageRange: doc2.pageRange,
        text: doc2.text,
        author: doc2.author,
      },
      textSimilarity,
      visualSimilarity,
      matchedFragments,
      isSuspicious,
      suspiciousReason,
      humanReview,
    };
  }

  /**
   * Удалить стандартные юридические шаблоны из текста
   */
  private removeTemplates(text: string): string {
    let cleaned = text;
    for (const template of this.LEGAL_TEMPLATES) {
      const regex = new RegExp(template, "gi");
      cleaned = cleaned.replace(regex, "");
    }
    return cleaned;
  }

  /**
   * Нормализация текста для сравнения
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, " ") // Множественные пробелы в один
      .replace(/[.,;:!?()]/g, "") // Удалить пунктуацию
      .trim();
  }

  /**
   * Вычислить процент текстового совпадения
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1.length === 0 || text2.length === 0) {
      return 0;
    }

    // Используем алгоритм Левенштейна
    const maxLength = Math.max(text1.length, text2.length);
    const distance = levenshteinDistance(text1, text2);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.round(similarity * 100) / 100; // Округляем до 2 знаков
  }

  /**
   * Найти совпадающие фрагменты текста
   */
  private findMatchedFragments(
    text1: string,
    text2: string,
    minLength: number,
  ): Array<{
    text: string;
    position1: [number, number];
    position2: [number, number];
  }> {
    const fragments: Array<{
      text: string;
      position1: [number, number];
      position2: [number, number];
    }> = [];

    // Разбиваем на предложения
    const sentences1 = text1.split(/[.!?]\s+/);
    const sentences2 = text2.split(/[.!?]\s+/);

    let pos1 = 0;
    for (const sentence1 of sentences1) {
      if (sentence1.length < minLength) {
        pos1 += sentence1.length + 2; // +2 для разделителя
        continue;
      }

      let pos2 = 0;
      for (const sentence2 of sentences2) {
        if (sentence2.length < minLength) {
          pos2 += sentence2.length + 2;
          continue;
        }

        // Проверяем сходство предложений
        const normalized1 = this.normalizeText(sentence1);
        const normalized2 = this.normalizeText(sentence2);
        const similarity = this.calculateTextSimilarity(
          normalized1,
          normalized2,
        );

        // Если совпадение > 80%, считаем это копипастом
        if (similarity > 80) {
          fragments.push({
            text: sentence1,
            position1: [pos1, pos1 + sentence1.length],
            position2: [pos2, pos2 + sentence2.length],
          });
        }

        pos2 += sentence2.length + 2;
      }

      pos1 += sentence1.length + 2;
    }

    return fragments;
  }

  /**
   * Визуальное сравнение страниц через мультимодальную модель
   */
  private async compareVisually(
    pdfPath1: string,
    page1: number,
    pdfPath2: string,
    page2: number,
  ): Promise<number> {
    if (!this.pdfProcessor || !this.multimodalModel) {
      return 0;
    }

    try {
      // Конвертируем обе страницы в изображения
      const image1 = await this.pdfProcessor.convertPageToImage(pdfPath1, page1);
      const image2 = await this.pdfProcessor.convertPageToImage(pdfPath2, page2);

      // TODO: Реализовать вызов MOZGACH108 для визуального сравнения
      // const prompt = `Сравни эти два документа визуально.
      // Определи процент визуального совпадения (0-100%).
      // Обрати внимание на:
      // 1. Расположение текстовых блоков
      // 2. Шрифты и форматирование
      // 3. Подписи и печати
      // 4. Любые признаки копирования
      // 
      // Ответь только числом - процент совпадения.`;

      // const response = await this.multimodalModel.complete({
      //   prompt,
      //   images: [image1, image2],
      // });

      // Временная заглушка
      return 0;
    } catch (error) {
      console.error("Ошибка визуального сравнения:", error);
      return 0;
    }
  }

  /**
   * Определить, является ли совпадение подозрительным
   */
  private determineSuspiciousness(
    textSimilarity: number,
    visualSimilarity: number | undefined,
    matchedFragmentsCount: number,
    options: ComparisonOptions,
  ): boolean {
    // Проверка текстового совпадения
    if (textSimilarity >= options.suspiciousTextThreshold) {
      return true;
    }

    // Проверка визуального совпадения
    if (
      visualSimilarity !== undefined &&
      visualSimilarity >= options.suspiciousVisualThreshold
    ) {
      return true;
    }

    // Проверка количества совпадающих фрагментов
    if (matchedFragmentsCount >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Сгенерировать причину подозрительности
   */
  private generateSuspiciousReason(
    textSimilarity: number,
    visualSimilarity: number | undefined,
    matchedFragmentsCount: number,
    author1: string,
    author2: string,
  ): string | undefined {
    const reasons: string[] = [];

    if (textSimilarity >= 70) {
      reasons.push(
        `Высокое текстовое совпадение: ${textSimilarity.toFixed(1)}%`,
      );
    }

    if (visualSimilarity && visualSimilarity >= 70) {
      reasons.push(
        `Высокое визуальное совпадение: ${visualSimilarity.toFixed(1)}%`,
      );
    }

    if (matchedFragmentsCount >= 5) {
      reasons.push(
        `Обнаружено ${matchedFragmentsCount} совпадающих фрагментов`,
      );
    }

    if (reasons.length > 0) {
      return `Возможно копирование документа ${author1} документом ${author2}. ${reasons.join(". ")}.`;
    }

    return undefined;
  }

  /**
   * Сгенерировать рекомендацию для человека
   */
  private generateHumanReview(
    isSuspicious: boolean,
    textSimilarity: number,
    matchedFragmentsCount: number,
    author1: string,
    author2: string,
  ): string {
    if (!isSuspicious) {
      return "Документы имеют достаточные различия. Рутинная проверка.";
    }

    if (textSimilarity >= 90) {
      return `⚠️ КРИТИЧНО: Почти полное копирование! Документ ${author2} практически идентичен документу ${author1}. Это может свидетельствовать о формальном подходе и отсутствии независимой проверки. Рекомендуется тщательное изучение обоих документов и выяснение обстоятельств их составления.`;
    }

    if (textSimilarity >= 70) {
      return `⚠️ ВНИМАНИЕ: Высокая степень совпадения (${textSimilarity.toFixed(1)}%). Документ ${author2} содержит значительные заимствования из документа ${author1}. Рекомендуется проверить, выполнил ли ${author2} свою работу независимо или просто скопировал выводы ${author1}.`;
    }

    if (matchedFragmentsCount >= 10) {
      return `⚠️ ВНИМАНИЕ: Обнаружено ${matchedFragmentsCount} совпадающих фрагментов между документами. Это может указывать на систематическое копирование. Требуется внимательная проверка.`;
    }

    return `⚠️ Обнаружены подозрительные совпадения между документами ${author1} и ${author2}. Рекомендуется ручная проверка.`;
  }

  /**
   * Массовое сравнение документов в деле
   * Находит все подозрительные пары документов
   */
  async findSuspiciousPairs(
    pages: LegalPage[],
    options: ComparisonOptions,
  ): Promise<DocumentComparison[]> {
    const suspiciousComparisons: DocumentComparison[] = [];

    // Группируем страницы по авторам (следователь, прокурор и т.д.)
    const documentsByAuthor = this.groupPagesByAuthor(pages);

    // Сравниваем документы разных авторов
    const authors = Object.keys(documentsByAuthor);
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const author1 = authors[i];
        const author2 = authors[j];

        const docs1 = documentsByAuthor[author1];
        const docs2 = documentsByAuthor[author2];

        for (const doc1 of docs1) {
          for (const doc2 of docs2) {
            const comparison = await this.compareDocuments(doc1, doc2, options);

            if (comparison.isSuspicious) {
              suspiciousComparisons.push(comparison);
            }
          }
        }
      }
    }

    // Сортируем по убыванию подозрительности
    suspiciousComparisons.sort(
      (a, b) => b.textSimilarity - a.textSimilarity,
    );

    return suspiciousComparisons;
  }

  /**
   * Группировка страниц по авторам документов
   */
  private groupPagesByAuthor(pages: LegalPage[]): Record<
    string,
    Array<{
      volumeNumber: number;
      pageRange: [number, number];
      text: string;
      author: string;
    }>
  > {
    // TODO: Реализовать определение автора документа
    // Пока возвращаем заглушку
    return {
      "Следователь": [],
      "Прокурор": [],
    };
  }
}

