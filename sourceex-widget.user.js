  // ==UserScript==
  // @name         SourceEX – Ressources externes
  // @description  Widget listant les ressources externes chargées par chaque URL visitée
  // @match        *://*/*
  // @grant        GM.setValue
  // @grant        GM.getValue
  // @run-at       document_start
  // @namespace    https://github.com/GemDem/SourceEx
  // @version      1.6
  // ==/UserScript==

  (function () {
    'use strict';

    const STORAGE_KEY = 'sourceex_pages';
    const SEARCH_FILTER_KEY = 'sourceex_search_filter';
    const COLLECT_DELAY_MS = 2500;
    const PANEL_MIN_WIDTH = 280;
    const PANEL_MIN_HEIGHT = 200;
    const PANEL_DEFAULT_WIDTH = 420;
    const PANEL_DEFAULT_HEIGHT = 360;

    const pageOrigin = () => window.location.origin;

    function escapeCsvCell(str) {
      const s = String(str);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    function csvFilenameWithTimestamp(base) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const name = base.endsWith('.csv') ? base.slice(0, -4) : base;
      return `${name}_${date}_${time}.csv`;
    }

    function safeParseJson(raw, defaultValue) {
      try {
        const parsed = JSON.parse(raw);
        return parsed != null ? parsed : defaultValue;
      } catch (_) {
        return defaultValue;
      }
    }

    function downloadCsv(filename, rows, headers) {
      const line = (arr) => arr.map(escapeCsvCell).join(',');
      const csv = [line(headers), ...rows.map((r) => line(r))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function escapeHtmlAttr(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function isExternalResource(pageOriginStr, resourceUrl) {
      try {
        const origin = new URL(resourceUrl).origin;
        return origin !== pageOriginStr;
      } catch {
        return false;
      }
    }

    const CATEGORIES = ['css', 'js', 'img', 'xhr', 'other'];
    function resourceCategory(type) {
      const t = (type || '').toLowerCase();
      if (t === 'link') return 'css';
      if (t === 'script') return 'js';
      if (t === 'img') return 'img';
      if (t === 'fetch' || t === 'xmlhttprequest') return 'xhr';
      return 'other';
    }
    function countByCategory(resources) {
      const counts = { css: 0, js: 0, img: 0, xhr: 0, other: 0 };
      (resources || []).forEach((r) => {
        const cat = resourceCategory(r.type);
        if (counts[cat] !== undefined) counts[cat]++;
      });
      return counts;
    }

    const externalResources = [];
    const seen = new Set();

    function captureResources() {
      const origin = pageOrigin();
      if (!window.PerformanceObserver || !window.performance) return;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const url = entry.name;
          if (!url || seen.has(url)) continue;
          if (!isExternalResource(origin, url)) continue;
          seen.add(url);
          const type = entry.initiatorType || 'other';
          externalResources.push({ url, type });
        }
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        return;
      }

      function finishAndSave() {
        try {
          observer.disconnect();
        } catch (_) {}
        const origin = pageOrigin();
        try {
          const entries = performance.getEntriesByType('resource') || [];
          for (const entry of entries) {
            const url = entry.name;
            if (!url || seen.has(url)) continue;
            if (!isExternalResource(origin, url)) continue;
            seen.add(url);
            externalResources.push({ url, type: entry.initiatorType || 'other' });
          }
        } catch (_) {}
        const pageUrl = window.location.href;
        const resources = externalResources.map((r) => ({ url: r.url, type: r.type }));
        const count = resources.length;
        GM.getValue(STORAGE_KEY, '{}').then((raw) => {
          const data = safeParseJson(raw, {});
          data[pageUrl] = { count, resources };
          return GM.setValue(STORAGE_KEY, JSON.stringify(data));
        }).catch(() => {});
      }

      if (document.readyState === 'complete') {
        setTimeout(finishAndSave, COLLECT_DELAY_MS);
      } else {
        window.addEventListener('load', () => setTimeout(finishAndSave, COLLECT_DELAY_MS));
      }
    }

    captureResources();

    function injectWidget() {
      const POSITION_KEY = 'sourceex_position';
      const SIZE_KEY = 'sourceex_size';
      const PANEL_OPEN_KEY = 'sourceex_panel_open';

      const container = document.createElement('div');
      container.id = 'sourceex-container';
      container.innerHTML = `
        <style>
          #sourceex-container { font-family: system-ui, sans-serif; font-size: 13px; }
          #sourceex-wrapper { position: fixed; top: 12px; right: 12px; z-index: 2147483647; display: inline-flex; align-items: flex-start; gap: 0; }
          #sourceex-drag { padding: 8px 4px; cursor: move; color: #888; background: #1a1a2e; border: 1px solid #333; border-right: none; border-radius: 8px 0 0 8px; display: flex; align-items: center; }
          #sourceex-drag:hover { color: #aaa; }
          #sourceex-drag::before { content: '⋮⋮'; font-size: 12px; letter-spacing: -2px; }
          #sourceex-toggle { padding: 8px 12px; background: #1a1a2e; color: #eee; border: 1px solid #333; border-radius: 0 8px 8px 0; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
          #sourceex-toggle:hover { background: #16213e; }
          #sourceex-panel { display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; width: 420px; max-width: calc(100vw - 24px); height: 360px; max-height: calc(100vh - 72px); min-width: 280px; min-height: 200px; z-index: 2147483647; background: #1a1a2e; color: #e0e0e0; border: 1px solid #333; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); overflow: hidden; flex-direction: column; box-sizing: border-box; }
          #sourceex-panel.open { display: flex; }
          #sourceex-resize { position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; cursor: se-resize; background: linear-gradient(135deg, transparent 50%, #333 50%, #333 55%, transparent 55%); border-radius: 0 0 8px 0; }
          #sourceex-resize:hover { background: linear-gradient(135deg, transparent 50%, #555 50%, #555 55%, transparent 55%); }
          #sourceex-resize-left { position: absolute; bottom: 0; left: 0; width: 16px; height: 16px; cursor: sw-resize; background: linear-gradient(225deg, transparent 50%, #333 50%, #333 55%, transparent 55%); border-radius: 0 0 0 8px; }
          #sourceex-resize-left:hover { background: linear-gradient(225deg, transparent 50%, #555 50%, #555 55%, transparent 55%); }
          #sourceex-title { padding: 12px; font-weight: 700; border-bottom: 1px solid #333; background: #16213e; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
          #sourceex-title-text { flex: 1; min-width: 0; }
          #sourceex-title-buttons { display: flex; gap: 6px; }
          #sourceex-title-buttons button { padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 6px; border: 1px solid #333; background: #0f3460; color: #eee; }
          #sourceex-title-buttons button:hover { background: #16213e; }
          #sourceex-title-buttons button:disabled { opacity: 0.5; cursor: not-allowed; }
          #sourceex-title-buttons button:disabled:hover { background: #0f3460; }
          #sourceex-search { flex: 1 1 100%; margin-top: 6px; padding: 6px 10px; font-size: 12px; border-radius: 6px; border: 1px solid #333; background: #0d0d1a; color: #e0e0e0; box-sizing: border-box; }
          #sourceex-search::placeholder { color: #666; }
          #sourceex-search:focus { outline: none; border-color: #0f3460; }
          #sourceex-list { overflow: auto; padding: 8px; flex: 1; min-height: 0; }
          .sourceex-item { padding: 8px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
          .sourceex-item:hover { background: #252540; }
          .sourceex-item-url { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sourceex-item.detail-open .sourceex-item-url { display: none; }
          .sourceex-badge { flex-shrink: 0; background: #0f3460; color: #eee; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .sourceex-detail { display: none; padding: 8px 10px 10px 12px; background: #0d0d1a; border-radius: 6px; margin-top: 2px; margin-bottom: 6px; box-sizing: border-box; width: 100%; }
          .sourceex-detail.open { display: block; }
          .sourceex-detail-url { font-size: 13px; color: #fff; margin-bottom: 8px; word-break: break-all; padding-bottom: 6px; border-bottom: 1px solid #252540; }
          .sourceex-resource { font-size: 11px; padding: 4px 0; word-break: break-all; color: #a0a0a0; }
          .sourceex-resource-type { color: #6c9bcf; margin-right: 6px; }
          .sourceex-item a, .sourceex-detail-url a { color: #6c9bcf; text-decoration: none; }
          .sourceex-item a:hover, .sourceex-detail-url a:hover { text-decoration: underline; }
          .sourceex-export-btn { flex-shrink: 0; padding: 2px 6px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #333; background: #0f3460; color: #eee; }
          .sourceex-export-btn:hover { background: #16213e; }
          .sourceex-cat-btns { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; flex-shrink: 0; }
          .sourceex-cat-btn { padding: 2px 6px; font-size: 10px; cursor: pointer; border-radius: 4px; border: 1px solid #333; background: #252540; color: #a0a0a0; }
          .sourceex-cat-btn:hover { background: #333355; color: #eee; }
          .sourceex-cat-btn.active { background: #0f3460; color: #eee; border-color: #3a6ea5; }
          .sourceex-cat-btn .sourceex-cat-num { margin-left: 2px; font-weight: 600; color: #8ab4f8; }
        </style>
        <div id="sourceex-wrapper">
          <div id="sourceex-drag" title="Move"></div>
          <button type="button" id="sourceex-toggle">SourceEX</button>
          <div id="sourceex-panel">
            <div id="sourceex-title">
              <span id="sourceex-title-text">SourceEX</span>
              <div id="sourceex-title-buttons">
                <button type="button" id="sourceex-fresh">Refresh</button>
                <button type="button" id="sourceex-export-all" disabled>Export all</button>
                <button type="button" id="sourceex-clear">Clear</button>
              </div>
              <input type="text" id="sourceex-search" placeholder="Filter pages..." />
            </div>
            <div id="sourceex-list"></div>
            <div id="sourceex-resize" title="Resize"></div>
            <div id="sourceex-resize-left" title="Resize"></div>
          </div>
        </div>
      `;

      document.documentElement.appendChild(container);

      const wrapper = document.getElementById('sourceex-wrapper');
      const toggle = document.getElementById('sourceex-toggle');
      const panel = document.getElementById('sourceex-panel');
      const listEl = document.getElementById('sourceex-list');
      const dragHandle = document.getElementById('sourceex-drag');
      const btnClear = document.getElementById('sourceex-clear');
      const btnFresh = document.getElementById('sourceex-fresh');
      const btnExportAll = document.getElementById('sourceex-export-all');
      const searchInput = document.getElementById('sourceex-search');
      const resizeHandle = document.getElementById('sourceex-resize');
      const resizeHandleLeft = document.getElementById('sourceex-resize-left');

      GM.getValue(POSITION_KEY, '{}').then((raw) => {
        const pos = safeParseJson(raw, {});
        const hasLeft = typeof pos.left === 'number';
        const hasTop = typeof pos.top === 'number';
        if (hasLeft || hasTop) {
          const left = hasLeft ? Math.max(0, Math.min(pos.left, window.innerWidth - PANEL_MIN_WIDTH)) : (window.innerWidth - 120);
          const top = hasTop ? Math.max(0, Math.min(pos.top, window.innerHeight - PANEL_MIN_HEIGHT)) : 12;
          wrapper.style.left = left + 'px';
          wrapper.style.top = top + 'px';
          wrapper.style.right = 'auto';
        } else {
          wrapper.style.right = '12px';
          wrapper.style.left = '';
          wrapper.style.top = '12px';
        }
      }).catch(() => {});

      GM.getValue(SIZE_KEY, '{}').then((raw) => {
        const size = safeParseJson(raw, {});
        const w = typeof size.width === 'number' ? size.width : PANEL_DEFAULT_WIDTH;
        const h = typeof size.height === 'number' ? size.height : PANEL_DEFAULT_HEIGHT;
        panel.style.width = Math.max(PANEL_MIN_WIDTH, Math.min(w, window.innerWidth - 24)) + 'px';
        panel.style.height = Math.max(PANEL_MIN_HEIGHT, Math.min(h, window.innerHeight - 72)) + 'px';
      }).catch(() => {}).then(() => {
        return GM.getValue(PANEL_OPEN_KEY, false);
      }).then((open) => {
        if (open) {
          panel.classList.add('open');
          renderList();
          startLiveResourceObserver();
        }
      }).catch(() => {});

      GM.getValue(SEARCH_FILTER_KEY, '').then((saved) => {
        if (searchInput) searchInput.value = saved || '';
      }).catch(() => {});

      searchInput.addEventListener('input', () => {
        const value = searchInput.value;
        GM.setValue(SEARCH_FILTER_KEY, value).catch(() => {});
        renderList();
      });

      let dragStart = null;
      function onDragMove(e) {
        if (!dragStart) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const maxLeft = window.innerWidth - (wrapper.offsetWidth || 120);
        const maxTop = window.innerHeight - PANEL_MIN_HEIGHT;
        const left = Math.max(0, Math.min(dragStart.left + dx, maxLeft));
        const top = Math.max(0, Math.min(dragStart.top + dy, maxTop));
        wrapper.style.left = left + 'px';
        wrapper.style.top = top + 'px';
        wrapper.style.right = 'auto';
      }
      function onDragUp() {
        if (!dragStart) return;
        const left = parseInt(wrapper.style.left, 10);
        const top = parseInt(wrapper.style.top, 10);
        if (!isNaN(left) && !isNaN(top)) {
          GM.setValue(POSITION_KEY, JSON.stringify({ left, top })).catch(() => {});
        }
        dragStart = null;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragUp);
      }
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = wrapper.getBoundingClientRect();
        dragStart = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
        wrapper.style.left = rect.left + 'px';
        wrapper.style.top = rect.top + 'px';
        wrapper.style.right = 'auto';
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragUp);
      });

      let resizeStart = null;
      function onResizeMove(e) {
        if (!resizeStart) return;
        const dw = resizeStart.fromLeft ? resizeStart.x - e.clientX : e.clientX - resizeStart.x;
        const dh = e.clientY - resizeStart.y;
        const newW = Math.max(PANEL_MIN_WIDTH, Math.min(resizeStart.w + dw, window.innerWidth - 24));
        const newH = Math.max(PANEL_MIN_HEIGHT, Math.min(resizeStart.h + dh, window.innerHeight - 72));
        panel.style.width = newW + 'px';
        panel.style.height = newH + 'px';
      }
      function onResizeUp() {
        if (!resizeStart) return;
        const w = parseInt(panel.style.width, 10);
        const h = parseInt(panel.style.height, 10);
        if (!isNaN(w) && !isNaN(h)) {
          GM.setValue(SIZE_KEY, JSON.stringify({ width: w, height: h })).catch(() => {});
        }
        resizeStart = null;
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
      }
      function startResize(e, fromLeft) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = panel.getBoundingClientRect();
        resizeStart = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, fromLeft: !!fromLeft };
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
      }
      resizeHandle.addEventListener('mousedown', (e) => startResize(e, false));
      resizeHandleLeft.addEventListener('mousedown', (e) => startResize(e, true));

      let liveResourceObserver = null;
      function refreshCurrentPageAndRender(preserveExpanded) {
        const origin = pageOrigin();
        const resources = [];
        const seenUrl = new Set();
        try {
          const entries = performance.getEntriesByType('resource') || [];
          for (const entry of entries) {
            const url = entry.name;
            if (!url || !isExternalResource(origin, url) || seenUrl.has(url)) continue;
            seenUrl.add(url);
            resources.push({ url, type: entry.initiatorType || 'other' });
          }
        } catch (_) {}
        const pageUrl = window.location.href;
        GM.getValue(STORAGE_KEY, '{}').then((raw) => {
          const data = safeParseJson(raw, {});
          const prev = data[pageUrl];
          const prevCount = prev ? prev.count : 0;
          data[pageUrl] = { count: resources.length, resources };
          return GM.setValue(STORAGE_KEY, JSON.stringify(data)).then(() => {
            if (resources.length !== prevCount) renderList(preserveExpanded);
          });
        }).catch(() => {});
      }

      function startLiveResourceObserver() {
        if (liveResourceObserver || !window.PerformanceObserver) return;
        let pending = false;
        liveResourceObserver = new PerformanceObserver(() => {
          if (pending) return;
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            refreshCurrentPageAndRender(true);
          });
        });
        try {
          liveResourceObserver.observe({ entryTypes: ['resource'] });
        } catch (_) {
          liveResourceObserver = null;
        }
      }
      function stopLiveResourceObserver() {
        if (liveResourceObserver) {
          try { liveResourceObserver.disconnect(); } catch (_) {}
          liveResourceObserver = null;
        }
      }

      toggle.addEventListener('click', () => {
        const willOpen = !panel.classList.contains('open');
        panel.classList.toggle('open', willOpen);
        GM.setValue(PANEL_OPEN_KEY, willOpen).catch(() => {});
        if (willOpen) {
          renderList();
          startLiveResourceObserver();
        } else {
          stopLiveResourceObserver();
        }
      });

      btnClear.addEventListener('click', () => {
        GM.setValue(STORAGE_KEY, '{}').then(() => {
          if (panel.classList.contains('open')) renderList();
        }).catch(() => {});
      });

      btnFresh.addEventListener('click', () => {
        refreshCurrentPageAndRender(true);
      });

      btnExportAll.addEventListener('click', () => {
        GM.getValue(STORAGE_KEY, '{}').then((raw) => {
          const data = safeParseJson(raw, {});
          const pageUrls = Object.keys(data).sort((a, b) => a.localeCompare(b));
          const rows = [];
          pageUrls.forEach((pageUrl) => {
            const { resources } = data[pageUrl] || {};
            if (resources && Array.isArray(resources)) {
              resources.forEach((r) => rows.push([pageUrl, r.type, r.url]));
            }
          });
          if (rows.length === 0) return;
          downloadCsv(csvFilenameWithTimestamp('sourceex-all.csv'), rows, ['page_url', 'resource_type', 'resource_url']);
        }).catch(() => {});
      });

      function renderList(preserveExpanded) {
        const expandedState = new Map();
        if (preserveExpanded) {
          listEl.querySelectorAll('.sourceex-item[data-page-url]').forEach((el) => {
            const url = el.dataset.pageUrl;
            const detail = el.querySelector('.sourceex-detail');
            if (detail && detail.classList.contains('open')) {
              expandedState.set(url, el.dataset.activeCategory || '');
            }
          });
        }
        const filter = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
        GM.getValue(STORAGE_KEY, '{}').then((raw) => {
          const data = safeParseJson(raw, {});
          let urls = Object.keys(data).sort((a, b) => a.localeCompare(b));
          if (filter) {
            urls = urls.filter((pageUrl) => pageUrl.toLowerCase().includes(filter));
          }
          let totalExportable = 0;
          listEl.innerHTML = '';
          urls.forEach((pageUrl) => {
            const pageData = data[pageUrl];
            const resources = (pageData && Array.isArray(pageData.resources)) ? pageData.resources : [];
            const count = pageData && typeof pageData.count === 'number' ? pageData.count : resources.length;
            const counts = countByCategory(resources);
            totalExportable += resources.length;
            const savedFilter = expandedState.get(pageUrl);
            const isExpanded = expandedState.has(pageUrl);
            const item = document.createElement('div');
            item.className = 'sourceex-item';
            item.dataset.pageUrl = pageUrl;
            if (savedFilter) item.dataset.activeCategory = savedFilter;
            const displayUrl = pageUrl.length > 50 ? pageUrl.slice(0, 47) + '...' : pageUrl;
            const detail = document.createElement('div');
            detail.className = 'sourceex-detail';
            if (isExpanded) {
              detail.classList.add('open');
              item.classList.add('detail-open');
            }
            const detailHeader = document.createElement('div');
            detailHeader.className = 'sourceex-detail-url';
            const pageLink = document.createElement('a');
            pageLink.href = pageUrl;
            pageLink.target = '_blank';
            pageLink.rel = 'noopener';
            pageLink.textContent = pageUrl;
            detailHeader.appendChild(pageLink);
            detail.appendChild(detailHeader);
            const activeCat = savedFilter || '';
            resources.forEach((r) => {
              const line = document.createElement('div');
              line.className = 'sourceex-resource';
              line.dataset.category = resourceCategory(r.type);
              if (activeCat && line.dataset.category !== activeCat) line.style.display = 'none';
              const typeSpan = document.createElement('span');
              typeSpan.className = 'sourceex-resource-type';
              typeSpan.textContent = `[${r.type}] `;
              line.appendChild(typeSpan);
              const resLink = document.createElement('a');
              resLink.href = r.url;
              resLink.target = '_blank';
              resLink.rel = 'noopener';
              resLink.textContent = r.url;
              line.appendChild(resLink);
              detail.appendChild(line);
            });
            const safePageUrl = escapeHtmlAttr(pageUrl);
            const safeDisplayUrl = escapeHtmlAttr(displayUrl);
            item.innerHTML = `<span class="sourceex-item-url"><a href="${safePageUrl}" target="_blank" rel="noopener" title="${safePageUrl}">${safeDisplayUrl}</a></span><span class="sourceex-badge">${count}</span><button type="button" class="sourceex-export-btn" title="Export this page to CSV">Export</button>`;
            item.querySelector('.sourceex-item-url a').addEventListener('click', (e) => {
              e.preventDefault();
              detail.classList.toggle('open');
              item.classList.toggle('detail-open', detail.classList.contains('open'));
            });
            const catBtns = document.createElement('div');
            catBtns.className = 'sourceex-cat-btns';
            const allCount = count;
            const addCatBtn = (cat, label) => {
              const n = cat === 'all' ? allCount : (counts[cat] || 0);
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'sourceex-cat-btn' + (activeCat === (cat === 'all' ? '' : cat) ? ' active' : '');
              btn.title = cat === 'all' ? 'Show all' : `Show ${cat} only`;
              btn.innerHTML = label + ' <span class="sourceex-cat-num">' + n + '</span>';
              btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const wantCat = cat === 'all' ? '' : cat;
                item.dataset.activeCategory = wantCat;
                detail.classList.add('open');
                item.classList.add('detail-open');
                detail.querySelectorAll('.sourceex-resource').forEach((line) => {
                  line.style.display = wantCat && line.dataset.category !== wantCat ? 'none' : '';
                });
                catBtns.querySelectorAll('.sourceex-cat-btn').forEach((b) => b.classList.toggle('active', b === btn));
              });
              catBtns.appendChild(btn);
            };
            addCatBtn('all', 'all');
            CATEGORIES.forEach((cat) => addCatBtn(cat, cat));
            item.insertBefore(catBtns, item.querySelector('.sourceex-badge'));
            item.appendChild(detail);
            item.querySelector('.sourceex-export-btn').addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const rows = resources.map((r) => [pageUrl, r.type, r.url]);
              const slug = (() => {
                try {
                  const u = new URL(pageUrl);
                  return (u.hostname + u.pathname).replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
                } catch (_) {
                  return 'page';
                }
              })();
              downloadCsv(csvFilenameWithTimestamp(`sourceex-${slug}.csv`), rows, ['page_url', 'resource_type', 'resource_url']);
            });
            item.addEventListener('click', (e) => {
              if (e.target.closest('a') || e.target.closest('.sourceex-export-btn') || e.target.closest('.sourceex-cat-btn') || e.target.closest('.sourceex-resource')) return;
              detail.classList.toggle('open');
              item.classList.toggle('detail-open', detail.classList.contains('open'));
            });
            listEl.appendChild(item);
          });
          if (btnExportAll) btnExportAll.disabled = totalExportable === 0;
          if (urls.length === 0) {
            listEl.innerHTML = filter
              ? '<div style="padding:12px;color:#888;">No results for this filter.</div>'
              : '<div style="padding:12px;color:#888;">No URLs recorded.</div>';
          }
        }).catch(() => {});
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectWidget);
    } else {
      injectWidget();
    }
  })();
