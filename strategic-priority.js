import {
  STRATEGIC_SPRINTS_2026,
  STRATEGIC_THEME_LABELS,
  getStrategicSprint2026ById,
  getStrategicSprint2026ForDate,
} from "./strategic-sprints-2026.js";

const THEME_KEYWORDS = {
  commercial: [
    "comercial",
    "prospeccao",
    "prospectar",
    "lead",
    "leads",
    "proposta",
    "propostas",
    "follow up",
    "follow-up",
    "fechamento",
    "fechar",
    "contrato",
    "contratos",
    "venda",
    "vendas",
    "receita",
    "dinheiro",
  ],
  legal: [
    "juridico",
    "juridica",
    "caso",
    "casos",
    "processo",
    "processos",
    "peticao",
    "pendencia juridica",
  ],
  product: [
    "produto",
    "app",
    "life os",
    "sistema",
    "gestao rural completa",
    "plataforma",
    "modelo de negocio",
    "validar modelo",
  ],
  organization: [
    "organizar",
    "organizacao",
    "planejar",
    "planejamento",
    "ajustar",
    "revisar",
    "limpar backlog",
    "backlog",
    "processar",
    "agenda",
    "estrutura",
  ],
  content: [
    "conteudo",
    "roteiro",
    "gravar",
    "gravar video",
    "pauta",
    "post",
    "postagem",
    "movimento",
    "depoimento",
    "instagram",
    "youtube",
  ],
  visits: [
    "visita",
    "visitas",
    "presencial",
    "externa",
    "campo",
    "deslocamento",
    "ir ate",
  ],
  management: [
    "gestao",
    "clientes ativos",
    "cliente ativo",
    "entrega",
    "operacao",
    "rodando",
    "consistencia",
  ],
  bigClose: [
    "caso grande",
    "casos grandes",
    "fechamento grande",
    "fechamento maior",
    "cliente grande",
    "contrato grande",
    "grande oportunidade",
  ],
  relationship: [
    "relacionamento",
    "depoimento",
    "depoimentos",
    "evento",
    "acao de relacionamento",
    "pos venda",
    "pos-venda",
    "cliente ativo",
  ],
};

const PROJECT_THEME_HINTS = {
  "project-assessoria": ["commercial", "relationship"],
  "project-financeira": ["management", "product", "legal"],
  "project-conteudo": ["content"],
};

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getCurrentStrategicSprint(state, referenceDate = "") {
  const currentId = state?.sprints?.find((sprint) => sprint.status === "current")?.id || "";
  return getStrategicSprint2026ById(currentId) || getStrategicSprint2026ForDate(referenceDate) || STRATEGIC_SPRINTS_2026[0] || null;
}

function detectThemesFromText(haystack = "") {
  return Object.entries(THEME_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(normalizeText(keyword))))
    .map(([themeId]) => themeId);
}

function buildTaskHaystack(task = {}, context = {}) {
  return normalizeText([
    task.title,
    task.notes,
    task.nextAction,
    task.type,
    task.context,
    context.projectName,
    context.areaName,
    ...(task.subtasks || []),
  ].filter(Boolean).join(" "));
}

function detectSignals(task = {}, context = {}) {
  const haystack = buildTaskHaystack(task, context);
  const projectThemes = PROJECT_THEME_HINTS[task.projectId] || [];
  const detectedThemes = unique([
    ...detectThemesFromText(haystack),
    ...projectThemes,
  ]);

  const generatesRevenue = detectedThemes.includes("commercial")
    || detectedThemes.includes("bigClose")
    || ["receita", "dinheiro", "cliente", "proposta", "contrato", "fechar"].some((keyword) => haystack.includes(keyword));

  const lightMorning = ["mensagem", "mensagens", "resposta", "respostas", "suporte", "whats", "whatsapp", "ligar"].some((keyword) => haystack.includes(keyword))
    || (task.estimatedMinutes || 0) <= 30;

  const heavyExecution = detectedThemes.includes("commercial")
    || detectedThemes.includes("management")
    || detectedThemes.includes("product")
    || (task.estimatedMinutes || 0) >= 60;

  return {
    haystack,
    themes: detectedThemes,
    generatesRevenue,
    bigClose: detectedThemes.includes("bigClose"),
    visit: detectedThemes.includes("visits"),
    organization: detectedThemes.includes("organization"),
    lightMorning,
    heavyExecution,
  };
}

function summarizePrimaryReason(sprint, primaryTheme, reasons = [], signals = {}) {
  if (!sprint) {
    return "Sem sprint estrategico ativo definido.";
  }

  if (signals.bigClose) {
    return `Prioridade maxima porque conversa com ${sprint.title} e sinaliza fechamento grande.`;
  }

  if (signals.generatesRevenue) {
    return `Alta prioridade porque esta alinhada ao ${sprint.title} e gera oportunidade comercial.`;
  }

  if (primaryTheme) {
    return `Prioridade puxada pelo ${sprint.title}: tema ${primaryTheme.label} com peso ${primaryTheme.weight}.`;
  }

  return reasons[0]
    ? `Leitura estrategica: ${reasons[0]}.`
    : `Sem alinhamento forte com ${sprint.title}.`;
}

export function evaluateStrategicPriority(task = {}, state = {}, referenceDate = "", taskPeriod = "") {
  const sprint = getCurrentStrategicSprint(state, referenceDate);
  const context = {
    areaName: state?.areas?.find((area) => area.id === task.areaId)?.name || "",
    projectName: state?.projects?.find((project) => project.id === task.projectId)?.name || "",
  };
  const signals = detectSignals(task, context);
  const reasons = [];
  const matchedThemes = signals.themes
    .map((themeId) => ({
      id: themeId,
      label: STRATEGIC_THEME_LABELS[themeId] || themeId,
      weight: sprint?.strategicWeights?.[themeId] || sprint?.weights?.[themeId] || 0,
    }))
    .filter((entry) => entry.weight > 0)
    .sort((left, right) => right.weight - left.weight);
  const primaryTheme = matchedThemes[0] || null;
  const openTaskCount = Array.isArray(state?.tasks)
    ? state.tasks.filter((entry) => !["done", "template", "discarded"].includes(entry.status)).length
    : 0;

  let scoreDelta = 0;

  if (primaryTheme) {
    scoreDelta += primaryTheme.weight * 3;
    reasons.push(`tema ${primaryTheme.label} recebe peso ${primaryTheme.weight} no ${sprint?.title || "sprint atual"}`);
  }

  if (signals.generatesRevenue) {
    scoreDelta += 18;
    reasons.push("gera cliente, receita ou fechamento");
  }

  if (signals.bigClose) {
    scoreDelta += 24;
    reasons.push("entra na frente por ser fechamento grande");
  }

  if (taskPeriod === "afternoon" && (signals.generatesRevenue || signals.visit || matchedThemes.some((entry) => ["commercial", "visits", "management", "bigClose"].includes(entry.id)))) {
    scoreDelta += 10;
    reasons.push("ganha forca na tarde, que e sua janela de execucao comercial");
  }

  if (taskPeriod === "night" && signals.organization) {
    scoreDelta += 8;
    reasons.push("organizacao tende a encaixar melhor a noite");
  }

  if (taskPeriod === "morning") {
    if (signals.lightMorning) {
      scoreDelta += 8;
      reasons.push("combina com a manha leve de casa, filhos e respostas");
    } else if (signals.heavyExecution && !task.critical) {
      scoreDelta -= 7;
      reasons.push("na manha tarefas pesadas costumam perder espaco");
    }
  }

  if (!primaryTheme && sprint) {
    scoreDelta -= 6;
    reasons.push(`nao conversa diretamente com o foco principal do ${sprint.title}`);
  }

  const shouldDownrankForLowWeight = openTaskCount > 10
    && primaryTheme
    && primaryTheme.weight > 0
    && primaryTheme.weight < 6
    && !signals.generatesRevenue
    && !signals.bigClose;

  if (shouldDownrankForLowWeight) {
    scoreDelta -= 16;
    reasons.push("com excesso de tarefas, temas com peso menor que 6 perdem espaco");
  }

  const level = signals.bigClose
    ? "maxima"
    : primaryTheme?.weight >= 10 || signals.generatesRevenue
      ? "alta"
      : primaryTheme?.weight >= 8
        ? "alta"
        : primaryTheme?.weight >= 6
          ? "media"
          : "baixa";

  const matched = Boolean(primaryTheme || signals.generatesRevenue || signals.bigClose);

  return {
    sprintId: sprint?.id || "",
    sprintTitle: sprint?.title || "",
    matched,
    matchedThemes,
    primaryTheme: primaryTheme?.label || "",
    primaryThemeId: primaryTheme?.id || "",
    weight: primaryTheme?.weight || 0,
    scoreDelta,
    reasons: unique(reasons).slice(0, 5),
    summaryReason: summarizePrimaryReason(sprint, primaryTheme, reasons, signals),
    level,
    downrankedForLowWeight: shouldDownrankForLowWeight,
    generatesRevenue: signals.generatesRevenue,
    bigClose: signals.bigClose,
  };
}
