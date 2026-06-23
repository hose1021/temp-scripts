# ByRutGame Checker

Userscript для Steam, который ищет страницу игры на ByRutGame и показывает компактный виджет с информацией о раздаче: размер, язык, дату обновления, версии, обычную и онлайн-версию, если она есть.

**RUS** | [ENG](README.eng.md)

## Возможности

- Автоматически определяет название игры на странице Steam.
- Ищет подходящую страницу на `byrutgame.org`.
- Показывает статус: найдено, без онлайна или не найдено.
- Добавляет отдельные кнопки для обычной и онлайн-версии.
- Показывает размер, русский язык, дату выхода, дату обновления и версии.
- Кэширует результат в `localStorage`, чтобы не делать лишние запросы.
- Позволяет свернуть виджет и вручную обновить результат.

## Установка

1. Установите расширение для userscript'ов:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)

2. Откройте файл [`userscript/byrut-checker.user.js`](userscript/byrut-checker.user.js).

3. Установите скрипт в расширение вручную или через raw-ссылку GitHub после публикации репозитория.

4. Откройте страницу игры в Steam, например:
   `https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/`

## Структура

```text
.
├── userscript/
│   └── byrut-checker.user.js
├── assets/
├── utils/
├── .github/
│   └── ISSUE_TEMPLATE/
├── README.md
├── README.eng.md
└── LICENSE
```

## Примечание

Проект не хранит и не распространяет файлы игр. Скрипт только показывает ссылки и данные, найденные на стороннем сайте.

## Лицензия

MIT. Подробнее в [LICENSE](LICENSE).
