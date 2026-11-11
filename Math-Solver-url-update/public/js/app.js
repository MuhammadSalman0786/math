
/* ===================================================
   STYLISH NOTIFICATION POPUP (REPLACES ALL BROWSER ALERTS)
   =================================================== */
// Escape text before putting it into HTML (prevents code injection)
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(title, message, type = 'success', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-solid fa-circle-check',
    info: 'fa-solid fa-circle-info',
    warning: 'fa-solid fa-triangle-exclamation',
    error: 'fa-solid fa-circle-xmark',
    logout: 'fa-solid fa-arrow-right-from-bracket'
  };

  const toast = document.createElement('div');
  toast.className = `toast-popup toast-${type === 'logout' ? 'info' : type}`;
  
  toast.innerHTML = `
    <div class="toast-icon-wrap">
      <i class="${icons[type] || icons.success}"></i>
    </div>
    <div class="toast-content">
      <span class="toast-title">${escapeHtml(title)}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
    </div>
    <button type="button" class="toast-close-btn" aria-label="Close Notification">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="toast-progress"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismissToast = () => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 350);
  };

  closeBtn?.addEventListener('click', dismissToast);

  container.appendChild(toast);

  // Trigger smooth slide in
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // Auto dismiss
  setTimeout(dismissToast, duration);
}

// Global State Management
let currentMode = 'expression';
let currentUser = null;

// Educational Blog Posts Data
// Blog articles live in js/blog-data.js (shared with the server, which renders them for search engines)
const blogArticles = window.BLOG_ARTICLES || {};


const symbolsData = {
  quick: ['+', '−', '×', '÷', '=', '≠', '<', '>', '≤', '≥', 'a/b', '√x', 'x²', 'x³', 'xⁿ', '±', 'π', '°', 'θ', '∞', '(x)', '|x|'],
  arithmetic: ['+', '−', '×', '÷', '±', '∓', 'a/b', '1/x', '√x', '∛x', '=', '≠', '≈', '<', '≤', '>', '≥', '·', '%', 'π', 'e', '∞', 'x!'],
  algebra: ['x', 'y', 'z', 'n', 'k', 'a/b', '√x', 'x²', 'x³', 'xⁿ', '∝', '±', '|x|', '∑', '∏'],
  trig: ['sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'π', 'θ', 'ϕ', '°'],
  calculus: ['d/dx', '∫', '∬', '∂', '∇', 'Δx', '∞', 'lim'],
  linalg: ['·', '×', '‖x‖', '[2×2]', '[3×3]', 'det', 'x⁻¹', 'xᵀ', 'λ', 'I'],
  discrete: ['∀', '∃', '∄', '∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '⇒', '⇔', '∧', '∨', '¬'],
  greek: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Δ', 'Σ', 'Ω']
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initGoogleAuthSystem();
  setupNavigationRouting();
  setupDropdown();
  setupMobileSidebar();
  setupMathFieldPaste();
  renderPageMath();
  setupLongPressPastePopup();
  setupSymbols();
  setupBlogReader();
  loadHistory();

    // 1. Direct Click Binding on Calculate Button
  const calcBtn = document.getElementById('btnCalculate');
  if (calcBtn) {
    calcBtn.onclick = (e) => {
      e.preventDefault();
      handleCalculate();
    };
  }

  // 2. On-Enter Key Submit & Mobile Paste Fix for MathField
  const mf = document.getElementById('mainExprInput');
  if (mf) {
    mf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCalculate();
      }
    });


    // Mobile touch focus handling
    mf.addEventListener('touchstart', () => {
      if (typeof mf.focus === 'function') {
        mf.focus();
      }
    }, { passive: true });

    // (Paste is handled once, in setupMathFieldPaste)
  }

  // 3. On-Enter for other inputs
  ['propA', 'propB', 'propC', 'propD', 'dobInput', 'acdcVoltage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCalculate();
        }
      });
    }
  });
  // Calculate on Enter Key Press
  const mathField = document.getElementById('mainExprInput');
  if (mathField) {
    mathField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCalculate();
      }
    });

  }

  // Support Enter key on other calculators
  ['propA', 'propB', 'propC', 'propD', 'dobInput', 'acdcVoltage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCalculate();
        }
      });
    }
  });
  document.getElementById('btnToggleFx').addEventListener('click', () => {
    document.getElementById('symbolsDrawer').classList.toggle('hidden');
  });
  document.getElementById('btnCloseFxDrawer').addEventListener('click', () => {
    document.getElementById('symbolsDrawer').classList.add('hidden');
  });
  document.getElementById('btnNewChat').addEventListener('click', () => {
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('mainExprInput').value = '';
    closeMobileSidebar();
  });
  document.getElementById('btnClearHistory').addEventListener('click', clearAllHistory);
  document.getElementById('btnCopy').addEventListener('click', copyResult);
  document.getElementById('btnPdf').addEventListener('click', downloadResultPDF);
});

/* ===================================================
   LIGHT & DARK THEME ENGINE
   =================================================== */
function initTheme() {
  const toggleBtn = document.getElementById('btnThemeToggle');
  const icon = document.getElementById('themeIcon');
  
  const savedTheme = localStorage.getItem('allmath_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    icon.className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('dark-theme');
    icon.className = 'fa-solid fa-moon';
  }

  toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    if (isDark) {
      localStorage.setItem('allmath_theme', 'dark');
      icon.className = 'fa-solid fa-sun';
    } else {
      localStorage.setItem('allmath_theme', 'light');
      icon.className = 'fa-solid fa-moon';
    }
  });
}

/* ===================================================
   AUTHENTICATION (verified Google sign-in + email/password)
   The server returns a signed login token; it is sent as
   "Authorization: Bearer <token>" on every API request.
   =================================================== */
let authToken = null;
let googleClientId = null;
let googleReady = false;
let userMenuListenerAdded = false;

function authHeaders(extra = {}) {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : { ...extra };
}

function setSession(user, token) {
  const guestItems = readLocalRecents('allmath_recent_guest');
  currentUser = user;
  authToken = token;
  if (guestItems.length) {
    // questions solved before signing in become part of this account's recents
    const key = recentsKey();
    const merged = mergeRecents(readLocalRecents(key), guestItems);
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch (e) {} // copy (not move), so they still show if the login later expires
  }
  try {
    localStorage.setItem('allmath_user', JSON.stringify(user));
    localStorage.setItem('allmath_token', token);
  } catch (e) {}
  renderAuthUI();
  closeAuthModal();
  loadHistory();
}

// keepRecents=false on a real logout removes this user's recents from the (possibly shared) browser
function clearSession(keepRecents = false) {
  if (currentUser && keepRecents) {
    // login expired (not a real logout): keep showing this user's recent questions
    const merged = mergeRecents(readLocalRecents(recentsKey()), readLocalRecents('allmath_recent_guest'));
    try { localStorage.setItem('allmath_recent_guest', JSON.stringify(merged)); } catch (e) {}
  }
  if (currentUser && !keepRecents) {
    // real logout: remove this account's questions from the browser (shared computers)
    const mine = new Set(readLocalRecents(recentsKey()).map(x => String(x.query || x.title || '').trim().toLowerCase()));
    const guestLeft = readLocalRecents('allmath_recent_guest').filter(x => !mine.has(String(x.query || x.title || '').trim().toLowerCase()));
    try { localStorage.setItem('allmath_recent_guest', JSON.stringify(guestLeft)); } catch (e) {}
    clearLocalRecents(recentsKey());
  }
  currentUser = null;
  authToken = null;
  try {
    localStorage.removeItem('allmath_user');
    localStorage.removeItem('allmath_token');
    // Old versions stored unverified "saved accounts" here
    localStorage.removeItem('allmath_saved_google_accounts');
    localStorage.removeItem('allmath_google_client_id');
  } catch (e) {}
  renderAuthUI();
}

function initGoogleAuthSystem() {
  const modal = document.getElementById('authModalBackdrop');
  const btnClose = document.getElementById('btnCloseModal');
  const googleBtn = document.getElementById('btnGooglePopupAuth');
  const googleSection = document.getElementById('googleAuthSection');
  const emailSection = document.getElementById('emailAuthSection');
  const btnShowEmail = document.getElementById('btnShowEmailAuth');
  const btnBackToGoogle = document.getElementById('btnBackToGoogleAuth');

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const groupName = document.getElementById('groupName');
  const emailForm = document.getElementById('authForm');
  const btnSubmitEmail = document.getElementById('btnAuthSubmit');
  const registerSidebarBtn = document.getElementById('btnSidebarRegister');

  let authMode = 'login';

  // 1. Restore the saved session, then confirm it with the server
  try {
    const savedUser = localStorage.getItem('allmath_user');
    const savedToken = localStorage.getItem('allmath_token');
    // Remove data saved by older, insecure versions
    localStorage.removeItem('allmath_saved_google_accounts');
    localStorage.removeItem('allmath_google_client_id');
    if (savedUser && savedToken) {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
    } else if (savedUser) {
      localStorage.removeItem('allmath_user'); // old session without a token
    }
  } catch (e) {}
  renderAuthUI();

  if (authToken) {
    fetch('/api/auth/me', { headers: authHeaders() })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && d.success) {
          currentUser = d.user;
          try { localStorage.setItem('allmath_user', JSON.stringify(d.user)); } catch (e) {}
          renderAuthUI();
        } else {
          clearSession(true);
          loadHistory();
        }
      })
      .catch(() => {});
  }

  // 2. Google sign-in: the Client ID comes from the server (GOOGLE_CLIENT_ID)
  fetch('/api/auth/config')
    .then(r => r.json())
    .then(cfg => {
      googleClientId = cfg.googleClientId || null;
      if (googleClientId) waitForGoogleSdk(0);
      else if (googleBtn) googleBtn.title = 'Google sign-in is not configured on this server yet';
    })
    .catch(() => {});

  // Modal open & close
  document.getElementById('btnOpenLogin')?.addEventListener('click', () => openAuthModal('login'));
  registerSidebarBtn?.addEventListener('click', () => openAuthModal('register'));

  btnClose?.addEventListener('click', closeAuthModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal();
  });

  btnShowEmail?.addEventListener('click', () => {
    googleSection.classList.add('hidden');
    emailSection.classList.remove('hidden');
  });

  btnBackToGoogle?.addEventListener('click', () => {
    emailSection.classList.add('hidden');
    googleSection.classList.remove('hidden');
  });

  const setMode = (mode) => {
    authMode = mode;
    tabLogin?.classList.toggle('active', mode === 'login');
    tabRegister?.classList.toggle('active', mode === 'register');
    if (groupName) groupName.style.display = mode === 'register' ? 'block' : 'none';
    if (btnSubmitEmail) btnSubmitEmail.textContent = mode === 'register' ? 'Create Account' : 'Sign In';
    const pw = document.getElementById('authInputPassword');
    if (pw) {
      pw.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
      pw.setAttribute('minlength', mode === 'register' ? '8' : '1');
      pw.placeholder = mode === 'register' ? 'At least 8 characters' : '••••••••';
    }
  };
  tabLogin?.addEventListener('click', () => setMode('login'));
  tabRegister?.addEventListener('click', () => setMode('register'));
  window.__setAuthMode = setMode;

  // "Continue with Google" button
  googleBtn?.addEventListener('click', () => {
    if (googleReady && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }
    showToast('Google Sign-In Unavailable', 'Google sign-in is not set up on this site yet. Please use email and password.', 'info');
    googleSection?.classList.add('hidden');
    emailSection?.classList.remove('hidden');
  });

  // Email / password form
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authInputEmail').value.trim();
    const password = document.getElementById('authInputPassword').value;
    const name = document.getElementById('authInputName')?.value.trim() || '';

    if (authMode === 'register' && password.length < 8) {
      showToast('Password Too Short', 'Please use at least 8 characters.', 'warning');
      return;
    }

    btnSubmitEmail.disabled = true;
    try {
      const res = await fetch(authMode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('authInputPassword').value = '';
        setSession(data.user, data.token);
        showToast(authMode === 'register' ? 'Account Created' : 'Welcome Back!', `Signed in as ${data.user.name}.`, 'success');
      } else {
        showToast('Sign-in Failed', data.error || 'Please check your details and try again.', 'error');
      }
    } catch (err) {
      showToast('Authentication Error', 'Could not connect to server. Please try again.', 'error');
    } finally {
      btnSubmitEmail.disabled = false;
    }
  });
}

// The Google script loads asynchronously; wait for it (up to ~10 seconds)
function waitForGoogleSdk(attempt) {
  if (window.google?.accounts?.id) {
    setupOfficialGoogleButton(googleClientId);
  } else if (attempt < 50) {
    setTimeout(() => waitForGoogleSdk(attempt + 1), 200);
  }
}

function setupOfficialGoogleButton(clientId) {
  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleOfficialGoogleCredential
    });
    googleReady = true;
    // The official Google button replaces the placeholder button
    document.querySelector('.google-one-click-box')?.classList.add('hidden');
    const btnWrapper = document.getElementById('googleOfficialBtn');
    if (btnWrapper) {
      btnWrapper.innerHTML = '';
      window.google.accounts.id.renderButton(btnWrapper, {
        theme: 'outline',
        size: 'large',
        width: 340,
        text: 'continue_with'
      });
    }
  } catch (err) {
    console.warn('Google sign-in could not be initialised', err);
  }
}

async function handleOfficialGoogleCredential(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.user, data.token);
      showToast('Google Sign-In', `Welcome, ${data.user.name}!`, 'success');
    } else {
      showToast('Sign-in Failed', data.error || 'Google sign-in could not be verified.', 'error');
    }
  } catch (err) {
    showToast('Connection Error', 'Unable to connect to server. Please try again.', 'error');
  }
}
window.handleOfficialGoogleCredential = handleOfficialGoogleCredential;

function openAuthModal(mode = 'login', customMessage = null) {
  const modal = document.getElementById('authModalBackdrop');
  const notice = document.getElementById('authModalNotice');
  if (customMessage) {
    notice.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fa-solid fa-lock"></i> ${escapeHtml(customMessage)}</span>`;
  } else {
    notice.textContent = 'Sign in to save your calculations and see your history on any device.';
  }

  const googleSection = document.getElementById('googleAuthSection');
  const emailSection = document.getElementById('emailAuthSection');
  if (mode === 'register') {
    googleSection?.classList.add('hidden');
    emailSection?.classList.remove('hidden');
  } else {
    googleSection?.classList.remove('hidden');
    emailSection?.classList.add('hidden');
  }
  if (window.__setAuthMode) window.__setAuthMode(mode === 'register' ? 'register' : 'login');
  modal?.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModalBackdrop')?.classList.add('hidden');
}

function renderAuthUI() {
  renderMobileDrawerAuth();
  const container = document.getElementById('authContainer');
  if (!container) return;

  if (currentUser) {
    const name = escapeHtml(currentUser.name || currentUser.email || 'User');
    const email = escapeHtml(currentUser.email || '');
    const initial = escapeHtml((currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase());
    const safePicture = /^https:\/\//.test(currentUser.picture || '') ? escapeHtml(currentUser.picture) : '';
    const avatar = safePicture
      ? `<img src="${safePicture}" class="user-avatar-img" alt="avatar" referrerpolicy="no-referrer">`
      : initial;

    container.innerHTML = `
      <div class="user-menu-wrapper" id="userMenuWrapper">
        <button type="button" class="user-profile-btn" id="btnUserDropdown" title="User Menu">
          <div class="user-avatar-circle">${avatar}</div>
          <span class="user-name-text">${name}</span>
          <i class="fa-solid fa-chevron-down user-dropdown-arrow" id="userDropdownArrow"></i>
        </button>
        <div class="user-dropdown-card hidden" id="userDropdownCard">
          <div class="user-dropdown-header">
            <div class="dropdown-avatar-lg">${avatar}</div>
            <div class="dropdown-user-info">
              <span class="dropdown-user-name">${name}</span>
              <span class="dropdown-user-email">${email}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-logout-btn" id="btnLogoutAction">
            <i class="fa-solid fa-arrow-right-from-bracket logout-icon"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    `;

    const dropdownBtn = document.getElementById('btnUserDropdown');
    const dropdownCard = document.getElementById('userDropdownCard');
    const dropdownArrow = document.getElementById('userDropdownArrow');
    const logoutBtn = document.getElementById('btnLogoutAction');

    dropdownBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = dropdownCard.classList.contains('hidden');
      dropdownCard.classList.toggle('hidden');
      dropdownArrow?.classList.toggle('open', isClosed);
    });

    logoutBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
      clearSession();
      loadHistory();
      showToast("Signed Out", "You have been logged out safely.", "logout");
    });

    // Close the menu when clicking elsewhere (listener added only once)
    if (!userMenuListenerAdded) {
      userMenuListenerAdded = true;
      document.addEventListener('click', (e) => {
        const menuWrapper = document.getElementById('userMenuWrapper');
        if (menuWrapper && !menuWrapper.contains(e.target)) {
          document.getElementById('userDropdownCard')?.classList.add('hidden');
          document.getElementById('userDropdownArrow')?.classList.remove('open');
        }
      });
    }

  } else {
    container.innerHTML = `
      <button class="btn-login" id="btnOpenLogin">
        <i class="fa-regular fa-user"></i> <span>Login</span>
      </button>
    `;
    document.getElementById('btnOpenLogin')?.addEventListener('click', () => openAuthModal('login'));
  }
}

/* ===================================================
   BLOG POST READER
   =================================================== */
function setupBlogReader() {
  // Whole blog card is clickable (the title and "Read" button are real links too)
  document.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // links are handled by the router
      const post = blogArticles[card.dataset.postId];
      if (post && post.slug) navigateTo('/blog/' + post.slug);
    });
  });
  document.getElementById('btnBackToBlogs')?.addEventListener('click', () => navigateTo('/blog'));
}

function openBlogArticle(postId) {
  const post = blogArticles[postId];
  const blogList = document.getElementById('blogListPage');
  const blogReader = document.getElementById('blogReaderPage');
  const articleContent = document.getElementById('blogArticleContent');
  if (!post || !articleContent) return;

  // The server already put this article in the page on first load; only rebuild if needed
  if (articleContent.dataset.post !== postId || !articleContent.innerHTML.trim()) {
    articleContent.innerHTML = `
      <div class="article-header">
        <span class="badge-tag">${post.category}</span>
        <h1 class="article-title">${post.title}</h1>
        <div class="blog-meta"><i class="fa-regular fa-calendar"></i> ${post.date} • ${post.readTime}</div>
      </div>
      <p class="lead-text"><strong>Overview:</strong> ${post.lead}</p>
      <div class="article-content">${post.content}</div>
      <div style="margin-top: 30px; padding-top: 18px; border-top: 1px solid var(--border-color); text-align: center;">
        <button class="btn-calculate" id="btnTryArticleCalc">
          <i class="fa-solid fa-calculator"></i> Try this in AllMath Calculator →
        </button>
      </div>
    `;
  }
  articleContent.dataset.post = postId;
  blogList.classList.add('hidden');
  blogReader.classList.remove('hidden');

  const tryBtn = document.getElementById('btnTryArticleCalc');
  if (tryBtn && !tryBtn.dataset.bound) {
    tryBtn.dataset.bound = '1';
    tryBtn.addEventListener('click', () => {
      const paths = window.SITE_ROUTES ? window.SITE_ROUTES.CALC_PATHS : {};
      navigateTo(paths[post.calcMode] || '/', { scrollTo: 'solver' });
      if (post.calcQuery) {
        if (post.calcMode === 'expression') document.getElementById('mainExprInput').value = post.calcQuery;
        if (post.calcMode === 'acdc') document.getElementById('acdcVoltage').value = post.calcQuery;
      }
    });
  }
  if (window.renderMathInElement) {
    try { window.renderMathInElement(articleContent, { throwOnError: false }); } catch (e) {}
  }
}

/* ===================================================
   NAVIGATION: real URLs (/about, /age-calculator, /blog/...)
   Pages switch without reloading, the address bar shows the real URL,
   Back/Forward work, and old #hash links are forwarded.
   =================================================== */
function routesApi() {
  return window.SITE_ROUTES || { findRoute: () => null, LEGACY: {}, CALC_PATHS: {} };
}

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) return;
  el.setAttribute(attr, value);
}

function applyRoute(path, opts = {}) {
  const route = routesApi().findRoute(path);
  if (!route) return false;
  closeDropdown();
  closeMobileSidebar();
  showSection(route.section);
  if (route.calc) switchCalculatorMode(route.calc);
  if (route.post) openBlogArticle(route.post);

  document.title = route.title;
  setMeta('meta[name="description"]', 'content', route.description);
  setMeta('meta[property="og:title"]', 'content', route.title);
  setMeta('meta[property="og:description"]', 'content', route.description);
  const abs = location.origin + (route.path === '/' ? '/' : route.path);
  setMeta('link[rel="canonical"]', 'href', abs);
  setMeta('meta[property="og:url"]', 'content', abs);

  if (opts.scrollTo === 'solver' || (opts.scroll !== false && route.calc && route.path !== '/')) {
    document.getElementById('solverCardAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (opts.scroll !== false) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return true;
}

function navigateTo(path, opts = {}) {
  if (!routesApi().findRoute(path)) { window.location.href = path; return; }
  if (location.pathname !== path) history.pushState({ path }, '', path);
  applyRoute(path, opts);
}
window.navigateTo = navigateTo;

function setupNavigationRouting() {
  // Internal links: switch page without a full reload
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
    const path = href.split('#')[0].split('?')[0];
    if (!routesApi().findRoute(path)) return; // let the browser load it normally
    e.preventDefault();
    navigateTo(path, { scrollTo: a.dataset.calc && a.dataset.calc !== 'expression' ? 'solver' : undefined });
  });

  // Back / Forward buttons
  window.addEventListener('popstate', () => applyRoute(location.pathname, { scroll: false }));

  // Old links like allmathsolver.com/#about -> /about
  const legacy = routesApi().LEGACY[location.hash];
  if (legacy) {
    history.replaceState({ path: legacy }, '', legacy);
    applyRoute(legacy);
    return;
  }
  // First load: the server already rendered this page; sync the script's state with it
  if (!document.body.dataset.notFound) applyRoute(location.pathname, { scroll: false });
}

function showSection(target) {
  const sections = ['Home', 'About', 'Blog', 'Contact', 'Privacy', 'Terms'];
  sections.forEach(s => {
    const sec = document.getElementById('section' + s);
    if (sec) sec.classList.add('hidden');
  });

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  let activeSectionId = 'sectionHome';
  if (target === 'about') {
    activeSectionId = 'sectionAbout';
    document.querySelector('.nav-link[data-target="about"]')?.classList.add('active');
  } else if (target === 'blog') {
    activeSectionId = 'sectionBlog';
    document.querySelector('.nav-link[data-target="blog"]')?.classList.add('active');
    document.getElementById('blogListPage')?.classList.remove('hidden');
    document.getElementById('blogReaderPage')?.classList.add('hidden');
  } else if (target === 'contact') {
    activeSectionId = 'sectionContact';
  } else if (target === 'privacy') {
    activeSectionId = 'sectionPrivacy';
  } else if (target === 'terms') {
    activeSectionId = 'sectionTerms';
  } else {
    activeSectionId = 'sectionHome';
    document.querySelector('.nav-link[data-target="home"]')?.classList.add('active');
  }

  const activeSec = document.getElementById(activeSectionId);
  if (activeSec) activeSec.classList.remove('hidden');
}

function switchCalculatorMode(mode) {
  currentMode = mode;

  document.getElementById('expressionInputs').classList.add('hidden');
  document.getElementById('proportionInputs').classList.add('hidden');
  document.getElementById('ageInputs').classList.add('hidden');
  document.getElementById('acdcInputs').classList.add('hidden');

  const heading = document.getElementById('dynamicCalcHeading');
  const subheading = document.getElementById('dynamicCalcSubheading');
  const pill = document.getElementById('currentModeLabel');

  if (mode === 'proportion') {
    document.getElementById('proportionInputs').classList.remove('hidden');
    heading.textContent = 'Proportion Calculator';
    subheading.textContent = 'Solve unknown variables in fractions using cross multiplication A/B = C/D.';
    pill.innerHTML = '<i class="fa-solid fa-divide"></i> Proportion Calculator';
  } else if (mode === 'age') {
    document.getElementById('ageInputs').classList.remove('hidden');
    heading.textContent = 'Age Calculator';
    subheading.textContent = 'Calculate exact age, months, days, total hours and leap year milestones.';
    pill.innerHTML = '<i class="fa-solid fa-calendar-days"></i> Age Calculator';
  } else if (mode === 'acdc') {
    document.getElementById('acdcInputs').classList.remove('hidden');
    heading.textContent = 'AC to DC Voltage Calculator';
    subheading.textContent = 'Calculate rectified DC output voltage from AC peak or RMS waveforms with diode formulas.';
    pill.innerHTML = '<i class="fa-solid fa-bolt"></i> AC to DC Calculator';
  } else {
    document.getElementById('expressionInputs').classList.remove('hidden');
    heading.textContent = 'AllMath Solver';
    subheading.textContent = 'Solve math problems instantly with single-line step-by-step breakdown.';
    pill.innerHTML = '<i class="fa-solid fa-calculator"></i> Math Solver';
  }
}

// Dropdown Logic
function setupDropdown() {
  const trigger = document.getElementById('dropdownTrigger');
  const menu = document.getElementById('dropdownMenu');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    trigger.classList.toggle('open');
    menu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !menu.contains(e.target)) {
      closeDropdown();
    }
  });
}

function closeDropdown() {
  const trigger = document.getElementById('dropdownTrigger');
  const menu = document.getElementById('dropdownMenu');
  if (trigger) trigger.classList.remove('open');
  if (menu) menu.classList.remove('show');
}


// --- Mobile Scroll Lock & Enhanced Sidebar / Drawer Handling ---
function lockBodyScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

function unlockBodyScroll() {
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

// Updated Mobile Sidebar & Navigation Drawer

// --- Robust Mobile Sidebar & Navigation Drawer Toggle & Outside Click ---
function setupMobileSidebar() {
  const btnToggle = document.getElementById('btnToggleSidebar');
  const btnClose = document.getElementById('btnCloseSidebar');
  const sidebar = document.getElementById('appSidebar');

  const btnNavToggle = document.getElementById('btnToggleNavDrawer');
  const btnNavClose = document.getElementById('btnCloseNavDrawer');
  const navDrawer = document.getElementById('mobileNavDrawer');

  const backdrop = document.getElementById('sidebarBackdrop');

  // Prevent scroll propagation when touching the backdrop
  backdrop?.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  // 1. Recents History Sidebar Toggle (Open / Close on button click)
  btnToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navDrawer) navDrawer.classList.remove('mobile-open');
    if (sidebar?.classList.contains('mobile-open')) {
      closeMobileSidebar();
    } else {
      sidebar?.classList.add('mobile-open');
      backdrop?.classList.add('active');
      lockBodyScroll();
    }
  });

  // 2. Navigation Pages Menu Toggle (Open / Close on button click)
  btnNavToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (navDrawer?.classList.contains('mobile-open')) {
      closeMobileSidebar();
    } else {
      navDrawer?.classList.add('mobile-open');
      backdrop?.classList.add('active');
      lockBodyScroll();
    }
  });

  btnClose?.addEventListener('click', closeMobileSidebar);
  btnNavClose?.addEventListener('click', closeMobileSidebar);
  
  // Backdrop click & touch to close
  backdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileSidebar();
  });
  backdrop?.addEventListener('touchend', (e) => {
    e.preventDefault();
    closeMobileSidebar();
  }, { passive: false });

  // Global document click/tap outside sidebar or nav drawer to close
  document.addEventListener('click', (e) => {
    const isSidebarOpen = sidebar?.classList.contains('mobile-open');
    const isNavOpen = navDrawer?.classList.contains('mobile-open');

    if (isSidebarOpen || isNavOpen) {
      const clickedInsideSidebar = sidebar?.contains(e.target);
      const clickedInsideNav = navDrawer?.contains(e.target);
      const clickedToggle = btnToggle?.contains(e.target) || btnNavToggle?.contains(e.target);

      if (!clickedInsideSidebar && !clickedInsideNav && !clickedToggle) {
        closeMobileSidebar();
      }
    }
  });

  document.addEventListener('touchend', (e) => {
    const isSidebarOpen = sidebar?.classList.contains('mobile-open');
    const isNavOpen = navDrawer?.classList.contains('mobile-open');

    if (isSidebarOpen || isNavOpen) {
      const clickedInsideSidebar = sidebar?.contains(e.target);
      const clickedInsideNav = navDrawer?.contains(e.target);
      const clickedToggle = btnToggle?.contains(e.target) || btnNavToggle?.contains(e.target);

      if (!clickedInsideSidebar && !clickedInsideNav && !clickedToggle) {
        closeMobileSidebar();
      }
    }
  }, { passive: true });

  // Mobile Drawer login / account area (rendered by renderMobileDrawerAuth)
  renderMobileDrawerAuth();

  // Real visible screen height for the mobile menu (100vh includes the browser toolbar on phones)
  const setAppHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 200));
}

// Bottom of the mobile menu: "Login" when signed out, name + Logout when signed in
function renderMobileDrawerAuth() {
  const box = document.getElementById('mobileDrawerAuth');
  if (!box) return;
  if (currentUser) {
    const name = escapeHtml(currentUser.name || currentUser.email || 'User');
    const email = escapeHtml(currentUser.email || '');
    const safePicture = /^https:\/\//.test(currentUser.picture || '') ? escapeHtml(currentUser.picture) : '';
    const initial = escapeHtml((currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase());
    box.innerHTML = `
      <div class="mobile-drawer-user">
        <div class="user-avatar-circle">${safePicture ? `<img src="${safePicture}" class="user-avatar-img" alt="avatar" referrerpolicy="no-referrer">` : initial}</div>
        <div class="mobile-drawer-user-info">
          <span class="mobile-drawer-user-name">${name}</span>
          <span class="mobile-drawer-user-email">${email}</span>
        </div>
      </div>
      <button type="button" class="btn-mobile-drawer-logout" id="btnMobileDrawerLogout">
        <i class="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>
      </button>`;
    document.getElementById('btnMobileDrawerLogout').addEventListener('click', () => {
      if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
      closeMobileSidebar();
      clearSession();
      loadHistory();
      showToast("Signed Out", "You have been logged out safely.", "logout");
    });
  } else {
    box.innerHTML = `
      <button type="button" class="btn-mobile-drawer-login" id="btnMobileDrawerLogin">
        <i class="fa-regular fa-user"></i> <span>Login / Sign Up</span>
      </button>`;
    document.getElementById('btnMobileDrawerLogin').addEventListener('click', () => {
      closeMobileSidebar();
      openAuthModal('login');
    });
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const navDrawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (sidebar) sidebar.classList.remove('mobile-open');
  if (navDrawer) navDrawer.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');
  unlockBodyScroll();
}


// Draw \( ... \) and \[ ... \] math in the page's information sections
function renderPageMath(attempt = 0) {
  if (!window.renderMathInElement) {
    if (attempt < 50) setTimeout(() => renderPageMath(attempt + 1), 200);
    return;
  }
  try {
    window.renderMathInElement(document.body, {
      delimiters: [{ left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'math-field', 'input'],
      ignoredClasses: ['history-list', 'steps-flow', 'big-answer'],
      throwOnError: false
    });
  } catch (e) { /* leave text as it is */ }
}

// --- Universal Paste Function for MathField ---
function insertPastedText(text) {
  if (!text) return;
  const mf = document.getElementById('mainExprInput');
  if (!mf) return;
  mf.focus();
  try {
    if (typeof mf.insert === 'function') {
      mf.insert(text, { format: 'auto' });
    } else if (typeof mf.executeCommand === 'function') {
      mf.executeCommand(['insert', text]);
    } else {
      mf.value = (mf.value || '') + text;
    }
  } catch (err) {
    mf.value = (mf.value || '') + text;
  }
}

function setupMathFieldPaste() {
  const btnPasteMath = document.getElementById('btnPasteMath');
  const mf = document.getElementById('mainExprInput');

  btnPasteMath?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          insertPastedText(text);
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard API readText failed or permission denied:', err);
    }

    // Fallback: prompt modal for user to paste input
    const promptText = prompt('Paste your math question or expression here:');
    if (promptText && promptText.trim().length > 0) {
      insertPastedText(promptText);
    }
  });

  // Keyboard / right-click paste. Registered in the CAPTURE phase so it runs before
  // MathLive's own paste handling; stopping the event there means the text is
  // inserted exactly once (previously it could be inserted 2-3 times).
  mf?.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const text = clipboardData ? clipboardData.getData('text') : '';
    if (!text) return; // nothing we can read: let the browser/MathLive handle it
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    insertPastedText(text);
  }, true);
}

function setupSymbols() {
  const grid = document.getElementById('symbolsGrid');
  const symTabs = document.querySelectorAll('.sym-tab');

  function renderCategory(cat) {
    grid.innerHTML = '';
    const items = symbolsData[cat] || [];
    items.forEach(sym => {
      const btn = document.createElement('button');
      btn.className = 'sym-key';
      btn.textContent = sym;
      btn.onclick = () => insertSymbol(sym);
      grid.appendChild(btn);
    });
  }

  symTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      symTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCategory(tab.dataset.cat);
    });
  });

  renderCategory('quick');
}

function insertSymbol(sym) {
  const mf = document.getElementById('mainExprInput');
  let target = mf;
  if (currentMode === 'proportion') {
    target = document.getElementById('propD');
  }
  if (!target) return;

  const insertMap = {
    'a/b': '\frac{#?}{#?}',
    '1/x': '\frac{1}{#?}',
    '√x': '\sqrt{#?}',
    '∛x': '\sqrt[3]{#?}',
    'x²': '^{2}',
    'x³': '^{3}',
    'xⁿ': '^{#?}',
    'x⁻¹': '^{-1}',
    'xᵀ': '^{T}',
    '|x|': '|#?|',
    '(x)': '(#?)',
    'd/dx': '\frac{d}{dx}',
    '∫': '\int ',
    '∬': '\iint ',
    'sin': '\sin(#?)',
    'cos': '\cos(#?)',
    'tan': '\tan(#?)',
    'csc': '\csc(#?)',
    'sec': '\sec(#?)',
    'cot': '\cot(#?)',
    '∑': '\sum ',
    '∏': '\prod ',
    '⊂': '\subset ',
    '⊆': '\subseteq ',
    '∈': '\in ',
    '∉': '\notin ',
    'ω': '\omega ',
    'θ': '\theta ',
    'π': '\pi ',
    'ϕ': '\phi ',
    '∞': '\infty ',
    '[2×2]': '\begin{pmatrix}#? & #?\\ #? & #?\end{pmatrix}',
    '[3×3]': '\begin{pmatrix}#? & #? & #?\\ #? & #? & #?\\ #? & #? & #?\end{pmatrix}'
  };

  const toInsert = insertMap[sym] || sym;

  if (target === mf && typeof mf.executeCommand === 'function') {
    mf.executeCommand(['insert', toInsert]);
    mf.focus();
  } else {
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const text = target.value || '';
    target.value = text.substring(0, start) + toInsert + text.substring(end);
    const newPos = start + toInsert.length;
    target.setSelectionRange(newPos, newPos);
    target.focus();
  }
}

function getMathInputValue() {
  const mf = document.getElementById('mainExprInput');
  if (!mf) return '';
  let val = '';
  if (typeof mf.getValue === 'function') {
    val = mf.getValue('latex');
  }
  if (!val && mf.value !== undefined && mf.value !== '') {
    val = mf.value;
  }
  if (!val) {
    val = mf.innerText || mf.textContent || '';
  }
  return (val || '').trim();
}

async function handleCalculate() {
  const calcBtn = document.getElementById('btnCalculate');
  let originalHtml = '<i class="fa-solid fa-paper-plane"></i> <span>Calculate</span>';
  
  let payload = {};
  if (currentMode === 'proportion') {
    payload = {
      a: document.getElementById('propA').value,
      b: document.getElementById('propB').value,
      c: document.getElementById('propC').value,
      d: document.getElementById('propD').value
    };
  } else if (currentMode === 'age') {
    payload = { dob: document.getElementById('dobInput').value };
  } else if (currentMode === 'acdc') {
    payload = {
      voltage: document.getElementById('acdcVoltage').value,
      conversionType: document.getElementById('acdcConversion').value,
      rectifierType: document.getElementById('acdcRectifier').value
    };
  } else {
    const expr = getMathInputValue();
    if (!expr) {
      showToast("Input Required", "Please enter a mathematical expression.", "warning");
      return;
    }
    payload = { query: expr };
  }

  // Set loading state
  if (calcBtn) {
    calcBtn.disabled = true;
    calcBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Solving...</span>';
  }

  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ type: currentMode, payload })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success && data.steps) {
      renderResult(data.answer, data.steps);
      saveLocalRecent({
        id: data.id || Date.now(),
        type: currentMode,
        title: data.title || '',
        query: currentMode === 'expression' ? payload.query : (data.title || ''),
        answer: data.answer,
        steps: data.steps,
        created_at: new Date().toISOString()
      });
      loadHistory();
    } else {
      showToast("Solver Error", data.error || "Unable to solve this expression.", "error");
    }
  } catch (err) {
    console.error("Calculate Error:", err);
    showToast("Server Connection Error", "Server is not responding. Ensure the Node.js server is running.", "error");
  } finally {
    if (calcBtn) {
      calcBtn.disabled = false;
      calcBtn.innerHTML = originalHtml;
    }
  }
}

window.handleCalculate = handleCalculate;

// Renders a step label. Text inside $...$ is drawn as math; if there are no $ signs
// but the label contains LaTeX commands (like \\frac or \\Delta), the part from the
// first command onward is drawn as math. Everything else is plain text.
function renderLabel(el, text) {
  el.textContent = '';
  const addText = (t) => { if (t) el.appendChild(document.createTextNode(t)); };
  const addMath = (m) => {
    const span = document.createElement('span');
    span.className = 'step-inline-math';
    try {
      katex.render(m, span, { throwOnError: false, displayMode: false });
    } catch (e) {
      span.textContent = m;
    }
    el.appendChild(span);
  };
  if (!window.katex) { addText(text.replace(/\$/g, '')); return; }

  if (text.includes('$')) {
    text.split('$').forEach((part, i) => (i % 2 ? addMath(part) : addText(part)));
    return;
  }
  const cmd = text.search(/\\[a-zA-Z]+/);
  if (cmd !== -1) {
    // start the math at the beginning of the word/expression that holds the command
    let start = cmd;
    while (start > 0 && !/[\s:(]/.test(text[start - 1])) start--;
    let tail = text.slice(start);
    const trailing = tail.match(/[:.]\s*$/);
    if (trailing) tail = tail.slice(0, -trailing[0].length);
    addText(text.slice(0, start));
    addMath(tail);
    if (trailing) addText(trailing[0]);
    return;
  }
  addText(text);
}

function renderResult(answer, steps) {
  window.__lastResult = { answer, steps }; // used by Copy
  const card = document.getElementById('resultCard');
  card.classList.remove('hidden');
  const bigAnswer = document.getElementById('bigAnswerBox');

  // Render bottom final answer as vertical fraction
  try {
    if (window.katex && (answer.indexOf('\\') !== -1 || answer.indexOf('/') !== -1 || answer.indexOf('^') !== -1 || answer.indexOf('=') !== -1)) {
      katex.render(answer, bigAnswer, { throwOnError: false, displayMode: true });
    } else {
      bigAnswer.textContent = answer;
    }
  } catch (e) {
    bigAnswer.textContent = answer;
  }

  const stepsBox = document.getElementById('katexStepsList');
  stepsBox.innerHTML = '';

  steps.forEach(s => {
    const row = document.createElement('div');
    row.className = 'step-row';

    const label = document.createElement('div');
    label.className = 'step-title';

    renderLabel(label, s.label || '');

    row.appendChild(label);

    if (s.katex && s.katex.trim() !== '') {
      const mathDiv = document.createElement('div');
      mathDiv.className = 'step-math';
      row.appendChild(mathDiv);
      try {
        katex.render(s.katex, mathDiv, { throwOnError: false, displayMode: true });
      } catch (e) {
        mathDiv.textContent = s.katex;
      }
    }

    stepsBox.appendChild(row);
  });

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ===================================================
   RECENT HISTORY
   Every result is kept in this browser (localStorage), so recent
   history always shows — even when signed out or if the server's
   storage is unavailable. When signed in, the server copy (synced
   across devices) is merged in. Each signed-in user has a separate
   local list, which is deleted on logout.
   =================================================== */
const MAX_LOCAL_RECENTS = 100;

function recentsKey() {
  return currentUser && currentUser.email
    ? 'allmath_recent_user_' + currentUser.email.toLowerCase()
    : 'allmath_recent_guest';
}

function readLocalRecents(key = recentsKey()) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRecent(entry) {
  const key = recentsKey();
  const q = String(entry.query || entry.title || '').trim().toLowerCase();
  let list = readLocalRecents(key).filter(x => String(x.query || x.title || '').trim().toLowerCase() !== q);
  list.unshift(entry);
  list = list.slice(0, MAX_LOCAL_RECENTS);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    // Storage full: keep fewer items
    try { localStorage.setItem(key, JSON.stringify(list.slice(0, 10))); } catch (e2) {}
  }
}

function clearLocalRecents(key = recentsKey()) {
  try { localStorage.removeItem(key); } catch (e) {}
}

// Merge server + local lists: newest first, no duplicate questions
function mergeRecents(serverList, localList) {
  const seen = new Set();
  return [...serverList, ...localList]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .filter(item => {
      const k = String(item.query || item.title || '').trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_LOCAL_RECENTS);
}

// Adds a fade at the bottom of the recents list while more items are hidden below
function updateHistoryFade() {
  const sec = document.querySelector('.history-section');
  if (!sec) return;
  if (!sec.dataset.fadeListener) {
    sec.dataset.fadeListener = '1';
    sec.addEventListener('scroll', updateHistoryFade, { passive: true });
    window.addEventListener('resize', updateHistoryFade);
  }
  sec.classList.toggle('more-below', sec.scrollTop + sec.clientHeight < sec.scrollHeight - 4);
}

function renderHistoryList(items) {
  const list = document.getElementById('historyList');
  if (!list) return;
  setTimeout(updateHistoryFade, 0);
  list.innerHTML = '';
  const counter = document.getElementById('historyCount');
  if (counter) counter.textContent = items.length ? `(${items.length})` : '';

  if (!items.length) {
    list.innerHTML = `
      <div class="no-history">
        <i class="fa-regular fa-comments empty-icon"></i>
        <p>No History Found</p>
      </div>`;
    return;
  }

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const mathDisplay = String(item.query || item.title || '');
    el.innerHTML = `
      <span class="hist-label" style="display:flex; align-items:center; gap:8px; overflow:hidden;">
        <i class="fa-solid fa-calculator" style="flex-shrink:0;"></i>
        <span class="hist-math-target" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;"></span>
      </span>
      <i class="fa-solid fa-chevron-right" style="font-size: 11px; color:#9ca3af; flex-shrink:0;"></i>
    `;
    const target = el.querySelector('.hist-math-target');
    const looksLikeMath = /[\\^\/]/.test(mathDisplay) && !/[a-zA-Z]{6,}\s/.test(mathDisplay) && mathDisplay.length < 120;
    try {
      if (window.katex && looksLikeMath) {
        katex.render(mathDisplay, target, { throwOnError: false, displayMode: false });
      } else {
        target.textContent = item.title || mathDisplay;
      }
    } catch (e) {
      target.textContent = item.title || mathDisplay;
    }
    el.title = mathDisplay.slice(0, 200);

    el.onclick = () => {
      const calcPaths = routesApi().CALC_PATHS;
      const mode = (item.type && item.type !== 'math') ? item.type : 'expression';
      navigateTo(calcPaths[mode] || '/', { scroll: false });
      if (Array.isArray(item.steps)) renderResult(item.answer || '', item.steps);
      closeMobileSidebar();
    };

    list.appendChild(el);
  });
}

async function loadHistory() {
  const localList = readLocalRecents();
  // Show the local list straight away, then add the server copy if signed in
  renderHistoryList(mergeRecents([], localList));

  if (!currentUser || !authToken) return;
  try {
    const res = await fetch('/api/history', { headers: authHeaders() });
    if (res.status === 401) {
      // Login expired: sign out quietly but keep their saved recents for next sign-in
      clearSession(true);
      renderHistoryList(mergeRecents([], readLocalRecents()));
      return;
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.history)) {
      renderHistoryList(mergeRecents(data.history, readLocalRecents()));
    }
  } catch (err) {
    console.warn('Server history unavailable, showing local recents only');
  }
}

async function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all history?")) return;
  clearLocalRecents();
  if (currentUser && authToken) {
    try {
      const res = await fetch('/api/history', { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) showToast("Could Not Clear", data.error || "Please try again.", "error");
    } catch (e) {
      showToast("Connection Error", "Could not reach the server.", "error");
    }
  }
  loadHistory();
  document.getElementById('resultCard').classList.add('hidden');
}

function downloadResultPDF() {
  const resultCard = document.getElementById('resultCard');
  if (!resultCard || resultCard.classList.contains('hidden')) {
    showToast("No Result", "Pehle koi question solve karein.", "warning");
    return;
  }

  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'AllMath-Calculation-Result.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    html2pdf().set(opt).from(resultCard).save();
    showToast("PDF Export", "Calculation result PDF download ho rahi hai...", "success");
  } else {
    window.print();
  }
}

// Turn LaTeX into readable plain text for copying, e.g. \frac{1}{2} -> (1)/(2), \sqrt{2} -> √(2)
function latexToText(tex) {
  let t = String(tex || '');
  const unwrap = (cmd, fn) => {
    for (let guard = 0; guard < 50; guard++) {
      const i = t.indexOf(cmd + '{');
      if (i === -1) break;
      let depth = 0, j = i + cmd.length;
      const args = [];
      let k = j;
      for (let n = 0; n < fn.length; n++) {
        if (t[k] !== '{') break;
        depth = 0; let e = k;
        for (; e < t.length; e++) { if (t[e] === '{') depth++; else if (t[e] === '}') { depth--; if (depth === 0) break; } }
        args.push(t.slice(k + 1, e)); k = e + 1;
      }
      if (args.length !== fn.length) break;
      t = t.slice(0, i) + fn(...args) + t.slice(k);
    }
  };
  t = t.replace(/\\left|\\right|\\displaystyle|\\!|\\big|\\Big/g, '');
  unwrap('\\mathbf', (a) => a); unwrap('\\text', (a) => a); unwrap('\\mathrm', (a) => a); unwrap('\\operatorname', (a) => a); unwrap('\\mathbb', (a) => a);
  unwrap('\\cancel', (a) => a);
  const wrap = (a) => (/^[A-Za-z0-9.πλαβθ√_]+$/.test(a.trim()) ? a.trim() : `(${a.trim()})`); // brackets only when needed
  unwrap('\\sqrt', (a) => `√${wrap(a)}`);
  unwrap('\\frac', (a, b) => `${wrap(a)}/${wrap(b)}`); unwrap('\\dfrac', (a, b) => `${wrap(a)}/${wrap(b)}`); unwrap('\\tfrac', (a, b) => `${wrap(a)}/${wrap(b)}`);
  const sym = { '\\cdot': '·', '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓', '\\pi': 'π', '\\infty': '∞', '\\neq': '≠', '\\le': '≤', '\\ge': '≥', '\\leq': '≤', '\\geq': '≥', '\\approx': '≈', '\\Rightarrow': '⇒', '\\implies': '⇒', '\\iff': '⇔', '\\to': '→', '\\in': '∈', '\\lambda': 'λ', '\\alpha': 'α', '\\beta': 'β', '\\theta': 'θ', '\\Delta': 'Δ', '\\int': '∫', '\\iint': '∬', '\\oint': '∮', '\\sum': 'Σ', '\\partial': '∂', '\\varepsilon': 'ε', '\\mathbb{R}': 'ℝ', '\\ln': 'ln', '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\log': 'log', '\\lim': 'lim', '\\checkmark': '✓', '\\blacksquare': '∎' };
  Object.keys(sym).sort((x, y) => y.length - x.length).forEach(k => { t = t.split(k).join(sym[k]); });
  t = t.replace(/\\(quad|qquad|,|;|:|\s)/g, ' ')
    .replace(/\\\\/g, '\n').replace(/&/g, '')
    .replace(/\\begin\{[a-z]*\}|\\end\{[a-z]*\}/g, '')
    .replace(/\^\{([^{}]*)\}/g, (m, e) => (e.length > 1 ? `^(${e})` : `^${e}`)).replace(/_\{([^{}]*)\}/g, (m, e) => (e.length > 1 ? `_(${e})` : `_${e}`))
    .replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/\$/g, '')
    .replace(/[ \t]+/g, ' ').trim();
  return t;
}

function copyResult() {
  const res = window.__lastResult;
  if (!res || !res.answer) {
    showToast("Empty Result", "Koi result mojood nahi hai.", "warning");
    return;
  }
  const answer = latexToText(res.answer);
  let fullText = `AllMath Solution\nAnswer: ${answer}\n\nStep-by-Step Breakdown:\n`;
  (res.steps || []).forEach((st) => {
    const label = latexToText(st.label || '');
    const math = latexToText(st.katex || '');
    fullText += `${label}${math ? ' ' + math : ''}\n`;
  });

  navigator.clipboard.writeText(fullText).then(() => {
    showToast("Copied!", "Calculation result aur steps copy ho gaye.", "success");
  }).catch(() => {
    navigator.clipboard.writeText(answer);
    showToast("Copied!", "Answer copy ho gaya.", "success");
  });
}

// --- Long Press Custom Paste Pop-up (Blue Theme, Paste Only, No Prompt) ---
function setupLongPressPastePopup() {
  const mf = document.getElementById('mainExprInput');
  const popup = document.getElementById('mathPastePopup');
  const btnPopupPaste = document.getElementById('btnPopupPasteAction');
  if (!mf || !popup || !btnPopupPaste) return;

  let pressTimer = null;
  let touchStartPos = { x: 0, y: 0 };

  function hidePopup() {
    popup.classList.add('hidden');
  }

  function showPopup(x, y) {
    popup.style.left = `${Math.max(60, Math.min(window.innerWidth - 60, x))}px`;
    popup.style.top = `${Math.max(40, y - 12)}px`;
    popup.classList.remove('hidden');
  }

  // Handle clicking "Paste" inside the pop-up (Direct paste without prompt)
  btnPopupPaste.addEventListener('click', async (e) => {
    e.stopPropagation();
    hidePopup();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          insertPastedText(text);
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard readText failed or denied:', err);
    }

    // Direct clipboard fallback using hidden textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      const successful = document.execCommand('paste');
      document.body.removeChild(textarea);
      if (successful && textarea.value) {
        insertPastedText(textarea.value);
      }
    } catch (ex) {
      console.warn('execCommand paste failed:', ex);
    }
  });

  // Touch handlers for mobile long-press detection
  mf.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };

    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      showPopup(touchStartPos.x, touchStartPos.y);
    }, 450); // 450ms long press threshold
  }, { passive: true });

  mf.addEventListener('touchmove', (e) => {
    if (!pressTimer || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.y);
    if (diffX > 10 || diffY > 10) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }, { passive: true });

  mf.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  }, { passive: true });

  // Suppress native context menu & selection menu entirely so only our custom paste popup shows
  mf.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const x = e.clientX || touchStartPos.x || (window.innerWidth / 2);
    const y = e.clientY || touchStartPos.y || 150;
    showPopup(x, y);
  });

  // Dismiss pop-up on tap outside
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target)) {
      hidePopup();
    }
  });
}
