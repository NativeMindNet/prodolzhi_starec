/**
 * Определение, нужно ли индексировать PDF файлы
 * PDF файлы обычно игнорируются, но для юридических документов мы их обрабатываем
 */

import * as path from "node:path";

/**
 * Проверить, находится ли файл в папке с юридическими документами
 */
export function isInLegalDocsDirectory(
  filePath: string,
  legalDocsDirectories: string[],
): boolean {
  const normalizedPath = path.normalize(filePath);

  for (const legalDir of legalDocsDirectories) {
    const normalizedLegalDir = path.normalize(legalDir);
    
    if (normalizedPath.startsWith(normalizedLegalDir)) {
      return true;
    }
  }

  return false;
}

/**
 * Определить, нужно ли индексировать PDF файл
 * @param filePath Путь к файлу
 * @param legalDocsConfig Конфигурация юридических документов
 * @returns true если файл нужно индексировать, false если игнорировать
 */
export function shouldIndexPdf(
  filePath: string,
  legalDocsConfig?: {
    enabled: boolean;
    volumesDirectory: string;
  },
): boolean {
  // Если юридические документы не включены, игнорируем все PDF
  if (!legalDocsConfig || !legalDocsConfig.enabled) {
    return false;
  }

  // Проверяем, что файл - это действительно PDF
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    return false;
  }

  // Проверяем, что файл находится в папке с юридическими документами
  return isInLegalDocsDirectory(filePath, [legalDocsConfig.volumesDirectory]);
}

/**
 * Создать фильтр для игнорирования файлов с учётом юридических документов
 */
export function createIgnoreFilter(
  standardIgnoreFilter: (filePath: string) => boolean,
  legalDocsConfig?: {
    enabled: boolean;
    volumesDirectory: string;
  },
): (filePath: string) => boolean {
  return (filePath: string) => {
    // Если это PDF файл из папки юридических документов, не игнорируем его
    if (shouldIndexPdf(filePath, legalDocsConfig)) {
      return false;
    }

    // Иначе применяем стандартный фильтр
    return standardIgnoreFilter(filePath);
  };
}

