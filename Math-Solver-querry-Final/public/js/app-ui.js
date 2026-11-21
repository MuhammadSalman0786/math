/* All Math Solver – app-only interface (loaded ONLY inside the installed app / APK, see the
 * is-app script in index.html <head>; the website never loads this file).
 *  - Simple Calculator: a phone-style calculator with its own numeric keypad (+ − × ÷ % . = C ⌫)
 *  - "Simple | Advanced" switch; the advanced solvers keep their maths keyboard unchanged
 *  - "Simple Calculator" at the top of the menu's calculator list
 * Styles live in style.css under .is-app (so the header is right before this file even loads).
 */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('is-app')) return;

  var PREF_KEY = 'ams_app_mode'; // 'simple' (default) or 'advanced'
  var store = {
    get: function () { try { return localStorage.getItem(PREF_KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(PREF_KEY, v); } catch (e) { /* storage blocked */ } }
  };
  var preferSimple = function () { return store.get() !== 'advanced'; };

  // ------------------------------------------------------------------ safe arithmetic evaluator
  // Grammar: expr = term (('+'|'−') term)* ; term = unary (('×'|'÷') unary)* ;
  //          unary = '−' unary | number '%'?
  // "a + b%" means a + (a × b / 100) like phone calculators; a lone "b%" is b / 100.
  function evaluate(src) {
    var s = src.replace(/[+−×÷]+$/, ''); // ignore a trailing operator while typing
    if (!s) return null;
    var i = 0;
    function peek() { return s[i]; }
    function number() {
      var start = i;
      while (i < s.length && /[0-9.]/.test(s[i])) i++;
      if (start === i) throw new Error('syntax');
      // a result such as 1e+21 or 5e-7 can be used again
      if (s[i] === 'e' && /^e[+-]?\d/.test(s.slice(i))) { i++; if (s[i] === '+' || s[i] === '-') i++; while (/\d/.test(s[i] || '')) i++; }
      var t = s.slice(start, i);
      if (t === '.') t = '0';
      var v = parseFloat(t);
      if (!isFinite(v)) throw new Error('syntax');
      return v;
    }
    function unary() {
      if (peek() === '−') { i++; var u = unary(); return { v: -u.v, pct: u.pct, raw: -u.raw }; }
      var n = number();
      if (peek() === '%') { i++; return { v: n / 100, pct: true, raw: n }; }
      return { v: n, pct: false, raw: n };
    }
    function term() {
      var left = unary(), single = true;
      while (peek() === '×' || peek() === '÷') {
        var op = s[i++], r = unary();
        single = false;
        if (op === '×') left = { v: left.v * r.v };
        else { if (r.v === 0) throw new Error('div0'); left = { v: left.v / r.v }; }
      }
      if (!single) left.pct = false;
      return left;
    }
    var acc = term().v;
    while (peek() === '+' || peek() === '−') {
      var op = s[i++], r = term();
      var rv = r.pct ? acc * r.raw / 100 : r.v;
      acc = op === '+' ? acc + rv : acc - rv;
    }
    if (i !== s.length) throw new Error('syntax');
    if (!isFinite(acc)) throw new Error('overflow');
    return parseFloat(acc.toPrecision(12));
  }

  function formatNumber(v) {
    if (v === null || v === undefined) return '';
    if (Object.is(v, -0)) v = 0;
    var abs = Math.abs(v);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return v.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e');
    return v.toLocaleString('en-US', { maximumFractionDigits: 10 });
  }
  // shows the expression with thousands separators, e.g. 12345×6 -> 12,345×6
  function prettyExpr(e) {
    return e.replace(/\d+(\.\d*)?/g, function (m) {
      var parts = m.split('.');
      return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts.length > 1 ? '.' + parts[1] : '');
    });
  }

  // ------------------------------------------------------------------ simple calculator UI
  var expr = '', justEvaluated = false, lastLine = '';
  var els = {};

  function buildSimpleSection() {
    if (document.getElementById('sectionSimple')) return;
    var home = document.getElementById('sectionHome');
    if (!home) return;
    var sec = document.createElement('section');
    sec.id = 'sectionSimple';
    sec.className = 'simple-calc-view';
    sec.setAttribute('aria-label', 'Simple calculator');
    var keys = [
      ['C', 'clear', 'Clear'], ['⌫', 'back', 'Delete'], ['%', 'op', 'Percent'], ['÷', 'op', 'Divide'],
      ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op', 'Multiply'],
      ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op', 'Minus'],
      ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op', 'Plus'],
      ['±', 'sign', 'Change sign'], ['0', 'num'], ['.', 'dot', 'Decimal point'], ['=', 'equals', 'Equals']
    ];
    sec.innerHTML =
      '<div class="simple-calc-card">' +
        '<div class="simple-display" aria-live="polite">' +
          '<div class="simple-last" id="simpleLast"></div>' +
          '<div class="simple-expr" id="simpleExpr">0</div>' +
          '<div class="simple-result" id="simpleResult"></div>' +
        '</div>' +
        '<div class="simple-keypad" id="simpleKeypad">' +
          keys.map(function (k) {
            var label = k[2] ? ' aria-label="' + k[2] + '"' : '';
            var icon = k[0] === '⌫' ? '<i class="fa-solid fa-delete-left" aria-hidden="true"></i>' : k[0];
            return '<button type="button" class="sk sk-' + k[1] + '" data-k="' + k[0] + '"' + label + '>' + icon + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<p class="simple-hint"><i class="fa-solid fa-square-root-variable" aria-hidden="true"></i> Need equations, calculus or steps? Use <button type="button" class="simple-link" data-mode-switch="advanced">Advanced</button></p>';
    home.parentNode.insertBefore(sec, home);
    els.last = sec.querySelector('#simpleLast');
    els.expr = sec.querySelector('#simpleExpr');
    els.result = sec.querySelector('#simpleResult');

    sec.querySelector('#simpleKeypad').addEventListener('click', function (e) {
      var b = e.target.closest('.sk');
      if (!b) return;
      press(b.dataset.k);
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* ignore */ } }
    });
    render();
  }

  function lastNumberRange() {
    var m = expr.match(/(\d*\.?\d*)%?$/);
    var end = expr.length - (expr.endsWith('%') ? 1 : 0);
    var num = m ? m[1] : '';
    return { start: end - num.length, end: end, text: num };
  }

  function press(k) {
    var isOp = function (c) { return c === '+' || c === '−' || c === '×' || c === '÷'; };
    var lastCh = expr.slice(-1);
    if (k === 'C') { expr = ''; justEvaluated = false; lastLine = ''; render(); return; }
    if (k === '⌫') {
      if (justEvaluated) { justEvaluated = false; render(); return; }
      expr = expr.slice(0, -1); render(); return;
    }
    if (k === '=') {
      if (!expr) return;
      try {
        var v = evaluate(expr);
        if (v === null) return;
        lastLine = prettyExpr(expr.replace(/[+−×÷]+$/, '')) + ' =';
        expr = v < 0 ? '−' + String(-v) : String(v);
        justEvaluated = true;
      } catch (err) { showError(err.message); return; }
      render(); return;
    }
    if (/[0-9]/.test(k)) {
      if (justEvaluated) { expr = ''; lastLine = ''; justEvaluated = false; }
      if (lastCh === '%') expr += '×';
      var num = lastNumberRange().text;
      if (num === '0') expr = expr.slice(0, -1); // no leading zeros
      if (num.replace('.', '').length >= 15) return;
      expr += k; render(); return;
    }
    if (k === '.') {
      if (justEvaluated) { expr = ''; lastLine = ''; justEvaluated = false; }
      if (lastCh === '%') expr += '×';
      var n2 = lastNumberRange().text;
      if (n2.indexOf('.') !== -1) return;
      expr += n2 === '' ? '0.' : '.'; render(); return;
    }
    justEvaluated = false;
    if (k === '±') {
      var r = lastNumberRange();
      if (!r.text) { if (expr === '' || isOp(lastCh)) { expr += '−'; render(); } return; }
      var before = expr.slice(0, r.start);
      // a minus right before the number that is a sign (at the start or after another operator)
      if (before.endsWith('−') && (before.length === 1 || isOp(before.slice(-2, -1)))) expr = before.slice(0, -1) + expr.slice(r.start);
      else expr = before + '−' + expr.slice(r.start);
      render(); return;
    }
    if (k === '%') {
      if (/[0-9.]/.test(lastCh)) { expr += '%'; render(); }
      return;
    }
    if (isOp(k)) {
      if (expr === '') { if (k === '−') expr = '−'; else expr = '0' + k; render(); return; }
      if (expr === '−') return;
      if (isOp(lastCh)) {
        // "5×−" : allow a minus sign after × or ÷; otherwise replace the operator
        if (k === '−' && (lastCh === '×' || lastCh === '÷')) { expr += k; render(); return; }
        expr = expr.replace(/[+−×÷]+$/, '') + k; render(); return;
      }
      expr += k; render();
    }
  }

  var errTimer = null;
  function showError(code) {
    if (!els.result) return;
    els.result.textContent = code === 'div0' ? "Can't divide by 0" : code === 'overflow' ? 'Number too large' : 'Check the expression';
    els.result.classList.add('is-error');
    clearTimeout(errTimer);
    errTimer = setTimeout(function () { els.result.classList.remove('is-error'); render(); }, 1600);
  }

  function render() {
    if (!els.expr) return;
    var shown = expr ? prettyExpr(expr) : '0';
    els.expr.textContent = shown;
    els.expr.classList.toggle('is-final', justEvaluated);
    var len = shown.length;
    els.expr.style.fontSize = len > 18 ? '1.6rem' : len > 13 ? '2.1rem' : len > 9 ? '2.6rem' : '';
    els.last.textContent = lastLine;
    els.result.classList.remove('is-error');
    var preview = '';
    if (!justEvaluated && /[+−×÷%]/.test(expr.replace(/^−/, ''))) {
      try { var v = evaluate(expr); if (v !== null) preview = '= ' + formatNumber(v); } catch (e) { preview = ''; }
    }
    els.result.textContent = preview;
  }

  // physical / Bluetooth keyboard in simple mode
  document.addEventListener('keydown', function (e) {
    if (!root.classList.contains('simple-on') || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|MATH-FIELD)$/.test(t.tagName))) return;
    var map = { '+': '+', '-': '−', '*': '×', 'x': '×', '/': '÷', '%': '%', '.': '.', ',': '.', 'Enter': '=', '=': '=', 'Backspace': '⌫', 'Delete': 'C', 'Escape': 'C' };
    var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
    if (!k) return;
    e.preventDefault();
    press(k);
  });

  // ------------------------------------------------------------------ Simple | Advanced switching
  function modeSwitchHtml() {
    return '<div class="app-mode-switch" role="tablist" aria-label="Calculator type">' +
      '<button type="button" role="tab" data-mode-switch="simple"><i class="fa-solid fa-calculator" aria-hidden="true"></i> Simple</button>' +
      '<button type="button" role="tab" data-mode-switch="advanced"><i class="fa-solid fa-square-root-variable" aria-hidden="true"></i> Advanced</button>' +
      '</div>';
  }
  function addModeSwitches() {
    var simple = document.getElementById('sectionSimple'), home = document.getElementById('sectionHome');
    [simple, home].forEach(function (sec) {
      if (sec && !sec.querySelector('.app-mode-switch')) sec.insertAdjacentHTML('afterbegin', modeSwitchHtml());
    });
    syncSwitches();
  }
  function syncSwitches() {
    var on = root.classList.contains('simple-on');
    document.querySelectorAll('.app-mode-switch [data-mode-switch]').forEach(function (b) {
      var active = (b.dataset.modeSwitch === 'simple') === on;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#mobileNavDrawer .mobile-nav-item').forEach(function (a) {
      if (a.id === 'navSimpleCalc') a.classList.toggle('active', on);
      else if (on) a.classList.remove('active');
    });
  }

  function setSimple(on, remember) {
    root.classList.toggle('simple-on', !!on);
    if (remember) store.set(on ? 'simple' : 'advanced');
    if (on) {
      // the maths keyboard belongs to the advanced solvers: close it in the simple calculator
      var mf = document.getElementById('mainExprInput');
      try { if (mf && document.activeElement === mf) mf.blur(); } catch (e) { /* ignore */ }
      try { if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide(); } catch (e) { /* ignore */ }
      document.title = 'Simple Calculator | All Math Solver';
    }
    syncSwitches();
  }

  async function goSimple() {
    if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
    if (location.pathname !== '/' && typeof window.navigateTo === 'function') {
      await window.navigateTo('/', { scroll: false });
    }
    setSimple(true, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function goAdvanced() {
    setSimple(false, true);
    // back to the main maths solver (the advanced keyboard works as before)
    if (typeof window.navigateTo === 'function' && (location.pathname !== '/' || !document.getElementById('sectionHome'))) {
      await window.navigateTo('/', { scroll: false });
    } else if (typeof window.switchCalculatorMode === 'function') {
      window.switchCalculatorMode('expression');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-mode-switch]');
    if (sw) {
      e.preventDefault();
      if (sw.dataset.modeSwitch === 'simple') goSimple(); else goAdvanced();
      return;
    }
    if (e.target.closest('#navSimpleCalc')) { e.preventDefault(); goSimple(); return; }
    // any other link: a calculator link opens the advanced tools; Home / the logo open the saved choice
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var isHome = href === '/' && !a.dataset.calc;
    setSimple(isHome && preferSimple(), false);
  }, true);

  window.addEventListener('popstate', function () {
    setSimple(location.pathname === '/' && !location.search && preferSimple(), false);
  });

  // "Simple Calculator" first in the menu's calculator list
  function addMenuItem() {
    var drawer = document.getElementById('mobileNavDrawer');
    if (!drawer || document.getElementById('navSimpleCalc')) return;
    var first = drawer.querySelector('.mobile-nav-item[data-calc="expression"]');
    if (!first) return;
    var item = document.createElement('a');
    item.href = '/';
    item.id = 'navSimpleCalc';
    item.className = 'mobile-nav-item';
    item.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> <span>Simple Calculator</span>';
    first.parentNode.insertBefore(item, first);
    var label = first.querySelector('span');
    if (label) label.textContent = 'Math Solver (Advanced)';
  }

  function init() {
    buildSimpleSection();
    addModeSwitches();
    addMenuItem();
    // the head script already chose the starting mode (simple-on) before the first paint
    setSimple(root.classList.contains('simple-on') && !!document.getElementById('sectionSimple'), false);
    window.AMS_SIMPLE = { evaluate: evaluate, press: press, state: function () { return { expr: expr, justEvaluated: justEvaluated }; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
