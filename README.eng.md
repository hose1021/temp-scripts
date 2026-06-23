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

## Installation 🎓

1. Install one of the extensions for running userscripts:

   - [Tampermonkey](https://www.tampermonkey.net/) _(recommended)_
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)
   - [Userscripts](https://github.com/quoid/userscripts)

2. [Allow userscripts and developer mode](https://www.tampermonkey.net/faq.php?locale=ru#Q209) in your browser.

3. Install the script by opening [this link](https://github.com/hose1021/temp-scripts/raw/main/userscript/byrut-checker.user.js). _(or download `byrut-checker.user.js` from the `userscript` folder and install it manually)_

Done, now open a Steam game page _([example](https://store.steampowered.com/app/1868140/DAVE_THE_DIVER/))_.

## Disclaimer

This project does not store or distribute game files. The userscript only displays links and metadata found on a third-party website.

## License

MIT. See [LICENSE](LICENSE).
