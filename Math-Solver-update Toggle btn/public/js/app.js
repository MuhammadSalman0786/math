
/* ===================================================
   STYLISH NOTIFICATION POPUP (REPLACES ALL BROWSER ALERTS)
   =================================================== */
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
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
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
const blogArticles = {
  induction: {
    category: "Higher Mathematics • Intermediate",
    date: "October 2026",
    readTime: "5 min read",
    title: "Mastering Mathematical Induction for Inter & College Exams",
    lead: "Mathematical induction is a powerful proof technique used to establish the veracity of an infinite sequence of mathematical statements for all natural numbers n in N.",
    content: `
      <h3>Introduction to Principle of Mathematical Induction (PMI)</h3>
      <p>In algebra and discrete mathematics, proving that a formula holds true for every positive integer \(n = 1, 2, 3, \dots\) by testing numbers one by one is impossible because numbers are infinite. The Principle of Mathematical Induction solves this like falling dominoes.</p>

      <div class="article-box-callout">
        <strong>The 3 Essential Steps of Induction:</strong>
        <ol style="margin-left: 20px; margin-top: 8px;">
          <li><strong>Base Step:</strong> Prove that the proposition \(P(n)\) is true for the smallest natural number (usually \(n = 1\)).</li>
          <li><strong>Inductive Hypothesis:</strong> Assume that the proposition \(P(k)\) is true for some arbitrary positive integer \(k\).</li>
          <li><strong>Inductive Step:</strong> Using the hypothesis, prove that \(P(k+1)\) is strictly true.</li>
        </ol>
      </div>

      <h3>Classic Example: Sum of First n Cubes</h3>
      <p>Consider the famous textbook theorem:
      \[ 1^3 + 2^3 + 3^3 + \dots + n^3 = \frac{n^2(n+1)^2}{4} \]
      </p>
      <p><strong>Step 1 (Base Case):</strong> For \(n = 1\), L.H.S = \(1^3 = 1\). R.H.S = \(\frac{1^2(1+1)^2}{4} = \frac{4}{4} = 1\). Both sides are equal!</p>
      <p><strong>Step 2 (Hypothesis):</strong> We assume \(1^3 + 2^3 + \dots + k^3 = \frac{k^2(k+1)^2}{4}\) is true.</p>
      <p><strong>Step 3 (Proof for k+1):</strong> Adding \((k+1)^3\) to both sides and factoring \((k+1)^2\) yields \(\frac{(k+1)^2(k+2)^2}{4}\). The proof is complete!</p>
    `,
    calcMode: "expression",
    calcQuery: "1^3 + 2^3 + ... + n^3 = n^2(n+1)^2/4"
  },
  acdc: {
    category: "Applied Electronics & Physics",
    date: "October 2026",
    readTime: "6 min read",
    title: "Understanding AC to DC Rectification: Peak vs RMS Voltage",
    lead: "Every electronic device, from your laptop charger to smartphone adapter, relies on rectifier circuits to convert oscillating AC mains into steady DC electricity.",
    content: `
      <h3>Alternating Current (AC) Characteristics</h3>
      <p>Household AC voltage fluctuates sinusoidally. The standard voltage supplied to homes represents the <strong>Root Mean Square (RMS)</strong> voltage, which produces the same heating effect as an equivalent DC voltage.</p>
      <p>The relationship between Peak Voltage (\(V_{peak}\)) and RMS Voltage (\(V_{RMS}\)) is given by:
      \[ V_{peak} = V_{RMS} \times \sqrt{2} \approx 1.4142 \times V_{RMS} \]
      For a 220V RMS household line, the peak voltage reaches \(\approx 311.12\text{ V}\)!</p>

      <h3>Full-Wave vs Half-Wave Rectification</h3>
      <div class="article-box-callout">
        <ul>
          <li><strong>Full-Wave Bridge Rectifier:</strong> Converts both positive and negative AC half-cycles into positive DC pulses. The average DC voltage is:
          \[ V_{DC} = \frac{2 \times V_{peak}}{\pi} \approx 0.6366 \times V_{peak} \]</li>
          <li><strong>Half-Wave Rectifier:</strong> Conducts only during the positive half-cycle, blocking the negative half. The output is:
          \[ V_{DC} = \frac{V_{peak}}{\pi} \approx 0.3183 \times V_{peak} \]</li>
        </ul>
      </div>
    `,
    calcMode: "acdc",
    calcQuery: "220"
  },
  proportion: {
    category: "Arithmetic & Scientific Ratios",
    date: "October 2026",
    readTime: "4 min read",
    title: "Cross-Multiplication Made Simple: The Ratio & Proportion Guide",
    lead: "Mastering proportion equations is the foundation for solving chemistry stoichiometry, physics unit scaling, and financial percentages.",
    content: `
      <h3>What is a Mathematical Proportion?</h3>
      <p>A proportion states that two fractions or ratios are equal:
      \[ \frac{A}{B} = \frac{C}{D} \]
      Here, \(A\) and \(D\) are known as the <em>extremes</em>, while \(B\) and \(C\) are known as the <em>means</em>.</p>

      <div class="article-box-callout">
        <strong>The Cross-Multiplication Rule:</strong>
        <p>In any true proportion, the product of the extremes equals the product of the means:</p>
        \[ A \times D = B \times C \]
      </div>
    `,
    calcMode: "proportion",
    calcQuery: ""
  }
};

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
    mf.addEventListener('change', () => {
      handleCalculate();
    });

    // Mobile touch focus handling
    mf.addEventListener('touchstart', () => {
      if (typeof mf.focus === 'function') {
        mf.focus();
      }
    }, { passive: true });

    // Handle Paste event for mobile & desktop
    mf.addEventListener('paste', (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (clipboardData) {
        const pastedData = clipboardData.getData('text');
        if (pastedData) {
          e.preventDefault();
          if (typeof mf.executeCommand === 'function') {
            mf.executeCommand(['insert', pastedData]);
          } else if (typeof mf.insert === 'function') {
            mf.insert(pastedData);
          } else {
            mf.value = (mf.value || '') + pastedData;
          }
        }
      }
    });
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
    mathField.addEventListener('change', () => {
      handleCalculate();
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
   GOOGLE AUTHENTICATION & CLIENT ID (AUTH KEY) ENGINE
   =================================================== */
function initGoogleAuthSystem() {
  const modal = document.getElementById('authModalBackdrop');
  const btnClose = document.getElementById('btnCloseModal');
  const googleBtn = document.getElementById('btnGooglePopupAuth');
  const googleSection = document.getElementById('googleAuthSection');
  const emailSection = document.getElementById('emailAuthSection');
  const btnShowEmail = document.getElementById('btnShowEmailAuth');
  const btnBackToGoogle = document.getElementById('btnBackToGoogleAuth');

  // Key drawer elements
  const btnToggleKey = document.getElementById('btnToggleKeySettings');
  const keyDrawer = document.getElementById('keySettingsDrawer');
  const inputKey = document.getElementById('inputGoogleClientId');
  const btnSaveKey = document.getElementById('btnSaveClientId');

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const groupName = document.getElementById('groupName');
  const emailForm = document.getElementById('authForm');
  const btnSubmitEmail = document.getElementById('btnAuthSubmit');
  const registerSidebarBtn = document.getElementById('btnSidebarRegister');

  let authMode = 'login';

  // 1. Check existing logged-in session
  const savedUser = localStorage.getItem('allmath_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      renderAuthUI();
    } catch (e) {}
  }

  // 2. Check saved Google Client ID (Auth Key)
  const savedKey = localStorage.getItem('allmath_google_client_id');
  if (savedKey) {
    inputKey.value = savedKey;
    setupOfficialGoogleButton(savedKey);
  }

  renderSavedGoogleAccounts();

  // Modal open & close
  document.getElementById('btnOpenLogin')?.addEventListener('click', () => openAuthModal('login'));
  registerSidebarBtn?.addEventListener('click', () => openAuthModal('register'));

  btnClose?.addEventListener('click', closeAuthModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal();
  });

  btnToggleKey?.addEventListener('click', () => {
    keyDrawer.classList.toggle('hidden');
    btnToggleKey.classList.toggle('open');
  });

  btnSaveKey?.addEventListener('click', () => {
    const val = inputKey.value.trim();
    if (!val) {
      localStorage.removeItem('allmath_google_client_id');
      showToast("Key Removed", "Google Client ID (Auth Key) has been cleared.", "info");
    } else {
      localStorage.setItem('allmath_google_client_id', val);
      setupOfficialGoogleButton(val);
      showToast("Auth Key Saved", "Google Client ID saved! Official 1-Click login activated.", "success");
    }
    keyDrawer.classList.add('hidden');
  });

  btnShowEmail?.addEventListener('click', () => {
    googleSection.classList.add('hidden');
    emailSection.classList.remove('hidden');
  });

  btnBackToGoogle?.addEventListener('click', () => {
    emailSection.classList.add('hidden');
    googleSection.classList.remove('hidden');
  });

  tabLogin?.addEventListener('click', () => {
    authMode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    groupName.style.display = 'none';
    btnSubmitEmail.textContent = 'Sign In';
  });

  tabRegister?.addEventListener('click', () => {
    authMode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    groupName.style.display = 'block';
    btnSubmitEmail.textContent = 'Create Account';
  });

  // Direct Google Login Trigger
  googleBtn?.addEventListener('click', () => {
    // Check if official GIS prompt is available
    const activeKey = localStorage.getItem('allmath_google_client_id');
    if (activeKey && window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {}
    }

    // Interactive Google Account Dialog (Prefills or asks specifically for user's actual email/name)
    openGoogleAccountPrompt();
  });

  // Standard Email Form Handler
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authInputEmail').value.trim();
    const name = authMode === 'register' 
      ? (document.getElementById('authInputName').value.trim() || email.split('@')[0]) 
      : email.split('@')[0];

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('allmath_user', JSON.stringify(currentUser));
        renderAuthUI();
        closeAuthModal();
        loadHistory();
        showToast("Welcome Back!", `Logged in as ${currentUser.name}. Profile synchronized.`, "success");
      }
    } catch (err) {
      showToast("Authentication Error", "Could not connect to server. Please try again.", "error");
    }
  });
}

function setupOfficialGoogleButton(clientId) {
  try {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.handleOfficialGoogleCredential
      });
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
    }
  } catch (err) {
    console.log("GIS SDK wait...");
  }
}

window.handleOfficialGoogleCredential = async (response) => {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      saveAccountLocally(currentUser);
      localStorage.setItem('allmath_user', JSON.stringify(currentUser));
      renderAuthUI();
      closeAuthModal();
      loadHistory();
      showToast("Google Sign-In", `Welcome, ${currentUser.name}! Profile synchronized.`, "success");
    }
  } catch (err) {
    console.error("Token verification failed:", err);
  }
};

function openGoogleAccountPrompt() {
  const accountPromptEmail = prompt("Apna Asli Google Email Address enter karein (e.g. aliza@gmail.com):", "aliza@gmail.com");
  if (!accountPromptEmail) return;

  const defaultName = accountPromptEmail.split('@')[0];
  const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
  const accountPromptName = prompt("Apna Name enter karein:", capitalizedName) || capitalizedName;

  performGoogleAuthentication({
    email: accountPromptEmail,
    name: accountPromptName
  });
}

async function performGoogleAuthentication(accountData) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userData: {
          email: accountData.email.trim().toLowerCase(),
          name: accountData.name && accountData.name.trim() !== '' ? accountData.name.trim() : accountData.email.split('@')[0],
          provider: 'google'
        }
      })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      saveAccountLocally(currentUser);
      localStorage.setItem('allmath_user', JSON.stringify(currentUser));
      renderAuthUI();
      closeAuthModal();
      loadHistory();
      showToast("Login Successful", `Welcome back, ${currentUser.name}!`, "success");
    } else {
      showToast("Sign-in Failed", data.error || "Could not complete Google authentication.", "error");
    }
  } catch (err) {
    console.error("Google Auth Error:", err);
    showToast("Connection Error", "Unable to connect to server. Please try again.", "error");
  }
}

function saveAccountLocally(user) {
  let accounts = [];
  try {
    accounts = JSON.parse(localStorage.getItem('allmath_saved_google_accounts') || '[]');
  } catch (e) {}

  accounts = accounts.filter(a => a.email.toLowerCase() !== user.email.toLowerCase());
  accounts.unshift({
    name: user.name,
    email: user.email,
    picture: user.picture || ''
  });
  if (accounts.length > 3) accounts = accounts.slice(0, 3);
  localStorage.setItem('allmath_saved_google_accounts', JSON.stringify(accounts));
}

function renderSavedGoogleAccounts() {
  const container = document.getElementById('savedGoogleAccountsList');
  if (!container) return;
  let accounts = [];
  try {
    accounts = JSON.parse(localStorage.getItem('allmath_saved_google_accounts') || '[]');
  } catch (e) {}

  if (accounts.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.innerHTML = '<span class="saved-accounts-title">1-Click Saved Accounts:</span>';
  accounts.forEach(acc => {
    const tile = document.createElement('div');
    tile.className = 'saved-account-tile';
    tile.innerHTML = `
      <div class="saved-acc-avatar">${acc.name ? acc.name[0].toUpperCase() : 'G'}</div>
      <div class="saved-acc-details">
        <span class="saved-acc-name">${acc.name}</span>
        <span class="saved-acc-email">${acc.email}</span>
      </div>
      <i class="fa-solid fa-arrow-right-to-bracket text-emerald" style="margin-left: auto;"></i>
    `;
    tile.onclick = () => performGoogleAuthentication(acc);
    container.appendChild(tile);
  });
  container.classList.remove('hidden');
}

function openAuthModal(mode = 'login', customMessage = null) {
  const modal = document.getElementById('authModalBackdrop');
  const notice = document.getElementById('authModalNotice');
  if (customMessage) {
    notice.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fa-solid fa-lock"></i> ${customMessage}</span>`;
  } else {
    notice.textContent = 'Sign in with your Google Account to connect with AllMath and unlock history.';
  }
  
  document.getElementById('googleAuthSection')?.classList.remove('hidden');
  document.getElementById('emailAuthSection')?.classList.add('hidden');
  renderSavedGoogleAccounts();
  modal?.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModalBackdrop')?.classList.add('hidden');
}

function renderAuthUI() {
  const container = document.getElementById('authContainer');
  if (!container) return;

  if (currentUser) {
    const avatar = currentUser.picture 
      ? `<img src="${currentUser.picture}" class="user-avatar-img" alt="avatar">` 
      : (currentUser.name ? currentUser.name[0].toUpperCase() : 'G');

    container.innerHTML = `
      <div class="user-menu-wrapper" id="userMenuWrapper">
        <button type="button" class="user-profile-btn" id="btnUserDropdown" title="User Menu">
          <div class="user-avatar-circle">${avatar}</div>
          <span class="user-name-text">${currentUser.name || currentUser.email}</span>
          <i class="fa-solid fa-chevron-down user-dropdown-arrow" id="userDropdownArrow"></i>
        </button>
        <div class="user-dropdown-card hidden" id="userDropdownCard">
          <div class="user-dropdown-header">
            <div class="dropdown-avatar-lg">${avatar}</div>
            <div class="dropdown-user-info">
              <span class="dropdown-user-name">${currentUser.name || 'User'}</span>
              <span class="dropdown-user-email">${currentUser.email || ''}</span>
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
      currentUser = null;
      localStorage.removeItem('allmath_user');
      container.innerHTML = `
        <button class="btn-login" id="btnOpenLogin">
          <i class="fa-regular fa-user"></i> <span>Login</span>
        </button>
      `;
      document.getElementById('btnOpenLogin')?.addEventListener('click', () => openAuthModal('login'));
      loadHistory();
      showToast("Signed Out", "You have been logged out safely.", "logout");
    });

    document.addEventListener('click', (e) => {
      const menuWrapper = document.getElementById('userMenuWrapper');
      if (menuWrapper && !menuWrapper.contains(e.target)) {
        dropdownCard?.classList.add('hidden');
        dropdownArrow?.classList.remove('open');
      }
    });

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
  const blogList = document.getElementById('blogListPage');
  const blogReader = document.getElementById('blogReaderPage');
  const articleContent = document.getElementById('blogArticleContent');
  const btnBack = document.getElementById('btnBackToBlogs');

  document.querySelectorAll('.blog-card, .btn-read-article').forEach(el => {
    el.addEventListener('click', (e) => {
      const postId = el.dataset.postId || el.closest('.blog-card')?.dataset.postId;
      if (postId && blogArticles[postId]) {
        openBlogArticle(postId);
      }
    });
  });

  btnBack.addEventListener('click', () => {
    blogReader.classList.add('hidden');
    blogList.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function openBlogArticle(postId) {
    const post = blogArticles[postId];
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

    blogList.classList.add('hidden');
    blogReader.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('btnTryArticleCalc')?.addEventListener('click', () => {
      showSection('home');
      switchCalculatorMode(post.calcMode);
      if (post.calcQuery) {
        if (post.calcMode === 'expression') document.getElementById('mainExprInput').value = post.calcQuery;
        if (post.calcMode === 'acdc') document.getElementById('acdcVoltage').value = post.calcQuery;
      }
      document.getElementById('solverCardAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    if (window.renderMathInElement) {
      window.renderMathInElement(articleContent);
    }
  }
}

/* ===================================================
   NAVIGATION & CALCULATOR MODE SWITCHING
   =================================================== */
function setupNavigationRouting() {
  const navActions = document.querySelectorAll('.nav-link-action');
  navActions.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.dataset.target || 'home';
      const calcMode = el.dataset.calc;

      closeDropdown();
      closeMobileSidebar();
      showSection(target);

      if (calcMode) {
        switchCalculatorMode(calcMode);
        const anchor = document.getElementById('solverCardAnchor');
        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
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

  // Mobile Drawer Login Button
  const btnMobLogin = document.getElementById('btnMobileDrawerLogin');
  btnMobLogin?.addEventListener('click', () => {
    closeMobileSidebar();
    openAuthModal('login');
  });
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

  // Native keyboard/contextual paste event
  mf?.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (clipboardData) {
      const text = clipboardData.getData('text');
      if (text) {
        e.preventDefault();
        insertPastedText(text);
      }
    }
  });
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: currentMode, payload })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success && data.steps) {
      renderResult(data.answer, data.steps);
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

function renderResult(answer, steps) {
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

    const inlineMathMatch = s.label.match(/(\frac\{[^{}]+\}\{[^{}]+\}.*)$/);
    if (inlineMathMatch) {
      const textPart = s.label.substring(0, inlineMathMatch.index);
      const mathPart = inlineMathMatch[1];
      label.innerHTML = `<span>${textPart}</span><span class="step-inline-math"></span>`;
      try {
        katex.render(mathPart, label.querySelector('.step-inline-math'), { throwOnError: false, displayMode: false });
      } catch (e) {
        label.textContent = s.label;
      }
    } else {
      label.textContent = s.label;
    }

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
   HISTORY LOCK & STORAGE
   =================================================== */
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (!data.history || data.history.length === 0) {
      list.innerHTML = `
        <div class="no-history">
          <i class="fa-regular fa-comments empty-icon"></i>
          <p>No History Found</p>
        </div>`;
      return;
    }

    data.history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      const mathDisplay = item.query || item.title;
      el.innerHTML = `
        <span class="hist-label" style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          <i class="fa-solid fa-calculator" style="flex-shrink:0;"></i> 
          <span class="hist-math-target" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;"></span>
        </span>
        <i class="fa-solid ${currentUser ? 'fa-chevron-right' : 'fa-lock'}" style="font-size: 11px; color:#9ca3af; flex-shrink:0;"></i>
      `;
      const target = el.querySelector('.hist-math-target');
      try {
        if (window.katex && (mathDisplay.includes('\\') || mathDisplay.includes('/') || mathDisplay.includes('^'))) {
          katex.render(mathDisplay, target, { throwOnError: false, displayMode: false });
        } else {
          target.textContent = item.title;
        }
      } catch (e) {
        target.textContent = item.title;
      }

      el.onclick = () => {
        if (!currentUser) {
          openAuthModal('login', 'Please sign in with Google or Email to restore and view previous calculations!');
          return;
        }

        showSection('home');
        if (item.type) switchCalculatorMode(item.type);
        renderResult(item.answer, item.steps);
        closeMobileSidebar();
      };

      list.appendChild(el);
    });
  } catch (err) {
    console.error("Failed to fetch history");
  }
}

async function clearAllHistory() {
  if (!currentUser) {
    openAuthModal('login', 'Please login to manage your history records.');
    return;
  }
  if (!confirm("Are you sure you want to clear all history?")) return;
  await fetch('/api/history', { method: 'DELETE' });
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

function copyResult() {
  const answer = document.getElementById('bigAnswerBox')?.innerText || '';
  const stepsNodes = document.querySelectorAll('#katexStepsList .step-row');

  if (!answer) {
    showToast("Empty Result", "Koi result mojood nahi hai.", "warning");
    return;
  }

  let fullText = `AllMath Solution
Answer: ${answer}

Step-by-Step Breakdown:
`;
  stepsNodes.forEach((node, idx) => {
    const title = node.querySelector('.step-title')?.innerText || `Step ${idx + 1}`;
    const mathText = node.querySelector('div:last-child')?.innerText || '';
    fullText += `${title}: ${mathText}
`;
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
