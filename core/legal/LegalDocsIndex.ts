/**
 * Индекс юридических документов с поддержкой семантического поиска
 * Духовная миссия: создание базы знаний для поиска истины
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { DatabaseConnection, SqliteDb } from "../indexing/refreshIndex";
import {
  CodebaseIndex,
  IndexResultType,
  IndexTag,
  IndexingProgressUpdate,
  MarkCompleteCallback,
  RefreshIndexResults,
} from "../indexing/types";
import { BaseLLM } from "../llm";
import { DocumentComparisonService } from "./DocumentComparisonService";
import { PdfProcessor } from "./PdfProcessor";
import {
  LegalDocsConfig,
  LegalPage,
  LegalSearchQuery,
  LegalSearchResult,
  LegalVolume,
} from "./types";

export class LegalDocsIndex implements CodebaseIndex {
  artifactId: string = "legal-docs-index";
  relativeExpectedTime: number = 5.0; // Индексация PDF занимает много времени

  private pdfProcessor: PdfProcessor;
  private comparisonService: DocumentComparisonService;
  private config: LegalDocsConfig;
  private multimodalModel?: BaseLLM;

  constructor(
    cacheDir: string,
    config: LegalDocsConfig,
    multimodalModel?: BaseLLM,
  ) {
    this.config = config;
    this.multimodalModel = multimodalModel;
    this.pdfProcessor = new PdfProcessor(cacheDir, multimodalModel);
    this.comparisonService = new DocumentComparisonService(
      multimodalModel,
      this.pdfProcessor,
    );
  }

  /**
   * Создание таблиц в БД
   */
  private async createTables(db: DatabaseConnection): Promise<void> {
    // Таблица томов
    await db.exec(`
      CREATE TABLE IF NOT EXISTS legal_volumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        volume_number INTEGER NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        file_size INTEGER NOT NULL,
        total_pages INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        indexing_status TEXT NOT NULL DEFAULT 'pending',
        indexing_progress INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица страниц с полнотекстовым поиском
    await db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS legal_pages_fts USING fts5(
        volume_number,
        page_number,
        text,
        author,
        document_type,
        content='legal_pages',
        content_rowid='id'
      )
    `);

    // Таблица страниц (основная)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS legal_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        volume_number INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        image_path TEXT,
        ocr_confidence REAL,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(volume_number, page_number),
        FOREIGN KEY(volume_number) REFERENCES legal_volumes(volume_number)
      )
    `);

    // Триггер для синхронизации FTS
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS legal_pages_ai AFTER INSERT ON legal_pages BEGIN
        INSERT INTO legal_pages_fts(
          rowid,
          volume_number,
          page_number,
          text,
          author,
          document_type
        )
        VALUES (
          new.id,
          new.volume_number,
          new.page_number,
          new.text,
          json_extract(new.metadata_json, '$.author'),
          json_extract(new.metadata_json, '$.documentType')
        );
      END;
    `);

    // Таблица сравнений документов
    await db.exec(`
      CREATE TABLE IF NOT EXISTS legal_comparisons (
        id TEXT PRIMARY KEY,
        doc1_volume INTEGER NOT NULL,
        doc1_pages TEXT NOT NULL,
        doc1_author TEXT NOT NULL,
        doc2_volume INTEGER NOT NULL,
        doc2_pages TEXT NOT NULL,
        doc2_author TEXT NOT NULL,
        text_similarity REAL NOT NULL,
        visual_similarity REAL,
        is_suspicious BOOLEAN NOT NULL,
        suspicious_reason TEXT,
        matched_fragments_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Индексы для производительности
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_legal_volumes_status 
      ON legal_volumes(indexing_status)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_legal_pages_volume 
      ON legal_pages(volume_number)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_legal_comparisons_suspicious 
      ON legal_comparisons(is_suspicious, text_similarity DESC)
    `);
  }

  /**
   * Обновление индекса
   */
  async *update(
    tag: IndexTag,
    results: RefreshIndexResults,
    markComplete: MarkCompleteCallback,
    repoName: string | undefined,
  ): AsyncGenerator<IndexingProgressUpdate> {
    const db = await SqliteDb.get();
    await this.createTables(db);

    // Сканируем директорию с томами
    const volumesDir = this.config.volumesDirectory;
    if (!fs.existsSync(volumesDir)) {
      console.warn(`Директория с томами не найдена: ${volumesDir}`);
      return;
    }

    yield {
      progress: 0,
      desc: "Сканирование томов...",
      status: "indexing",
    };

    // Находим все PDF файлы
    const pdfFiles = this.findPdfFiles(volumesDir);

    yield {
      progress: 0.1,
      desc: `Найдено томов: ${pdfFiles.length}`,
      status: "indexing",
    };

    // Обрабатываем каждый том
    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfPath = pdfFiles[i];
      const progress = (i + 1) / pdfFiles.length;

      yield {
        progress: progress * 0.8, // 80% на индексацию
        desc: `Обработка тома ${i + 1}/${pdfFiles.length}...`,
        status: "indexing",
      };

      try {
        // Получаем метаданные тома
        const volume = await this.pdfProcessor.getVolumeMetadata(pdfPath);

        // Проверяем, не индексирован ли уже этот том
        const existing = await db.get(
          "SELECT id, indexing_status FROM legal_volumes WHERE file_path = ?",
          [pdfPath],
        );

        if (existing && existing.indexing_status === "completed") {
          continue; // Пропускаем уже проиндексированные
        }

        // Сохраняем том
        await this.saveVolume(db, volume);

        // Индексируем страницы
        const processGenerator = this.pdfProcessor.processVolume(
          volume,
          this.config.indexing.enableOcr,
          false, // Мультимодальный анализ пока отключаем для скорости
        );

        for await (const processProgress of processGenerator) {
          yield {
            progress: progress * 0.8,
            desc: processProgress.message,
            status: "indexing",
          };

          // TODO: Сохранять страницы по мере обработки
        }

        // Обновляем статус тома
        await db.run(
          `UPDATE legal_volumes 
           SET indexing_status = 'completed', 
               indexing_progress = 100,
               updated_at = CURRENT_TIMESTAMP
           WHERE file_path = ?`,
          [pdfPath],
        );
      } catch (error) {
        console.error(`Ошибка обработки ${pdfPath}:`, error);

        await db.run(
          `UPDATE legal_volumes 
           SET indexing_status = 'error',
               updated_at = CURRENT_TIMESTAMP
           WHERE file_path = ?`,
          [pdfPath],
        );
      }
    }

    // Поиск подозрительных совпадений
    if (this.config.comparison.suspiciousTextThreshold > 0) {
      yield {
        progress: 0.9,
        desc: "Поиск подозрительных совпадений...",
        status: "indexing",
      };

      await this.findSuspiciousDocuments(db);
    }

    yield {
      progress: 1.0,
      desc: "Индексация завершена",
      status: "indexing",
    };

    // Помечаем завершение
    await markComplete(results.compute, IndexResultType.Compute);
  }

  /**
   * Найти все PDF файлы в директории
   */
  private findPdfFiles(dir: string): string[] {
    const files: string[] = [];

    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".pdf")
        ) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Сохранить том в БД
   */
  private async saveVolume(
    db: DatabaseConnection,
    volume: LegalVolume,
  ): Promise<void> {
    await db.run(
      `INSERT OR REPLACE INTO legal_volumes (
        volume_number, file_path, file_size, total_pages, document_type,
        indexing_status, indexing_progress, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        volume.volumeNumber,
        volume.filePath,
        volume.fileSize,
        volume.totalPages,
        volume.documentType,
        volume.indexingStatus,
        volume.indexingProgress,
        JSON.stringify(volume.metadata),
      ],
    );
  }

  /**
   * Сохранить страницу в БД
   */
  private async savePage(
    db: DatabaseConnection,
    page: LegalPage,
  ): Promise<void> {
    await db.run(
      `INSERT OR REPLACE INTO legal_pages (
        volume_number, page_number, text, image_path, ocr_confidence, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        page.volumeNumber,
        page.pageNumber,
        page.text,
        page.imagePath,
        page.ocrConfidence,
        JSON.stringify(page.metadata),
      ],
    );
  }

  /**
   * Поиск подозрительных документов (копипаст между прокурором и следователем)
   */
  private async findSuspiciousDocuments(db: DatabaseConnection): Promise<void> {
    // TODO: Реализовать логику поиска документов прокурора и следователя
    // и их сравнение через DocumentComparisonService
    console.log("Поиск подозрительных совпадений...");
  }

  /**
   * Полнотекстовый поиск
   */
  async search(query: LegalSearchQuery): Promise<LegalSearchResult[]> {
    const db = await SqliteDb.get();
    const limit = query.limit || this.config.search.defaultResults;

    let sql = `
      SELECT 
        p.volume_number,
        p.page_number,
        p.text,
        p.image_path,
        bm25(legal_pages_fts) as relevance
      FROM legal_pages_fts
      INNER JOIN legal_pages p ON legal_pages_fts.rowid = p.id
      WHERE legal_pages_fts MATCH ?
    `;

    const params: any[] = [query.query];

    // Фильтр по томам
    if (query.volumeNumbers && query.volumeNumbers.length > 0) {
      sql += ` AND p.volume_number IN (${query.volumeNumbers.join(",")})`;
    }

    sql += ` ORDER BY relevance DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(sql, params);

    return rows.map((row: any, index: number) => ({
      id: `${row.volume_number}_${row.page_number}`,
      volumeNumber: row.volume_number,
      pageNumber: row.page_number,
      text: row.text,
      relevance: 1 / (1 + Math.abs(row.relevance)), // Нормализуем BM25 score
      imagePath: row.image_path,
      highlights: [], // TODO: Реализовать подсветку
    }));
  }

  /**
   * Получить все подозрительные сравнения
   */
  async getSuspiciousComparisons(): Promise<any[]> {
    const db = await SqliteDb.get();

    return await db.all(`
      SELECT *
      FROM legal_comparisons
      WHERE is_suspicious = 1
      ORDER BY text_similarity DESC
    `);
  }

  /**
   * Получить статистику по делу
   */
  async getCaseStatistics(): Promise<{
    totalVolumes: number;
    totalPages: number;
    indexedVolumes: number;
    suspiciousComparisons: number;
  }> {
    const db = await SqliteDb.get();

    const volumeStats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN indexing_status = 'completed' THEN 1 ELSE 0 END) as indexed,
        SUM(total_pages) as pages
      FROM legal_volumes
    `);

    const comparisonStats = await db.get(`
      SELECT COUNT(*) as suspicious
      FROM legal_comparisons
      WHERE is_suspicious = 1
    `);

    return {
      totalVolumes: volumeStats?.total || 0,
      totalPages: volumeStats?.pages || 0,
      indexedVolumes: volumeStats?.indexed || 0,
      suspiciousComparisons: comparisonStats?.suspicious || 0,
    };
  }
}
