# ByRutGame Checker

A Steam userscript that looks up a game on ByRutGame and shows a compact widget with release details: size, language, update date, versions, regular download, and an online version when available.

[RUS](README.md) | **ENG**

## Features

- Detects the game title on Steam pages.
- Searches for a matching page on `byrutgame.org`.
- Shows whether the game was found and whether an online version exists.
- Adds separate buttons for regular and online versions.
- Shows size, Russian language availability, release date, update date, and versions.
- Caches lookup results in `localStorage`.
- Supports collapsing the widget and manually refreshing the lookup.

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)

2. Open [`userscript/byrut-checker.user.js`](userscript/byrut-checker.user.js).

3. Install the script manually or via a GitHub raw link after publishing this repository.

4. Open a Steam game page, for example:
   `https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/`

## Disclaimer

This project does not store or distribute game files. The userscript only displays links and metadata found on a third-party website.

## License

MIT. See [LICENSE](LICENSE).
