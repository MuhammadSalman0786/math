// Footer language menu: translates the page with Google Translate.
// Google's script is only loaded when a visitor picks a language other than English
// (or has picked one before), so English visitors download nothing extra.
(function () {
  'use strict';

  var LANGUAGES = [
    { code: 'en', name: 'English', label: 'English' },
    { code: 'it', name: 'Italiano', label: 'Italian' },
    { code: 'de', name: 'Deutsch', label: 'German' },
    { code: 'fr', name: 'Français', label: 'French' },
    { code: 'es', name: 'Español', label: 'Spanish' },
    { code: 'id', name: 'Bahasa Indonesia', label: 'Indonesian' },
    { code: 'ar', name: 'العربية', label: 'Arabic' },
    { code: 'nl', name: 'Nederlands', label: 'Dutch' },
    { code: 'tr', name: 'Türkçe', label: 'Turkish' }
  ];
  var CODES = LANGUAGES.map(function (l) { return l.code; });

  function readLang() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[a-z-]+\/([a-zA-Z-]+)/);
    var code = m ? m[1].toLowerCase() : 'en';
    return CODES.indexOf(code) === -1 ? 'en' : code;
  }

  function setCookie(value) {
    var host = location.hostname;
    var expiry = value ? '; max-age=31536000' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    var v = 'googtrans=' + (value || '') + expiry + '; path=/; SameSite=Lax';
    document.cookie = v;
    // Google also reads/writes the cookie on the parent domain
    if (host.indexOf('.') !== -1 && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      document.cookie = v + '; domain=.' + host.replace(/^www\./, '');
    }
  }

  // Keep formulas, the math box and code out of the translation
  function protectMath(root) {
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll('.katex, .katex-display, math-field, code, pre, .math-input, #bigAnswerBox');
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].classList.contains('notranslate')) {
        nodes[i].classList.add('notranslate');
        nodes[i].setAttribute('translate', 'no');
      }
    }
  }

  var scriptRequested = false;
  function loadGoogleTranslate() {
    if (scriptRequested) return;
    scriptRequested = true;
    protectMath(document);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].addedNodes.length; j++) {
          var n = list[i].addedNodes[j];
          if (n.nodeType === 1) { protectMath(n); if (n.matches && n.matches('.katex, .katex-display, code')) protectMath(n.parentNode); }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    window.googleTranslateElementInit = function () {
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: CODES.join(','),
          autoDisplay: false
        }, 'google_translate_element');
      } catch (e) { /* translation unavailable */ }
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.onerror = function () {
      var cur = document.getElementById('langCurrent');
      if (cur) cur.title = 'Translation could not be loaded. Please check your connection.';
    };
    document.head.appendChild(s);
  }

  // Ask the loaded widget to switch language without reloading the page
  function switchWithWidget(code) {
    var combo = document.querySelector('#google_translate_element select.goog-te-combo');
    if (!combo) return false;
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
    return true;
  }

  function applyDirection(code) {
    var html = document.documentElement;
    html.setAttribute('lang', code === 'en' ? 'en' : code);
    html.classList.toggle('lang-rtl', code === 'ar');
  }

  function chooseLanguage(code) {
    var current = readLang();
    closeMenu();
    if (code === current) return;
    if (code === 'en') {
      setCookie(null);
      location.reload(); // the cleanest way back to the original English page
      return;
    }
    setCookie('/en/' + code);
    updateButton(code);
    applyDirection(code);
    if (current !== 'en' && switchWithWidget(code)) return;
    if (scriptRequested && switchWithWidget(code)) return;
    if (!scriptRequested) {
      loadGoogleTranslate(); // the widget reads the cookie and translates once it loads
      return;
    }
    location.reload();
  }

  // ---------- menu UI
  var switcher, trigger, menu;

  function updateButton(code) {
    var lang = LANGUAGES.filter(function (l) { return l.code === code; })[0] || LANGUAGES[0];
    var cur = document.getElementById('langCurrent');
    if (cur) cur.textContent = lang.name;
    if (menu) {
      var items = menu.querySelectorAll('.lang-item');
      for (var i = 0; i < items.length; i++) {
        var on = items[i].getAttribute('data-lang') === code;
        items[i].classList.toggle('active', on);
        items[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
    }
  }

  function openMenu() {
    switcher.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    var active = menu.querySelector('.lang-item.active') || menu.querySelector('.lang-item');
    if (active) active.focus();
  }
  function closeMenu() {
    if (!switcher) return;
    switcher.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function buildMenu() {
    menu.innerHTML = LANGUAGES.map(function (l) {
      return '<button type="button" class="lang-item" role="option" data-lang="' + l.code + '" lang="' + l.code + '">' +
        '<span class="lang-code">' + l.code.toUpperCase() + '</span>' +
        '<span class="lang-text"><span class="lang-name">' + l.name + '</span>' +
        (l.name !== l.label ? '<span class="lang-label">' + l.label + '</span>' : '') + '</span>' +
        '<i class="fa-solid fa-check lang-check"></i></button>';
    }).join('');
  }

  function init() {
    switcher = document.getElementById('langSwitcher');
    trigger = document.getElementById('langTrigger');
    menu = document.getElementById('langMenu');
    var year = document.getElementById('footerYear');
    if (year) year.textContent = String(new Date().getFullYear());
    if (!switcher || !trigger || !menu) return;

    buildMenu();
    var code = readLang();
    updateButton(code);
    applyDirection(code);
    if (code !== 'en') loadGoogleTranslate();

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (switcher.classList.contains('open')) closeMenu(); else openMenu();
    });
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('.lang-item');
      if (item) chooseLanguage(item.getAttribute('data-lang'));
    });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('.lang-item'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!switcher.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && switcher.classList.contains('open')) { closeMenu(); trigger.focus(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.AMS_LANG = { languages: LANGUAGES, current: readLang, choose: chooseLanguage };
})();
