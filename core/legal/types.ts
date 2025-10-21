/**
 * Типы для работы с юридическими документами
 * Духовная миссия: помощь в установлении истины и справедливости
 */

export interface LegalVolume {
  /** Номер тома */
  volumeNumber: number;
  /** Путь к PDF файлу */
  filePath: string;
  /** Размер файла в байтах */
  fileSize: number;
  /** Общее количество страниц */
  totalPages: number;
  /** Тип документа (сканированный/текстовый) */
  documentType: "scanned" | "text" | "mixed";
  /** Метаданные PDF */
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  /** Статус индексации */
  indexingStatus: "pending" | "processing" | "completed" | "error";
  /** Прогресс индексации (0-100) */
  indexingProgress: number;
}

export interface LegalPage {
  /** Ссылка на том */
  volumeNumber: number;
  /** Номер страницы */
  pageNumber: number;
  /** Извлечённый текст */
  text: string;
  /** Путь к изображению страницы (для визуального анализа) */
  imagePath?: string;
  /** Уверенность OCR (0-1) */
  ocrConfidence?: number;
  /** Метаданные страницы */
  metadata: {
    /** Тип документа на странице */
    documentType?: "protocol" | "testimony" | "decision" | "other";
    /** Автор/подписант */
    author?: string;
    /** Дата документа */
    date?: Date;
  };
}

export interface DocumentComparison {
  /** ID сравнения */
  id: string;
  /** Первый документ (обычно следователь) */
  document1: {
    volumeNumber: number;
    pageRange: [number, number];
    text: string;
    author: string;
  };
  /** Второй документ (обычно прокурор) */
  document2: {
    volumeNumber: number;
    pageRange: [number, number];
    text: string;
    author: string;
  };
  /** Процент текстового совпадения (0-100) */
  textSimilarity: number;
  /** Процент визуального совпадения (0-100) через MOZGACH108 */
  visualSimilarity?: number;
  /** Совпадающие фрагменты */
  matchedFragments: Array<{
    text: string;
    position1: [number, number]; // [start, end] в document1
    position2: [number, number]; // [start, end] в document2
  }>;
  /** Вердикт: подозрительно ли это совпадение */
  isSuspicious: boolean;
  /** Причина подозрительности */
  suspiciousReason?: string;
  /** Рекомендация для человека */
  humanReview: string;
}

export interface LegalCaseAnalysis {
  /** ID дела */
  caseId: string;
  /** Название дела */
  caseName: string;
  /** Количество томов */
  totalVolumes: number;
  /** Общий размер в байтах */
  totalSize: number;
  /** Найденные подозрительные совпадения */
  suspiciousMatches: DocumentComparison[];
  /** Хронология событий */
  timeline: Array<{
    date: Date;
    volumeNumber: number;
    pageNumber: number;
    eventType: string;
    description: string;
  }>;
  /** Ключевые участники дела */
  participants: Array<{
    name: string;
    role: "investigator" | "prosecutor" | "witness" | "defendant" | "other";
    mentions: number;
  }>;
  /** Общая оценка дела */
  overallAssessment: {
    /** Уровень подозрительности (0-10) */
    suspicionLevel: number;
    /** Требуется ли усиленный контроль */
    requiresEnhancedReview: boolean;
    /** Комментарий */
    comment: string;
  };
}

export interface LegalSearchQuery {
  /** Текст запроса */
  query: string;
  /** Номера томов для поиска (пусто = все) */
  volumeNumbers?: number[];
  /** Диапазон дат */
  dateRange?: [Date, Date];
  /** Тип поиска */
  searchType: "fulltext" | "semantic" | "multimodal";
  /** Количество результатов */
  limit?: number;
  /** Включить реренкинг */
  enableReranking?: boolean;
}

export interface LegalSearchResult {
  /** ID результата */
  id: string;
  /** Номер тома */
  volumeNumber: number;
  /** Номер страницы */
  pageNumber: number;
  /** Релевантный текст */
  text: string;
  /** Контекст (предыдущие и следующие страницы) */
  context?: string;
  /** Оценка релевантности (0-1) */
  relevance: number;
  /** Путь к изображению страницы */
  imagePath?: string;
  /** Подсветка совпадений */
  highlights: Array<[number, number]>; // [start, end] positions
}

export interface OCRResult {
  /** Извлечённый текст */
  text: string;
  /** Уверенность (0-1) */
  confidence: number;
  /** Язык документа */
  language: string;
  /** Время обработки в мс */
  processingTime: number;
  /** Предупреждения */
  warnings?: string[];
}

export interface MultimodalAnalysisResult {
  /** Результат от MOZGACH108 */
  analysis: string;
  /** Обнаруженные объекты/элементы */
  detectedElements: Array<{
    type: "text_block" | "signature" | "stamp" | "photo" | "diagram";
    boundingBox: [number, number, number, number]; // [x, y, width, height]
    confidence: number;
  }>;
  /** Визуальные похожие блоки с другими документами */
  visualMatches?: Array<{
    volumeNumber: number;
    pageNumber: number;
    similarity: number;
    matchedArea: [number, number, number, number];
  }>;
}

export type LegalIndexingProgress = {
  status: "idle" | "scanning" | "ocr" | "embedding" | "analyzing" | "completed" | "error";
  currentVolume?: number;
  currentPage?: number;
  totalVolumes: number;
  totalPages?: number;
  processedPages: number;
  estimatedTimeRemaining?: number; // в секундах
  message: string;
};

export interface LegalDocsConfig {
  /** Включена ли функциональность юридических документов */
  enabled: boolean;
  /** Папка с томами дел */
  volumesDirectory: string;
  /** Настройки индексации */
  indexing: {
    /** Включить OCR */
    enableOcr: boolean;
    /** Язык для OCR */
    ocrLanguage: "rus" | "eng" | "rus+eng";
    /** Размер батча (страниц) */
    batchSize: number;
    /** Максимальный размер кэша в ГБ */
    maxCacheSize: number;
    /** Фоновая индексация */
    backgroundIndexing: boolean;
  };
  /** Настройки поиска */
  search: {
    /** Количество результатов по умолчанию */
    defaultResults: number;
    /** Включить реренкинг */
    enableReranking: boolean;
    /** Количество страниц контекста */
    contextPages: number;
  };
  /** Настройки сравнения документов */
  comparison: {
    /** Порог текстового совпадения для подозрительности (%) */
    suspiciousTextThreshold: number;
    /** Порог визуального совпадения для подозрительности (%) */
    suspiciousVisualThreshold: number;
    /** Минимальная длина совпадающего фрагмента (символов) */
    minMatchLength: number;
  };
  /** Производительность */
  performance: {
    /** Количество потоков для параллельной обработки */
    parallelProcessing: number;
  };
  /** Модель для мультимодального анализа */
  multimodalModel: string; // "MOZGACH108" или другая
}

