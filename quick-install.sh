#!/bin/bash
# Быстрая установка "Сделай, Старец!" в VS Code
# Quick install script for "Continue, Elder!" VS Code extension

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🙏 Сделай, Старец! 🙏               ║${NC}"
echo -e "${BLUE}║   ดำเนินต่อไปเถิด พ่อแก่!            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен. Установите Node.js 20.19.0+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Требуется Node.js 20.19.0+. Текущая версия: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Проверка VS Code
if ! command -v code &> /dev/null; then
    echo -e "${RED}❌ VS Code не найден в PATH${NC}"
    echo "   Добавьте VS Code в PATH или установите через:"
    echo "   VS Code -> Command Palette (⇧⌘P) -> 'Shell Command: Install code command in PATH'"
    exit 1
fi

echo -e "${GREEN}✓ VS Code найден${NC}"
echo ""

# Переход в директорию проекта
PROJECT_DIR="/Users/anton/proj/ai.nativemind.net/Сделай, Старец!"
cd "$PROJECT_DIR"

# Установка зависимостей
echo -e "${YELLOW}📦 Установка зависимостей...${NC}"

echo "   → Корневые зависимости..."
npm install > /dev/null 2>&1 || true

echo "   → Core модуль..."
cd core
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1
cd ..

echo "   → GUI модуль..."
cd gui
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1
cd ..

echo "   → VS Code расширение..."
cd extensions/vscode
npm install > /dev/null 2>&1

echo -e "${GREEN}✓ Зависимости установлены${NC}"
echo ""

# Сборка расширения
echo -e "${YELLOW}🔨 Сборка расширения...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Расширение собрано${NC}"
echo ""

# Упаковка в .vsix
echo -e "${YELLOW}📦 Упаковка расширения...${NC}"

# Проверка vsce
if ! npm list -g @vscode/vsce > /dev/null 2>&1; then
    echo "   → Установка @vscode/vsce..."
    npm install -g @vscode/vsce > /dev/null 2>&1
fi

# Упаковка
npx @vscode/vsce package --allow-missing-repository --allow-star-activation > /dev/null 2>&1

# Поиск .vsix файла
VSIX_FILE=$(ls sdelay-starets-*.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo -e "${RED}❌ Не удалось создать .vsix файл${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Создан файл: $VSIX_FILE${NC}"
echo ""

# Удаление старой версии (если есть)
if code --list-extensions | grep -q "sdelay-starets"; then
    echo -e "${YELLOW}🗑️  Удаление старой версии...${NC}"
    code --uninstall-extension sdelay-starets > /dev/null 2>&1 || true
    echo -e "${GREEN}✓ Старая версия удалена${NC}"
    echo ""
fi

# Установка расширения
echo -e "${YELLOW}🚀 Установка в VS Code...${NC}"
code --install-extension "$VSIX_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ Установка завершена успешно!     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📌 Следующие шаги:${NC}"
    echo "   1. Перезапустите VS Code"
    echo "   2. Откройте любой проект"
    echo "   3. Найдите иконку 🙏 в боковой панели"
    echo ""
    echo -e "${BLUE}🎯 Горячие клавиши:${NC}"
    echo "   • Cmd+Shift+C (Ctrl+Shift+C) - Чат"
    echo "   • Cmd+Shift+A (Ctrl+Shift+A) - Агент"
    echo "   • Cmd+K (Ctrl+K) - Редактирование"
    echo "   • Alt+L - Переключить язык (🦅/ครุฑ)"
    echo ""
    echo -e "${BLUE}💡 Режимы работы:${NC}"
    echo "   • 💻 Разработка (по умолчанию)"
    echo "   • ⚖️ Юрист"
    echo "   • 🤝 Продавец"
    echo ""
    echo -e "${GREEN}🙏 Да пребудет с вами мудрость старца!${NC}"
    echo -e "${GREEN}🙏 ขอให้ปัญญาของพ่อแก่สถิตอยู่กับท่าน!${NC}"
    echo ""
else
    echo -e "${RED}❌ Ошибка при установке расширения${NC}"
    echo "Попробуйте установить вручную:"
    echo "code --install-extension $(pwd)/$VSIX_FILE"
    exit 1
fi


