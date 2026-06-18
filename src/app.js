/* ============================================================
   Flowscape — Water Logic SPA
   Vanilla JS · localStorage · hand-rolled SVG graph.

   Model (one per Flowscape, array persisted under STORE_KEY):
     { id, name, createdAt, updatedAt, entryId,
       theme:{mode,palette},
       nodes:[{id,label,text,x,y}],
       edges:[{id,from,to,strong}] }
   Invariant: at most one strong edge per `from` node
   (the favored "leads TO" that drives the flow sequence & loops).
   ============================================================ */

(() => {
  'use strict';

  const STORE_KEY = 'flowscapes.v1';
  const R = 26; // node radius

  // de Bono's Six Thinking Hats — node tag colors (c = fill, t = contrast text)
  const HATS = {
    white:  { n: 'White',  m: 'Facts / information',  c: '#e9edf3', t: '#23272e' },
    yellow: { n: 'Yellow', m: 'Value / optimism',     c: '#f4c20d', t: '#3a2f00' },
    black:  { n: 'Black',  m: 'Risk / caution',       c: '#2f3338', t: '#ffffff' },
    red:    { n: 'Red',    m: 'Feeling / intuition',  c: '#e5342a', t: '#ffffff' },
    green:  { n: 'Green',  m: 'Creativity / ideas',   c: '#2fa84f', t: '#ffffff' },
    blue:   { n: 'Blue',   m: 'Process / control',    c: '#3aa0da', t: '#ffffff' },
  };
  const HAT_ORDER = ['white', 'yellow', 'black', 'red', 'green', 'blue'];

  const $ = (s) => document.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const now = () => Date.now();

  let store = { flowscapes: [], currentId: null };
  let current = null;
  let undoSnapshot = null;

  /* ---------- persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) store = JSON.parse(raw);
    } catch { /* ignore corrupt store */ }
    if (!Array.isArray(store.flowscapes)) store.flowscapes = [];
    if (!store.ui) store.ui = { showList: true, showGraph: true };
    store.flowscapes.forEach((f) => { if (f.theme && f.theme.strongStyle === 'chevrons') f.theme.strongStyle = 'arrow'; });
  }
  function save() {
    if (current) current.updatedAt = now();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }
  let _saveTimer = 0;
  function saveSoon() { clearTimeout(_saveTimer); _saveTimer = setTimeout(save, 300); }

  function snapshot() { if (current) undoSnapshot = JSON.parse(JSON.stringify(current)); }
  function undo() {
    if (!undoSnapshot) return;
    const idx = store.flowscapes.findIndex((f) => f.id === undoSnapshot.id);
    if (idx >= 0) store.flowscapes[idx] = undoSnapshot;
    setCurrent(undoSnapshot.id); undoSnapshot = null; render();
  }
  function setCurrent(id) {
    current = store.flowscapes.find((f) => f.id === id) || null;
    store.currentId = current ? current.id : null;
  }

  /* ---------- labels ---------- */
  function labelFor(i) {            // 0 -> A, 25 -> Z, 26 -> AA …
    let s = ''; i++;
    while (i > 0) { i--; s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26); }
    return s;
  }
  function nextLabel(fs) {
    const used = new Set(fs.nodes.map((n) => n.label));
    for (let i = 0; ; i++) { const l = labelFor(i); if (!used.has(l)) return l; }
  }
  const labelCmp = (a, b) => (a.length - b.length) || a.localeCompare(b);

  /* ---------- model factories & mutations ---------- */
  function makeFlowscape(name) {
    const theme = current ? { strongStyle: 'flow', ...current.theme }
      : { mode: document.documentElement.dataset.mode || 'light',
          palette: document.documentElement.dataset.palette || 'blue-yellow',
          strongStyle: 'flow' };
    return {
      id: uid(), name: name || 'Untitled Flowscape',
      createdAt: now(), updatedAt: now(),
      entryId: null, theme, nodes: [], edges: [],
    };
  }
  function nodeById(id) { return current.nodes.find((n) => n.id === id); }

  function addNode(text, x, y) {
    const n = {
      id: uid(), label: nextLabel(current), text: (text || '').trim() || 'New node',
      x: x, y: y,
    };
    if (x == null || y == null) {
      // place new nodes around the center of the *current view* (world coords)
      const wrap = $('#graphWrap'), v = getView();
      const w = wrap.clientWidth || 600, h = wrap.clientHeight || 400;
      const cx = (w / 2 - v.x) / v.z, cy = (h / 2 - v.y) / v.z;
      const k = current.nodes.length;
      n.x = cx + Math.cos(k * 1.3) * (40 + k * 6);
      n.y = cy + Math.sin(k * 1.3) * (40 + k * 6);
    }
    clampNode(n);
    current.nodes.push(n);
    if (!current.entryId) current.entryId = n.id; // first node becomes entry
    return n;
  }
  // loose clamp to a generous world rect (pan/zoom handles visibility)
  function clampNode(n) {
    n.x = Math.max(-2000, Math.min(6000, n.x));
    n.y = Math.max(-2000, Math.min(6000, n.y));
  }
  function deleteNode(id) {
    current.nodes = current.nodes.filter((n) => n.id !== id);
    current.edges = current.edges.filter((e) => e.from !== id && e.to !== id);
    if (current.entryId === id) current.entryId = current.nodes[0] ? current.nodes[0].id : null;
  }
  function setText(id, text) { const n = nodeById(id); if (n) n.text = text.trim() || n.text; }
  function setEntry(id) { current.entryId = id; }
  function setHat(id, hat) { const n = nodeById(id); if (n) { if (hat) n.hat = hat; else delete n.hat; } }

  function findEdge(from, to) { return current.edges.find((e) => e.from === from && e.to === to); }
  function setEdge(from, to, strong) {
    if (from === to) return;
    if (strong) { // enforce single strong out-link: demote siblings to normal
      current.edges.forEach((e) => { if (e.from === from && e.strong) e.strong = false; });
    }
    const ex = findEdge(from, to);
    if (ex) ex.strong = !!strong;
    else current.edges.push({ id: uid(), from, to, strong: !!strong });
  }
  function deleteEdge(id) { current.edges = current.edges.filter((e) => e.id !== id); }
  function toggleEdgeStrong(id) {
    const e = current.edges.find((x) => x.id === id);
    if (!e) return;
    if (!e.strong) setEdge(e.from, e.to, true); // promote (demotes siblings)
    else e.strong = false;
  }

  /* ---------- flow sequence (the core algorithm) ---------- */
  function strongOut(id) { const e = current.edges.find((x) => x.from === id && x.strong); return e ? e.to : null; }

  function flowSequence() {
    const order = [], seen = new Map();
    let cur = current.entryId, loopStart = -1;
    while (cur != null && !seen.has(cur) && nodeById(cur)) {
      seen.set(cur, order.length); order.push(cur); cur = strongOut(cur);
    }
    if (cur != null && seen.has(cur)) loopStart = seen.get(cur);
    const visited = new Set(order);
    const peripheral = current.nodes
      .filter((n) => !visited.has(n.id))
      .sort((a, b) => labelCmp(a.label, b.label))
      .map((n) => n.id);
    const loopSet = new Set(loopStart >= 0 ? order.slice(loopStart) : []);
    return { order, loopStart, loopSet, peripheral };
  }
  function inDegree() {
    const m = new Map();
    current.edges.forEach((e) => m.set(e.to, (m.get(e.to) || 0) + 1));
    return m;
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function render() { renderToolbar(); applyLayout(); renderLegend(); renderList(); drawGraph(); save(); }

  function applyLayout() {
    const ws = $('.workspace');
    ws.classList.toggle('hide-list', !store.ui.showList);
    ws.classList.toggle('hide-graph', !store.ui.showGraph);
    $('#toggleList').classList.toggle('active', store.ui.showList);
    $('#toggleGraph').classList.toggle('active', store.ui.showGraph);
  }

  function renderLegend() {
    const el = $('#legend');
    if (!el) return;
    el.innerHTML = '<span class="legend-title">Hats:</span>' + HAT_ORDER.map((k) => {
      const h = HATS[k];
      return `<span class="chip" title="${esc(h.n + ' — ' + h.m)}"><span class="sw" style="background:${h.c}"></span>${esc(h.n)}</span>`;
    }).join('');
  }

  function renderToolbar() {
    const sel = $('#fsSelect');
    sel.innerHTML = store.flowscapes
      .map((f) => `<option value="${f.id}" ${f.id === current?.id ? 'selected' : ''}>${esc(f.name)}</option>`)
      .join('');
    if (current) {
      document.documentElement.dataset.mode = current.theme.mode;
      document.documentElement.dataset.palette = current.theme.palette;
      $('#paletteSelect').value = current.theme.palette;
      $('#strongStyle').value = current.theme.strongStyle || 'flow';
      $('#modeToggle').textContent = current.theme.mode === 'dark' ? '☀️' : '🌙';
    }
  }

  function renderList() {
    const list = $('#list');
    list.innerHTML = '';
    if (!current || current.nodes.length === 0) {
      list.innerHTML = `<div class="empty-note">No nodes yet.<br>Add a one-liner above, or load the <b>Example</b>.</div>`;
      return;
    }
    const { order, loopStart, loopSet, peripheral } = flowSequence();
    const indeg = inDegree();
    const collectorId = topCollector(indeg);

    if (order.length) {
      list.appendChild(sectionLabel('Flow from entry'));
      order.forEach((id, i) => {
        const firstLoop = (i === loopStart);
        list.appendChild(rowFor(id, { inLoop: loopSet.has(id), firstLoop, collector: id === collectorId }));
      });
    }
    if (peripheral.length) {
      list.appendChild(sectionLabel(order.length ? 'Peripheral' : 'Nodes (set an entry ★ to sequence)'));
      peripheral.forEach((id) => list.appendChild(rowFor(id, { collector: id === collectorId })));
    }
    applySearch();
  }

  function applySearch() {
    const q = ($('#searchInput')?.value || '').toLowerCase();
    document.querySelectorAll('#list .node-row').forEach((li) => {
      const n = nodeById(li.dataset.id);
      li.style.display = (!q || !n || n.text.toLowerCase().includes(q) || n.label.toLowerCase().includes(q)) ? '' : 'none';
    });
  }

  function sectionLabel(t) { const d = document.createElement('div'); d.className = 'section-label'; d.textContent = t; return d; }

  function rowFor(id, opt = {}) {
    const n = nodeById(id);
    const li = document.createElement('li');
    li.className = 'node-row';
    li.dataset.id = id;
    if (current.entryId === id) li.dataset.entry = '1';
    if (opt.inLoop) li.dataset.loop = '1';

    const tgt = strongOut(id);
    const tgtLabel = tgt ? nodeById(tgt)?.label : null;
    const hat = n.hat && HATS[n.hat];
    const dotStyle = hat ? ` style="background:${hat.c};color:${hat.t};border-color:${hat.c}"` : '';

    const incoming = current.edges.filter((e) => e.to === id);
    const inChips = incoming.map((e) => {
      const srcLabel = nodeById(e.from)?.label ?? '?';
      return `<span class="in-chip${e.strong ? ' in-chip--strong' : ''}" data-edge="${e.id}" title="${e.strong ? 'Strong' : 'Normal'} path from ${srcLabel}">${esc(srcLabel)}</span>`;
    }).join('');
    const incomingHtml = `<span class="row-incoming">${inChips || '<span class="in-empty">·</span>'}</span>`;

    li.innerHTML = `
      ${incomingHtml}
      <span class="dot"${dotStyle} title="${hat ? esc(hat.n + ' · ' + hat.m) : ''}">${esc(n.label)}</span>
      <span class="row-text" title="Double-click to edit">${esc(n.text)}</span>
      ${opt.firstLoop ? '<span class="loop-pill">loop</span>' : ''}
      <span class="row-flow">${tgtLabel ? '→ <b>' + esc(tgtLabel) + '</b>' : '∅'}</span>
      <button class="icon entry-btn" title="Set as entry">★</button>
      <button class="icon menu-btn" title="Menu">⋯</button>`;

    li.querySelector('.entry-btn').addEventListener('click', (e) => { e.stopPropagation(); setEntry(id); render(); });
    li.querySelector('.menu-btn').addEventListener('click', (e) => { e.stopPropagation(); openNodeMenu(id, e.clientX, e.clientY); });
    li.querySelectorAll('.in-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => { e.stopPropagation(); openEdgeMenu(chip.dataset.edge, e.clientX, e.clientY); });
    });

    const txt = li.querySelector('.row-text');
    txt.addEventListener('dblclick', () => startInlineEdit(txt, id));
    return li;
  }

  function startInlineEdit(el, id) {
    el.setAttribute('contenteditable', 'true');
    el.textContent = nodeById(id).text;
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el);
    const selObj = getSelection(); if (selObj) { selObj.removeAllRanges(); selObj.addRange(range); }
    const finish = (commit) => {
      el.removeAttribute('contenteditable');
      el.removeEventListener('blur', onBlur);
      if (commit) { setText(id, el.textContent); }
      render();
    };
    const onBlur = () => finish(true);
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  }

  function topCollector(indeg) {
    let best = null, bestN = 2; // only flag a real collector (>=3 incoming)
    indeg.forEach((v, k) => { if (v > bestN) { bestN = v; best = k; } });
    return best;
  }

  /* ---------- graph ---------- */
  function drawGraph() {
    const svg = $('#graph'), wrap = $('#graphWrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);

    if (!current) { svg.innerHTML = ''; $('#graphHint').textContent = ''; return; }

    const { loopSet } = flowSequence();
    const indeg = inDegree();
    const collectorId = topCollector(indeg);

    let defs = `
      <defs>
        ${marker('arrow')}
        ${marker('arrowS')}
        ${marker('arrowL')}
      </defs>`;

    const sstyle = (current.theme && current.theme.strongStyle) || 'classic';
    const edgesSvg = current.edges.map((e) => {
      const g = edgeGeom(e); if (!g) return '';
      const isLoop = e.strong && loopSet.has(e.from) && loopSet.has(e.to) && strongOut(e.from) === e.to;
      const cls = 'edge' + (e.strong ? ' strong style-' + sstyle : '') + (isLoop ? ' loop' : '');
      const mk = isLoop ? 'arrowL' : (e.strong ? 'arrowS' : 'arrow');
      let deco = '';
      if (e.strong && sstyle === 'classic') deco = strongTicks(g.slash); // de Bono ‖
      // 'flow' = animated via CSS (.style-flow .line); 'arrow' = plain end arrowhead, no mid mark
      return `<g class="${cls}" data-edge="${e.id}">
        <path class="hit" d="${g.d}"></path>
        <path class="line" d="${g.d}" marker-end="url(#${mk})"></path>
        ${deco}
      </g>`;
    }).join('');

    const nodesSvg = current.nodes.map((n) => {
      const attrs = [`data-node="${n.id}"`, 'class="gnode"'];
      if (current.entryId === n.id) attrs.push('data-entry="1"');
      if (loopSet.has(n.id)) attrs.push('data-loop="1"');
      if (n.id === collectorId) attrs.push('data-collector="1"');
      if (n.id === selectedNodeId) attrs.push('data-selected="1"');
      const hat = n.hat && HATS[n.hat];
      const circleStyle = hat ? ` style="fill:${hat.c}"` : '';
      const labelStyle = hat ? ` style="fill:${hat.t}"` : '';
      const cap2 = hat ? `${hat.n} · ${cap(n.text)}` : cap(n.text);
      const outerRing = current.entryId === n.id ? `<circle class="entry-ring" r="${R + 8}"></circle>` : '';
      return `<g ${attrs.join(' ')} transform="translate(${n.x},${n.y})">
        <title>${esc(hat ? hat.n + ' (' + hat.m + ') — ' + n.text : n.text)}</title>
        ${outerRing}<circle r="${R}"${circleStyle}></circle>
        <text class="node-label" y="1"${labelStyle}>${esc(n.label)}</text>
        <text class="node-cap" y="${R + 14}">${esc(cap2)}</text>
      </g>`;
    }).join('');

    const v = getView();
    svg.innerHTML = defs +
      `<g class="viewport" transform="translate(${v.x},${v.y}) scale(${v.z})">${edgesSvg}${nodesSvg}</g>`;

    // hint
    const loopLabels = current.nodes.filter((n) => loopSet.has(n.id)).map((n) => n.label).join('-');
    const entry = current.entryId ? nodeById(current.entryId)?.label : '—';
    $('#graphHint').textContent =
      `${current.nodes.length} nodes · entry ${entry}` + (loopLabels ? ` · loop ${loopLabels}` : ' · no loop') +
      ` · ${Math.round(v.z * 100)}%`;
  }

  function marker(id) {
    // fill is set via CSS (#graph #<id> path) so it can use theme custom properties
    return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z"></path></marker>`;
  }

  function edgeGeom(e) {
    const a = nodeById(e.from), b = nodeById(e.to);
    if (!a || !b) return null;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;        // along edge
    const px = -uy, py = ux;                       // perpendicular
    const recip = current.edges.some((o) => o.from === e.to && o.to === e.from);
    const sx = a.x + ux * R, sy = a.y + uy * R;
    const ex = b.x - ux * R, ey = b.y - uy * R;
    if (recip) {
      const off = 22;
      const mx = (sx + ex) / 2 + px * off, my = (sy + ey) / 2 + py * off;
      return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, sx, sy, ex, ey, recip: true, mx, my,
               slash: { x: sx + ux * 16 + px * off * 0.25, y: sy + uy * 16 + py * off * 0.25, ux, uy, px, py } };
    }
    return { d: `M ${sx} ${sy} L ${ex} ${ey}`, sx, sy, ex, ey, recip: false,
             slash: { x: sx + ux * 20, y: sy + uy * 20, ux, uy, px, py } };
  }

  // de Bono double-slash marking the favored (strong) path:
  // two short bars crossing the path perpendicularly (‖), as in the deck.
  function strongTicks(s) {
    const len = 6, gap = 4.5;             // half-length across the line, spacing along it
    const dx = s.px, dy = s.py;           // perpendicular to the edge (straight ticks)
    const seg = (k, cls) => {
      const cx = s.x + s.ux * k, cy = s.y + s.uy * k;
      const x1 = cx - dx * len, y1 = cy - dy * len, x2 = cx + dx * len, y2 = cy + dy * len;
      return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
    };
    // thin halo under each tick so it stays legible on top of the line
    return seg(-gap, 'slash-halo') + seg(gap, 'slash-halo') + seg(-gap, 'slash') + seg(gap, 'slash');
  }

  /* ============================================================
     INTERACTIONS — graph drag, context menus
     ============================================================ */
  let selectedNodeId = null;

  function initGraphEvents() {
    const svg = $('#graph');
    let drag = null, pan = null, moved = false, raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawGraph(); }); };

    svg.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const g = e.target.closest('[data-node]');
      moved = false;
      if (g) { // drag node (in world coords)
        const n = nodeById(g.dataset.node), pt = worldPoint(e);
        drag = { n, dx: n.x - pt.x, dy: n.y - pt.y };
        g.classList.add('dragging');
      } else { // pan the canvas
        const v = getView(), sp = svgPoint(e);
        pan = { sx: sp.x, sy: sp.y, vx: v.x, vy: v.y };
        svg.classList.add('panning');
      }
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (drag) {
        const pt = worldPoint(e);
        drag.n.x = pt.x + drag.dx; drag.n.y = pt.y + drag.dy;
        clampNode(drag.n); moved = true; schedule();
      } else if (pan) {
        const sp = svgPoint(e), v = getView();
        v.x = pan.vx + (sp.x - pan.sx); v.y = pan.vy + (sp.y - pan.sy);
        moved = true; schedule();
      }
    });
    window.addEventListener('mouseup', () => {
      if (drag) {
        const wasClick = !moved, nodeId = drag.n.id;
        drag = null;
        if (moved) saveSoon(); else { selectedNodeId = nodeId; }
        drawGraph();
      } else if (pan) {
        if (!moved) selectedNodeId = null;
        pan = null; svg.classList.remove('panning');
        if (moved) saveSoon();
      }
    });

    // wheel = zoom toward cursor (gentle step + short cooldown so fast scroll doesn't race)
    let lastWheel = 0;
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const t = performance.now();
      if (t - lastWheel < 70) return;
      lastWheel = t;
      const sp = svgPoint(e);
      zoomBy(e.deltaY < 0 ? 1.06 : 1 / 1.06, sp.x, sp.y);
    }, { passive: false });

    // double-click node -> edit text
    svg.addEventListener('dblclick', (e) => {
      const g = e.target.closest('[data-node]');
      if (g) openEditText(g.dataset.node);
    });

    // right-click context menus
    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const gn = e.target.closest('[data-node]');
      const ge = e.target.closest('[data-edge]');
      if (gn) openNodeMenu(gn.dataset.node, e.clientX, e.clientY);
      else if (ge) openEdgeMenu(ge.dataset.edge, e.clientX, e.clientY);
      else { const wp = worldPoint(e); openCanvasMenu(wp.x, wp.y, e.clientX, e.clientY); }
    });

    // zoom controls
    $('#zoomIn').addEventListener('click', () => zoomBy(1.2));
    $('#zoomOut').addEventListener('click', () => zoomBy(1 / 1.2));
    $('#zoomFit').addEventListener('click', fitView);

    // keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'Escape') {
        const menu = $('#ctxMenu'); menu.hidden = true; menu.innerHTML = '';
        const top = $('#modalRoot').lastElementChild; if (top) top.remove();
        selectedNodeId = null; drawGraph();
      }
      if (e.key === 'f' || e.key === 'F') fitView();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault(); snapshot(); deleteNode(selectedNodeId); selectedNodeId = null; render();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
    });
  }

  function svgPoint(e) {
    const r = $('#graph').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  // pan/zoom view (persisted per Flowscape): screen = world * z + (x,y)
  function getView() { if (!current.view) current.view = { z: 1, x: 0, y: 0 }; return current.view; }
  function worldPoint(e) { const sp = svgPoint(e), v = getView(); return { x: (sp.x - v.x) / v.z, y: (sp.y - v.y) / v.z }; }

  function setZoom(z, px, py) {
    const v = getView(), wrap = $('#graphWrap');
    if (px == null) { px = wrap.clientWidth / 2; py = wrap.clientHeight / 2; }
    const nz = Math.max(0.3, Math.min(3, z));
    const wx = (px - v.x) / v.z, wy = (py - v.y) / v.z;   // world point under the pivot
    v.z = nz; v.x = px - wx * nz; v.y = py - wy * nz;       // keep that point fixed
    drawGraph(); save();
  }
  function zoomBy(f, px, py) { setZoom(getView().z * f, px, py); }
  function fitView() {
    const v = getView(), wrap = $('#graphWrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!current.nodes.length) { v.z = 1; v.x = 0; v.y = 0; drawGraph(); save(); return; }
    const xs = current.nodes.map((n) => n.x), ys = current.nodes.map((n) => n.y);
    const minX = Math.min(...xs) - R, maxX = Math.max(...xs) + R;
    const minY = Math.min(...ys) - R, maxY = Math.max(...ys) + R + 18; // include caption
    const pad = 40, bw = (maxX - minX) || 1, bh = (maxY - minY) || 1;
    const z = Math.max(0.3, Math.min(3, Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh)));
    v.z = z;
    v.x = w / 2 - ((minX + maxX) / 2) * z;
    v.y = h / 2 - ((minY + maxY) / 2) * z;
    drawGraph(); save();
  }

  /* ---------- context menu builder ---------- */
  function showMenu(items, x, y) {
    const menu = $('#ctxMenu');
    menu.innerHTML = '';
    items.forEach((it) => {
      if (it.sep) { const s = document.createElement('div'); s.className = 'sep'; menu.appendChild(s); return; }
      if (it.title) { const t = document.createElement('div'); t.className = 'ctx-title'; t.textContent = it.title; menu.appendChild(t); return; }
      if (it.hatPicker) {
        const row = document.createElement('div'); row.className = 'hat-row';
        const none = document.createElement('button');
        none.className = 'hat-chip' + (!it.current ? ' sel' : ''); none.dataset.none = '1';
        none.textContent = '∅'; none.title = 'No hat';
        none.addEventListener('click', () => { hideMenu(); setHat(it.hatPicker, null); render(); });
        row.appendChild(none);
        HAT_ORDER.forEach((k) => {
          const h = HATS[k];
          const b = document.createElement('button');
          b.className = 'hat-chip' + (it.current === k ? ' sel' : '');
          b.style.background = h.c; b.title = `${h.n} · ${h.m}`;
          b.addEventListener('click', () => { hideMenu(); setHat(it.hatPicker, k); render(); });
          row.appendChild(b);
        });
        menu.appendChild(row); return;
      }
      const b = document.createElement('button');
      b.textContent = it.label;
      if (it.danger) b.className = 'danger';
      b.addEventListener('click', () => { hideMenu(); it.action(); });
      menu.appendChild(b);
    });
    menu.hidden = false;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.min(x, innerWidth - mw - 8) + 'px';
    menu.style.top = Math.min(y, innerHeight - mh - 8) + 'px';
  }
  function hideMenu() { $('#ctxMenu').hidden = true; }
  window.addEventListener('click', hideMenu);
  window.addEventListener('scroll', hideMenu, true);

  function openNodeMenu(id, x, y) {
    const n = nodeById(id);
    const items = [
      { title: `${n.label} · ${cap(n.text, 24)}` },
      { label: '★ Set as entry', action: () => { setEntry(id); render(); } },
      { label: '✎ Edit text', action: () => openEditText(id) },
      { label: '→ Add path TO…', action: () => openAddPath(id) },
      { title: 'Thinking hat' },
      { hatPicker: id, current: n.hat },
    ];
    if (strongOut(id)) items.push({ label: '⌫ Clear strong path', action: () => { current.edges.forEach((e) => { if (e.from === id) e.strong = false; }); render(); } });
    items.push({ sep: true });
    items.push({ label: '🗑 Delete node', danger: true, action: () => { snapshot(); deleteNode(id); render(); } });
    showMenu(items, x, y);
  }

  function openEdgeMenu(id, x, y) {
    const e = current.edges.find((x) => x.id === id); if (!e) return;
    const from = nodeById(e.from)?.label, to = nodeById(e.to)?.label;
    showMenu([
      { title: `${from} → ${to}` },
      { label: e.strong ? '↓ Make normal path' : '↑ Make strong path', action: () => { toggleEdgeStrong(id); render(); } },
      { sep: true },
      { label: '🗑 Delete path', danger: true, action: () => { snapshot(); deleteEdge(id); render(); } },
    ], x, y);
  }

  function openCanvasMenu(sx, sy, cx, cy) {
    showMenu([
      { label: '＋ Add node here', action: () => openAddNodeAt(sx, sy) },
    ], cx, cy);
  }

  /* ============================================================
     MODALS
     ============================================================ */
  const ABOUT_HTML = `
<div class="info-modal-body">
<p>Flowscape maps a problem as a flow of connected thoughts — not a hierarchy,
not a pros/cons list. You follow where each idea <em>leads</em>, until loops emerge.</p>
<ol>
<li><strong>Add nodes</strong> — type a one-liner per thought, press Enter. Each gets a label (A, B, C…).</li>
<li><strong>Connect</strong> — right-click a node → <em>Add path TO…</em> Ask: "what does this naturally lead to?"</li>
<li><strong>Weight</strong> — right-click an edge → <em>Make strong path</em> to mark the most likely direction.</li>
<li><strong>Set entry</strong> — click ★ on any node. The list reorders along the strong-path flow.</li>
<li><strong>Read the structure</strong> — a node many paths feed into is a <strong>Collector</strong>; a cycle the flow settles into is a <strong>Stable loop</strong>. Change a weight or add a node to shift which loop dominates.</li>
</ol>
<p class="info-quote">"From any input, any system with a finite number of states and a tiring factor will always reach a stable repeating loop." — Edward de Bono</p>
</div>`;

  const MIT_HTML = `
<div class="info-modal-body">
<p><strong>MIT License</strong></p>
<p>Copyright © 2026 iprobot</p>
<p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
<p>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
<p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
</div>`;

  function openConfirmModal(title, msg, onConfirm) {
    const root = $('#modalRoot');
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>
      <div class="modal-body"><p class="confirm-msg">${esc(msg)}</p></div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" id="cfmCancel">Cancel</button>
        <button type="button" class="btn primary danger" id="cfmOk">Confirm</button>
      </div>
    </div>`;
    root.appendChild(back);
    back.querySelector('#cfmCancel').addEventListener('click', () => back.remove());
    back.querySelector('#cfmOk').addEventListener('click', () => { back.remove(); onConfirm(); });
    back.addEventListener('mousedown', (e) => { if (e.target === back) back.remove(); });
  }

  function openInfoModal(title, html) {
    const root = $('#modalRoot');
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal info-modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>
      <div class="modal-body">${html}</div>
      <div class="modal-actions"><button type="button" class="btn primary" id="infoClose">Close</button></div>
    </div>`;
    root.appendChild(back);
    const close = () => { back.remove(); };
    back.querySelector('#infoClose').addEventListener('click', close);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelector('.modal').addEventListener('mousedown', (e) => e.stopPropagation());
  }

  function openModal(title, buildBody, onOk, okText = 'Save') {
    const root = $('#modalRoot');
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <form class="modal-body"></form>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-cancel>Cancel</button>
          <button type="submit" class="btn primary" data-ok>${esc(okText)}</button>
        </div>
      </div>`;
    const form = back.querySelector('.modal-body');
    const wrap = back.querySelector('.modal');
    buildBody(form);
    root.appendChild(back);

    const onEsc = (ev) => { if (ev.key === 'Escape') close(); };
    const close = () => {
      if (back.parentNode) root.removeChild(back);
      document.removeEventListener('keydown', onEsc);
    };
    const submit = (e) => { e?.preventDefault(); if (onOk(form) !== false) close(); };
    wrap.querySelector('[data-cancel]').addEventListener('click', close);
    wrap.querySelector('[data-ok]').addEventListener('click', submit);
    form.addEventListener('submit', submit);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', onEsc);
    const first = form.querySelector('input, textarea, select'); if (first) first.focus();
  }

  function field(label, inputHtml) {
    return `<div class="field"><label>${esc(label)}</label>${inputHtml}</div>`;
  }

  function openEditText(id) {
    const n = nodeById(id);
    openModal('Edit node', (form) => {
      form.innerHTML = field('One-liner', `<textarea name="text">${esc(n.text)}</textarea>`);
    }, (form) => { setText(id, form.text.value); render(); });
  }

  function openAddNodeAt(x, y) {
    openModal('Add node', (form) => {
      form.innerHTML = field('One-liner', `<input type="text" name="text" placeholder="What is it?" />`);
    }, (form) => {
      const v = form.text.value.trim(); if (!v) return false;
      addNode(v, x, y); render();
    }, 'Add');
  }

  function openAddPath(fromId) {
    const others = current.nodes.filter((n) => n.id !== fromId);
    if (!others.length) { alert('Add another node first.'); return; }
    openModal('Add path TO…', (form) => {
      const opts = others.map((n) => `<option value="${n.id}">${esc(n.label)} · ${esc(cap(n.text, 30))}</option>`).join('');
      form.innerHTML =
        field('Leads to', `<select name="to">${opts}</select>`) +
        `<div class="field"><label>Weight</label><div class="radio-row">
           <label><input type="radio" name="w" value="strong" checked> Strong (favored)</label>
           <label><input type="radio" name="w" value="normal"> Normal</label>
         </div></div>`;
    }, (form) => {
      setEdge(fromId, form.to.value, form.w.value === 'strong'); render();
    }, 'Add path');
  }

  function openNewFlowscape() {
    openModal('New Flowscape', (form) => {
      form.innerHTML = field('Name (problem domain)', `<input type="text" name="name" value="Flowscape ${store.flowscapes.length + 1}" />`);
    }, (form) => {
      const fs = makeFlowscape(form.name.value.trim());
      store.flowscapes.push(fs); setCurrent(fs.id); render();
    }, 'Create');
  }

  function openRename() {
    if (!current) return;
    openModal('Rename Flowscape', (form) => {
      form.innerHTML = field('Name', `<input type="text" name="name" value="${esc(current.name)}" />`);
    }, (form) => { const v = form.name.value.trim(); if (v) current.name = v; render(); });
  }

  /* ============================================================
     TOOLBAR WIRING
     ============================================================ */
  function initToolbar() {
    $('#fsSelect').addEventListener('change', (e) => { setCurrent(e.target.value); render(); requestAnimationFrame(fitView); });
    $('#fsNew').addEventListener('click', openNewFlowscape);
    $('#fsRename').addEventListener('click', openRename);
    $('#fsExample').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      showMenu(
        [{ title: 'Load example' }].concat(EXAMPLES.map((def) => ({ label: def.name, action: () => loadExample(def) }))),
        r.left, r.bottom + 4,
      );
    });
    $('#fsReset').addEventListener('click', () => {
      openConfirmModal('Reset everything?', 'Deletes ALL saved Flowscapes from this browser and reloads. This cannot be undone.', () => {
        localStorage.removeItem(STORE_KEY); location.reload();
      });
    });
    $('#fsExport').addEventListener('click', () => {
      if (!current) return;
      const data = JSON.stringify({ flowscapes: [current] });
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const slug = current.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('#fsImport').addEventListener('click', () => $('#fsImportFile').click());
    $('#fsImportFile').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported.flowscapes)) throw new Error('Invalid format');
          const existing = store.flowscapes.map((f) => f.id);
          const added = imported.flowscapes.filter((f) => !existing.includes(f.id));
          if (!added.length) { openInfoModal('Import', '<div class="info-modal-body"><p>Already up to date — no new Flowscapes were added.</p></div>'); }
          else {
            added.forEach((f) => store.flowscapes.push(f));
            if (!store.currentId && store.flowscapes.length) store.currentId = store.flowscapes[0].id;
            setCurrent(added[0].id); render();
          }
        } catch {
          alert('Import failed: not a valid Flowscape JSON file.');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    $('#fsDelete').addEventListener('click', () => {
      if (!current) return;
      openConfirmModal(`Delete "${current.name}"?`, 'This Flowscape will be permanently removed.', () => {
        store.flowscapes = store.flowscapes.filter((f) => f.id !== current.id);
        if (!store.flowscapes.length) store.flowscapes.push(makeFlowscape('My Flowscape'));
        setCurrent(store.flowscapes[0].id); render();
      });
    });

    $('#paletteSelect').addEventListener('change', (e) => {
      if (current) current.theme.palette = e.target.value;
      document.documentElement.dataset.palette = e.target.value; save();
    });
    $('#strongStyle').addEventListener('change', (e) => {
      if (current) current.theme.strongStyle = e.target.value;
      drawGraph(); save();
    });
    $('#modeToggle').addEventListener('click', () => {
      const next = (current?.theme.mode === 'dark') ? 'light' : 'dark';
      if (current) current.theme.mode = next;
      document.documentElement.dataset.mode = next;
      $('#modeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
      save();
    });

    $('#toggleList').addEventListener('click', () => {
      store.ui.showList = !store.ui.showList;
      if (!store.ui.showList && !store.ui.showGraph) store.ui.showGraph = true; // keep one visible
      applyLayout(); save(); requestAnimationFrame(drawGraph);
    });
    $('#toggleGraph').addEventListener('click', () => {
      store.ui.showGraph = !store.ui.showGraph;
      if (!store.ui.showGraph && !store.ui.showList) store.ui.showList = true;
      applyLayout(); save(); requestAnimationFrame(drawGraph);
    });

    const addForm = $('#addForm');
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('#addInput'); const v = inp.value.trim();
      if (!v) return;
      addNode(v); inp.value = ''; render();
    });

    $('#searchInput').addEventListener('input', applySearch);

    $('#footerAbout').addEventListener('click', () => openInfoModal('How to use Flowscape', ABOUT_HTML));
    $('#footerMit').addEventListener('click', () => openInfoModal('MIT License', MIT_HTML));
    $('#landingAbout').addEventListener('click', () => openInfoModal('How to use Flowscape', ABOUT_HTML));
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function cap(s, n = 18) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- thought-scape examples ----------
     node tuple: [label, text, strong-target, x, y, hat] */
  const EXAMPLES = [
    {
      name: 'The Avoidance Cycle', entry: 'A',
      nodes: [
        ['A', 'Task feels too large to start',     'B', 110, 240, 'white'],
        ['B', 'Find something easier to do',        'C', 300, 100, 'green'],
        ['C', 'Guilt and low energy build up',      'D', 550, 100, 'red'],
        ['D', 'Deadline closes in',                 'E', 680, 240, 'black'],
        ['E', 'Panic-mode rush',                    'F', 550, 380, 'black'],
        ['F', 'Poor result deepens the dread',      'B', 300, 380, 'red'],
      ],
    },
    {
      name: 'The Scroll Trap', entry: 'A',
      nodes: [
        ['A', 'Bored or avoiding something',        'B', 100, 270, 'white'],
        ['B', 'Open social media',                  'C', 270, 270, 'white'],
        ['C', 'Endless scroll for stimulation',     'D', 430, 140, 'green'],
        ['D', 'Compare self to curated highlights', 'E', 630, 190, 'red'],
        ['E', 'Feel inadequate or envious',         'F', 770, 330, 'red'],
        ['F', 'Post something for validation',      'G', 670, 460, 'yellow'],
        ['G', 'Anxiety waiting for reactions',      'H', 460, 490, 'black'],
        ['H', 'Check app compulsively',             'C', 270, 420, 'black'],
        ['I', 'FOMO from a notification',           'B', 110, 110, 'red'],
        ['J', 'Real priorities quietly suffer',     'D', 800, 100, 'black'],
      ],
    },
    {
      name: 'The Mastery Path', entry: 'A',
      nodes: [
        ['A', 'Decide to learn something new',       'B', 110, 280, 'blue'],
        ['B', 'First attempts are clumsy',           'C', 290, 150, 'white'],
        ['C', 'Experts make it look effortless',     'D', 490, 100, 'white'],
        ['D', 'Feel like an imposter',               'E', 680, 170, 'red'],
        ['E', 'Tempted to quit entirely',            'F', 780, 320, 'black'],
        ['F', 'One small thing finally clicks',      'G', 700, 470, 'yellow'],
        ['G', 'Return to practice with new energy',  'H', 510, 530, 'green'],
        ['H', 'Progress becomes visible',            'I', 310, 470, 'yellow'],
        ['I', 'Others notice and ask questions',     'J', 160, 340, 'green'],
        ['J', 'Teaching others deepens mastery',     'K', 370, 350, 'blue'],
        ['K', 'New gaps in knowledge surface',       'J', 560, 380, 'white'],
      ],
    },
  ];

  function buildExample(def) {
    const fs = makeFlowscape(def.name);
    const byLabel = {};
    def.nodes.forEach(([label, text, , x, y, hat]) => {
      const n = { id: uid(), label, text, x, y };
      if (hat) n.hat = hat;
      fs.nodes.push(n); byLabel[label] = n.id;
    });
    def.nodes.forEach(([label, , to]) => {
      if (to && byLabel[to]) fs.edges.push({ id: uid(), from: byLabel[label], to: byLabel[to], strong: true });
    });
    fs.entryId = byLabel[def.entry] || (fs.nodes[0] && fs.nodes[0].id) || null;
    return fs;
  }

  function loadExample(def) {
    const fresh = buildExample(def);
    const existing = store.flowscapes.find((f) => f.name === fresh.name);
    if (existing) { // reuse in place so examples never accumulate duplicates
      existing.nodes = fresh.nodes;
      existing.edges = fresh.edges;
      existing.entryId = fresh.entryId;
      setCurrent(existing.id);
    } else {
      store.flowscapes.push(fresh); setCurrent(fresh.id);
    }
    render(); requestAnimationFrame(fitView);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    load();
    if (!store.flowscapes.length) {
      store.flowscapes.push(buildExample(EXAMPLES[0]));
    }
    setCurrent(store.currentId && store.flowscapes.some((f) => f.id === store.currentId)
      ? store.currentId : store.flowscapes[0].id);

    const landing = document.getElementById('landing');
    const toolbar = document.querySelector('.toolbar');
    const workspace = document.querySelector('.workspace');

    function hideLanding() {
      landing.classList.add('landing-out');
      landing.addEventListener('transitionend', () => {
        landing.classList.add('landing-hidden');
        landing.classList.remove('landing-out');
        toolbar.style.visibility = '';
        workspace.style.visibility = '';
      }, { once: true });
      store.ui.seen = true;
      save();
    }

    function showLanding() {
      landing.classList.remove('landing-hidden', 'landing-out');
      toolbar.style.visibility = 'hidden';
      workspace.style.visibility = 'hidden';
    }

    if (landing) {
      if (store.ui?.seen) {
        landing.classList.add('landing-hidden');
      } else {
        toolbar.style.visibility = 'hidden';
        workspace.style.visibility = 'hidden';
      }
      document.getElementById('enterBtn').addEventListener('click', hideLanding);
      document.querySelector('.brand').addEventListener('click', showLanding);
    }

    initToolbar();
    initGraphEvents();
    render(); requestAnimationFrame(fitView);
    addEventListener('resize', drawGraph);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
