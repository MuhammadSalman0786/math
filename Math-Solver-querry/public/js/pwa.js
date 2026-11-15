// Installable app: registers the service worker, shows "Install App" buttons when the
// browser allows installing, and an offline banner when the connection drops.
(function () {
  'use strict';

  var standalone = window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: minimal-ui)').matches) ||
    window.navigator.standalone === true || document.referrer.indexOf('android-app://') === 0;
  if (standalone) document.documentElement.classList.add('is-app');

  // ---- service worker
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (e) {
        console.warn('[app] service worker not registered:', e && e.message);
      });
    });
  }

  // ---- install buttons
  var deferredPrompt = null;
  var buttons = function () { return [document.getElementById('btnInstallApp'), document.getElementById('btnInstallAppMobile')].filter(Boolean); };
  function showButtons(show) { buttons().forEach(function (b) { b.classList.toggle('hidden', !show); }); }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // we show our own button instead of the browser's mini bar
    deferredPrompt = e;
    if (!standalone) showButtons(true);
  });

  function install() {
    if (!deferredPrompt) return;
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    p.userChoice.then(function (choice) {
      if (choice && choice.outcome === 'accepted') showButtons(false);
      else deferredPrompt = p; // they can try again later
    }).catch(function () {});
  }

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    showButtons(false);
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
    buttons().forEach(function (b) { b.addEventListener('click', install); });
    updateOnline();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.AMS_APP = { install: install, canInstall: function () { return !!deferredPrompt; }, standalone: standalone };
})();
