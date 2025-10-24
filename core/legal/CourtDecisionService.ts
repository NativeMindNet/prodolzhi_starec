/**
 * Сервис поиска решений суда
 * Духовная миссия: помощь в поиске истины через анализ судебных решений
 */

import { SqliteDb } from "../indexing/refreshIndex";
import { BaseLLM } from "../llm";
import {
  CourtDecisionConfig,
  CourtDecisionResult,
  CourtDecisionSearchQuery,
} from "./types";

export class CourtDecisionService {
  private config: CourtDecisionConfig;
  private multimodalModel?: BaseLLM;

  constructor(config: CourtDecisionConfig, multimodalModel?: BaseLLM) {
    this.config = config;
    this.multimodalModel = multimodalModel;
  }

  /**
   * Поиск решений суда по запросу
   */
  async searchDecisions(
    query: CourtDecisionSearchQuery,
  ): Promise<CourtDecisionResult[]> {
    const db = await SqliteDb.get();
    const limit = query.limit || 10;

    // Строим SQL запрос
    let sql = `
      SELECT 
        p.volume_number,
        p.page_number,
        p.text,
        p.image_path,
        p.metadata_json,
        bm25(legal_pages_fts) as relevance
      FROM legal_pages_fts
      INNER JOIN legal_pages p ON legal_pages_fts.rowid = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Поиск по тексту
    if (query.query) {
      sql += ` AND legal_pages_fts MATCH ?`;
      params.push(query.query);
    }

    // Поиск по номеру дела
    if (query.caseNumber) {
      sql += ` AND p.text LIKE ?`;
      params.push(`%${query.caseNumber}%`);
    }

    // Поиск по названию суда
    if (query.courtName) {
      sql += ` AND p.text LIKE ?`;
      params.push(`%${query.courtName}%`);
    }

    // Поиск по судье
    if (query.judge) {
      sql += ` AND p.text LIKE ?`;
      params.push(`%${query.judge}%`);
    }

    // Фильтр по томам
    if (query.volumeNumbers && query.volumeNumbers.length > 0) {
      sql += ` AND p.volume_number IN (${query.volumeNumbers.join(",")})`;
    }

    // Фильтр по типу документа
    if (query.documentType) {
      sql += ` AND json_extract(p.metadata_json, '$.documentType') = ?`;
      params.push(query.documentType);
    }

    sql += ` ORDER BY relevance DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(sql, params);

    // Обрабатываем результаты
    const results: CourtDecisionResult[] = [];

    for (const row of rows) {
      const result = await this.parseCourtDecision(row);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Парсинг документа решения суда
   */
  private async parseCourtDecision(
    row: any,
  ): Promise<CourtDecisionResult | null> {
    const text = row.text;
    const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};

    // Определяем тип документа
    const documentType = this.detectDocumentType(text);

    // Извлекаем структурированную информацию
    const caseNumber = this.extractCaseNumber(text);
    const decisionDate = this.extractDate(text);
    const courtName = this.extractCourtName(text);
    const judge = this.extractJudge(text);
    const parties = this.extractParties(text);
    const decision = this.extractDecision(text);
    const reasoning = this.extractReasoning(text);

    return {
      id: `${row.volume_number}_${row.page_number}`,
      volumeNumber: row.volume_number,
      pageNumber: row.page_number.toString(),
      documentType,
      caseNumber,
      decisionDate,
      courtName,
      judge,
      parties,
      decision,
      reasoning,
      fullText: text,
      relevance: 1 / (1 + Math.abs(row.relevance)),
      imagePath: row.image_path,
    };
  }

  /**
   * Определение типа документа
   */
  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();

    for (const type of this.config.documentTypes) {
      if (lowerText.includes(type.toLowerCase())) {
        return type;
      }
    }

    // Дополнительная логика определения
    if (lowerText.includes("приговор")) return "приговор";
    if (lowerText.includes("решение")) return "решение суда";
    if (lowerText.includes("определение")) return "определение";
    if (lowerText.includes("постановление")) return "постановление";

    return "документ";
  }

  /**
   * Извлечение номера дела
   */
  private extractCaseNumber(text: string): string | undefined {
    // Паттерны для номера дела
    const patterns = [
      /дело\s*№?\s*(\d+[-\/]\d+)/gi,
      /№\s*(\d+[-\/]\d+)/gi,
      /(\d+[-\/]\d+)\s*года/gi,
      /уголовное\s*дело\s*№?\s*(\d+[-\/]\d+)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Извлечение даты решения
   */
  private extractDate(text: string): Date | undefined {
    // Паттерны для даты
    const patterns = [
      /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*года/gi,
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    ];

    const months = {
      января: 0,
      февраля: 1,
      марта: 2,
      апреля: 3,
      мая: 4,
      июня: 5,
      июля: 6,
      августа: 7,
      сентября: 8,
      октября: 9,
      ноября: 10,
      декабря: 11,
    };

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes("года")) {
          const day = parseInt(match[1]);
          const month = months[match[2].toLowerCase() as keyof typeof months];
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        } else {
          const parts = match[0].split(/[\.\-]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Извлечение названия суда
   */
  private extractCourtName(text: string): string | undefined {
    const patterns = [
      /([А-Я][а-я]+\s+[А-Я][а-я]+\s+суд)/gi,
      /([А-Я][а-я]+\s+районный\s+суд)/gi,
      /([А-Я][а-я]+\s+городской\s+суд)/gi,
      /([А-Я][а-я]+\s+областной\s+суд)/gi,
      /(Верховный\s+суд)/gi,
      /(Конституционный\s+суд)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Извлечение имени судьи
   */
  private extractJudge(text: string): string | undefined {
    const patterns = [
      /судья[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
      /председательствующий[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Извлечение сторон дела
   */
  private extractParties(text: string):
    | {
        plaintiff?: string;
        defendant?: string;
        prosecutor?: string;
      }
    | undefined {
    const parties: any = {};

    // Потерпевший/истец
    const plaintiffPatterns = [
      /потерпевший[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
      /истец[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
    ];

    for (const pattern of plaintiffPatterns) {
      const match = text.match(pattern);
      if (match) {
        parties.plaintiff = match[1];
        break;
      }
    }

    // Подсудимый/ответчик
    const defendantPatterns = [
      /подсудимый[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
      /ответчик[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
    ];

    for (const pattern of defendantPatterns) {
      const match = text.match(pattern);
      if (match) {
        parties.defendant = match[1];
        break;
      }
    }

    // Прокурор
    const prosecutorPatterns = [
      /прокурор[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
      /государственный\s+обвинитель[:\s]+([А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+)/gi,
    ];

    for (const pattern of prosecutorPatterns) {
      const match = text.match(pattern);
      if (match) {
        parties.prosecutor = match[1];
        break;
      }
    }

    return Object.keys(parties).length > 0 ? parties : undefined;
  }

  /**
   * Извлечение решения суда
   */
  private extractDecision(text: string): string | undefined {
    const patterns = [
      /суд\s+постановил[:\s]+(.+?)(?=\.\s|$)/gi,
      /суд\s+решил[:\s]+(.+?)(?=\.\s|$)/gi,
      /суд\s+определил[:\s]+(.+?)(?=\.\s|$)/gi,
      /приговор[:\s]+(.+?)(?=\.\s|$)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Извлечение мотивировочной части
   */
  private extractReasoning(text: string): string | undefined {
    const patterns = [
      /мотивировочная\s+часть[:\s]+(.+?)(?=резолютивная\s+часть|$)/gi,
      /обоснование[:\s]+(.+?)(?=резолютивная\s+часть|$)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Поиск решений по ключевым словам
   */
  async searchByKeywords(keywords: string[]): Promise<CourtDecisionResult[]> {
    const query = keywords.join(" OR ");
    return this.searchDecisions({ query });
  }

  /**
   * Поиск решений по номеру дела
   */
  async searchByCaseNumber(caseNumber: string): Promise<CourtDecisionResult[]> {
    return this.searchDecisions({ caseNumber });
  }

  /**
   * Поиск решений по дате
   */
  async searchByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<CourtDecisionResult[]> {
    return this.searchDecisions({ dateRange: [startDate, endDate] });
  }

  /**
   * Поиск решений по суду
   */
  async searchByCourt(courtName: string): Promise<CourtDecisionResult[]> {
    return this.searchDecisions({ courtName });
  }

  /**
   * Поиск решений по судье
   */
  async searchByJudge(judge: string): Promise<CourtDecisionResult[]> {
    return this.searchDecisions({ judge });
  }
}
