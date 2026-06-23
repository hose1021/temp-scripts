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

## Установка 🎓

1. Установите одно из расширений для запуска пользовательских скриптов:

   - [Tampermonkey](https://www.tampermonkey.net/) _(рекомендуемое)_
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)
   - [Userscripts](https://github.com/quoid/userscripts)

2. [Разрешите выполнение userscript'ов и режим разработчика](https://www.tampermonkey.net/faq.php?locale=ru#Q209) в вашем браузере.

3. Установите скрипт, перейдя по [этой ссылке](https://github.com/hose1021/temp-scripts/raw/main/userscript/byrut-checker.user.js). _(либо скачайте `byrut-checker.user.js` из папки `userscript` и установите вручную)_

Готово, теперь откройте страницу игры в Steam _([пример](https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/))_.

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
