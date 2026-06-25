// ==UserScript==
// @name         ByRutGame Checker
// @namespace    http://tampermonkey.net/
// @version      6.3
// @description  Shows game availability, SteamDB prices & players, ProtonDB
// @author       you
// @match        https://store.steampowered.com/app/*
// @icon         https://byrutgame.org/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @connect      byrutgame.org
// @connect      api.steampowered.com
// @connect      steamcharts.com
// @connect      steamdb.info
// @connect      protondb.com
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const BYRUT_ORIGIN = 'https://byrutgame.org';
  const isLinux = /linux/i.test(navigator.userAgentData?.platform||navigator.platform||'');

  const EMPTY_INFO = {
    size:null,rus:false,date:null,updated:null,
    network:false,isNetworkPage:false,networkPageUrl:null,
    networkVersion:null,versions:[],seeders:null,leechers:null,
    torrentUrl:null,magnetUrl:null,releaseType:null
  };

  // ── CSS ─────────────────────────────

  const STYLES = `
    #byrut-widget{position:fixed;right:18px;bottom:18px;z-index:9999;width:min(380px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 36px));overflow:hidden auto;box-sizing:border-box;padding:14px;border:1px solid rgba(102,192,244,0.22);border-radius:8px;color:#e8f2fb;background:linear-gradient(180deg,rgba(29,47,65,0.98),rgba(18,30,43,0.98));box-shadow:0 18px 42px rgba(0,0,0,0.46),0 0 0 1px rgba(255,255,255,0.04) inset;font:13px/1.45 Arial,Helvetica,sans-serif;user-select:none;transition:opacity 200ms ease}
    #byrut-widget.left{right:auto;left:18px}
    #byrut-widget *{box-sizing:border-box}
    #byrut-widget .byrut-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
    #byrut-widget .byrut-title{min-width:0;cursor:pointer}
    #byrut-widget .byrut-name{color:#fff;font-size:14px;font-weight:700;line-height:1.25;overflow-wrap:anywhere}
    #byrut-widget .byrut-source{margin-top:3px;color:#8fa9bd;font-size:11px}
    #byrut-widget .byrut-badge{flex:0 0 auto;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);font-size:11px;font-weight:700;line-height:1;white-space:nowrap}
    #byrut-widget .byrut-head-right{display:flex;align-items:center;gap:6px;flex:0 0 auto}
    #byrut-widget .byrut-icon-btn{width:24px;height:24px;display:inline-grid;place-items:center;border:1px solid rgba(255,255,255,0.10);border-radius:6px;color:#b9d4e7;background:rgba(255,255,255,0.05);cursor:pointer;font:700 14px/1 Arial,Helvetica,sans-serif}
    #byrut-widget .byrut-icon-btn:hover{color:#fff;background:rgba(102,192,244,0.14)}
    #byrut-widget .byrut-badge--ok{color:#9effb3;background:rgba(42,181,92,0.14);border-color:rgba(68,255,120,0.28)}
    #byrut-widget .byrut-badge--warn{color:#ffd89a;background:rgba(255,159,28,0.14);border-color:rgba(255,178,71,0.30)}
    #byrut-widget .byrut-badge--empty{color:#ffe8a6;background:rgba(255,209,102,0.12);border-color:rgba(255,209,102,0.28)}
    #byrut-widget .byrut-badge--updated{color:#66c0f4;background:rgba(102,192,244,0.18);border-color:rgba(102,192,244,0.35)}
    #byrut-widget .byrut-meta{display:grid;gap:7px;margin-bottom:12px;padding:10px;border-radius:7px;background:rgba(6,12,20,0.22)}
    #byrut-widget .byrut-row{display:grid;grid-template-columns:minmax(90px,0.42fr) minmax(0,1fr);gap:10px;align-items:baseline}
    #byrut-widget .byrut-label{color:#8fa9bd;font-size:11px;text-transform:uppercase}
    #byrut-widget .byrut-value{min-width:0;color:#edf7ff;font-weight:600;overflow-wrap:anywhere}
    #byrut-widget .byrut-seed-leech{display:flex;gap:12px;align-items:center}
    #byrut-widget .byrut-seed{color:#9effb3}
    #byrut-widget .byrut-leech{color:#ff8a8a}
    #byrut-widget .byrut-actions{display:grid;gap:8px}
    #byrut-widget .byrut-actions-row{display:flex;gap:6px}
    #byrut-widget .byrut-button{width:100%;min-height:40px;padding:9px 11px;border:0;border-radius:7px;color:#fff;cursor:pointer;font:700 13px/1.25 Arial,Helvetica,sans-serif;text-align:left;box-shadow:0 1px 0 rgba(255,255,255,0.08) inset,0 8px 18px rgba(0,0,0,0.22);transition:transform 120ms ease,filter 120ms ease,box-shadow 120ms ease}
    #byrut-widget .byrut-button:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,0.10) inset,0 11px 22px rgba(0,0,0,0.28)}
    #byrut-widget .byrut-button:active{transform:translateY(0)}
    #byrut-widget .byrut-button--offline{background:linear-gradient(180deg,#2f8b4b,#1f6f36)}
    #byrut-widget .byrut-button--online{background:linear-gradient(180deg,#2477b8,#1b5687)}
    #byrut-widget .byrut-button--torrent{background:linear-gradient(180deg,#7a5c2e,#5a3f1c)}
    #byrut-widget .byrut-button--repack{background:linear-gradient(180deg,#5a3f7a,#3e2060)}
    #byrut-widget .byrut-button--steamrip{background:linear-gradient(180deg,#1a5c8a,#0f3d60)}
    #byrut-widget .byrut-button-title{display:block}
    #byrut-widget .byrut-button-version{display:block;margin-top:2px;color:rgba(255,255,255,0.72);font-size:11px;font-weight:600;overflow-wrap:anywhere}
    #byrut-widget .byrut-button--small{flex:1;min-height:32px;padding:6px 8px;font-size:11px;text-align:center}
    #byrut-widget.is-collapsed{width:auto;min-width:174px;max-width:min(300px,calc(100vw - 28px));padding:10px 11px;overflow:visible}
    #byrut-widget.is-collapsed .byrut-head{align-items:center;margin-bottom:0}
    #byrut-widget.is-collapsed .byrut-name,#byrut-widget.is-collapsed .byrut-source,#byrut-widget.is-collapsed .byrut-meta,#byrut-widget.is-collapsed .byrut-actions,#byrut-widget.is-collapsed .byrut-footer{display:none}
    #byrut-widget.is-collapsed .byrut-title::before{content:attr(data-collapsed-title);display:block;color:#fff;font-size:13px;font-weight:700}
    #byrut-widget.is-mini{width:24px;min-width:24px;max-width:24px;height:24px;max-height:24px;padding:0;border-radius:50%;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06) inset}
    #byrut-widget.is-mini:not(:hover)>*{display:none!important}
    #byrut-widget.is-mini::after{content:'';display:block;width:100%;height:100%;border-radius:50%}
    #byrut-widget.is-mini.mini--ok::after{background:radial-gradient(circle,rgba(42,181,92,0.9),rgba(22,130,62,0.9));box-shadow:0 0 10px rgba(42,181,92,0.5)}
    #byrut-widget.is-mini.mini--warn::after{background:radial-gradient(circle,rgba(255,159,28,0.85),rgba(200,120,10,0.85));box-shadow:0 0 10px rgba(255,159,28,0.45)}
    #byrut-widget.is-mini.mini--empty::after{background:radial-gradient(circle,rgba(150,160,180,0.7),rgba(100,110,130,0.7));box-shadow:0 0 8px rgba(150,160,180,0.3)}
    #byrut-widget.is-mini:hover{width:min(380px,calc(100vw - 28px));min-width:min(380px,calc(100vw - 28px));max-width:min(380px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 36px));height:auto;border-radius:8px;overflow:hidden auto}
    #byrut-widget.is-mini:hover::after{display:none}
    #byrut-widget .byrut-footer{display:flex;justify-content:center;margin-top:11px;padding-top:9px;border-top:1px solid rgba(255,255,255,0.08)}
    #byrut-widget .byrut-footer span{color:#8fa9bd;font-size:11px}
    #byrut-widget .byrut-release-type{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:6px}
    #byrut-widget .byrut-release--pirate{background:rgba(42,181,92,0.18);color:#9effb3}
    #byrut-widget .byrut-release--repack{background:rgba(138,109,26,0.2);color:#ffd89a}
    #byrut-widget .byrut-release--steamrip{background:rgba(36,119,184,0.2);color:#66c0f4}
    #byrut-widget .byrut-deck-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(102,192,244,0.12);color:#66c0f4}
    #byrut-widget .byrut-online-players{color:#66c0f4;font-weight:700}
    #byrut-widget .byrut-online-players--live{color:#9effb3}
    .byrut-settings-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center}
    .byrut-settings-panel{width:min(400px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:hidden auto;padding:20px;border-radius:10px;background:linear-gradient(180deg,rgba(29,47,65,0.99),rgba(18,30,43,0.99));border:1px solid rgba(102,192,244,0.25);color:#e8f2fb;font:13px/1.45 Arial,Helvetica,sans-serif}
    .byrut-settings-title{font-size:16px;font-weight:700;margin-bottom:16px}
    .byrut-settings-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;gap:12px}
    .byrut-settings-row+.byrut-settings-row{border-top:1px solid rgba(255,255,255,0.06)}
    .byrut-settings-label{color:#b9d4e7}
    .byrut-settings-select{padding:4px 8px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#e8f2fb;font-size:12px}
    .byrut-settings-btn{padding:8px 16px;border-radius:6px;border:0;background:rgba(102,192,244,0.15);color:#e8f2fb;cursor:pointer;font-size:13px;font-weight:600}
    .byrut-settings-btn:hover{background:rgba(102,192,244,0.25)}
    .byrut-settings-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  `;

  // ── L10N ────────────────────────────

  const L10N = {
    ru: {
      searching:'Ищу...',notFound:'Не найдено',found:'Игра найдена',noOnline:'Без онлайна',
      searchOnByrut:'Ищу на ByRut...',foundShort:'Найдено',notFoundShort:'Не найдено',
      byrutgame:'byrutgame.org',
      status:'Статус',searchingStatus:'поиск игры на ByRut',game:'Игра',notFoundOnByrut:'не найдена на ByRut',
      size:'Размер',russian:'Русский',yes:'есть',no:'нет',date:'Дата',updated:'Обновлено',version:'Версия',
      seeders:'Сиды',leechers:'Личи',
      refresh:'Обновить',expand:'Развернуть',collapse:'Свернуть',settings:'Настройки',miniMode:'Мини-режим',
      normalVersion:'Обычная версия',onlineVersion:'Онлайн-версия',
      downloadTorrent:'Скачать .torrent',openPage:'Открыть страницу',copyMagnet:'Копировать magnet',
      updatedBadge:'Обновлено',position:'Позиция виджета',right:'Справа',left:'Слева',
      cacheTtl:'Кэш (часов)',autoCollapse:'Автосворачивание',language:'Язык',
      onlinePlayers:'Онлайн игроков',onlinePeak24h:'Пик за 24ч',onlinePeakAll:'Пик за всё время',
      steamUpdate:'Обновление в Steam',
      protonDB:'ProtonDB',
      steamRating:'Рейтинг',steamDeck:'Steam Deck',steamDate:'Дата в Steam',
      dlc:'DLC',dlcCount:'{} шт.',
      releaseType:'Тип релиза',typePirate:'Пиратка',typeRepack:'Repack',typeSteamRip:'SteamRip',typeOther:'Другое',
      verified:'Проверено',playable:'Играбельно',unsupported:'Не поддерживается',unknown:'Неизвестно',
      steamdbFetch:'Загружать SteamDB',
      cacheAge:'обновлён {} назад',cacheMin:'мин',cacheHour:'ч',cacheDay:'дн'
    },
    en: {
      searching:'Searching...',notFound:'Not found',found:'Found',noOnline:'No online',
      searchOnByrut:'Searching ByRut...',foundShort:'Found',notFoundShort:'Not found',
      byrutgame:'byrutgame.org',
      status:'Status',searchingStatus:'searching on ByRut',game:'Game',notFoundOnByrut:'not found on ByRut',
      size:'Size',russian:'Russian',yes:'yes',no:'no',date:'Date',updated:'Updated',version:'Version',
      seeders:'Seeders',leechers:'Leechers',
      refresh:'Refresh',expand:'Expand',collapse:'Collapse',settings:'Settings',miniMode:'Mini mode',
      normalVersion:'Normal version',onlineVersion:'Online version',
      downloadTorrent:'Download .torrent',openPage:'Open page',copyMagnet:'Copy magnet',
      updatedBadge:'Updated',position:'Widget position',right:'Right',left:'Left',
      cacheTtl:'Cache (hours)',autoCollapse:'Auto collapse',language:'Language',
      onlinePlayers:'Online players',onlinePeak24h:'24h peak',onlinePeakAll:'All-time peak',
      steamUpdate:'Steam update',
      protonDB:'ProtonDB',
      steamRating:'Rating',steamDeck:'Steam Deck',steamDate:'Steam date',
      dlc:'DLC',dlcCount:'{} pcs.',
      releaseType:'Release type',typePirate:'Pirate',typeRepack:'Repack',typeSteamRip:'SteamRip',typeOther:'Other',
      verified:'Verified',playable:'Playable',unsupported:'Unsupported',unknown:'Unknown',
      steamdbFetch:'Fetch SteamDB',
      cacheAge:'updated {} ago',cacheMin:'min',cacheHour:'h',cacheDay:'d'
    }
  };

  function detectLang() {
    const nav = (navigator.language||'en').toLowerCase();
    if (nav.startsWith('ru')) return 'ru';
    const docEl = document.documentElement;
    if (docEl&&(docEl.lang||'').toLowerCase().startsWith('ru')) return 'ru';
    return 'en';
  }

  let lang = detectLang();
  function t(key) { return L10N[lang]?.[key]||L10N.en[key]||key; }

  // ── Settings ────────────────────────

  const SETTINGS_DEFAULTS = { cacheTtlHours:4, position:'right', autoCollapse:false, miniMode:false, lang:'auto', fetchSteamDB:true };

  function gmGet(key, fb) {
    try { if (typeof GM_getValue==='function') { const v=GM_getValue(key); if (v!==undefined&&v!==null) return v; } } catch(_) {}
    try { const r=localStorage.getItem(`byrut-cfg:${key}`); if (r!==null) return JSON.parse(r); } catch(_) {}
    return fb;
  }

  function gmSet(key, val) {
    try { if (typeof GM_setValue==='function') { GM_setValue(key,val); return; } } catch(_) {}
    try { localStorage.setItem(`byrut-cfg:${key}`,JSON.stringify(val)); } catch(_) {}
  }

  function loadSettings() {
    const cfg = {};
    for (const[k,v] of Object.entries(SETTINGS_DEFAULTS)) cfg[k]=gmGet(k,v);
    cfg._lang = cfg.lang==='auto'?detectLang():cfg.lang;
    return cfg;
  }

  let settings = loadSettings();
  function applySettings() { if (settings._lang!==lang) lang=settings._lang; }

  try {
    if (typeof GM_registerMenuCommand==='function') {
      GM_registerMenuCommand('ByRut Checker: Settings', () => showSettingsPanel());
      GM_registerMenuCommand('ByRut Checker: Clear cache', () => {
        for (let i=localStorage.length-1;i>=0;i--) { const k=localStorage.key(i);         if (k&&(k.startsWith('byrut-checker:')||k.startsWith('byrut-steamcharts:')||k.startsWith('byrut-steamplayers:')||k.startsWith('byrut-steamupdate:'))) localStorage.removeItem(k); }
      });
    }
  } catch(_) {}

  // ── Utilities ───────────────────────

  function decodeHtml(v) { const el=document.createElement('span'); el.innerHTML=v||''; return el.textContent||''; }
  function textOf(el) { return (el?.textContent||'').replace(/\s+/g,' ').trim(); }
  function attrOf(el,n) { return (el?.getAttribute(n)||'').trim(); }
  function absoluteUrl(h) { try { return new URL(decodeHtml(h),BYRUT_ORIGIN).href; } catch(_) { return null; } }
  function uniq(a) { return [...new Set(a.filter(Boolean))]; }
  function normalizeTitle(v) { return decodeHtml(v||'').toLowerCase().replace(/[™®©]/g,'').replace(/[’'`´]/g,'').replace(/[^a-zа-яё0-9]+/giu,' ').replace(/\s+/g,' ').trim(); }
  function slugTitleFromUrl(u) { try { return new URL(u).pathname.split('/').pop().replace(/\.html$/i,'').replace(/^\d+-/,'').replace(/-po-seti-na-piratke-besplatno$/i,'').replace(/-besplatno$/i,'').replace(/-/g,' '); } catch(_) { return ''; } }
  function isOnlineUrl(u) { try { return /(?:^|-)po-seti(?:-|$)/i.test(new URL(u).pathname); } catch(_) { return /po-seti/i.test(u||''); } }
  function isOnlineText(v) { return /по\s+сети|игра\s+по\s+сети|online|multiplayer|co[-\s]?op/i.test(v||''); }
  function toDoc(h) { return new DOMParser().parseFromString(h||'','text/html'); }
  function getGameName() { const el=document.querySelector('#appHubAppName'); if (el?.textContent?.trim()) return el.textContent.trim(); const m=document.title.match(/^(.+?)\s+on\s+Steam/i); return m?m[1].trim():null; }
  function getSteamAppId() { const m=location.pathname.match(/\/app\/(\d+)/); return m?m[1]:null; }
  function cleanSize(v) { const r=decodeHtml(v||'').replace(/\s+/g,' ').trim(); return (!r||/размер/i.test(r))?null:r; }
  function cleanVersion(v) { return decodeHtml(v||'').replace(/\s+/g,' ').replace(/\s*\[Новая версия\]\s*/i,'').trim(); }
  function fmtNum(n) { if (!n) return n; const v = typeof n === 'string' ? n.replace(/[,\s]/g,'') : n; return Number(v).toLocaleString('en-US'); }

  // ── Steam Store ─────────────────────

  function getSteamStoreInfo() {
    const info = { steamDate:null, steamRating:null, steamDeck:null, dlcCount:0 };
    const de = document.querySelector('.date,.release_date .date'); if (de) info.steamDate=textOf(de);
    const re = document.querySelector('.user_reviews_summary_row'); if (re) { const rt=textOf(re); const p=rt.match(/(\d+)%/); const d=rt.match(/(\w[\w\s]+?)\s*[-–]/); info.steamRating=p?p[1]+'%':(d?d[1]:rt.slice(0,40)); }
    const dk = document.querySelector('.game_area_details_specs .deck-verified,.deck-verified'); const dt=textOf(dk); if (/verified/i.test(dt)) info.steamDeck='verified'; else if (/playable/i.test(dt)) info.steamDeck='playable'; else if (/unsupported/i.test(dt)) info.steamDeck='unsupported';
    const dl = document.querySelectorAll('.game_area_dlc_list a.game_area_dlc_row'); if (dl.length>0) info.dlcCount=dl.length;
    return info;
  }

  // ── Network ─────────────────────────

  function xhrGet(url, headers, opts) {
    return new Promise((resolve, reject) => {
      const timeout = (opts&&opts.timeout)||15000;
      let done=false;
      function settle(fn) { if (done) return; done=true; fn(); }
      function attempt(retries, delay) {
        const d = { method:'GET', url, headers:{...headers}, timeout,
          onload: r => settle(()=>resolve(r)),
          onerror: () => { if (retries>0) setTimeout(()=>attempt(retries-1,delay*2),delay); else settle(reject); },
          ontimeout: () => { if (retries>0) setTimeout(()=>attempt(retries-1,delay*2),delay); else settle(reject); }
        };
        if (typeof GM_xmlhttpRequest==='function') GM_xmlhttpRequest(d);
        else if (typeof GM!=='undefined'&&typeof GM.xmlHttpRequest==='function') GM.xmlHttpRequest(d);
        else settle(reject);
      }
      attempt((opts&&opts.retries)??2, (opts&&opts.retryDelay)??1000);
    });
  }

  function requestByrut(url, onload, onerror, opts) {
    const h = {'Accept':'text/html,application/xhtml+xml,*/*','Accept-Language':'ru,en;q=0.9','Referer':BYRUT_ORIGIN+'/'};
    xhrGet(url, h, opts).then(onload, onerror);
  }

  // ── Steam API ───────────────────────

  function fetchSteamPlayers(appid, onDone) {
    const ck = `byrut-steamplayers:${appid}`;
    try { const r=localStorage.getItem(ck); if (r) { const c=JSON.parse(r); if (c&&c.data&&c.time&&Date.now()-c.time<300000) { onDone(c.data); return; } } } catch(_) {}
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`;
    const h = {'Accept':'application/json'};
    xhrGet(url, h, {timeout:8000}).then(res => {
      try { const j=JSON.parse(res.responseText); const cnt=j?.response?.player_count; const d={onlinePlayers:cnt!=null?String(cnt):null}; if (d.onlinePlayers) try { localStorage.setItem(ck, JSON.stringify({time:Date.now(),data:d})); } catch(_) {} onDone(d); }
      catch(_) { onDone({onlinePlayers:null}); }
    }, () => onDone({onlinePlayers:null}));
  }

  // ── SteamCharts ─────────────────────

  function fetchSteamCharts(appid, onDone) {
    const ck = `byrut-steamcharts:${appid}`;
    try { const r=localStorage.getItem(ck); if (r) { const c=JSON.parse(r); if (c&&c.data&&c.time&&Date.now()-c.time<3600000) { onDone(c.data); return; } } } catch(_) {}
    const url = `https://steamcharts.com/app/${appid}`;
    const h = {'Accept':'text/html,*/*'};
    xhrGet(url, h, {timeout:12000}).then(res => {
      const d = parseSteamCharts(res.responseText);
      if (d.onlinePlayers||d.onlinePeak24h||d.onlinePeakAll) try { localStorage.setItem(ck, JSON.stringify({time:Date.now(),data:d})); } catch(_) {}
      onDone(d);
    }, () => onDone(null));
  }

  function parseSteamCharts(html) {
    const data = { onlinePlayers: null, onlinePeak24h: null, onlinePeakAll: null };
    const doc = toDoc(html);
    const stats = doc.querySelectorAll('.app-stat');
    for (const stat of stats) {
      const num = stat.querySelector('.num');
      const val = num ? textOf(num).replace(/[,\s]/g,'') : null;
      const label = textOf(stat).toLowerCase();
      if (!val) continue;
      if (label.includes('playing')) data.onlinePlayers = val;
      else if (label.includes('24-hour')) data.onlinePeak24h = val;
      else if (label.includes('all-time')) data.onlinePeakAll = val;
    }
    return data;
  }

  // ── SteamDB App Info ────────────────

  function fetchSteamUpdate(appid, onDone) {
    console.log('ByRut: fetchSteamUpdate called, appid=', appid);
    const ck = `byrut-steamupdate:${appid}`;
    try {
      const r = localStorage.getItem(ck);
      if (r) {
        const c = JSON.parse(r);
        console.log('ByRut: steamupdate cache found, age=', Date.now()-c.time, 'data=', c.data);
        if (c&&c.data&&c.time&&Date.now()-c.time<3600000) {
          console.log('ByRut: steamupdate using cache');
          onDone(c.data);
          return;
        }
        console.log('ByRut: steamupdate cache expired or null, removing');
        localStorage.removeItem(ck);
      }
    } catch(_) {}
    const url = `https://steamdb.info/app/${appid}/patchnotes/`;
    console.log('ByRut: steamupdate fetching', url);
    const h = {'Accept':'text/html,*/*'};
    xhrGet(url, h, {timeout:12000}).then(res => {
      console.log('ByRut: steamupdate response received, length=', res.responseText.length);
      const d = parseSteamAppInfo(res.responseText);
      console.log('ByRut: steamupdate parsed=', d);
      if (d) try { localStorage.setItem(ck, JSON.stringify({time:Date.now(),data:d})); } catch(_) {}
      onDone(d);
    }, err => {
      console.warn('ByRut: SteamDB app info fetch FAILED', err);
      onDone(null);
    });
  }

  function parseSteamAppInfo(html) {
    const result = {};
    const doc = toDoc(html);
    const rows = doc.querySelectorAll('tr');
    const found = [];
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) continue;
      const label = textOf(cells[0]).toLowerCase();
      const value = textOf(cells[1]).replace(/UTC.*/i,'').trim();
      if (label.includes('record')||label.includes('release')||label.includes('date')||label.includes('update')) {
        found.push({label, value});
      }
      if (!value) continue;
      if (label.includes('release date')) result.steamDate = value;
      else if (label.includes('last record update')) result.steamUpdate = value;
    }
    console.debug('ByRut: parseSteamAppInfo found rows:', found);
    console.debug('ByRut: parseSteamAppInfo result:', result);
    return Object.keys(result).length ? result : null;
  }

  // ── ProtonDB ────────────────────────

  function fetchProtonDB(appid, onDone) {
    const ck = `byrut-protondb:${appid}`;
    try { const r=localStorage.getItem(ck); if (r) { const c=JSON.parse(r); if (c&&c.data&&c.time&&Date.now()-c.time<86400000) { onDone(c.data); return; } } } catch(_) {}
    const url = `https://www.protondb.com/app/${appid}`;
    const h = {'Accept':'text/html,*/*'};
    xhrGet(url, h, {timeout:10000}).then(res => {
      const tier = parseProtonDB(res.responseText);
      try { localStorage.setItem(ck, JSON.stringify({time:Date.now(),data:tier})); } catch(_) {}
      onDone(tier);
    }, () => onDone(null));
  }

  function parseProtonDB(html) {
    const doc = toDoc(html);
    const badge = doc.querySelector('.tier-badge,.rating-badge,[class*="tier"]');
    if (badge) { const t=textOf(badge).toLowerCase(); if (t.includes('platinum')||t.includes('native')) return 'platinum'; if (t.includes('gold')) return 'gold'; if (t.includes('silver')) return 'silver'; if (t.includes('bronze')) return 'bronze'; if (t.includes('borked')) return 'borked'; }
    const meta = doc.querySelector('meta[property="og:description"]');
    if (meta) { const d=(attrOf(meta,'content')||'').toLowerCase(); if (d.includes('platinum')||d.includes('native')) return 'platinum'; if (d.includes('gold')) return 'gold'; if (d.includes('silver')) return 'silver'; if (d.includes('bronze')) return 'bronze'; }
    return null;
  }

  // ── ByRut Parsing ──────────────────

  function getInfoValue(doc, label) { const w=normalizeTitle(label); for (const it of doc.querySelectorAll('.info-basictor__item')) { if (normalizeTitle(textOf(it.querySelector('.info-basictor__label')))===w) return textOf(it.querySelector('.info-basictor__value, strong')); } return null; }
  function getReleaseDate(doc) { const r=[...doc.querySelectorAll('.ul-details li')].find(li=>/дата\s+выхода/i.test(textOf(li))); return r?textOf(r).replace(/дата\s+выхода\s*:/i,'').trim():null; }
  function getUpdatedDate(doc) { const m1=textOf(doc.querySelector('.tupd-text')).match(/Публикация обновлена\s*[-–]\s*(.+)$/i); if (m1) return m1[1].trim(); const m2=textOf(doc.body).match(/Публикация обновлена\s*[-–]\s*([^|]+?)(?:\s+Информация|\s+Комментарии|$)/i); return m2?m2[1].trim():null; }
  function getSeedLeech(doc) { let s=null,l=null; const se=doc.querySelector('.seed_leech .seed,.torrent_stats .seed,[class*="seed"]'); const le=doc.querySelector('.seed_leech .leech,.torrent_stats .leech,[class*="leech"]'); if (se) { const m=textOf(se).match(/(\d[\d\s]*)/); if (m) s=m[1].replace(/\s+/g,''); } if (le) { const m=textOf(le).match(/(\d[\d\s]*)/); if (m) l=m[1].replace(/\s+/g,''); } return {seeders:s,leechers:l}; }
  function getTorrentUrl(doc) { const lk=doc.querySelector('a[href$=".torrent"]'); if (lk) return absoluteUrl(attrOf(lk,'href')); const dl=doc.querySelector('a[href*="index.php?do=download"]'); if (dl) { const h=attrOf(dl,'href'); if (/\btorrent\b/i.test(h)||/\.torrent$/i.test(h)) return absoluteUrl(h); } return null; }
  function getMagnetUrl(doc) { const lk=doc.querySelector('a[href^="magnet:"]'); return lk?attrOf(lk,'href'):null; }
  function classifyReleaseType(rt) { const t=(rt||'').toLowerCase(); if (/repack/i.test(t)) return 'repack'; if (/steam\s*rip|steamrip/i.test(t)) return 'steamrip'; if (/пиратка|pirate|лицензия|license/i.test(t)) return 'pirate'; return 'other'; }

  function parsePage(html, pageUrl) {
    const doc = toDoc(html);
    const pageTitle = textOf(doc.querySelector('h1'))||attrOf(doc.querySelector('meta[property="og:title"]'),'content')||textOf(doc.querySelector('title'));
    const releaseType = getInfoValue(doc,'Тип релиза')||'';
    const releaseAndTitle = `${pageTitle} ${releaseType}`;
    const networkCard = doc.querySelector('.rel_network');
    const rawNetUrl = absoluteUrl(attrOf(networkCard?.querySelector('a[href]'),'href'));
    const hasNetworkCard = Boolean(rawNetUrl&&isOnlineUrl(rawNetUrl)&&isOnlineText(textOf(networkCard)));
    const networkPageUrl = hasNetworkCard?rawNetUrl:null;
    const isNetworkPage = isOnlineUrl(pageUrl)||/игра\s+по\s+сети|по\s+сети\s+на\s+пиратке/i.test(releaseAndTitle);
    const size = cleanSize(getInfoValue(doc,'Размер')||attrOf(doc.querySelector('[data-size]'),'data-size')||textOf(doc.querySelector('.dist_size')));
    const mainVersion = cleanVersion(getInfoValue(doc,'Версия')||textOf(doc.querySelector('.subhnamever.js-ver'))||textOf(doc.querySelector('.show_ver.js-ver,.show_ver')));
    const extraVersions = [...doc.querySelectorAll('.torrent_list .show_ver,.shortnet-version')].map(el=>cleanVersion(textOf(el)));
    const languageText = [textOf(doc.querySelector('.subver_info')),getInfoValue(doc,'Интерфейс'),getInfoValue(doc,'Озвучка'),textOf(doc.querySelector('.main-release-block'))].join(' ');
    const {seeders,leechers} = getSeedLeech(doc);
    const info = {
      size,rus:/русск/i.test(languageText),date:getReleaseDate(doc),updated:getUpdatedDate(doc),
      network:isNetworkPage||hasNetworkCard,isNetworkPage,networkPageUrl,
      networkVersion:cleanVersion(textOf(networkCard?.querySelector('.shortnet-version'))),
      versions:uniq([mainVersion,...extraVersions].filter(Boolean)).slice(0,5),
      seeders,leechers,torrentUrl:getTorrentUrl(doc),magnetUrl:getMagnetUrl(doc),
      releaseType:classifyReleaseType(releaseType)
    };
    const torrents=[]; const seen=new Set();
    for (const link of doc.querySelectorAll('a[href*="index.php?do=download"]')) { const href=absoluteUrl(attrOf(link,'href')); if (!href||seen.has(href)) continue; seen.add(href); torrents.push({href,label:isNetworkPage?'Скачать сетевую версию':'Скачать обычную версию',version:mainVersion,network:isNetworkPage}); }
    return {info,torrents,pageUrl,title:pageTitle};
  }

  function extractSearchResults(html) { return [...toDoc(html).querySelectorAll('a.search_res[href]')].map(card=>{ const href=absoluteUrl(attrOf(card,'href')); const ttl=textOf(card.querySelector('.search_res_title'))||attrOf(card.querySelector('img[alt]'),'alt')||textOf(card); return {href,title:ttl,text:textOf(card),online:isOnlineUrl(href)||/по\s+сети|игра\s+по\s+сети/i.test(textOf(card))}; }).filter(r=>r.href&&r.title); }

  function scoreResult(result, gameName) { const target=normalizeTitle(gameName),title=normalizeTitle(result.title),slug=normalizeTitle(slugTitleFromUrl(result.href)); const words=target.split(' ').filter(w=>w.length>1); if (title===target) return 100; if (slug===target) return 90; if (title.startsWith(`${target} `)) return 55; if (slug.startsWith(`${target} `)) return 45; if (words.length>=2&&words.every(w=>title.includes(w))) return 35; if (words.length>=2&&words.every(w=>slug.includes(w))) return 30; return -1; }
  function pickBestSearchResult(results, gameName) { const scored=results.map(r=>({result:r,score:scoreResult(r,gameName)})).filter(i=>i.score>=60).sort((a,b)=>b.score!==a.score?b.score-a.score:Number(a.result.online)-Number(b.result.online)); return scored[0]?.result||null; }
  function getSearchQueries(name) { const wm=name.replace(/[™®©]/g,'').trim(); const we=wm.replace(/\s+(demo|playtest|beta|open beta|closed beta)$/i,'').trim(); return uniq([name,wm,we,we.split(':')[0].trim()]); }

  // ── Search ──────────────────────────

  function emptyData(pageUrl=null) { return {info:{...EMPTY_INFO,versions:[]},torrents:[],pageUrl,title:''}; }
  function mergeNetworkData(base, net) { const ex=new Set(base.torrents.map(t=>t.href)); const nt=net.torrents.filter(t=>t.network&&!ex.has(t.href)).map(t=>({...t,label:'Скачать онлайн-версию',version:t.version||net.info.versions[0]||base.info.networkVersion})); return {...base,info:{...base.info,network:true,networkVersion:net.info.versions[0]||base.info.networkVersion,updated:base.info.updated||net.info.updated,versions:uniq([...base.info.versions,...net.info.versions]),torrentUrl:base.info.torrentUrl||net.info.torrentUrl},torrents:[...base.torrents,...nt]}; }
  function finishLookup(name, data, onDone) { if (onDone) onDone(data); else showWidget(name,data); }

  function fetchGamePage(url, name, options={}, onDone=null) {
    requestByrut(url, res => {
      const data = parsePage(res.responseText, url);
      if (!options.skipNetworkFetch&&data.info.networkPageUrl&&!data.info.isNetworkPage) {
        requestByrut(data.info.networkPageUrl, nr => finishLookup(name, mergeNetworkData(data, parsePage(nr.responseText, data.info.networkPageUrl)), onDone), () => finishLookup(name, data, onDone));
        return;
      }
      finishLookup(name, data, onDone);
    }, () => finishLookup(name, options.fallbackData||emptyData(url), onDone));
  }

  function searchOnByrut(name, queries=getSearchQueries(name), index=0, onDone=null) {
    if (!queries.length||index>=queries.length) { finishLookup(name, emptyData(), onDone); return; }
    const batchSize = Math.min(3, queries.length-index);
    const batch = queries.slice(index, index+batchSize);
    let settled=0, found=false;
    function tryFallback() { if (found) return; const ni=index+batchSize; if (ni<queries.length) sequentialSearch(name,queries,ni,onDone); else finishLookup(name, emptyData(), onDone); }
    for (const q of batch) {
      const url = `${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(q)}&titleonly=3`;
      requestByrut(url, res => { if (found) return; const best=pickBestSearchResult(extractSearchResults(res.responseText),name); if (best) { found=true; fetchGamePage(best.href,name,{},onDone); return; } settled++; if (settled===batch.length) tryFallback(); }, () => { if (found) return; settled++; if (settled===batch.length) tryFallback(); }, {retries:1});
    }
  }

  function sequentialSearch(name, queries, index, onDone) {
    if (index>=queries.length) { finishLookup(name, emptyData(), onDone); return; }
    const url = `${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(queries[index])}&titleonly=3`;
    requestByrut(url, res => { const best=pickBestSearchResult(extractSearchResults(res.responseText),name); if (best) { fetchGamePage(best.href,name,{},onDone); return; } sequentialSearch(name,queries,index+1,onDone); }, () => sequentialSearch(name,queries,index+1,onDone));
  }

  // ── Cache ───────────────────────────

  function cacheKey(name) { return `byrut-checker:${normalizeTitle(name)}`; }
  function getCacheTtl() { return (settings.cacheTtlHours||4)*3600000; }
  function getCachedData(name) { try { const r=localStorage.getItem(cacheKey(name)); if (!r) return null; const c=JSON.parse(r); if (!c||!c.data||!c.time||Date.now()-c.time>getCacheTtl()) { localStorage.removeItem(cacheKey(name)); return null; } return {data:c.data,time:c.time}; } catch(_) { return null; } }
  function setCachedData(name, data) { if (data?.loading) return; try { localStorage.setItem(cacheKey(name), JSON.stringify({time:Date.now(),data})); } catch(_) {} }
  function clearCachedData(name) { try { localStorage.removeItem(cacheKey(name)); } catch(_) {} }
  function formatCacheAge(ts) { if (!ts) return ''; const diff=Math.floor((Date.now()-ts)/60000); if (diff<1) return '<1'+t('cacheMin'); if (diff<60) return diff+t('cacheMin'); const h=Math.floor(diff/60); if (h<24) return h+t('cacheHour'); return Math.floor(h/24)+t('cacheDay'); }

  // ── Clipboard ───────────────────────

  function copyToClipboard(text) {
    try { if (typeof GM_setClipboard==='function') { GM_setClipboard(text); return; } } catch(_) {}
    try { navigator.clipboard.writeText(text); } catch(_) { const ta=document.createElement('textarea'); ta.value=text; ta.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
  }

  // ── Widget Builders ─────────────────

  function ensureWidgetStyles() { if (document.querySelector('#byrut-widget-styles')) return; const s=document.createElement('style'); s.id='byrut-widget-styles'; s.textContent=STYLES; document.head.appendChild(s); }

  function addLine(parent, label, value, extraClass) {
    if (!value) return;
    const row = document.createElement('div'); row.className = 'byrut-row';
    const k = document.createElement('div'); k.className = 'byrut-label'; k.textContent = label;
    const v = document.createElement('div'); v.className = 'byrut-value' + (extraClass?' '+extraClass:''); v.textContent = value;
    row.append(k, v); parent.appendChild(row);
  }

  function buildHeader(data, options, name, collapsed) {
    const { info, torrents, pageUrl } = data;
    const found = Boolean(pageUrl||torrents.length);
    const loading = Boolean(data.loading);
    const status = loading?t('searching'):(!found?t('notFound'):(info.network?t('found'):t('noOnline')));
    const ct = loading?t('searchOnByrut'):(found?t('foundShort'):t('notFoundShort'));
    const bc = loading?'byrut-badge--empty':(!found?'byrut-badge--empty':(info.network?'byrut-badge--ok':'byrut-badge--warn'));
    const openUrl = pageUrl||`${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(name)}&titleonly=3`;
    const header = document.createElement('div'); header.className='byrut-head';
    const title = document.createElement('div'); title.className='byrut-title'; title.dataset.collapsedTitle=ct;
    const titleName = document.createElement('div'); titleName.className='byrut-name'; titleName.textContent=loading?t('searchOnByrut'):(found?(data.title||name):name);
    const source = document.createElement('div'); source.className='byrut-source';
    source.textContent = options.fromCache ? (t('byrutgame')+' · '+t('cacheAge').replace('{}',formatCacheAge(options.cacheTime))) : t('byrutgame');
    const badge = document.createElement('div'); badge.className=`byrut-badge ${bc}`; badge.textContent=status;
    const sBtn = document.createElement('button'); sBtn.className='byrut-icon-btn'; sBtn.type='button'; sBtn.title=t('settings'); sBtn.textContent='⚙'; sBtn.onclick=e=>{e.stopPropagation();showSettingsPanel();};
    const rBtn = document.createElement('button'); rBtn.className='byrut-icon-btn'; rBtn.type='button'; rBtn.title=t('refresh'); rBtn.textContent='↻'; rBtn.onclick=e=>{e.stopPropagation();startLookup(name,{force:true});};
    const cBtn = document.createElement('button'); cBtn.className='byrut-icon-btn'; cBtn.type='button'; cBtn.title=collapsed?t('expand'):t('collapse'); cBtn.textContent=collapsed?'+':'−'; cBtn.dataset.collapsed=collapsed?'1':'0';
    const right = document.createElement('div'); right.className='byrut-head-right'; right.append(badge,rBtn,sBtn,cBtn);
    title.append(titleName,source); header.append(title,right);
    return {header,title,collapseButton:cBtn,openUrl};
  }

  function buildMeta(info, loading, found, steamStore, steamData) {
    const body = document.createElement('div'); body.className='byrut-meta';
    if (loading) { addLine(body, t('status'), t('searchingStatus')); return body; }
    if (!found) { addLine(body, t('game'), t('notFoundOnByrut')); return body; }

    // ByRut data
    if (info.releaseType&&info.releaseType!=='other') {
      const r = document.createElement('div'); r.className='byrut-row';
      const l = document.createElement('div'); l.className='byrut-label'; l.textContent=t('releaseType');
      const v = document.createElement('div'); v.className='byrut-value';
      const b = document.createElement('span'); b.className=`byrut-release-type byrut-release--${info.releaseType}`;
      b.textContent=t('type'+info.releaseType.charAt(0).toUpperCase()+info.releaseType.slice(1));
      v.appendChild(b); r.append(l,v); body.appendChild(r);
    }
    addLine(body, t('size'), info.size);
    addLine(body, t('russian'), info.rus?t('yes'):null);
    addLine(body, t('date'), info.date);
    addLine(body, t('updated'), info.updated);
    addLine(body, t('version'), info.versions.join(', '));

    // Steam date — from SteamDB if available, otherwise from DOM
    if (steamData?.steamDate) addLine(body, t('steamDate'), steamData.steamDate);
    else if (steamStore?.steamDate) addLine(body, t('steamDate'), steamStore.steamDate);

    // Steam data (online, peaks, update)
    if (steamData) {
      if (steamData.onlinePlayers) addLine(body, t('onlinePlayers'), fmtNum(steamData.onlinePlayers), 'byrut-online-players byrut-online-players--live');
      if (steamData.onlinePeak24h) addLine(body, t('onlinePeak24h'), fmtNum(steamData.onlinePeak24h));
      if (steamData.onlinePeakAll) addLine(body, t('onlinePeakAll'), fmtNum(steamData.onlinePeakAll));
      if (steamData.steamUpdate) addLine(body, t('steamUpdate'), steamData.steamUpdate);
    }

    if (info.seeders||info.leechers) {
      const r = document.createElement('div'); r.className='byrut-row';
      const l = document.createElement('div'); l.className='byrut-label'; l.textContent='';
      const v = document.createElement('div'); v.className='byrut-value byrut-seed-leech';
      if (info.seeders) { const s=document.createElement('span'); s.className='byrut-seed'; s.textContent='▲ '+fmtNum(info.seeders); v.appendChild(s); }
      if (info.leechers) { const le=document.createElement('span'); le.className='byrut-leech'; le.textContent='▼ '+fmtNum(info.leechers); v.appendChild(le); }
      r.append(l,v); body.appendChild(r);
    }

    if (steamStore) {
      if (steamStore.steamRating) addLine(body, t('steamRating'), steamStore.steamRating);
      if (steamStore.steamDeck) {
        const dl={verified:t('verified'),playable:t('playable'),unsupported:t('unsupported')};
        const dv=document.createElement('div'); dv.className='byrut-value';
        const db=document.createElement('span'); db.className='byrut-deck-badge'; db.textContent='Deck: '+(dl[steamStore.steamDeck]||t('unknown'));
        dv.appendChild(db);
        const r=document.createElement('div'); r.className='byrut-row';
        const l=document.createElement('div'); l.className='byrut-label'; l.textContent=t('steamDeck'); r.append(l,dv); body.appendChild(r);
      }
      if (steamStore.dlcCount>0) addLine(body, t('dlc'), t('dlcCount').replace('{}',steamStore.dlcCount));
    }
    return body;
  }

  function buildProtonDBRow(protonTier) {
    if (!protonTier) return null;
    const tc={platinum:'#b4c7dc',gold:'#cfb53b',silver:'#a8a8a8',bronze:'#cd7f32',borked:'#ff4444'};
    const color=tc[protonTier]||'#8fa9bd';
    const isGood=protonTier==='platinum'||protonTier==='gold';
    const prefix=isLinux?'🐧 ':'';
    const el=document.createElement('div'); el.className='byrut-value';
    el.innerHTML=`${prefix}<a href="https://www.protondb.com/app/${getSteamAppId()}/" target="_blank" style="color:${color};text-decoration:none;font-weight:${isLinux&&isGood?'900':'700'};text-transform:capitalize;${isLinux?'background:rgba(102,192,244,0.10);padding:2px 8px;border-radius:4px;':''}">${protonTier}</a>`;
    const row=document.createElement('div'); row.className='byrut-row';
    const lbl=document.createElement('div'); lbl.className='byrut-label'; lbl.innerHTML=(isLinux?'🐧 ':'')+t('protonDB');
    row.append(lbl,el); return row;
  }

  function buildActions(torrents, info, name) {
    if (!torrents.length) return null;
    const actions = document.createElement('div'); actions.className='byrut-actions';
    torrents.forEach(torrent => {
      const relClass = info.releaseType==='repack'?'byrut-button--repack':(info.releaseType==='steamrip'?'byrut-button--steamrip':(torrent.network?'byrut-button--online':'byrut-button--offline'));
      const btn = document.createElement('button'); btn.className=`byrut-button ${relClass}`;
      const bt = document.createElement('span'); bt.className='byrut-button-title'; bt.textContent=torrent.network?t('onlineVersion'):t('normalVersion'); btn.appendChild(bt);
      const dets = uniq([torrent.version,info.size].filter(Boolean));
      if (dets.length) { const bv=document.createElement('span'); bv.className='byrut-button-version'; bv.textContent=dets.join(' · '); btn.appendChild(bv); }
      btn.onclick=()=>window.open(torrent.href,'_blank'); actions.appendChild(btn);
    });
    if (info.torrentUrl||info.magnetUrl) {
      const row = document.createElement('div'); row.className='byrut-actions-row';
      if (info.torrentUrl) { const tb=document.createElement('button'); tb.className='byrut-button byrut-button--torrent byrut-button--small'; tb.textContent=t('downloadTorrent'); tb.onclick=()=>window.open(info.torrentUrl,'_blank'); row.appendChild(tb); }
      if (info.magnetUrl) { const mb=document.createElement('button'); mb.className='byrut-button byrut-button--torrent byrut-button--small'; mb.textContent=t('copyMagnet'); mb.onclick=()=>{copyToClipboard(info.magnetUrl);mb.style.color='#9effb3';setTimeout(()=>mb.style.color='',1500);}; row.appendChild(mb); }
      const pb=document.createElement('button'); pb.className='byrut-button byrut-button--torrent byrut-button--small'; pb.textContent=t('openPage');
      pb.onclick=()=>{ const w=document.querySelector('#byrut-widget'); const u=(w?._data?.pageUrl)||`${BYRUT_ORIGIN}/index.php?do=search&subaction=search&story=${encodeURIComponent(name)}&titleonly=3`; window.open(u,'_blank'); }; row.appendChild(pb);
      actions.appendChild(row);
    }
    return actions;
  }

  function buildFooter(appid) { const f=document.createElement('div'); f.className='byrut-footer'; const s=document.createElement('span'); s.textContent='© hose1021 · v6.3'+(appid?' · app/'+appid:''); f.appendChild(s); return f; }

  // ── Settings Panel ──────────────────

  function showSettingsPanel() {
    const ex = document.querySelector('#byrut-settings-overlay');
    if (ex) { ex.remove(); return; }
    const overlay = document.createElement('div'); overlay.id='byrut-settings-overlay'; overlay.className='byrut-settings-overlay';
    const panel = document.createElement('div'); panel.className='byrut-settings-panel';
    const title = document.createElement('div'); title.className='byrut-settings-title'; title.textContent=t('settings'); panel.appendChild(title);

    function addRow(labelKey, key, options) {
      const r = document.createElement('div'); r.className='byrut-settings-row';
      const l = document.createElement('span'); l.className='byrut-settings-label'; l.textContent=t(labelKey);
      const sel = document.createElement('select'); sel.className='byrut-settings-select';
      options.forEach(o => { const opt=document.createElement('option'); opt.value=o.value; opt.textContent=t(o.labelKey)||o.labelKey; if (String(settings[key])===String(o.value)) opt.selected=true; sel.appendChild(opt); });
      sel.onchange=()=>{ settings[key]=key==='cacheTtlHours'?Number(sel.value):sel.value; gmSet(key,settings[key]); if (key==='lang') settings._lang=sel.value==='auto'?detectLang():sel.value; applySettings(); };
      r.append(l,sel); panel.appendChild(r);
    }

    addRow('position','position',[{value:'right',labelKey:'right'},{value:'left',labelKey:'left'}]);
    addRow('cacheTtl','cacheTtlHours',[{value:'1',labelKey:'1'},{value:'2',labelKey:'2'},{value:'4',labelKey:'4'},{value:'8',labelKey:'8'},{value:'24',labelKey:'24'}]);
    addRow('autoCollapse','autoCollapse',[{value:'true',labelKey:'yes'},{value:'false',labelKey:'no'}]);
    addRow('miniMode','miniMode',[{value:'true',labelKey:'yes'},{value:'false',labelKey:'no'}]);
    addRow('steamdbFetch','fetchSteamDB',[{value:'true',labelKey:'yes'},{value:'false',labelKey:'no'}]);
    addRow('language','lang',[{value:'auto',labelKey:'Auto'},{value:'ru',labelKey:'Русский'},{value:'en',labelKey:'English'}]);

    const actions = document.createElement('div'); actions.className='byrut-settings-actions';
    const cb = document.createElement('button'); cb.className='byrut-settings-btn'; cb.textContent='OK'; cb.onclick=()=>overlay.remove(); actions.appendChild(cb);
    panel.appendChild(actions);
    overlay.onclick=e=>{if(e.target===overlay) overlay.remove();};
    overlay.appendChild(panel); document.body.appendChild(overlay);
  }

  // ── Widget Display ──────────────────

  function showLoadingWidget(name) { showWidget(name, {...emptyData(),loading:true,title:name}, {cache:false}); }

  function showWidget(name, data, options={}) {
    document.querySelector('#byrut-widget')?.remove();
    ensureWidgetStyles(); applySettings();

    const { info, torrents, pageUrl } = data;
    const found = Boolean(pageUrl||torrents.length);
    const loading = Boolean(data.loading);
    const appid = getSteamAppId();
    const steamStore = getSteamStoreInfo();

    const widget = document.createElement('div'); widget.id='byrut-widget'; widget._data=data;

    const collapsed = settings.autoCollapse?true:localStorage.getItem('byrut-widget-collapsed')==='1';
    if (collapsed) widget.classList.add('is-collapsed');

    if (settings.miniMode) { widget.classList.add('is-mini'); widget.classList.add(loading?'mini--empty':(found&&info.network?'mini--ok':(found?'mini--warn':'mini--empty'))); }
    if (settings.position==='left') widget.classList.add('left');

    const { header, title, collapseButton, openUrl } = buildHeader(data,options,name,collapsed);
    widget.appendChild(header);

    title.onclick = () => { if (widget.classList.contains('is-mini')) return; if (widget.classList.contains('is-collapsed')) collapseButton.click(); else window.open(openUrl,'_blank'); };
    collapseButton.onclick = e => { e.stopPropagation(); if (widget.classList.contains('is-mini')) return; const ic=widget.classList.toggle('is-collapsed'); localStorage.setItem('byrut-widget-collapsed',ic?'1':'0'); collapseButton.textContent=ic?'+':'−'; collapseButton.title=ic?t('expand'):t('collapse'); collapseButton.dataset.collapsed=ic?'1':'0'; };

    // Meta (initially without SteamData)
    const meta = buildMeta(info, loading, found, steamStore, null);
    widget.appendChild(meta);

    // Actions
    const actions = buildActions(torrents, info, name);
    if (actions) widget.appendChild(actions);

    // Footer
    widget.appendChild(buildFooter(appid));
    document.body.appendChild(widget);

    if (options.cache!==false&&!loading) setCachedData(name, data);

    // ── Async external data ────────────
    console.log('ByRut: async section, appid=', appid, 'found=', found, 'fetchSteamDB=', settings.fetchSteamDB);
    if (appid && found) {
      const steamData = { onlinePlayers:null, onlinePeak24h:null, onlinePeakAll:null, steamUpdate:null, steamDate:null };

      function refreshMeta() {
        const w = document.querySelector('#byrut-widget');
        if (!w||w!==widget) return;
        const oldMeta = w.querySelector('.byrut-meta');
        const newMeta = buildMeta(info, loading, found, steamStore, steamData);
        if (oldMeta) oldMeta.replaceWith(newMeta);
        // Re-append ProtonDB if it was already added
        const existingProton = oldMeta?.querySelector('.byrut-row:has(.byrut-value a[href*="protondb"])');
        if (existingProton) newMeta.appendChild(existingProton.cloneNode(true));
      }

      fetchSteamPlayers(appid, players => { Object.assign(steamData, players); refreshMeta(); });

      if (settings.fetchSteamDB) {
        console.log('ByRut: SteamDB block entered, fetchSteamDB=', settings.fetchSteamDB);
        fetchSteamCharts(appid, sc => { if (sc) {
          Object.assign(steamData, sc);
          refreshMeta();
        } });
        fetchSteamUpdate(appid, su => { if (su) {
          Object.assign(steamData, su);
          refreshMeta();
        } });
      } else {
        console.log('ByRut: SteamDB block SKIPPED, fetchSteamDB=', settings.fetchSteamDB);
      }

      fetchProtonDB(appid, protonTier => {
        const pw = document.querySelector('#byrut-widget');
        if (!pw||pw!==widget||!protonTier) return;
        const metaEl = pw.querySelector('.byrut-meta');
        if (metaEl) { const pr = buildProtonDBRow(protonTier); if (pr) metaEl.appendChild(pr); }
      });
    }
  }

  // ── Background Refresh ──────────────

  function scheduleBackgroundRefresh(name, cachedData) {
    const cv = cachedData?.info?.versions?.join(',')||'';
    setTimeout(() => {
      searchOnByrut(name, getSearchQueries(name), 0, freshData => {
        if (freshData.loading) return;
        const fv = freshData?.info?.versions?.join(',')||'';
        if (fv&&fv!==cv) { setCachedData(name, freshData);
          const w=document.querySelector('#byrut-widget'); const cn=w?.querySelector('.byrut-name')?.textContent;
          if (w&&cn&&normalizeTitle(cn)===normalizeTitle(name)) { const b=w.querySelector('.byrut-badge'); if (b) { b.textContent=t('updatedBadge'); b.className='byrut-badge byrut-badge--updated'; } showWidget(name, freshData); }
        }
      });
    }, 3000);
  }

  function startLookup(name, options={}) {
    if (!options.force) { const c=getCachedData(name); if (c) { showWidget(name, c.data, {fromCache:true,cacheTime:c.time}); scheduleBackgroundRefresh(name, c.data); return; } }
    else { clearCachedData(name); }
    showLoadingWidget(name);
    searchOnByrut(name, getSearchQueries(name), 0, data => { setCachedData(name, data); showWidget(name, data); });
  }

  // ── Keyboard Shortcut ───────────────

  document.addEventListener('keydown', event => { if (event.altKey&&event.key==='b') { event.preventDefault(); const w=document.querySelector('#byrut-widget'); if (w) w.style.display=w.style.display==='none'?'':'none'; } });

  // ── Entry ───────────────────────────

  const name = getGameName();
  if (name) { startLookup(name); return; }
  showLoadingWidget(name||'');
  let observerTimeout;

  function setupObserver() {
    const target = document.querySelector('#appHubAppName')?.parentElement||document.querySelector('.apphub_AppName')||document.getElementById('game_area_purchase')||document.body;
    const observer = new MutationObserver(() => { const dn=getGameName(); if (!dn) return; clearTimeout(observerTimeout); startLookup(dn); observer.disconnect(); });
    observer.observe(target, target===document.body?{childList:true,subtree:true}:{childList:true,subtree:true,characterData:true});
    observerTimeout = setTimeout(() => { observer.disconnect(); const w=document.querySelector('#byrut-widget'); if (w&&w.querySelector('.byrut-meta .byrut-value')?.textContent===t('searchingStatus')) showWidget(name||'', emptyData()); }, 30000);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', setupObserver);
  else setupObserver();
})();
