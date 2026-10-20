let currentMode = 'expression';

const symbolsData = {
  quick: ['+', '−', '×', '÷', '=', '≠', '<', '>', '≤', '≥', '□/□', '√□', '□²', '□³', '□ⁿ', '±', 'π', '°', 'θ', '∞', '(□)', '|□|'],
  arithmetic: ['+', '−', '×', '÷', '±', '∓', '□/□', '1/□', '√□', '∛□', '=', '≠', '≈', '<', '≤', '>', '≥', '≪', '≫', '·', '%', 'π', 'e', '∞', '⌈□⌉', '⌊□⌋', '□!', 'gcd(□,□)', 'lcm(□,□)'],
  algebra: ['x', 'y', 'z', 'n', 'k', '□/□', '√□', '□²', '□³', '□ⁿ', '∝', '±', 'f(□)', 'ln(□)', 'log₁₀(□)', 'e^□', '|□|', '∑', 'y=mx+b'],
  trig: ['sin(□)', 'cos(□)', 'tan(□)', 'csc(□)', 'sec(□)', 'cot(□)', 'arcsin(□)', 'arccos(□)', 'arctan(□)', 'sinh(□)', 'cosh(□)', 'tanh(□)', 'π', 'θ', 'ϕ', '°'],
  calculus: ['d/dx', 'd²/dx²', 'dy/dx', 'lim', '∫', '∫□□', '∂/∂x', '∮', '∇', 'Δx', '∞'],
  linalg: ['·', '×', '‖□‖', '[2x2]', '[3x3]', 'det(□)', 'Tr(□)', 'rank(□)', '□⁻¹', '□ᵀ', 'λ', 'I'],
  discrete: ['∀', '∃', '∄', '∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '{□}', '⟹', '⟺', '∧', '∨', '¬'],
  greek: ['α', 'β', 'γ', 'δ', 'ϵ', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'ϕ', 'omega', 'Δ', 'Σ', 'Ω']
};

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupSymbols();
  loadHistory();

  document.getElementById('btnCalculate').addEventListener('click', handleCalculate);
  document.getElementById('btnToggleFx').addEventListener('click', () => {
    document.getElementById('symbolsDrawer').classList.toggle('hidden');
  });
  document.getElementById('btnNewChat').addEventListener('click', () => {
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('mainExprInput').value = '';
  });
  document.getElementById('btnClearHistory').addEventListener('click', clearAllHistory);
  document.getElementById('btnCopy').addEventListener('click', copyResult);
  document.getElementById('btnPdf').addEventListener('click', () => window.print());
});

function setupTabs() {
  const tabs = document.querySelectorAll('.calc-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;

      document.getElementById('proportionInputs').classList.add('hidden');
      document.getElementById('expressionInputs').classList.add('hidden');
      document.getElementById('ageInputs').classList.add('hidden');

      if (currentMode === 'proportion') {
        document.getElementById('proportionInputs').classList.remove('hidden');
      } else if (currentMode === 'expression') {
        document.getElementById('expressionInputs').classList.remove('hidden');
      } else if (currentMode === 'age') {
        document.getElementById('ageInputs').classList.remove('hidden');
      }
    });
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
  let target = document.getElementById('mainExprInput');
  if (currentMode === 'proportion') {
    target = document.getElementById('propD');
  }
  const start = target.selectionStart || target.value.length;
  const end = target.selectionEnd || target.value.length;
  const text = target.value;
  target.value = text.substring(0, start) + sym + text.substring(end);
  target.focus();
}

async function handleCalculate() {
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
  } else {
    payload = { query: document.getElementById('mainExprInput').value };
  }

  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: currentMode, payload })
    });
    const data = await res.json();
    if (data.success) {
      renderResult(data.answer, data.steps);
      loadHistory();
    }
  } catch (err) {
    alert("Error solving calculation");
  }
}

function renderResult(answer, steps) {
  const card = document.getElementById('resultCard');
  card.classList.remove('hidden');
  document.getElementById('bigAnswerBox').textContent = answer;

  const stepsBox = document.getElementById('katexStepsList');
  stepsBox.innerHTML = '';

  steps.forEach(s => {
    const row = document.createElement('div');
    row.className = 'step-row';
    const label = document.createElement('div');
    label.className = 'step-title';
    label.textContent = s.label;
    const mathDiv = document.createElement('div');
    row.appendChild(label);
    row.appendChild(mathDiv);
    stepsBox.appendChild(row);

    try {
      katex.render(s.katex, mathDiv, { throwOnError: false, displayMode: true });
    } catch (e) {
      mathDiv.textContent = s.katex;
    }
  });

  card.scrollIntoView({ behavior: 'smooth' });
}

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
      el.innerHTML = `
        <span><i class="fa-solid fa-calculator"></i> ${item.title}</span>
        <i class="fa-solid fa-chevron-right" style="font-size: 10px; color:#9ca3af;"></i>
      `;
      el.onclick = () => renderResult(item.answer, item.steps);
      list.appendChild(el);
    });
  } catch (err) {
    console.error("Failed to fetch history");
  }
}

async function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all history?")) return;
  await fetch('/api/history', { method: 'DELETE' });
  loadHistory();
  document.getElementById('resultCard').classList.add('hidden');
}

function copyResult() {
  const ans = document.getElementById('bigAnswerBox').textContent;
  navigator.clipboard.writeText(ans);
  alert("Result copied to clipboard!");
}
