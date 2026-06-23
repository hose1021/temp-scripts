// ==UserScript==
// @name         ByRutGame Checker
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  Показывает наличие игры и онлайн-версии на byrutgame.org для страниц Steam
// @author       you
// @match        https://store.steampowered.com/app/*
// @icon         https://byrutgame.org/favicon.ico
// @grant        GM_xmlhttpRequest
// @connect      byrutgame.org
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const BYRUT_ORIGIN = 'https://byrutgame.org';
  const CACHE_TTL = 4 * 60 * 60 * 1000;
  const EMPTY_INFO = {
    size: null,
    rus: false,
    date: null,
    updated: null,
    network: false,
    isNetworkPage: false,
    networkPageUrl: null,
    networkVersion: null,
    versions: []
  };

  const decoder = document.createElement('textarea');

  function decodeHtml(value) {
    decoder.innerHTML = value || '';
    return decoder.value;
  }

  function textOf(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function attrOf(el, name) {
    return (el?.getAttribute(name) || '').trim();
  }

  function absoluteUrl(href) {
    try {
      return new URL(decodeHtml(href), BYRUT_ORIGIN).href;
    } catch (_) {
      return null;
    }
  }

  function uniq(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function normalizeTitle(value) {
    return decodeHtml(value || '')
      .toLowerCase()
      .replace(/[™®©]/g, '')
      .replace(/[’'`´]/g, '')
      .replace(/[^a-zа-яё0-9]+/giu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slugTitleFromUrl(url) {
    try {
      const slug = new URL(url).pathname.split('/').pop()
        .replace(/\.html$/i, '')
        .replace(/^\d+-/, '')
        .replace(/-po-seti-na-piratke-besplatno$/i, '')
        .replace(/-besplatno$/i, '')
        .replace(/-/g, ' ');
      return slug;
    } catch (_) {
      return '';
    }
  }

  function isOnlineUrl(url) {
    try {
      return /(?:^|-)po-seti(?:-|$)/i.test(new URL(url).pathname);
    } catch (_) {
      return /po-seti/i.test(url || '');
    }
  }

  function isOnlineText(value) {
    return /по\s+сети|игра\s+по\s+сети|online|multiplayer|co[-\s]?op/i.test(value || '');
  }

  function toDoc(html) {
    return new DOMParser().parseFromString(html || '', 'text/html');
  }

  function getGameName() {
    const el = document.querySelector('#appHubAppName');
    if (el?.textContent?.trim()) return el.textContent.trim();

    const titleMatch = document.title.match(/^(.+?)\s+on\s+Steam/i);
    if (titleMatch) return titleMatch[1].trim();

    return null;
  }

  function cleanSize(value) {
    const raw = decodeHtml(value || '').replace(/\s+/g, ' ').trim();
    if (!raw || /размер/i.test(raw)) return null;
    return raw;
  }

  function cleanVersion(value) {
    return decodeHtml(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\[Новая версия\]\s*/i, '')
      .trim();
  }

  function getInfoValue(doc, label) {
    const wanted = normalizeTitle(label);
    const items = [...doc.querySelectorAll('.info-basictor__item')];

    for (const item of items) {
      const itemLabel = normalizeTitle(textOf(item.querySelector('.info-basictor__label')));
      if (itemLabel === wanted) {
        return textOf(item.querySelector('.info-basictor__value, strong'));
      }
    }

    return null;
  }

  function getReleaseDate(doc) {
    const details = [...doc.querySelectorAll('.ul-details li')];
    const dateRow = details.find(li => /дата\s+выхода/i.test(textOf(li)));
    if (dateRow) {
      return textOf(dateRow).replace(/дата\s+выхода\s*:/i, '').trim();
    }

    return null;
  }

  function getUpdatedDate(doc) {
    const updatedText = textOf(doc.querySelector('.tupd-text'));
    const updatedFromBlock = updatedText.match(/Публикация обновлена\s*[-–]\s*(.+)$/i);
    if (updatedFromBlock) return updatedFromBlock[1].trim();

    const text = textOf(doc.body);
    const updated = text.match(/Публикация обновлена\s*[-–]\s*([^|]+?)(?:\s+Информация|\s+Комментарии|$)/i);
    if (updated) return updated[1].trim();

    return null;
  }

  function parsePage(html, pageUrl) {
    const doc = toDoc(html);
    const pageTitle = textOf(doc.querySelector('h1')) ||
      attrOf(doc.querySelector('meta[property="og:title"]'), 'content') ||
      textOf(doc.querySelector('title'));
    const releaseType = getInfoValue(doc, 'Тип релиза') || '';
    const releaseAndTitle = `${pageTitle} ${releaseType}`;

    const networkCard = doc.querySelector('.rel_network');
    const rawNetworkPageUrl = absoluteUrl(attrOf(networkCard?.querySelector('a[href]'), 'href'));
    const hasNetworkCard = Boolean(
      rawNetworkPageUrl &&
      isOnlineUrl(rawNetworkPageUrl) &&
      isOnlineText(textOf(networkCard))
    );
    const networkPageUrl = hasNetworkCard ? rawNetworkPageUrl : null;
    const isNetworkPage = isOnlineUrl(pageUrl) || /игра\s+по\s+сети|по\s+сети\s+на\s+пиратке/i.test(releaseAndTitle);

    const size = cleanSize(
      getInfoValue(doc, 'Размер') ||
      attrOf(doc.querySelector('[data-size]'), 'data-size') ||
      textOf(doc.querySelector('.dist_size'))
    );

    const mainVersion = cleanVersion(
      getInfoValue(doc, 'Версия') ||
      textOf(doc.querySelector('.subhnamever.js-ver')) ||
      textOf(doc.querySelector('.show_ver.js-ver, .show_ver'))
    );
    const extraVersions = [...doc.querySelectorAll('.torrent_list .show_ver, .shortnet-version')]
      .map(el => cleanVersion(textOf(el)));

    const languageText = [
      textOf(doc.querySelector('.subver_info')),
      getInfoValue(doc, 'Интерфейс'),
      getInfoValue(doc, 'Озвучка'),
      textOf(doc.querySelector('.main-release-block'))
    ].join(' ');

    const info = {
      size,
      rus: /русск/i.test(languageText),
      date: getReleaseDate(doc),
      updated: getUpdatedDate(doc),
      network: isNetworkPage || hasNetworkCard,
      isNetworkPage,
      networkPageUrl,
      networkVersion: cleanVersion(textOf(networkCard?.querySelector('.shortnet-version'))),
      versions: uniq([mainVersion, ...extraVersions]).slice(0, 5)
    };

    const torrents = [];
    const seen = new Set();
    const downloadLinks = [...doc.querySelectorAll('a[href*="index.php?do=download"]')];

    for (const link of downloadLinks) {
      const href = absoluteUrl(attrOf(link, 'href'));
      if (!href || seen.has(href)) continue;

      seen.add(href);
      torrents.push({
        href,
        label: isNetworkPage ? 'Скачать сетевую версию' : 'Скачать обычную версию',
        version: mainVersion,
        network: isNetworkPage
      });
    }

    return { info, torrents, pageUrl, title: pageTitle };
  }

  function extractSearchResults(html) {
    const doc = toDoc(html);

    return [...doc.querySelectorAll('a.search_res[href]')].map(card => {
      const href = absoluteUrl(attrOf(card, 'href'));
      const title = textOf(card.querySelector('.search_res_title')) ||
        attrOf(card.querySelector('img[alt]'), 'alt') ||
        textOf(card);
      const text = textOf(card);
      const online = isOnlineUrl(href) || /по\s+сети|игра\s+по\s+сети/i.test(text);

      return { href, title, text, online };
    }).filter(result => result.href && result.title);
  }

  function scoreResult(result, gameName) {
    const target = normalizeTitle(gameName);
    const title = normalizeTitle(result.title);
    const slug = normalizeTitle(slugTitleFromUrl(result.href));
    const words = target.split(' ').filter(word => word.length > 1);

    let score = -1;

    if (title === target) score = 100;
    else if (slug === target) score = 90;
    else if (title.startsWith(`${target} `)) score = 55;
    else if (slug.startsWith(`${target} `)) score = 45;
    else if (words.length >= 2 && words.every(word => title.includes(word))) score = 35;
    else if (words.length >= 2 && words.every(word => slug.includes(word))) score = 30;

    return score;
  }

  function pickBestSearchResult(results, gameName) {
    const scored = results
      .map(result => ({ result, score: scoreResult(result, gameName) }))
      .filter(item => item.score >= 60)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Number(a.result.online) - Number(b.result.online);
      });

    return scored[0]?.result || null;
  }

  function getSearchQueries(name) {
    const withoutMarks = name.replace(/[™®©]/g, '').trim();
    const withoutEdition = withoutMarks
      .replace(/\s+(demo|playtest|beta|open beta|closed beta)$/i, '')
      .trim();
    const beforeColon = withoutEdition.split(':')[0].trim();

    return uniq([name, withoutMarks, withoutEdition, beforeColon]);
  }

  function requestByrut(url, onload, onerror) {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
        'Referer': BYRUT_ORIGIN + '/'
      },
      onload,
      onerror
    });
  }

  function emptyData(pageUrl = null) {
    return {
      info: { ...EMPTY_INFO, versions: [] },
      torrents: [],
      pageUrl,
      title: ''
    };
  }

  function mergeNetworkData(baseData, networkData) {
    const existing = new Set(baseData.torrents.map(torrent => torrent.href));
    const networkTorrents = networkData.torrents
      .filter(torrent => torrent.network && !existing.has(torrent.href))
      .map(torrent => ({
        ...torrent,
        label: 'Скачать онлайн-версию',
        version: torrent.version || networkData.info.versions[0] || baseData.info.networkVersion
      }));

    return {
      ...baseData,
      info: {
        ...baseData.info,
        network: true,
        networkVersion: networkData.info.versions[0] || baseData.info.networkVersion,
        updated: baseData.info.updated || networkData.info.updated,
        versions: uniq([...baseData.info.versions, ...networkData.info.versions])
      },
      torrents: [...baseData.torrents, ...networkTorrents]
    };
  }

  function finishLookup(name, data, onDone) {
    if (onDone) onDone(data);
    else showWidget(name, data);
  }

  function fetchGamePage(url, name, options = {}, onDone = null) {
    requestByrut(url, res => {
      const data = parsePage(res.responseText, url);

      if (!options.skipNetworkFetch && data.info.networkPageUrl && !data.info.isNetworkPage) {
        requestByrut(data.info.networkPageUrl, networkRes => {
          const networkData = parsePage(networkRes.responseText, data.info.networkPageUrl);
          finishLookup(name, mergeNetworkData(data, networkData), onDone);
        }, () => {
          finishLookup(name, data, onDone);
        });
        return;
      }

      finishLookup(name, data, onDone);
    }, () => {
      finishLookup(name, options.fallbackData || emptyData(url), onDone);
    });
  }

  function searchOnByrut(name, queries = getSearchQueries(name), index = 0, onDone = null) {
    const query = queries[index];
    const searchUrl = `${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}&titleonly=3`;

    requestByrut(searchUrl, res => {
      const results = extractSearchResults(res.responseText);
      const bestMatch = pickBestSearchResult(results, name);

      if (bestMatch) {
        fetchGamePage(bestMatch.href, name, {}, onDone);
        return;
      }

      if (index + 1 < queries.length) {
        searchOnByrut(name, queries, index + 1, onDone);
        return;
      }

      finishLookup(name, emptyData(), onDone);
    }, () => {
      if (index + 1 < queries.length) {
        searchOnByrut(name, queries, index + 1, onDone);
        return;
      }

      finishLookup(name, emptyData(), onDone);
    });
  }

  function cacheKey(name) {
    return `byrut-checker:${normalizeTitle(name)}`;
  }

  function getCachedData(name) {
    try {
      const raw = localStorage.getItem(cacheKey(name));
      if (!raw) return null;

      const cached = JSON.parse(raw);
      if (!cached || !cached.time || Date.now() - cached.time > CACHE_TTL) {
        localStorage.removeItem(cacheKey(name));
        return null;
      }

      return cached.data || null;
    } catch (_) {
      return null;
    }
  }

  function setCachedData(name, data) {
    if (data?.loading) return;

    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({
        time: Date.now(),
        data
      }));
    } catch (_) {}
  }

  function clearCachedData(name) {
    try {
      localStorage.removeItem(cacheKey(name));
    } catch (_) {}
  }

  function showLoadingWidget(name) {
    showWidget(name, {
      ...emptyData(),
      loading: true,
      title: name
    }, { cache: false });
  }

  function startLookup(name, options = {}) {
    if (!options.force) {
      const cached = getCachedData(name);
      if (cached) {
        showWidget(name, cached, { fromCache: true });
        return;
      }
    } else {
      clearCachedData(name);
    }

    showLoadingWidget(name);
    searchOnByrut(name, getSearchQueries(name), 0, data => {
      setCachedData(name, data);
      showWidget(name, data);
    });
  }

  function ensureWidgetStyles() {
    if (document.querySelector('#byrut-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'byrut-widget-styles';
    style.textContent = `
      #byrut-widget {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 9999;
        width: min(360px, calc(100vw - 28px));
        max-height: min(560px, calc(100vh - 36px));
        overflow: hidden auto;
        box-sizing: border-box;
        padding: 14px;
        border: 1px solid rgba(102, 192, 244, 0.22);
        border-radius: 8px;
        color: #e8f2fb;
        background:
          linear-gradient(180deg, rgba(29, 47, 65, 0.98), rgba(18, 30, 43, 0.98));
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.46), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        font: 13px/1.45 Arial, Helvetica, sans-serif;
        user-select: none;
      }

      #byrut-widget * {
        box-sizing: border-box;
      }

      #byrut-widget .byrut-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      #byrut-widget .byrut-title {
        min-width: 0;
        cursor: pointer;
      }

      #byrut-widget .byrut-name {
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      #byrut-widget .byrut-source {
        margin-top: 3px;
        color: #8fa9bd;
        font-size: 11px;
      }

      #byrut-widget .byrut-badge {
        flex: 0 0 auto;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      }

      #byrut-widget .byrut-head-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }

      #byrut-widget .byrut-icon-btn {
        width: 24px;
        height: 24px;
        display: inline-grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 6px;
        color: #b9d4e7;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        font: 700 14px/1 Arial, Helvetica, sans-serif;
      }

      #byrut-widget .byrut-icon-btn:hover {
        color: #ffffff;
        background: rgba(102, 192, 244, 0.14);
      }

      #byrut-widget .byrut-badge--ok {
        color: #9effb3;
        background: rgba(42, 181, 92, 0.14);
        border-color: rgba(68, 255, 120, 0.28);
      }

      #byrut-widget .byrut-badge--warn {
        color: #ffd89a;
        background: rgba(255, 159, 28, 0.14);
        border-color: rgba(255, 178, 71, 0.30);
      }

      #byrut-widget .byrut-badge--empty {
        color: #ffe8a6;
        background: rgba(255, 209, 102, 0.12);
        border-color: rgba(255, 209, 102, 0.28);
      }

      #byrut-widget .byrut-meta {
        display: grid;
        gap: 7px;
        margin-bottom: 12px;
        padding: 10px;
        border-radius: 7px;
        background: rgba(6, 12, 20, 0.22);
      }

      #byrut-widget .byrut-row {
        display: grid;
        grid-template-columns: minmax(82px, 0.42fr) minmax(0, 1fr);
        gap: 10px;
        align-items: baseline;
      }

      #byrut-widget .byrut-label {
        color: #8fa9bd;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      #byrut-widget .byrut-value {
        min-width: 0;
        color: #edf7ff;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      #byrut-widget .byrut-actions {
        display: grid;
        gap: 8px;
      }

      #byrut-widget .byrut-button {
        width: 100%;
        min-height: 40px;
        padding: 9px 11px;
        border: 0;
        border-radius: 7px;
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1.25 Arial, Helvetica, sans-serif;
        text-align: left;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08) inset, 0 8px 18px rgba(0, 0, 0, 0.22);
        transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease;
      }

      #byrut-widget .byrut-button:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.10) inset, 0 11px 22px rgba(0, 0, 0, 0.28);
      }

      #byrut-widget .byrut-button:active {
        transform: translateY(0);
      }

      #byrut-widget .byrut-button--offline {
        background: linear-gradient(180deg, #2f8b4b, #1f6f36);
      }

      #byrut-widget .byrut-button--online {
        background: linear-gradient(180deg, #2477b8, #1b5687);
      }

      #byrut-widget .byrut-button-title {
        display: block;
      }

      #byrut-widget .byrut-button-version {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, 0.72);
        font-size: 11px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      #byrut-widget.is-collapsed {
        width: auto;
        min-width: 174px;
        max-width: min(300px, calc(100vw - 28px));
        padding: 10px 11px;
        overflow: visible;
      }

      #byrut-widget.is-collapsed .byrut-head {
        align-items: center;
        margin-bottom: 0;
      }

      #byrut-widget.is-collapsed .byrut-name,
      #byrut-widget.is-collapsed .byrut-source,
      #byrut-widget.is-collapsed .byrut-meta,
      #byrut-widget.is-collapsed .byrut-actions,
      #byrut-widget.is-collapsed .byrut-footer {
        display: none;
      }

      #byrut-widget.is-collapsed .byrut-title::before {
        content: attr(data-collapsed-title);
        display: block;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
      }

      #byrut-widget .byrut-footer {
        display: flex;
        justify-content: center;
        margin-top: 11px;
        padding-top: 9px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      #byrut-widget .byrut-footer a {
        color: #66c0f4;
        font-size: 12px;
        text-decoration: none;
      }

      #byrut-widget .byrut-footer a:hover {
        color: #9bd9ff;
      }
    `;
    document.head.appendChild(style);
  }

  function addLine(parent, label, value) {
    if (!value) return;

    const row = document.createElement('div');
    row.className = 'byrut-row';

    const key = document.createElement('div');
    key.className = 'byrut-label';
    key.textContent = label;

    const val = document.createElement('div');
    val.className = 'byrut-value';
    val.textContent = value;

    row.append(key, val);
    parent.appendChild(row);
  }

  function showWidget(name, data, options = {}) {
    document.querySelector('#byrut-widget')?.remove();
    ensureWidgetStyles();

    const { info, torrents, pageUrl } = data;
    const found = Boolean(pageUrl || torrents.length);
    const loading = Boolean(data.loading);
    const status = loading ? 'Ищу...' : (!found ? 'Не найдено' : (info.network ? 'Игра найдена' : 'Без онлайна'));
    const collapsedTitle = loading ? 'Ищу на ByRut...' : (found ? 'Найдено' : 'Не найдено');
    const badgeClass = loading ? 'byrut-badge--empty' : (!found ? 'byrut-badge--empty' : (info.network ? 'byrut-badge--ok' : 'byrut-badge--warn'));
    const openUrl = pageUrl || `${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(name)}&titleonly=3`;
    const collapsed = localStorage.getItem('byrut-widget-collapsed') === '1';

    const widget = document.createElement('div');
    widget.id = 'byrut-widget';
    if (collapsed) widget.classList.add('is-collapsed');

    const header = document.createElement('div');
    header.className = 'byrut-head';

    const title = document.createElement('div');
    title.className = 'byrut-title';
    title.dataset.collapsedTitle = collapsedTitle;
    title.onclick = () => window.open(openUrl, '_blank');

    const titleName = document.createElement('div');
    titleName.className = 'byrut-name';
    titleName.textContent = loading ? 'Ищу на ByRut...' : (found ? (data.title || name) : name);

    const source = document.createElement('div');
    source.className = 'byrut-source';
    source.textContent = options.fromCache ? 'byrutgame.org · из кэша' : 'byrutgame.org';

    const badge = document.createElement('div');
    badge.className = `byrut-badge ${badgeClass}`;
    badge.textContent = status;

    const refreshButton = document.createElement('button');
    refreshButton.className = 'byrut-icon-btn';
    refreshButton.type = 'button';
    refreshButton.title = 'Обновить';
    refreshButton.textContent = '↻';
    refreshButton.onclick = event => {
      event.stopPropagation();
      startLookup(name, { force: true });
    };

    const collapseButton = document.createElement('button');
    collapseButton.className = 'byrut-icon-btn';
    collapseButton.type = 'button';
    collapseButton.title = collapsed ? 'Развернуть' : 'Свернуть';
    collapseButton.textContent = collapsed ? '+' : '−';
    collapseButton.onclick = event => {
      event.stopPropagation();
      const isCollapsed = widget.classList.toggle('is-collapsed');
      localStorage.setItem('byrut-widget-collapsed', isCollapsed ? '1' : '0');
      collapseButton.textContent = isCollapsed ? '+' : '−';
      collapseButton.title = isCollapsed ? 'Развернуть' : 'Свернуть';
    };

    const right = document.createElement('div');
    right.className = 'byrut-head-right';
    right.append(badge, refreshButton, collapseButton);

    title.append(titleName, source);
    header.append(title, right);
    widget.appendChild(header);

    const body = document.createElement('div');
    body.className = 'byrut-meta';

    if (loading) {
      addLine(body, 'Статус', 'поиск игры на ByRut');
    } else if (found) {
      addLine(body, 'Размер', info.size);
      addLine(body, 'Русский', info.rus ? 'есть' : null);
      addLine(body, 'Дата', info.date);
      addLine(body, 'Обновлено', info.updated);
      addLine(body, 'Версия', info.versions.join(', '));
    } else {
      addLine(body, 'Игра', 'не найдена на ByRut');
    }

    widget.appendChild(body);

    if (torrents.length > 0) {
      const actions = document.createElement('div');
      actions.className = 'byrut-actions';

      torrents.forEach(torrent => {
        const button = document.createElement('button');
        button.className = `byrut-button ${torrent.network ? 'byrut-button--online' : 'byrut-button--offline'}`;

        const buttonTitle = document.createElement('span');
        buttonTitle.className = 'byrut-button-title';
        buttonTitle.textContent = torrent.network ? 'Онлайн-версия' : 'Обычная версия';

        button.appendChild(buttonTitle);

        const details = uniq([torrent.version, info.size]);
        if (details.length > 0) {
          const buttonVersion = document.createElement('span');
          buttonVersion.className = 'byrut-button-version';
          buttonVersion.textContent = details.join(' · ');
          button.appendChild(buttonVersion);
        }

        button.onclick = () => window.open(torrent.href, '_blank');
        actions.appendChild(button);
      });

      widget.appendChild(actions);
    }

    const footer = document.createElement('div');
    footer.className = 'byrut-footer';

    const link = document.createElement('div');
    link.textContent = '© hose1021';
    link.target = '_blank';
    footer.appendChild(link);
    widget.appendChild(footer);

    document.body.appendChild(widget);

    if (options.cache !== false && !loading) {
      setCachedData(name, data);
    }
  }

  const name = getGameName();
  if (name) {
    startLookup(name);
    return;
  }

  const observer = new MutationObserver(() => {
    const delayedName = getGameName();
    if (!delayedName) return;

    startLookup(delayedName);
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 30000);
})();
