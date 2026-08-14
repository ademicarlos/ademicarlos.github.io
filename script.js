const WHATSAPP_NUMBER = "5577998726668";

const OBJETIVOS = {
  agro: [
    { label: "Trator", emoji: "🚜" },
    { label: "Colheitadeira", emoji: "🌾" },
    { label: "Implementos", emoji: "⚙️" },
    { label: "Caminhão", emoji: "🚛" },
    { label: "Terra", emoji: "🌱" },
    { label: "Estrutura", emoji: "🏗️" },
    { label: "Outro", emoji: "💬" },
  ],
  veiculo: [
    { label: "Carro", emoji: "🚗" },
    { label: "Moto", emoji: "🏍️" },
    { label: "Caminhão", emoji: "🚛" },
    { label: "Outro", emoji: "💬" },
  ],
  imovel: [
    { label: "Casa", emoji: "🏠" },
    { label: "Apartamento", emoji: "🏢" },
    { label: "Terreno", emoji: "📍" },
    { label: "Imóvel comercial", emoji: "🏬" },
    { label: "Construção", emoji: "🏗️" },
    { label: "Reforma", emoji: "🔨" },
    { label: "Investimento", emoji: "📈" },
  ],
  investimento: [
    { label: "Aquisição de imóveis", emoji: "🏠" },
    { label: "Formação patrimonial", emoji: "📊" },
    { label: "Diversificação", emoji: "🔄" },
    { label: "Quero entender melhor", emoji: "💬" },
  ],
  outros: [{ label: "Quero conhecer as opções disponíveis", emoji: "💬" }],
};

const SEGMENTO_LABEL = {
  agro: "Agronegócio",
  veiculo: "Veículo",
  imovel: "Imóvel",
  investimento: "Planejamento Patrimonial",
  outros: "Outros",
};

const CREDITO_PREDEFINIDOS = [
  "Até R$ 50 mil",
  "R$ 50 mil – R$ 100 mil",
  "R$ 100 mil – R$ 300 mil",
  "R$ 300 mil – R$ 500 mil",
  "Acima de R$ 500 mil",
];

const state = {
  segmento: null,
  credito: null,
  objetivo: null,
  prazo: null,
  possuiLance: null,
  valorLance: "",
  nome: "",
  whatsapp: "",
  cidade: "",
  estado: "",
};

const TOTAL_STEPS = 5;
let currentStep = 1;

const form = document.getElementById("simForm");
const steps = document.querySelectorAll(".form-step");
const progressSteps = document.querySelectorAll(".progress-step");
const progressLabel = document.getElementById("progressLabel");

/* ---------- helpers ---------- */

function parseValorBR(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/\./g, "");
  }
  const num = parseFloat(s);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

function formatBRL(num) {
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function setFieldError(fieldId, show) {
  const el = document.getElementById(fieldId);
  if (el) el.hidden = !show;
}

/* ---------- step navigation ---------- */

function focusStepHeading(step) {
  const el = document.querySelector(`.form-step[data-step="${step}"] h3`);
  if (el) el.focus({ preventScroll: true });
}

function goToStep(step) {
  currentStep = step;
  steps.forEach((el) => el.classList.toggle("active", el.dataset.step == step));
  progressSteps.forEach((el) => {
    const n = Number(el.dataset.progress);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
  });
  if (progressLabel && typeof step === "number") {
    progressLabel.textContent = `Etapa ${step} de ${TOTAL_STEPS}`;
  }
  syncStepUI(step);
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  focusStepHeading(step);
}

function selectOption(group, button, { silent } = {}) {
  group.querySelectorAll(".option-btn").forEach((b) => {
    b.classList.remove("selected");
    b.setAttribute("aria-pressed", "false");
  });
  if (button) {
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
  }
}

function setContinueEnabled(step, enabled) {
  const btn = document.querySelector(`[data-action="continue"][data-step="${step}"]`);
  if (btn) btn.disabled = !enabled;
}

/* Restores visual selection state for a step based on the current `state`,
   so navigating back and forward never loses a previous answer. */
function syncStepUI(step) {
  if (step === 1) {
    const group = document.getElementById("step1-options");
    const btn = state.segmento ? group.querySelector(`.option-btn[data-value="${state.segmento}"]`) : null;
    selectOption(group, btn);
    setContinueEnabled(1, !!state.segmento);
  }

  if (step === 2) {
    const group = document.getElementById("step2-options");
    const outroCampo = document.getElementById("campo-outro-credito");
    const outroInput = document.getElementById("outroCredito");
    const continueBtn = document.querySelector('[data-action="continue"][data-step="2"]');

    if (state.credito && CREDITO_PREDEFINIDOS.includes(state.credito)) {
      selectOption(group, group.querySelector(`.option-btn[data-value="${state.credito}"]`));
      outroCampo.hidden = true;
      continueBtn.hidden = false;
      setContinueEnabled(2, true);
    } else if (state.credito) {
      selectOption(group, group.querySelector('.option-btn[data-value="outro"]'));
      outroCampo.hidden = false;
      continueBtn.hidden = true;
      outroInput.value = state.credito.replace(/^R\$\s*/i, "");
      validarOutroCredito();
    } else {
      selectOption(group, null);
      outroCampo.hidden = true;
      continueBtn.hidden = false;
      setContinueEnabled(2, false);
    }
  }

  if (step === 3) {
    const group = document.getElementById("step3-options");
    const btn = state.objetivo ? group.querySelector(`.option-btn[data-value="${state.objetivo}"]`) : null;
    selectOption(group, btn);
    setContinueEnabled(3, !!state.objetivo);
  }

  if (step === 4) {
    const prazoGroup = document.getElementById("prazo-options");
    const lanceGroup = document.getElementById("lance-options");
    const campoLance = document.getElementById("campo-valor-lance");
    const lanceInput = document.getElementById("valorLance");

    selectOption(prazoGroup, state.prazo ? prazoGroup.querySelector(`.option-btn[data-value="${state.prazo}"]`) : null);
    selectOption(lanceGroup, state.possuiLance ? lanceGroup.querySelector(`.option-btn[data-value="${state.possuiLance}"]`) : null);

    if (state.possuiLance === "Sim") {
      campoLance.hidden = false;
      if (state.valorLance) lanceInput.value = state.valorLance;
    } else {
      campoLance.hidden = true;
    }
    setFieldError("prazoError", false);
    setFieldError("valorLanceError", false);
  }
}

/* ---------- step 1: segmento ---------- */

document.getElementById("step1-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  state.segmento = btn.dataset.value;
  selectOption(e.currentTarget, btn);
  setContinueEnabled(1, true);
  buildStep3Options();
});

document.querySelector('[data-action="continue"][data-step="1"]').addEventListener("click", () => {
  if (!state.segmento) return;
  goToStep(2);
});

/* ---------- step 2: crédito ---------- */

const step2Group = document.getElementById("step2-options");
const outroCampo = document.getElementById("campo-outro-credito");
const outroInput = document.getElementById("outroCredito");
const confirmarCreditoBtn = document.getElementById("confirmarCredito");
const step2ContinueBtn = document.querySelector('[data-action="continue"][data-step="2"]');

step2Group.addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  selectOption(step2Group, btn);

  if (btn.dataset.value === "outro") {
    state.credito = null;
    outroCampo.hidden = false;
    step2ContinueBtn.hidden = true;
    setFieldError("outroCreditoError", false);
    outroInput.value = "";
    validarOutroCredito();
    outroInput.focus();
  } else {
    outroCampo.hidden = true;
    step2ContinueBtn.hidden = false;
    state.credito = btn.dataset.value;
    setContinueEnabled(2, true);
  }
});

function validarOutroCredito() {
  const num = parseValorBR(outroInput.value);
  confirmarCreditoBtn.disabled = !num;
  return num;
}

outroInput.addEventListener("input", () => {
  setFieldError("outroCreditoError", false);
  outroInput.closest(".campo").classList.remove("campo-invalido");
  validarOutroCredito();
});

outroInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    confirmarCreditoBtn.click();
  }
});

confirmarCreditoBtn.addEventListener("click", () => {
  const num = parseValorBR(outroInput.value);
  if (!num) {
    setFieldError("outroCreditoError", true);
    outroInput.closest(".campo").classList.add("campo-invalido");
    outroInput.focus();
    return;
  }
  state.credito = formatBRL(num);
  goToStep(3);
});

step2ContinueBtn.addEventListener("click", () => {
  if (!state.credito) return;
  goToStep(3);
});

/* ---------- step 3: objetivo ---------- */

function buildStep3Options() {
  const container = document.getElementById("step3-options");
  container.innerHTML = "";
  const lista = OBJETIVOS[state.segmento] || OBJETIVOS.outros;
  lista.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn option-btn--compact";
    btn.dataset.value = item.label;
    btn.setAttribute("aria-pressed", "false");

    const emoji = document.createElement("span");
    emoji.className = "option-emoji option-emoji--sm";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = item.emoji;

    const text = document.createElement("span");
    text.textContent = item.label;

    btn.appendChild(emoji);
    btn.appendChild(text);
    container.appendChild(btn);
  });
}

document.getElementById("step3-options").addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  state.objetivo = btn.dataset.value;
  selectOption(e.currentTarget, btn);
  setContinueEnabled(3, true);
});

document.querySelector('[data-action="continue"][data-step="3"]').addEventListener("click", () => {
  if (!state.objetivo) return;
  goToStep(4);
});

/* ---------- step 4: prazo + lance ---------- */

const prazoGroup = document.getElementById("prazo-options");
const lanceGroup = document.getElementById("lance-options");
const campoLance = document.getElementById("campo-valor-lance");
const lanceInput = document.getElementById("valorLance");

prazoGroup.addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  selectOption(prazoGroup, btn);
  state.prazo = btn.dataset.value;
  setFieldError("prazoError", false);
});

lanceGroup.addEventListener("click", (e) => {
  const btn = e.target.closest(".option-btn");
  if (!btn) return;
  selectOption(lanceGroup, btn);
  state.possuiLance = btn.dataset.value;
  if (btn.dataset.value === "Sim") {
    campoLance.hidden = false;
    setFieldError("valorLanceError", false);
    lanceInput.focus();
  } else {
    campoLance.hidden = true;
    state.valorLance = "";
    lanceInput.value = "";
    setFieldError("valorLanceError", false);
  }
});

lanceInput.addEventListener("input", () => {
  setFieldError("valorLanceError", false);
  lanceInput.closest(".campo").classList.remove("campo-invalido");
});

document.querySelector('[data-action="continue"][data-step="4"]').addEventListener("click", () => {
  let ok = true;

  if (!state.prazo) {
    setFieldError("prazoError", true);
    ok = false;
  }

  if (state.possuiLance === "Sim") {
    const num = parseValorBR(lanceInput.value);
    if (!num) {
      setFieldError("valorLanceError", true);
      lanceInput.closest(".campo").classList.add("campo-invalido");
      ok = false;
    } else {
      state.valorLance = formatBRL(num);
    }
  }

  if (!ok) return;
  goToStep(5);
});

/* ---------- step 5: dados pessoais ---------- */

function validarCampoTexto(inputId, errorId) {
  const input = document.getElementById(inputId);
  const valido = input.value.trim().length > 0;
  setFieldError(errorId, !valido);
  input.closest(".campo").classList.toggle("campo-invalido", !valido);
  return valido;
}

function validarWhatsapp() {
  const input = document.getElementById("whatsapp");
  const digits = input.value.replace(/\D/g, "");
  const valido = digits.length >= 10;
  setFieldError("whatsappError", !valido);
  input.closest(".campo").classList.toggle("campo-invalido", !valido);
  return valido;
}

/* ---------- back navigation ---------- */

document.querySelectorAll('[data-action="back"]').forEach((btn) => {
  btn.addEventListener("click", () => goToStep(Math.max(1, currentStep - 1)));
});

/* ---------- final submit ---------- */

function buildWhatsappMessage() {
  const linhas = [
    `Olá, Carlos! Fiz uma simulação pelo seu site.`,
    ``,
    `Objetivo: ${SEGMENTO_LABEL[state.segmento] || state.segmento}`,
    `Crédito desejado: ${state.credito}`,
    `O que pretende adquirir: ${state.objetivo}`,
    `Prazo: ${state.prazo}`,
  ];
  if (state.possuiLance === "Sim" && state.valorLance) {
    linhas.push(`Recurso para lance: ${state.valorLance}`);
  } else if (state.possuiLance) {
    linhas.push(`Recurso para lance: ${state.possuiLance}`);
  }
  linhas.push(`Cidade: ${state.cidade}/${state.estado}`);
  linhas.push(``);
  linhas.push(`Meu nome é ${state.nome}.`);
  linhas.push(`Gostaria de receber uma simulação personalizada.`);
  return linhas.join("\n");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  state.nome = document.getElementById("nome").value.trim();
  state.whatsapp = document.getElementById("whatsapp").value.trim();
  state.cidade = document.getElementById("cidade").value.trim();
  state.estado = document.getElementById("estado").value;
  const consentimento = document.getElementById("consentimento").checked;

  const nomeOk = validarCampoTexto("nome", "nomeError");
  const whatsappOk = validarWhatsapp();
  const cidadeOk = validarCampoTexto("cidade", "cidadeError");
  const estadoOk = validarCampoTexto("estado", "estadoError");
  setFieldError("consentimentoError", !consentimento);

  if (!nomeOk || !whatsappOk || !cidadeOk || !estadoOk || !consentimento) {
    const firstInvalid = form.querySelector(".campo-invalido input, .campo-invalido select, #consentimento:not(:checked)");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const mensagem = buildWhatsappMessage();
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
  document.getElementById("whatsappLink").href = link;
  document.getElementById("successNome").textContent = `Tudo certo, ${state.nome}!`;

  steps.forEach((el) => el.classList.remove("active"));
  document.querySelector('[data-step="success"]').classList.add("active");
  progressSteps.forEach((el) => el.classList.add("done"));
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  focusStepHeading("success");
});

/* ---------- entry points: segmento cards + hash routing ---------- */

document.querySelectorAll(".segmento-card").forEach((card) => {
  card.addEventListener("click", () => {
    const segmento = card.dataset.segmento;
    state.segmento = segmento;
    buildStep3Options();
    document.getElementById("simulacao").scrollIntoView({ behavior: "smooth", block: "start" });
    goToStep(2);
  });
});

function preSelectFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (OBJETIVOS[hash]) {
    state.segmento = hash;
    buildStep3Options();
    goToStep(2);
  }
}

preSelectFromHash();
syncStepUI(1);

/* ---------- header: hide on scroll down, show on scroll up ---------- */

(function () {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = Math.max(window.scrollY, 0);
    if (y > lastY && y > 90) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
})();

/* ---------- mobile menu ---------- */

(function () {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("mobileMenu");
  if (!toggle || !menu) return;

  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    expanded ? closeMenu() : openMenu();
  });

  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  document.addEventListener("click", (e) => {
    if (toggle.getAttribute("aria-expanded") === "true" && !menu.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      toggle.focus();
    }
  });
})();
