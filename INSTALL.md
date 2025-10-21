# Установка "Сделай, Старец!" в VS Code

## Метод 1: Сборка и установка из исходников (Рекомендуется для разработки)

### Шаг 1: Установите зависимости

```bash
cd "/Users/anton/proj/ai.nativemind.net/Сделай, Старец!"

# Установка зависимостей для всего проекта
npm install

# Установка зависимостей для core
cd core
npm install
cd ..

# Установка зависимостей для GUI
cd gui
npm install
cd ..

# Установка зависимостей для расширения VS Code
cd extensions/vscode
npm install
cd ../..
```

### Шаг 2: Соберите проект

```bash
# Сборка core
cd core
npm run build
cd ..

# Сборка GUI
cd gui
npm run build
cd ..

# Сборка расширения VS Code
cd extensions/vscode
npm run build
cd ../..
```

### Шаг 3: Упакуйте расширение в .vsix

```bash
cd extensions/vscode

# Установите vsce (инструмент для упаковки расширений VS Code)
npm install -g @vscode/vsce

# Упакуйте расширение
vsce package

# Это создаст файл sdelay-starets-1.0.0.vsix
```

### Шаг 4: Установите в VS Code

**Через командную строку:**
```bash
code --install-extension sdelay-starets-1.0.0.vsix
```

**Или через UI VS Code:**
1. Откройте VS Code
2. Нажмите `Cmd+Shift+P` (Mac) или `Ctrl+Shift+P` (Windows/Linux)
3. Введите "Extensions: Install from VSIX"
4. Выберите файл `sdelay-starets-1.0.0.vsix`
5. Перезапустите VS Code

---

## Метод 2: Режим разработки (Для тестирования изменений)

Этот метод позволяет запускать расширение без упаковки, удобно для разработки:

### Шаг 1: Откройте проект в VS Code

```bash
cd "/Users/anton/proj/ai.nativemind.net/Сделай, Старец!"
code .
```

### Шаг 2: Откройте папку расширения

1. В VS Code: `File` → `Open Folder`
2. Выберите папку `extensions/vscode`

### Шаг 3: Запустите в режиме разработки

1. Нажмите `F5` или
2. Откройте Run and Debug (`Cmd+Shift+D` / `Ctrl+Shift+D`)
3. Выберите "Run Extension"
4. Нажмите зелёную кнопку "Start Debugging"

Откроется новое окно VS Code с установленным расширением "Сделай, Старец!".

---

## Метод 3: Быстрая установка (Если уже собрано)

Если расширение уже собрано и упаковано:

```bash
# Найдите файл .vsix
cd "/Users/anton/proj/ai.nativemind.net/Сделай, Старец!/extensions/vscode"

# Установите
code --install-extension sdelay-starets-*.vsix
```

---

## Проверка установки

После установки:

1. Перезапустите VS Code
2. Откройте любой проект
3. Вы должны увидеть:
   - Иконку "Сделай, Старец!" в боковой панели
   - Dropdown выбора режима работы вверху
   - Переключатель языка 🦅 / ครุฑ

### Горячие клавиши для проверки:

- `Cmd+Shift+C` / `Ctrl+Shift+C` - Открыть чат
- `Cmd+Shift+A` / `Ctrl+Shift+A` - Запустить агента
- `Cmd+K` / `Ctrl+K` - Режим редактирования

---

## Устранение проблем

### Ошибка: "Cannot find module"

```bash
# Переустановите все зависимости
npm run clean  # если есть такой скрипт
rm -rf node_modules package-lock.json
npm install
```

### Ошибка при сборке GUI

```bash
cd gui
rm -rf node_modules dist
npm install
npm run build
```

### Ошибка при упаковке с vsce

```bash
# Убедитесь, что все поля в package.json заполнены
# Проверьте, что есть README.md в папке extensions/vscode
# Проверьте, что иконка существует: media/icon.png

# Попробуйте с флагом --allow-missing-repository
vsce package --allow-missing-repository
```

### Расширение не появляется в VS Code

1. Проверьте список установленных расширений: `code --list-extensions`
2. Попробуйте удалить и переустановить:
```bash
code --uninstall-extension sdelay-starets
code --install-extension sdelay-starets-1.0.0.vsix
```

### GUI не загружается

Проверьте, что GUI собран:
```bash
cd gui
ls -la dist/  # должна быть папка dist с файлами
```

---

## Разработка и изменения

Если вы хотите внести изменения:

### Изменения в коде расширения:

1. Откройте `extensions/vscode` в VS Code
2. Внесите изменения
3. Нажмите `F5` для тестирования

### Изменения в GUI:

1. Откройте `gui` в VS Code
2. Внесите изменения
3. Запустите dev-сервер:
```bash
cd gui
npm run dev
```
4. Пересоберите для production:
```bash
npm run build
```

### Изменения в core логике:

1. Откройте `core` в VS Code
2. Внесите изменения
3. Пересоберите:
```bash
cd core
npm run build
```
4. Обновите зависимости в других модулях

---

## Автоматическая установка (скрипт)

Создайте скрипт для автоматической установки:

```bash
#!/bin/bash
# install-sdelay-starets.sh

set -e

echo "🙏 Установка Сделай, Старец!..."

# Переход в корень проекта
cd "/Users/anton/proj/ai.nativemind.net/Сделай, Старец!"

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install
cd core && npm install && npm run build && cd ..
cd gui && npm install && npm run build && cd ..
cd extensions/vscode && npm install && cd ../..

# Сборка расширения
echo "🔨 Сборка расширения..."
cd extensions/vscode
npm run build

# Упаковка
echo "📦 Упаковка расширения..."
npx @vscode/vsce package --allow-missing-repository

# Установка
echo "🚀 Установка в VS Code..."
VSIX_FILE=$(ls sdelay-starets-*.vsix | head -1)
code --install-extension "$VSIX_FILE"

echo "✅ Готово! Перезапустите VS Code."
echo "🙏 Да пребудет с вами мудрость старца!"
```

Сделайте скрипт исполняемым и запустите:
```bash
chmod +x install-sdelay-starets.sh
./install-sdelay-starets.sh
```

---

## Обновление расширения

Для обновления уже установленного расширения:

1. Внесите изменения в код
2. Увеличьте версию в `extensions/vscode/package.json`
3. Пересоберите и переупакуйте
4. Удалите старую версию:
```bash
code --uninstall-extension sdelay-starets
```
5. Установите новую версию:
```bash
code --install-extension sdelay-starets-1.0.1.vsix
```

---

## Полезные команды

```bash
# Список установленных расширений
code --list-extensions

# Удаление расширения
code --uninstall-extension sdelay-starets

# Открыть VS Code с определённым расширением
code --enable-proposed-api sdelay-starets

# Логи VS Code (для отладки)
# Mac: ~/Library/Application Support/Code/logs
# Linux: ~/.config/Code/logs
# Windows: %APPDATA%\Code\logs
```

---

**Да пребудет с вами мудрость старца! 🙏**

© 2025 NativeMind


