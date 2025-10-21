/**
 * Context Provider для юридических документов
 * Духовная миссия: предоставление доступа к правде через поиск в томах уголовных дел
 */

import {
    ContextItem,
    ContextProviderDescription,
    ContextProviderExtras,
    ContextSubmenuItem,
    LoadSubmenuItemsArgs,
} from "../../index.js";
import { LegalDocsIndex } from "../../legal/LegalDocsIndex.js";
import { LegalDocsConfig, LegalSearchQuery } from "../../legal/types.js";
import { BaseContextProvider } from "../index.js";

class LegalDocsContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "legal",
    displayTitle: "Юридические Документы",
    description: "Поиск по томам уголовного дела",
    type: "query",
    dependsOnIndexing: ["legal-docs" as any], // Новый тип индексации
  };

  private legalIndex?: LegalDocsIndex;

  constructor(options: any) {
    super(options);

    // Инициализация индекса
    const config: LegalDocsConfig = options?.config || this.getDefaultConfig();
    
    if (config.enabled) {
      // TODO: Получить multimodal модель из конфигурации
      this.legalIndex = new LegalDocsIndex(
        options?.cacheDir || ".sdelay-starets/cache",
        config,
      );
    }
  }

  /**
   * Получить конфигурацию по умолчанию
   */
  private getDefaultConfig(): LegalDocsConfig {
    return {
      enabled: false,
      volumesDirectory: "./legal-volumes",
      indexing: {
        enableOcr: true,
        ocrLanguage: "rus",
        batchSize: 10,
        maxCacheSize: 50,
        backgroundIndexing: true,
      },
      search: {
        defaultResults: 5,
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
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    if (!this.legalIndex) {
      return [
        {
          name: "Ошибка",
          description: "Юридические документы не настроены",
          content:
            "Для использования поиска по юридическим документам, включите эту функцию в конфигурации.",
        },
      ];
    }

    try {
      // Парсим запрос
      const searchQuery = this.parseQuery(query);

      // Выполняем поиск
      const results = await this.legalIndex.search(searchQuery);

      if (results.length === 0) {
        return [
          {
            name: "Результаты не найдены",
            description: `По запросу "${query}"`,
            content: `Не найдено ни одного документа, соответствующего запросу: "${query}"\n\nПопробуйте изменить запрос или убедитесь, что тома проиндексированы.`,
          },
        ];
      }

      // Формируем контекстные элементы
      return results.map((result) => ({
        name: `Том ${result.volumeNumber}, стр. ${result.pageNumber}`,
        description: `Релевантность: ${(result.relevance * 100).toFixed(0)}%`,
        content: this.formatResultContent(result, searchQuery),
        uri: {
          type: "file" as const,
          value: result.imagePath || "",
        },
      }));
    } catch (error) {
      console.error("Ошибка поиска по юридическим документам:", error);
      return [
        {
          name: "Ошибка поиска",
          description: String(error),
          content: `Произошла ошибка при поиске: ${error}`,
        },
      ];
    }
  }

  /**
   * Парсинг запроса пользователя
   */
  private parseQuery(query: string): LegalSearchQuery {
    // Ищем специальные команды в запросе
    const volumeMatch = query.match(/том[:\s]+(\d+(?:[-,]\d+)*)/i);
    const pageMatch = query.match(/страниц[аы][:\s]+(\d+(?:[-,]\d+)*)/i);

    let volumeNumbers: number[] | undefined;
    if (volumeMatch) {
      volumeNumbers = this.parseNumberRange(volumeMatch[1]);
      // Удаляем команду из запроса
      query = query.replace(volumeMatch[0], "").trim();
    }

    // Определяем тип поиска
    let searchType: "fulltext" | "semantic" | "multimodal" = "fulltext";
    
    if (query.includes("похожий") || query.includes("семантический")) {
      searchType = "semantic";
      query = query.replace(/похожий|семантический/gi, "").trim();
    }

    if (query.includes("визуальный") || query.includes("изображение")) {
      searchType = "multimodal";
      query = query.replace(/визуальный|изображение/gi, "").trim();
    }

    return {
      query: query.trim(),
      volumeNumbers,
      searchType,
      limit: 10,
      enableReranking: true,
    };
  }

  /**
   * Парсинг диапазона номеров (например, "1-5,7,9")
   */
  private parseNumberRange(range: string): number[] {
    const numbers: number[] = [];
    const parts = range.split(",");

    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
      } else {
        numbers.push(Number(part));
      }
    }

    return numbers;
  }

  /**
   * Форматирование результата поиска
   */
  private formatResultContent(
    result: any,
    query: LegalSearchQuery,
  ): string {
    let content = `# Том ${result.volumeNumber}, Страница ${result.pageNumber}\n\n`;
    content += `**Релевантность**: ${(result.relevance * 100).toFixed(1)}%\n\n`;
    content += `---\n\n`;

    // Текст документа
    content += result.text;

    // Контекст (следующие страницы, если нужно)
    if (result.context) {
      content += `\n\n---\n\n### Контекст\n\n${result.context}`;
    }

    return content;
  }

  /**
   * Загрузка элементов подменю (список томов)
   */
  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs,
  ): Promise<ContextSubmenuItem[]> {
    if (!this.legalIndex) {
      return [];
    }

    try {
      const stats = await this.legalIndex.getCaseStatistics();

      const items: ContextSubmenuItem[] = [
        {
          id: "statistics",
          title: "📊 Статистика дела",
          description: `${stats.totalVolumes} томов, ${stats.totalPages} страниц`,
        },
      ];

      // Добавляем подозрительные совпадения
      if (stats.suspiciousComparisons > 0) {
        items.push({
          id: "suspicious",
          title: `⚠️ Подозрительные совпадения (${stats.suspiciousComparisons})`,
          description: "Возможные случаи копипаста",
        });
      }

      // TODO: Добавить список отдельных томов

      return items;
    } catch (error) {
      console.error("Ошибка загрузки подменю:", error);
      return [];
    }
  }
}

export default LegalDocsContextProvider;

