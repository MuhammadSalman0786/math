// Installable app: registers the service worker, shows "Install App" buttons when the
// browser allows installing, and an offline banner when the connection drops.
(function () {
  'use strict';

  var standalone = document.documentElement.classList.contains('is-app') ||
    (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: minimal-ui)').matches)) ||
    window.navigator.standalone === true || document.referrer.indexOf('android-app://com.allmathsolver.app') === 0;
  if (standalone) document.documentElement.classList.add('is-app');

  // ---- service worker
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // A new version took over this open page: reload once so page, scripts and styles all match
    var hadController = !!navigator.serviceWorker.controller;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      reloaded = true;
      // never interrupt the user: only when nothing is typed, solved or being photographed
      var modal = document.getElementById('photoModal');
      if (modal && !modal.classList.contains('hidden')) return;
      var mf = document.getElementById('mainExprInput');
      if (mf && String(mf.value || '').trim()) return;
      var result = document.getElementById('resultCard');
      if (result && !result.classList.contains('hidden')) return;
      var active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT|MATH-FIELD)$/.test(active.tagName) && String(active.value || '').trim()) return;
      window.location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(function (e) {
        console.warn('[app] service worker not registered:', e && e.message);
      });
    });
  }

  // ---- install buttons
  // Chrome only fires "beforeinstallprompt" sometimes (and never on iPhone), so the buttons are
  // always shown on the website: they use Chrome's install prompt when it is available, and
  // otherwise open the "Get the app" window (Android APK download, Chrome menu steps, iPhone steps).
  var deferredPrompt = null;
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(navigator.userAgent);
  var headerBtn = function () { return document.getElementById('btnInstallApp'); };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // we show our own buttons instead of the browser's mini bar
    deferredPrompt = e;
    var h = headerBtn(); if (h && !standalone) h.classList.remove('hidden'); // desktop header button
  });

  function promptInstall() {
    if (!deferredPrompt) return false;
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    p.userChoice.then(function (choice) {
      if (choice && choice.outcome === 'accepted') closeModal();
      else deferredPrompt = p; // they can try again later
    }).catch(function () {});
    return true;
  }

  function openModal() {
    var m = document.getElementById('getAppModal');
    if (!m) { promptInstall(); return; }
    var card = m.querySelector('.get-app-card');
    card.setAttribute('data-os', isIOS ? 'ios' : isAndroid ? 'android' : 'desktop');
    var steps = document.getElementById('getAppChromeSteps'); if (steps) steps.classList.add('hidden');
    m.classList.remove('hidden');
  }
  function closeModal() { var m = document.getElementById('getAppModal'); if (m) m.classList.add('hidden'); }

  function install() {
    // Android: the window offers the APK and Chrome install; desktop with a ready prompt: install at once
    if (!isAndroid && !isIOS && promptInstall()) return;
    openModal();
  }

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    var h = headerBtn(); if (h) h.classList.add('hidden');
    closeModal();
    if (typeof window.showToast === 'function') window.showToast('App Installed', 'All Math Solver is now on your home screen.', 'success');
  });

  // ---- offline banner
  function updateOnline() {
    var banner = document.getElementById('offlineBanner');
    if (!banner) return;
    banner.classList.toggle('hidden', navigator.onLine !== false);
    document.documentElement.classList.toggle('is-offline', navigator.onLine === false);
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  function init() {
    ['btnInstallApp', 'btnInstallAppMobile', 'btnGetAppMobile'].forEach(function (id) {
      var b = document.getElementById(id); if (b) b.addEventListener('click', install);
    });
    var m = document.getElementById('getAppModal');
    if (m) {
      m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
      var c = document.getElementById('btnCloseGetApp'); if (c) c.addEventListener('click', closeModal);
      var pwa = document.getElementById('getAppInstallPwa');
      if (pwa) pwa.addEventListener('click', function () { if (!promptInstall()) { var st = document.getElementById('getAppChromeSteps'); if (st) st.classList.remove('hidden'); } });
      var dk = document.getElementById('getAppInstallDesktop');
      if (dk) dk.addEventListener('click', function () { if (!promptInstall()) { dk.textContent = 'Use the install icon in the address bar'; } });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    updateOnline();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.AMS_APP = { install: install, canInstall: function () { return !!deferredPrompt; }, standalone: standalone, openModal: openModal };
})();
