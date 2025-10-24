/**
 * Тест системы поиска решений суда
 * "Старец, пожалуйста, сделай" - Поиск истины в судебных решениях
 */

// Используем динамический импорт для ES модулей
const { CourtDecisionService } = await import(
  "./core/legal/CourtDecisionService.js"
);
const { LegalDocsIndex } = await import("./core/legal/LegalDocsIndex.js");
const { CourtDecisionConfig, CourtDecisionSearchQuery, LegalDocsConfig } =
  await import("./core/legal/types.js");

// Конфигурация для тестирования
const legalDocsConfig: LegalDocsConfig = {
  enabled: true,
  volumesDirectory: "./дела/судебные-решения",
  indexing: {
    enableOcr: true,
    ocrLanguage: "rus",
    batchSize: 10,
    maxCacheSize: 50,
    backgroundIndexing: false,
  },
  search: {
    defaultResults: 10,
    enableReranking: true,
    contextPages: 3,
  },
  comparison: {
    suspiciousTextThreshold: 70,
    suspiciousVisualThreshold: 70,
    minMatchLength: 100,
  },
  performance: {
    parallelProcessing: 4,
  },
  multimodalModel: "MOZGACH108",
};

const courtDecisionConfig: CourtDecisionConfig = {
  documentTypes: [
    "решение суда",
    "приговор",
    "определение",
    "постановление",
    "апелляционное определение",
    "кассационное определение",
  ],
  keywords: [
    "суд постановил",
    "суд решил",
    "суд определил",
    "приговор",
    "решение",
    "постановление",
    "определение",
    "апелляция",
    "кассация",
  ],
  searchStructure: {
    caseNumber: true,
    date: true,
    courtName: true,
    judge: true,
    parties: true,
    decision: true,
    reasoning: true,
  },
};

async function testCourtDecisionSearch() {
  console.log("🙏 Тестирование системы поиска решений суда...");
  console.log("📋 Духовная миссия: поиск истины в судебных решениях\n");

  try {
    // Создаем сервис поиска решений суда
    const courtDecisionService = new CourtDecisionService(courtDecisionConfig);

    // Создаем индекс юридических документов
    const legalIndex = new LegalDocsIndex(
      ".starets-pozhaluysta-sdelay/cache",
      legalDocsConfig,
      courtDecisionConfig,
    );

    console.log("✅ Сервисы инициализированы");

    // Тест 1: Поиск по ключевым словам
    console.log("\n🔍 Тест 1: Поиск по ключевым словам");
    const keywordsQuery: CourtDecisionSearchQuery = {
      query: "суд постановил",
      limit: 5,
    };

    const keywordResults = await legalIndex.searchCourtDecisions(keywordsQuery);
    console.log(`Найдено результатов: ${keywordResults.length}`);

    if (keywordResults.length > 0) {
      console.log("📄 Первый результат:");
      console.log(`- Тип: ${keywordResults[0].documentType}`);
      console.log(
        `- Том: ${keywordResults[0].volumeNumber}, Страница: ${keywordResults[0].pageNumber}`,
      );
      if (keywordResults[0].caseNumber) {
        console.log(`- Номер дела: ${keywordResults[0].caseNumber}`);
      }
      if (keywordResults[0].courtName) {
        console.log(`- Суд: ${keywordResults[0].courtName}`);
      }
    }

    // Тест 2: Поиск по номеру дела
    console.log("\n🔍 Тест 2: Поиск по номеру дела");
    const caseNumberQuery: CourtDecisionSearchQuery = {
      caseNumber: "123-2024",
      limit: 3,
    };

    const caseResults =
      await legalIndex.searchDecisionsByCaseNumber("123-2024");
    console.log(`Найдено результатов по номеру дела: ${caseResults.length}`);

    // Тест 3: Поиск по суду
    console.log("\n🔍 Тест 3: Поиск по суду");
    const courtResults = await legalIndex.searchDecisionsByCourt(
      "Московский городской суд",
    );
    console.log(`Найдено результатов по суду: ${courtResults.length}`);

    // Тест 4: Поиск по судье
    console.log("\n🔍 Тест 4: Поиск по судье");
    const judgeResults = await legalIndex.searchDecisionsByJudge(
      "Иванов Иван Иванович",
    );
    console.log(`Найдено результатов по судье: ${judgeResults.length}`);

    // Тест 5: Поиск по дате
    console.log("\n🔍 Тест 5: Поиск по дате");
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");
    const dateResults = await legalIndex.searchDecisionsByDateRange(
      startDate,
      endDate,
    );
    console.log(`Найдено результатов по дате: ${dateResults.length}`);

    // Тест 6: Комплексный поиск
    console.log("\n🔍 Тест 6: Комплексный поиск");
    const complexQuery: CourtDecisionSearchQuery = {
      query: "приговор",
      documentType: "приговор",
      courtName: "районный суд",
      limit: 5,
    };

    const complexResults = await legalIndex.searchCourtDecisions(complexQuery);
    console.log(
      `Найдено результатов комплексного поиска: ${complexResults.length}`,
    );

    // Тест 7: Статистика
    console.log("\n📊 Тест 7: Статистика дела");
    const stats = await legalIndex.getCaseStatistics();
    console.log("Статистика:");
    console.log(`- Всего томов: ${stats.totalVolumes}`);
    console.log(`- Всего страниц: ${stats.totalPages}`);
    console.log(`- Проиндексировано томов: ${stats.indexedVolumes}`);
    console.log(`- Подозрительных совпадений: ${stats.suspiciousComparisons}`);

    console.log("\n✅ Все тесты завершены успешно!");
    console.log("🙏 Да пребудет с вами мудрость старца!");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    console.log("\n💡 Возможные причины:");
    console.log("- Тома не проиндексированы");
    console.log("- Неправильный путь к томам");
    console.log("- Отсутствуют PDF файлы");
    console.log("- Проблемы с базой данных");
  }
}

// Запуск тестов
testCourtDecisionSearch().catch(console.error);

export { testCourtDecisionSearch };
