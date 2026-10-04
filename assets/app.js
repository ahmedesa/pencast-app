/* PenCast landing — vanilla JS, no dependencies, no network calls. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = /[?&]still\b/.test(location.search); // used for deterministic screenshots

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var themeBtn = $('#themeBtn');
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('pc-theme', next); } catch (e) {}
    demo && demo.restyle();
  });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { demo && demo.restyle(); });

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menuBtn'), nav = $('#nav');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });
  }

  /* ---------- tabs (WAI-ARIA pattern) ---------- */
  $$('[data-tabs]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- scroll reveal ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !still && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('in'); });

  /* ---------- OS-aware download CTAs ---------- */
  (function () {
    var ua = navigator.userAgent || '';
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Mac/i.test(plat + ua) ? 'mac' : /Win/i.test(plat + ua) ? 'win' : 'other';
    var cta = $('#ctaDesk');
    if (cta && (os === 'mac' || os === 'win')) {
      cta.textContent = os === 'mac' ? 'Download for Mac' : 'Download for Windows';
      cta.href = os === 'mac' ? 'https://github.com/ahmedesa/pencast-app/releases/latest/download/PenCast.dmg' : 'https://github.com/ahmedesa/pencast-app/releases/latest/download/PenCast-Setup.exe';
      cta.setAttribute('data-cta', 'hero-desktop-' + os);
    }
    var card = $('.dl[data-os="' + os + '"]');
    if (card) card.classList.add('you');
  })();

  /* ---------- pressure-curve playground (illustration) ---------- */
  (function () {
    var slider = $('#curve'); if (!slider) return;
    var cp = $('#curvePath'), shape = $('#strokeShape');
    function f(x, g) { return Math.pow(x, g); }
    function update() {
      var g = 0.45 + (slider.value / 100) * 1.9; // soft (<1) ... firm (>1)
      var d = 'M16 150', i, x, y;
      for (i = 0; i <= 24; i++) { x = i / 24; y = f(x, g); d += ' L' + (16 + x * 110).toFixed(1) + ' ' + (150 - y * 120).toFixed(1); }
      cp.setAttribute('d', d);
      // stroke whose width follows curve(pressure), pressure is a light-heavy-light bell
      var top = [], bot = [], N = 60, X0 = 150, X1 = 304, cy = 92;
      for (i = 0; i <= N; i++) {
        var t = i / N, p = Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.sin(t * 5)); p = Math.max(0.03, Math.min(1, p));
        var w = 1.5 + f(p, g) * 20, px = X0 + t * (X1 - X0), py = cy + Math.sin(t * 6.2) * 22;
        top.push([px, py - w / 2]); bot.push([px, py + w / 2]);
      }
      var path = 'M' + top.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' L' + bot.reverse().map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
      shape.setAttribute('d', path);
    }
    slider.addEventListener('input', update); update();
  })();

  /* ---------- hero demo: tablet -> laptop ---------- */
  var demo = (function () {
    var tabC = $('#tabCanvas'), lapC = $('#lapCanvas'), stage = $('#stage'); if (!tabC || !lapC) return null;
    var tctx = tabC.getContext('2d'), lctx = lapC.getContext('2d');
    var flight = $('#flight'), rail = $('#rail'), pk = $('#packets'), cursor = $('#cursor'), hint = $('#hint');
    var rx = $('#rx'), ry = $('#ry'), rp = $('#rp'), rt = $('#rt'), rh = $('#rh'), src = $('#srcLabel');
    var strokes = [], cur = null, dpr = 1, tw = 0, th = 0, lw = 0, lh = 0, colA = '#3b4bd8', colB = '#7b3fe0', trail = '#555', sig = '#e8431d';
    var user = false, playing = false, timer = 0, raf = 0, packets = [], lastSpawn = 0, visible = true;
    var P = [];
    for (var k = 0; k < 14; k++) { var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '3.6'); pk.appendChild(c); P.push({ el: c, t: 1 }); }

    function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
    function restyle() { colA = css('--stroke-a') || colA; colB = css('--stroke-b') || colB; trail = css('--trail') || trail; sig = css('--signal') || sig; redraw(); }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var a = tabC.getBoundingClientRect(), b = lapC.getBoundingClientRect();
      tw = a.width; th = a.height; lw = b.width; lh = b.height;
      tabC.width = Math.round(tw * dpr); tabC.height = Math.round(th * dpr);
      lapC.width = Math.round(lw * dpr); lapC.height = Math.round(lh * dpr);
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0); lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutRail();
    }
    function layoutRail() {
      var s = stage.getBoundingClientRect(), a = tabC.getBoundingClientRect(), b = lapC.getBoundingClientRect(), d;
      flight.setAttribute('viewBox', '0 0 ' + s.width + ' ' + s.height);
      if (s.width > 820) {
        var x1 = a.right - s.left - 6, y1 = a.top - s.top + a.height * 0.5, x2 = b.left - s.left + 6, y2 = b.top - s.top + b.height * 0.5;
        var mx = (x1 + x2) / 2; d = 'M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + (y1 - 70) + ', ' + mx + ' ' + (y2 - 70) + ', ' + x2 + ' ' + y2;
      } else {
        var x = a.left - s.left + a.width * 0.5, ya = a.bottom - s.top - 4, yb = b.top - s.top + 4;
        d = 'M' + x + ' ' + ya + ' C ' + (x + 60) + ' ' + (ya + (yb - ya) * 0.3) + ', ' + (x - 60) + ' ' + (ya + (yb - ya) * 0.7) + ', ' + x + ' ' + yb;
      }
      rail.setAttribute('d', d);
    }

    /* drawing model: strokes of {u,v,p,tilt} in 0..1 space (same aspect on both screens) */
    function widthL(p) { return (1.6 + p * 15) * (lw / 560); }
    function drawSeg(ctx, w, h, a, b, kind, grad) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (kind === 'lap') {
        ctx.strokeStyle = grad; ctx.lineWidth = widthL((a.p + b.p) / 2);
      } else { ctx.strokeStyle = trail; ctx.lineWidth = 1.6; }
      ctx.beginPath(); ctx.moveTo(a.u * w, a.v * h); ctx.lineTo(b.u * w, b.v * h); ctx.stroke();
      if (kind === 'tab') { ctx.globalAlpha = 0.16; ctx.lineWidth = 3 + b.p * 16; ctx.stroke(); ctx.globalAlpha = 1; }
    }
    function lapGrad() { var g = lctx.createLinearGradient(0, 0, lw, 0); g.addColorStop(0, colA); g.addColorStop(1, colB); return g; }
    function redraw() {
      if (!tw) return;
      tctx.clearRect(0, 0, tw, th); lctx.clearRect(0, 0, lw, lh);
      var g = lapGrad();
      strokes.forEach(function (s) {
        for (var i = 1; i < s.length; i++) { drawSeg(tctx, tw, th, s[i - 1], s[i], 'tab'); drawSeg(lctx, lw, lh, s[i - 1], s[i], 'lap', g); }
        if (s.length === 1) dot(s[0]);
      });
    }
    function dot(pt) { lctx.fillStyle = lapGrad(); lctx.beginPath(); lctx.arc(pt.u * lw, pt.v * lh, widthL(pt.p) / 2, 0, 7); lctx.fill(); }
    function addPoint(pt) {
      var s = cur; if (!s) return;
      var prev = s[s.length - 1]; s.push(pt);
      if (prev) { drawSeg(tctx, tw, th, prev, pt, 'tab'); drawSeg(lctx, lw, lh, prev, pt, 'lap', lapGrad()); } else dot(pt);
      show(pt, true);
      var now = performance.now();
      if (now - lastSpawn > 55) { lastSpawn = now; spawn(); }
    }
    function show(pt, down, real) {
      cursor.style.left = (pt.u * lw) + 'px'; cursor.style.top = (pt.v * lh) + 'px';
      cursor.classList.add('on'); cursor.classList.toggle('down', !!down);
      rx.textContent = pt.u.toFixed(2); ry.textContent = pt.v.toFixed(2); rp.textContent = pt.p.toFixed(2);
      rt.textContent = pt.tilt ? Math.round(pt.tilt) + '\u00b0' : '\u2014'; rh.textContent = down ? 'off (touching)' : 'on';
    }

    /* packets flying along the rail */
    function spawn() {
      for (var i = 0; i < P.length; i++) if (P[i].t >= 1) { P[i].t = 0; P[i].s = performance.now(); return; }
    }
    var railLen = 0;
    function tickPackets(now) {
      railLen = rail.getTotalLength ? rail.getTotalLength() : 0; if (!railLen) return;
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; if (p.t >= 1) { if (p.el.style.opacity !== '0') p.el.style.opacity = '0'; continue; }
        p.t = Math.min(1, (now - p.s) / 460);
        var pt = rail.getPointAtLength(p.t * railLen);
        p.el.setAttribute('cx', pt.x); p.el.setAttribute('cy', pt.y);
        p.el.style.opacity = String(Math.sin(Math.PI * p.t) * 0.95);
        p.el.style.fill = sig;
      }
    }
    function loop(now) { raf = requestAnimationFrame(loop); if (!visible) return; tickPackets(now); }

    /* scripted flourish */
    function catmull(pts, n) {
      var out = [];
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        for (var j = 0; j < n; j++) {
          var t = j / n, t2 = t * t, t3 = t2 * t;
          out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
        }
      }
      out.push(pts[pts.length - 1]); return out;
    }
    function script() {
      var a = catmull([[.10, .66], [.18, .40], [.32, .26], [.46, .40], [.40, .62], [.30, .50], [.40, .30], [.58, .20], [.76, .28], [.90, .46]], 14);
      var b = catmull([[.16, .82], [.42, .77], [.70, .80], [.86, .76]], 14);
      function press(pts, shape) { return pts.map(function (p, i) { var t = i / (pts.length - 1); return { u: p[0], v: p[1], p: shape(t), tilt: 18 + 10 * Math.sin(t * 6) }; }); }
      return [press(a, function (t) { return Math.max(.1, Math.min(1, Math.sin(Math.PI * t) * (.7 + .3 * Math.sin(t * 9)) + .08)); }),
              press(b, function (t) { return Math.max(.1, Math.sin(Math.PI * t) * .8); })];
    }
    function setSrc(t) { if (src) src.textContent = t; }
    function playScript(instant) {
      stopScript(); clearAll(); playing = true; setSrc('demo'); var sc = script(), si = 0, pi = 0;
      if (instant) { sc.forEach(function (s) { cur = []; strokes.push(cur); s.forEach(function (pt) { cur.push(pt); }); }); redraw(); var e = sc[0][sc[0].length - 1]; show(e, false); playing = false; hint.classList.add('off'); return; }
      cur = []; strokes.push(cur);
      (function step() {
        if (!playing) return;
        var s = sc[si];
        if (!s) { timer = setTimeout(function () { if (playing) playScript(); }, 2600); return; }
        addPoint(s[pi]); pi++;
        if (pi >= s.length) { var last = s[s.length - 1]; show(last, false); si++; pi = 0; if (sc[si]) { cur = []; strokes.push(cur); timer = setTimeout(step, 420); return; } }
        timer = setTimeout(step, 14);
      })();
    }
    function stopScript() { playing = false; clearTimeout(timer); }
    function clearAll() { strokes = []; cur = null; redraw(); cursor.classList.remove('on'); rh.textContent = 'off'; }

    /* user input via Pointer Events (real pressure/tilt for pens) */
    var scr = $('#tabScreen'), last = null, vsim = 0.4, nPts = 0;
    function norm(e) { var r = tabC.getBoundingClientRect(); return { u: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), v: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; }
    function press(e, n, dt) {
      if (e.pointerType === 'pen' && e.pressure > 0) { setSrc('S Pen / stylus: real pressure'); return e.pressure; }
      setSrc(e.pointerType === 'touch' ? 'finger: simulated pressure' : 'mouse: simulated pressure');
      var sp = dt > 0 && last ? Math.hypot((n.u - last.u) * tw, (n.v - last.v) * th) / dt : 0;
      var target = Math.max(.15, Math.min(1, .95 - sp * .35));
      vsim += (target - vsim) * .35; var ramp = Math.min(1, .35 + nPts * .08); return vsim * ramp;
    }
    var lt = 0;
    scr.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; e.preventDefault();
      var first = !user; user = true; stopScript(); hint.classList.add('off'); if (first) clearAll();
      scr.setPointerCapture(e.pointerId); nPts = 0; vsim = .4; last = null; lt = e.timeStamp;
      cur = []; strokes.push(cur);
      var n = norm(e), p = press(e, n, 0); var pt = { u: n.u, v: n.v, p: p, tilt: tiltOf(e) }; last = pt; addPoint(pt);
    });
    function tiltOf(e) { return e.pointerType === 'pen' ? Math.max(Math.abs(e.tiltX || 0), Math.abs(e.tiltY || 0)) : 0; }
    scr.addEventListener('pointermove', function (e) {
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      if (e.buttons && cur && scr.hasPointerCapture && scr.hasPointerCapture(e.pointerId)) {
        evs.forEach(function (ev) { var n = norm(ev), dt = Math.max(1, ev.timeStamp - lt); lt = ev.timeStamp; nPts++; var pt = { u: n.u, v: n.v, p: press(ev, n, dt), tilt: tiltOf(ev) }; last = pt; addPoint(pt); });
      } else if (!playing) {
        var n2 = norm(e); show({ u: n2.u, v: n2.v, p: 0, tilt: tiltOf(e) }, false);
        if (e.pointerType === 'pen') setSrc('S Pen / stylus: hovering');
      }
    });
    function end(e) {
      if (!cur || !cur.length) return; var l = cur[cur.length - 1];
      addPoint({ u: l.u, v: l.v, p: .08, tilt: 0 }); show(l, false); last = null;
      if (scr.hasPointerCapture && scr.hasPointerCapture(e.pointerId)) scr.releasePointerCapture(e.pointerId);
      cur = null;
    }
    scr.addEventListener('pointerup', end); scr.addEventListener('pointercancel', end);
    scr.addEventListener('pointerleave', function () { if (!cur) cursor.classList.remove('on'); });

    $('#replay').addEventListener('click', function () { user = false; hint.classList.add('off'); if (reduce) playScript(true); else playScript(); });
    $('#clear').addEventListener('click', function () { stopScript(); user = true; clearAll(); hint.classList.remove('off'); setSrc('draw here'); });

    /* visibility: pause everything when off-screen */
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (!visible) { var wasPlaying = playing; stopScript(); stage._resume = wasPlaying; }
      else if (stage._resume && !user && !reduce && !still) { stage._resume = false; playScript(); }
    }, { threshold: .15 }).observe(stage);

    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { size(); redraw(); }, 120); });
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rz); rz = setTimeout(function () { var a = tabC.getBoundingClientRect(); if (Math.abs(a.width - tw) > 1) { size(); redraw(); } else layoutRail(); }, 80); }).observe(stage);

    size(); restyle(); raf = requestAnimationFrame(loop);
    if (still || reduce) playScript(true); else playScript();
    return { restyle: restyle };
  })();
})();
