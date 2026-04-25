import {
  APP_TIMEZONE,
  addDays,
  clamp,
  createLocalDateTime,
  differenceInDays,
  formatISODate,
  formatLongDate,
  formatShortDate,
  formatWeekday,
  getCurrentISODate,
  getCurrentYear,
  getWeekDates,
  getWeekdayKey,
} from "./date.js";

const DEFAULT_FILTERS = {
  scope: "integrated",
  areaId: "all",
  projectId: "all",
  context: "all",
  dayTypeId: "all",
};

const ENERGY_FACTOR = { 1: 0.7, 2: 0.85, 3: 1, 4: 1.12, 5: 1.22 };
const PRIORITY_BASE = { low: 18, medium: 30, high: 44 };
const LAYOUT_WIDTH_ORDER = ["compact", "medium", "full"];
const LAYOUT_HEIGHT_ORDER = ["compact", "regular", "tall"];
const PROJECT_TEMPLATES = [
  {
    id: "work",
    label: "Projeto de trabalho",
    areaId: "area-work",
    projectType: "Projeto de trabalho",
    color: "#5f7859",
    summary: "Projeto com entregas, backlog, referencias e proximas acoes claras.",
    objective: "Avancar com clareza e manter execucao consistente.",
    description: "Workspace para organizar escopo, decisoes, backlog e plano de acao do projeto.",
    infoLinks: [
      { label: "Drive do projeto", url: "https://drive.google.com/" },
    ],
    referenceEntries: [
      { label: "Briefing / notas maestras", url: "" },
    ],
    observationLines: ["Mapear o contexto atual antes de abrir novas frentes."],
    decisionLines: ["Registrar decisoes relevantes logo que acontecerem."],
    okrs: [
      { title: "Dar tracao no projeto", status: "active", progress: 35, keyResults: ["Definir escopo claro", "Executar as 3 proximas entregas", "Fechar feedback com rapidez"] },
    ],
    backlogItems: [
      { title: "Mapear pendencias futuras", notes: "Itens que ainda nao vao para a semana atual." },
      { title: "Levantar oportunidades de melhoria", notes: "" },
    ],
    baseActivities: [
      { title: "Abrir contexto do projeto", checklist: ["ler notas principais", "revisar pendencias", "anotar proxima acao"], context: "planning", estimatedMinutes: 20, priority: "medium", bucket: "priority" },
      { title: "Executar bloco de entrega", checklist: ["abrir material", "trabalhar sem interrupcao", "fechar proximo passo"], context: "deep-work", estimatedMinutes: 60, priority: "high", bucket: "do-now" },
    ],
    actionPlan: [
      { title: "Fechar proxima entrega principal", nextAction: "Abrir material atual e revisar o primeiro gargalo.", checklist: ["revisar insumos", "executar entrega", "registrar decisao"], bucket: "priority" },
    ],
  },
  {
    id: "personal",
    label: "Projeto pessoal",
    areaId: "area-personal",
    projectType: "Projeto pessoal",
    color: "#6d7a70",
    summary: "Projeto de vida pessoal com foco em clareza, etapas e acompanhamento leve.",
    objective: "Organizar um objetivo pessoal em passos claros.",
    description: "Espaco para anotar referencias, backlog e proximas acoes sem poluir a execucao do dia.",
    backlogItems: [
      { title: "Listar ideias e alternativas", notes: "" },
    ],
    baseActivities: [
      { title: "Revisao semanal do projeto", checklist: ["ver o que andou", "ajustar proximo passo"], context: "planning", estimatedMinutes: 20, priority: "medium", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Definir proxima acao real", nextAction: "Escolher o menor passo que destrava o projeto.", checklist: ["quebrar em etapa pequena"], bucket: "priority" },
    ],
  },
  {
    id: "move",
    label: "Projeto de mudanca",
    areaId: "area-move",
    projectType: "Projeto de mudanca",
    color: "#7d705a",
    summary: "Mudanca com etapas, prazos, custos e estrutura por frentes.",
    objective: "Chegar pronto para a transicao ate novembro.",
    description: "Organiza frente de casa, trabalho, custos e pendencias da mudanca.",
    backlogItems: [
      { title: "Mapear itens da nova casa", notes: "" },
      { title: "Levantar custos e prioridades", notes: "" },
    ],
    baseActivities: [
      { title: "Revisao da mudanca", checklist: ["atualizar checklist", "validar prazo", "checar custo"], context: "planning", estimatedMinutes: 30, priority: "high", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Fechar proxima frente da mudanca", nextAction: "Escolher uma frente da semana e destrinchar.", checklist: ["definir prioridade", "criar tarefas reais"], bucket: "priority" },
    ],
  },
  {
    id: "travel",
    label: "Projeto de viagem",
    areaId: "area-personal",
    projectType: "Projeto de viagem",
    color: "#6e7f93",
    summary: "Viagem organizada com planejamento, reservas e checklist.",
    objective: "Evitar esquecimentos e concentrar tudo em um lugar so.",
    description: "Espaco para roteiro, reservas, custos e pendencias da viagem.",
    backlogItems: [
      { title: "Listar reservas e documentos", notes: "" },
    ],
    baseActivities: [
      { title: "Revisar documentos", checklist: ["confirmar datas", "checar comprovantes"], context: "admin", estimatedMinutes: 25, priority: "medium", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Fechar a proxima reserva", nextAction: "Abrir a principal pendencia da viagem.", checklist: ["comparar opcoes", "confirmar"], bucket: "priority" },
    ],
  },
  {
    id: "content",
    label: "Projeto de conteudo",
    areaId: "area-work",
    projectType: "Projeto de conteudo",
    color: "#8d6d7d",
    summary: "Workspace para ideias, pautas, roteiros, backlog e execucao de conteudo.",
    objective: "Gerar consistencia e crescimento com menos atrito.",
    description: "Centraliza ideias, referencias, roteiros e a traducao para tarefas reais.",
    backlogItems: [
      { title: "Anotar ideias de pauta", notes: "" },
      { title: "Guardar referencias de linguagem e formato", notes: "" },
    ],
    baseActivities: [
      { title: "Abrir pauta e estruturar roteiro", checklist: ["definir angulo", "montar estrutura", "fechar CTA"], context: "creative", estimatedMinutes: 45, priority: "medium", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Gerar o proximo roteiro", nextAction: "Escolher uma ideia do backlog e transformar em roteiro.", checklist: ["selecionar tema", "estruturar topicos"], bucket: "priority" },
    ],
  },
  {
    id: "finance",
    label: "Projeto financeiro",
    areaId: "area-finance",
    projectType: "Projeto financeiro",
    color: "#677066",
    summary: "Projeto para estruturar caixa, custos, metas e decisoes financeiras.",
    objective: "Dar previsibilidade e clareza para as decisoes.",
    description: "Concentra referencias, metas, backlog e proximas acoes ligadas ao financeiro.",
    backlogItems: [
      { title: "Mapear despesas e pendencias", notes: "" },
    ],
    baseActivities: [
      { title: "Revisao financeira", checklist: ["atualizar numeros", "registrar decisoes"], context: "admin", estimatedMinutes: 30, priority: "high", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Definir proxima decisao financeira", nextAction: "Escolher o item com maior impacto imediato.", checklist: ["avaliar impacto", "definir proximo passo"], bucket: "priority" },
    ],
  },
  {
    id: "home",
    label: "Projeto de casa",
    areaId: "area-home",
    projectType: "Projeto de casa",
    color: "#7a7361",
    summary: "Projeto para organizar melhorias, compras e pendencias da casa.",
    objective: "Dar andamento sem misturar tudo na rotina solta.",
    description: "Espaco para backlog, referencias e geracao de tarefas da casa.",
    backlogItems: [
      { title: "Mapear melhorias e compras", notes: "" },
    ],
    baseActivities: [
      { title: "Revisao da frente da casa", checklist: ["ver pendencias", "definir proxima acao"], context: "flex", estimatedMinutes: 20, priority: "medium", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Fechar uma frente da casa", nextAction: "Escolher o item que mais reduz atrito no dia a dia.", checklist: ["quebrar em etapas"], bucket: "priority" },
    ],
  },
  {
    id: "client",
    label: "Projeto de cliente",
    areaId: "area-work",
    projectType: "Projeto de cliente",
    color: "#61785f",
    summary: "Projeto orientado a entrega, follow-up, briefing e decisao com cliente.",
    objective: "Transformar atendimento em execucao organizada e previsivel.",
    description: "Workspace para briefing, backlog, decisao e geracao de tarefas do cliente.",
    backlogItems: [
      { title: "Registrar pendencias e demandas abertas", notes: "" },
    ],
    baseActivities: [
      { title: "Preparar proxima entrega ao cliente", checklist: ["revisar briefing", "fechar escopo", "definir envio"], context: "deep-work", estimatedMinutes: 50, priority: "high", bucket: "priority" },
    ],
    actionPlan: [
      { title: "Fechar a proxima acao do cliente", nextAction: "Abrir a demanda ativa e tirar a proxima travada.", checklist: ["revisar contexto", "executar", "registrar proximo passo"], bucket: "priority" },
    ],
  },
];
const DEFAULT_LAYOUTS = {
  dashboard: [
    { id: "overview", width: "full", height: "compact", frame: null },
    { id: "radar", width: "medium", height: "tall", frame: null },
    { id: "goals", width: "medium", height: "regular", frame: null },
    { id: "areas", width: "medium", height: "regular", frame: null },
    { id: "projects", width: "medium", height: "regular", frame: null },
    { id: "load", width: "full", height: "compact", frame: null },
  ],
  today: [
    { id: "focus", width: "full", height: "regular", frame: null },
    { id: "queue", width: "medium", height: "regular", frame: null },
    { id: "checklist", width: "medium", height: "regular", frame: null },
    { id: "alerts", width: "full", height: "regular", frame: null },
  ],
  checklist: [
      { id: "views", width: "full", height: "compact", frame: null },
      { id: "lists", width: "full", height: "tall", frame: null },
    ],
  days: [
    { id: "snapshot", width: "medium", height: "compact", frame: null },
    { id: "periods", width: "full", height: "tall", frame: null },
    { id: "alerts", width: "medium", height: "regular", frame: null },
  ],
  inbox: [
    { id: "capture", width: "medium", height: "compact", frame: null },
    { id: "recent", width: "medium", height: "regular", frame: null },
  ],
  prioritize: [
    { id: "pipeline", width: "full", height: "regular", frame: null },
    { id: "frogs", width: "medium", height: "regular", frame: null },
    { id: "auto", width: "medium", height: "regular", frame: null },
    { id: "ranked", width: "full", height: "tall", frame: null },
  ],
  organize: [
    { id: "board", width: "full", height: "tall", frame: null },
    { id: "summary", width: "full", height: "compact", frame: null },
  ],
  areas: [
    { id: "overview", width: "medium", height: "compact", frame: null },
    { id: "list", width: "full", height: "tall", frame: null },
  ],
  projects: [
    { id: "selector", width: "compact", height: "tall", frame: null },
    { id: "overview", width: "medium", height: "regular", frame: null },
    { id: "info", width: "medium", height: "tall", frame: null },
    { id: "okrs", width: "medium", height: "regular", frame: null },
    { id: "backlog", width: "medium", height: "regular", frame: null },
    { id: "base", width: "medium", height: "regular", frame: null },
    { id: "action", width: "medium", height: "regular", frame: null },
    { id: "generated", width: "full", height: "regular", frame: null },
  ],
  planning: [
    { id: "sprints", width: "full", height: "tall", frame: null },
    { id: "objectives", width: "medium", height: "regular", frame: null },
    { id: "backlog", width: "medium", height: "regular", frame: null },
    { id: "templates", width: "medium", height: "regular", frame: null },
  ],
  agenda: [
    { id: "week", width: "full", height: "tall", frame: null },
    { id: "editor", width: "full", height: "regular", frame: null },
  ],
  settings: [
    { id: "layout", width: "full", height: "regular", frame: null },
    { id: "system", width: "medium", height: "tall", frame: null },
    { id: "sync", width: "medium", height: "regular", frame: null },
    { id: "voice", width: "medium", height: "regular", frame: null },
    { id: "history", width: "full", height: "regular", frame: null },
  ],
};

const FREEFORM_CANVAS_WIDTH = 1120;
const FREEFORM_GAP = 20;
const FREEFORM_WIDTHS = {
  compact: 320,
  medium: 520,
  full: 1080,
};
const FREEFORM_HEIGHTS = {
  compact: 220,
  regular: 320,
  tall: 420,
};

const PERIODS = [
  { id: "morning", label: "Manha", baseMinutes: 105, startMinute: 450 },
  { id: "afternoon", label: "Tarde", baseMinutes: 220, startMinute: 780 },
  { id: "night", label: "Noite", baseMinutes: 95, startMinute: 1290 },
];

const METHOD_LABELS = {
  pipeline: "Pipeline completo",
  gtd: "GTD",
  frog: "Engolindo o sapo",
  agile: "Metodos ageis",
  scrum: "Scrum pessoal",
};

const METHOD_GUIDES = {
  pipeline: "Processa, explica, simplifica e so depois manda para o dia ou para a semana.",
  gtd: "Prioriza o que precisa de clareza, proxima acao e decisao pratica.",
  frog: "Traz para cima a tarefa mais importante e mais dificil para atacar cedo.",
  agile: "Refina por impacto, urgencia, esforco, carga e encaixe real na agenda.",
  scrum: "Puxa o que move sprint, backlog ativo e previsibilidade dos projetos.",
};

const ORGANIZE_BUCKETS = [
  { id: "do-now", label: "Fazer agora" },
  { id: "priority", label: "Prioridade" },
  { id: "schedule", label: "Agendar" },
  { id: "delegate", label: "Delegar" },
  { id: "waiting", label: "Aguardar" },
  { id: "backlog", label: "Backlog" },
];

const TASK_TYPES = [
  "task",
  "strategic",
  "work",
  "review",
  "planning",
  "family",
  "finance",
  "home",
  "visit",
  "move",
  "creative",
  "idea",
  "template",
];

const TASK_CONTEXTS = [
  "flex",
  "deep-work",
  "admin",
  "planning",
  "home",
  "outside",
  "street",
  "creative",
];

const VOICE_INTENTS = {
  "create-task": { label: "Criar tarefa", destination: "inbox" },
  "create-habit": { label: "Criar habito", destination: "inbox" },
  "add-checklist-item": { label: "Adicionar item de checklist", destination: "inbox" },
  "change-day-type": { label: "Mudar tipo de dia", destination: "days" },
  schedule: { label: "Agendar", destination: "agenda" },
  delegate: { label: "Delegar", destination: "project" },
  reschedule: { label: "Remarcar", destination: "agenda" },
};

const VOICE_DESTINATIONS = {
  inbox: "Inbox",
  project: "Projeto",
  agenda: "Agenda",
  days: "Dias",
};

const VOICE_PERIOD_ALIASES = {
  morning: ["manha", "cedo", "de manha"],
  afternoon: ["tarde", "de tarde", "apos o almoco"],
  night: ["noite", "a noite", "hoje a noite"],
};

const VOICE_URGENCY_KEYWORDS = {
  5: ["urgente", "pra hoje", "hoje sem falta", "agora", "o quanto antes", "imediato"],
  4: ["hoje", "amanha cedo", "amanha", "prioridade alta", "importante hoje"],
  3: ["essa semana", "nesta semana", "quando der", "prioridade media"],
  2: ["depois", "sem pressa", "baixa prioridade"],
};

function cloneValue(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function normalizeLayoutEntry(entry, fallback) {
  const source = typeof entry === "string" ? { id: entry } : (entry || {});
  const base = fallback || source;

  return {
    id: source.id || base.id,
    width: LAYOUT_WIDTH_ORDER.includes(source.width) ? source.width : (base.width || "medium"),
    height: LAYOUT_HEIGHT_ORDER.includes(source.height) ? source.height : (base.height || "regular"),
    frame: source.frame && typeof source.frame === "object"
      ? {
        x: Number.isFinite(source.frame.x) ? source.frame.x : null,
        y: Number.isFinite(source.frame.y) ? source.frame.y : null,
        w: Number.isFinite(source.frame.w) ? source.frame.w : null,
        h: Number.isFinite(source.frame.h) ? source.frame.h : null,
        z: Number.isFinite(source.frame.z) ? source.frame.z : (Number.isFinite(base?.frame?.z) ? base.frame.z : null),
      }
      : (base.frame ? cloneValue(base.frame) : null),
  };
}

function normalizeLayoutPage(layoutPage = [], fallbackPage = []) {
  const source = Array.isArray(layoutPage) && layoutPage.length ? layoutPage : fallbackPage;
  const fallbackMap = new Map((fallbackPage || []).map((entry) => [entry.id, normalizeLayoutEntry(entry)]));
  const normalized = [];
  const seen = new Set();

  source.forEach((entry) => {
    const id = typeof entry === "string" ? entry : entry?.id;
    const fallback = fallbackMap.get(id);
    if (!id || seen.has(id) || !fallback) {
      return;
    }

    normalized.push(normalizeLayoutEntry(entry, fallback));
    seen.add(id);
  });

  fallbackPage.forEach((entry) => {
    if (!seen.has(entry.id)) {
      normalized.push(normalizeLayoutEntry(entry));
    }
  });

  return normalized;
}

function normalizeLayouts(layouts = DEFAULT_LAYOUTS, fallbackLayouts = DEFAULT_LAYOUTS) {
  return {
    dashboard: normalizeLayoutPage(layouts?.dashboard, fallbackLayouts.dashboard || DEFAULT_LAYOUTS.dashboard),
    today: normalizeLayoutPage(layouts?.today, fallbackLayouts.today || DEFAULT_LAYOUTS.today),
    checklist: normalizeLayoutPage(layouts?.checklist, fallbackLayouts.checklist || DEFAULT_LAYOUTS.checklist),
    days: normalizeLayoutPage(layouts?.days, fallbackLayouts.days || DEFAULT_LAYOUTS.days),
    inbox: normalizeLayoutPage(layouts?.inbox, fallbackLayouts.inbox || DEFAULT_LAYOUTS.inbox),
    prioritize: normalizeLayoutPage(layouts?.prioritize, fallbackLayouts.prioritize || DEFAULT_LAYOUTS.prioritize),
    organize: normalizeLayoutPage(layouts?.organize, fallbackLayouts.organize || DEFAULT_LAYOUTS.organize),
    areas: normalizeLayoutPage(layouts?.areas, fallbackLayouts.areas || DEFAULT_LAYOUTS.areas),
    projects: normalizeLayoutPage(layouts?.projects, fallbackLayouts.projects || DEFAULT_LAYOUTS.projects),
    planning: normalizeLayoutPage(layouts?.planning, fallbackLayouts.planning || DEFAULT_LAYOUTS.planning),
    agenda: normalizeLayoutPage(layouts?.agenda, fallbackLayouts.agenda || DEFAULT_LAYOUTS.agenda),
    settings: normalizeLayoutPage(layouts?.settings, fallbackLayouts.settings || DEFAULT_LAYOUTS.settings),
  };
}

function cloneLayouts(layouts = DEFAULT_LAYOUTS) {
  return normalizeLayouts(cloneValue(layouts), DEFAULT_LAYOUTS);
}

function getFreeformFrameSize(entry) {
  return {
    width: FREEFORM_WIDTHS[entry.width] || FREEFORM_WIDTHS.medium,
    height: FREEFORM_HEIGHTS[entry.height] || FREEFORM_HEIGHTS.regular,
  };
}

function hasValidLayoutFrame(frame) {
  return Boolean(frame)
    && Number.isFinite(frame.x)
    && Number.isFinite(frame.y)
    && Number.isFinite(frame.w)
    && Number.isFinite(frame.h);
}

function ensureLayoutFrames(layoutPage = []) {
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  return (layoutPage || []).map((rawEntry, index) => {
    const entry = normalizeLayoutEntry(rawEntry, rawEntry);
    const existingFrame = hasValidLayoutFrame(entry.frame)
      ? {
        x: Math.max(0, entry.frame.x),
        y: Math.max(0, entry.frame.y),
        w: Math.max(220, entry.frame.w),
        h: Math.max(180, entry.frame.h),
        z: Number.isFinite(entry.frame.z) ? entry.frame.z : index + 1,
      }
      : null;

    if (existingFrame) {
      return { ...entry, frame: existingFrame };
    }

    const size = getFreeformFrameSize(entry);
    if (entry.width === "full") {
      if (cursorX !== 0) {
        cursorX = 0;
        cursorY += rowHeight + FREEFORM_GAP;
        rowHeight = 0;
      }
      const nextEntry = {
        ...entry,
        frame: { x: 0, y: cursorY, w: size.width, h: size.height, z: index + 1 },
      };
      cursorY += size.height + FREEFORM_GAP;
      cursorX = 0;
      rowHeight = 0;
      return nextEntry;
    }

    if (cursorX + size.width > FREEFORM_CANVAS_WIDTH) {
      cursorX = 0;
      cursorY += rowHeight + FREEFORM_GAP;
      rowHeight = 0;
    }

    const nextEntry = {
      ...entry,
      frame: { x: cursorX, y: cursorY, w: size.width, h: size.height, z: index + 1 },
    };
    cursorX += size.width + FREEFORM_GAP;
    rowHeight = Math.max(rowHeight, size.height);
    return nextEntry;
  });
}

function ensureLayoutsWithFrames(layouts = DEFAULT_LAYOUTS) {
  return Object.fromEntries(
    Object.entries(layouts).map(([page, entries]) => [page, ensureLayoutFrames(entries)]),
  );
}

function normalizeVisualDensity(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["compact", "comfortable", "ample"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "calm") {
    return "compact";
  }
  return "compact";
}

function stepLayoutValue(current, options, direction, fallback) {
  const safeCurrent = options.includes(current) ? current : fallback;
  const currentIndex = options.indexOf(safeCurrent);
  const nextIndex = clamp(currentIndex + (direction === "increase" ? 1 : -1), 0, options.length - 1);
  return options[nextIndex];
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return ["true", "1", "on", "yes"].includes(String(value).toLowerCase());
}

function parseSubtasks(value, existing = []) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return existing || [];
}

function normalizeCompletedSubtasks(value, subtasks = [], existing = []) {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(existing)
      ? existing
      : typeof value === "string"
        ? value.split(",")
        : [];

  return source
    .map((item) => Number(item))
    .filter((item, index, items) => Number.isInteger(item) && item >= 0 && item < subtasks.length && items.indexOf(item) === index)
    .sort((left, right) => left - right);
}

function parseLines(value, existing = []) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return existing || [];
}

function parseChecklist(value, existing = []) {
  return parseLines(value, existing);
}

function parseIdList(value, existing = []) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return existing || [];
}

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAnyKeyword(source, keywords = []) {
  return keywords.some((keyword) => source.includes(normalizeSearchText(keyword)));
}

function matchesPhrase(source, phrase) {
  const normalizedPhrase = normalizeSearchText(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${normalizedPhrase}(?=\\s|$)`);
  return pattern.test(source);
}

function findNextWeekdayDate(referenceDate, weekdayKey) {
  for (let offset = 0; offset <= 13; offset += 1) {
    const candidate = formatISODate(addDays(referenceDate, offset));
    if (getWeekdayKey(candidate) === weekdayKey) {
      return candidate;
    }
  }

  return "";
}

function defaultVoiceAssistantSettings() {
  return {
    projectAliases: [
      { term: "assessoria", value: "project-assessoria" },
      { term: "financeira", value: "project-financeira" },
      { term: "movimento", value: "project-conteudo" },
      { term: "conteudo", value: "project-conteudo" },
    ],
    areaAliases: [
      { term: "cliente", value: "area-work" },
      { term: "filhos", value: "area-family" },
      { term: "casa", value: "area-home" },
      { term: "mudanca", value: "area-move" },
    ],
    frequentAssociations: [
      { term: "gravar", target: { projectId: "project-conteudo", areaId: "area-work", context: "creative", intent: "create-task", destination: "project" } },
      { term: "cliente", target: { areaId: "area-work", context: "admin", intent: "create-task", destination: "inbox" } },
      { term: "reuniao", target: { areaId: "area-work", context: "planning", intent: "schedule", destination: "agenda" } },
    ],
    learnedPatterns: [],
    history: [],
  };
}

function defaultCloudSyncSettings() {
  return {
    enabled: false,
    provider: "supabase",
    projectUrl: "",
    anonKey: "",
    tableName: "life_os_snapshots",
    workspaceKey: "",
    pollIntervalSeconds: 20,
    lastSyncedAt: "",
    lastPulledAt: "",
    lastError: "",
    deviceId: "",
  };
}

function parseVoiceAliasLines(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        term: normalizeSearchText(entry?.term || ""),
        value: String(entry?.value || "").trim(),
      }))
      .filter((entry) => entry.term && entry.value);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left = "", right = ""] = line.split(/\s*(?:=>|=|->)\s*/);
      return {
        term: normalizeSearchText(left),
        value: String(right || "").trim(),
      };
    })
    .filter((entry) => entry.term && entry.value);
}

function parseAssociationTarget(rawTarget = "") {
  const target = {};
  rawTarget
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [left = "", right = ""] = part.split(/\s*:\s*/);
      const key = normalizeSearchText(left);
      const value = String(right || "").trim();
      if (!value) {
        return;
      }

      if (["project", "projeto"].includes(key)) target.projectId = value;
      if (["area"].includes(key)) target.areaId = value;
      if (["context", "contexto"].includes(key)) target.context = value;
      if (["intent", "intencao"].includes(key)) target.intent = value;
      if (["destination", "destino"].includes(key)) target.destination = value;
      if (["daytype", "tipo-dia", "tipodia"].includes(key)) target.dayTypeId = value;
      if (["period", "periodo"].includes(key)) target.period = value;
    });
  return target;
}

function parseVoiceAssociationLines(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        term: normalizeSearchText(entry?.term || ""),
        target: { ...(entry?.target || {}) },
      }))
      .filter((entry) => entry.term);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left = "", right = ""] = line.split(/\s*(?:=>|=|->)\s*/);
      return {
        term: normalizeSearchText(left),
        target: parseAssociationTarget(right),
      };
    })
    .filter((entry) => entry.term);
}

function parseLineList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseProjectLinkEntries(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        id: entry?.id || makeId("plink"),
        label: String(entry?.label || "").trim(),
        url: String(entry?.url || "").trim(),
      }))
      .filter((entry) => entry.label || entry.url);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", url = ""] = line.split("|").map((part) => part.trim());
      return {
        id: makeId("plink"),
        label: label || url,
        url,
      };
    })
    .filter((entry) => entry.label || entry.url);
}

function parseProjectOkrs(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        id: entry?.id || makeId("okr"),
        title: String(entry?.title || "").trim(),
        status: String(entry?.status || "active").trim() || "active",
        progress: clamp(toNumber(entry?.progress, 0), 0, 100),
        keyResults: parseLineList(entry?.keyResults || [], []),
      }))
      .filter((entry) => entry.title);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", status = "active", progress = "0", keyResults = ""] = line.split("|").map((part) => part.trim());
      return {
        id: makeId("okr"),
        title,
        status: status || "active",
        progress: clamp(toNumber(progress, 0), 0, 100),
        keyResults: keyResults.split(";").map((item) => item.trim()).filter(Boolean),
      };
    })
    .filter((entry) => entry.title);
}

function parseProjectBacklogItems(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        id: entry?.id || makeId("pbacklog"),
        title: String(entry?.title || "").trim(),
        notes: String(entry?.notes || "").trim(),
      }))
      .filter((entry) => entry.title);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", notes = ""] = line.split("|").map((part) => part.trim());
      return {
        id: makeId("pbacklog"),
        title,
        notes,
      };
    })
    .filter((entry) => entry.title);
}

function parseProjectBaseActivities(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        id: entry?.id || makeId("pbase"),
        title: String(entry?.title || "").trim(),
        checklist: parseLineList(entry?.checklist || [], []),
        context: String(entry?.context || "flex").trim() || "flex",
        estimatedMinutes: toNumber(entry?.estimatedMinutes, 30),
        priority: String(entry?.priority || "medium").trim() || "medium",
        bucket: String(entry?.bucket || "priority").trim() || "priority",
      }))
      .filter((entry) => entry.title);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", checklist = ""] = line.split("|").map((part) => part.trim());
      return {
        id: makeId("pbase"),
        title,
        checklist: checklist.split(";").map((item) => item.trim()).filter(Boolean),
        context: "flex",
        estimatedMinutes: 30,
        priority: "medium",
        bucket: "priority",
      };
    })
    .filter((entry) => entry.title);
}

function parseProjectActionPlan(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        id: entry?.id || makeId("pplan"),
        title: String(entry?.title || "").trim(),
        nextAction: String(entry?.nextAction || "").trim(),
        checklist: parseLineList(entry?.checklist || [], []),
        bucket: String(entry?.bucket || "priority").trim() || "priority",
      }))
      .filter((entry) => entry.title);
  }

  if (typeof value !== "string") {
    return cloneValue(fallback || []);
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", nextAction = "", checklist = ""] = line.split("|").map((part) => part.trim());
      return {
        id: makeId("pplan"),
        title,
        nextAction,
        checklist: checklist.split(";").map((item) => item.trim()).filter(Boolean),
        bucket: "priority",
      };
    })
    .filter((entry) => entry.title);
}

function getProjectTemplate(templateId) {
  return PROJECT_TEMPLATES.find((template) => template.id === templateId) || PROJECT_TEMPLATES[0];
}

function formatVoiceAliasLines(entries = []) {
  return (entries || [])
    .map((entry) => `${entry.term} => ${entry.value}`)
    .join("\n");
}

function formatVoiceAssociationLines(entries = []) {
  return (entries || [])
    .map((entry) => {
      const target = entry.target || {};
      const parts = [];
      if (target.areaId) parts.push(`area:${target.areaId}`);
      if (target.projectId) parts.push(`projeto:${target.projectId}`);
      if (target.context) parts.push(`contexto:${target.context}`);
      if (target.intent) parts.push(`intencao:${target.intent}`);
      if (target.destination) parts.push(`destino:${target.destination}`);
      if (target.dayTypeId) parts.push(`tipo-dia:${target.dayTypeId}`);
      if (target.period) parts.push(`periodo:${target.period}`);
      return `${entry.term} => ${parts.join(", ")}`;
    })
    .join("\n");
}

function getVoiceAssistantSettings(state) {
  const defaults = defaultVoiceAssistantSettings();
  const source = state?.settings?.voiceAssistant || {};
  return {
    projectAliases: parseVoiceAliasLines(source.projectAliases, defaults.projectAliases),
    areaAliases: parseVoiceAliasLines(source.areaAliases, defaults.areaAliases),
    frequentAssociations: parseVoiceAssociationLines(source.frequentAssociations, defaults.frequentAssociations),
    learnedPatterns: Array.isArray(source.learnedPatterns) ? source.learnedPatterns.map((item) => ({
      phrase: normalizeSearchText(item?.phrase || ""),
      target: { ...(item?.target || {}) },
      uses: toNumber(item?.uses, 1),
      updatedAt: item?.updatedAt || nowIso(),
    })).filter((item) => item.phrase) : [],
    history: Array.isArray(source.history) ? source.history.slice(0, 60) : [],
  };
}

function getCloudSyncSettings(state) {
  const defaults = defaultCloudSyncSettings();
  const source = state?.settings?.cloudSync || {};

  return {
    enabled: toBoolean(source.enabled, defaults.enabled),
    provider: source.provider || defaults.provider,
    projectUrl: String(source.projectUrl || defaults.projectUrl || "").trim(),
    anonKey: String(source.anonKey || defaults.anonKey || "").trim(),
    tableName: String(source.tableName || defaults.tableName || "life_os_snapshots").trim() || "life_os_snapshots",
    workspaceKey: String(source.workspaceKey || defaults.workspaceKey || "").trim(),
    pollIntervalSeconds: toNumber(source.pollIntervalSeconds, defaults.pollIntervalSeconds),
    lastSyncedAt: String(source.lastSyncedAt || ""),
    lastPulledAt: String(source.lastPulledAt || ""),
    lastError: String(source.lastError || ""),
    deviceId: String(source.deviceId || defaults.deviceId || "").trim(),
  };
}

function findAliasValue(text, entries = []) {
  const match = (entries || []).find((entry) => text.includes(normalizeSearchText(entry.term)));
  return match || null;
}

function mergeVoiceTarget(base, target = {}) {
  return {
    ...base,
    areaId: target.areaId || base.areaId || "",
    projectId: target.projectId || base.projectId || "",
    context: target.context || base.context || "flex",
    intent: target.intent || base.intent || "",
    destination: target.destination || base.destination || "",
    dayTypeId: target.dayTypeId || base.dayTypeId || "",
    period: target.period || base.period || "",
  };
}

function findLearnedVoiceTarget(text, learnedPatterns = []) {
  const sorted = [...(learnedPatterns || [])].sort((left, right) => (right.uses - left.uses) || (right.phrase.length - left.phrase.length));
  return sorted.find((entry) => text.includes(entry.phrase) || entry.phrase.includes(text)) || null;
}

function inferCaptureDate(text, referenceDate) {
  if (!text) {
    return { date: "", reason: "" };
  }

  if (text.includes("depois de amanha")) {
    return { date: formatISODate(addDays(referenceDate, 2)), reason: "Reconheceu 'depois de amanha'." };
  }

  if (text.includes("amanha")) {
    return { date: formatISODate(addDays(referenceDate, 1)), reason: "Reconheceu 'amanha'." };
  }

  if (text.includes("hoje")) {
    return { date: referenceDate, reason: "Reconheceu 'hoje'." };
  }

  const weekdayMap = {
    segunda: "segunda",
    terca: "terca",
    quarta: "quarta",
    quinta: "quinta",
    sexta: "sexta",
    sabado: "sabado",
    domingo: "domingo",
  };

  const matchedWeekday = Object.keys(weekdayMap).find((key) => text.includes(key));
  if (matchedWeekday) {
    return {
      date: findNextWeekdayDate(referenceDate, weekdayMap[matchedWeekday]),
      reason: `Reconheceu o dia '${matchedWeekday}'.`,
    };
  }

  return { date: "", reason: "" };
}

function inferCapturePeriod(text) {
  const matchedPeriod = Object.entries(VOICE_PERIOD_ALIASES).find(([, aliases]) => aliases.some((alias) => matchesPhrase(text, alias)));
  if (!matchedPeriod) {
    return { period: "", reason: "" };
  }

  const [period] = matchedPeriod;
  return {
    period,
    reason: `Reconheceu o periodo '${period === "morning" ? "manha" : period === "afternoon" ? "tarde" : "noite"}'.`,
  };
}

function inferCaptureUrgency(text) {
  const matched = Object.entries(VOICE_URGENCY_KEYWORDS)
    .sort((left, right) => Number(right[0]) - Number(left[0]))
    .find(([, keywords]) => includesAnyKeyword(text, keywords));

  if (!matched) {
    return {
      urgency: 3,
      priority: "medium",
      reason: "",
    };
  }

  const urgency = Number(matched[0]);
  return {
    urgency,
    priority: urgency >= 4 ? "high" : urgency <= 2 ? "low" : "medium",
    reason: `Urgencia sugerida em ${urgency}/5 pelo jeito da fala.`,
  };
}

function inferCaptureDuration(text) {
  const match = text.match(/(\d+)\s*(min|minuto|minutos|h|hora|horas)\b/);
  if (!match) {
    return { estimatedMinutes: 30, reason: "" };
  }

  const value = Number(match[1] || 30);
  const unit = match[2] || "min";
  const estimatedMinutes = unit.startsWith("h") ? value * 60 : value;
  return {
    estimatedMinutes: Math.max(5, estimatedMinutes),
    reason: `Duracao sugerida a partir de '${match[0]}'.`,
  };
}

function inferCaptureDayType(text) {
  if (includesAnyKeyword(text, ["futebol"])) {
    return { dayTypeId: "soccer", reason: "Reconheceu mencao a futebol." };
  }

  if (includesAnyKeyword(text, ["viagem completa", "viagem longa"])) {
    return { dayTypeId: "external", reason: "Reconheceu um dia quase bloqueado por viagem." };
  }

  if (includesAnyKeyword(text, ["viagem", "viajar"])) {
    return { dayTypeId: "trip-short", reason: "Reconheceu mencao a viagem." };
  }

  if (includesAnyKeyword(text, ["reuniao", "reunioes", "call", "alinhamento"])) {
    return { dayTypeId: "meeting", reason: "Reconheceu mencao a reuniao." };
  }

  if (includesAnyKeyword(text, ["visita", "externo", "campo", "rua", "presencial"])) {
    return { dayTypeId: "external", reason: "Reconheceu deslocamento ou trabalho externo." };
  }

  return { dayTypeId: "", reason: "" };
}

function inferCaptureChecklist(transcript) {
  const raw = String(transcript || "").trim();
  if (!raw) {
    return [];
  }

  if (raw.includes(":")) {
    const [, detail = ""] = raw.split(/:(.+)/);
    return detail
      .split(/,|;|\be\b/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
      .slice(0, 6);
  }

  const commaParts = raw
    .split(/,|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (commaParts.length >= 2) {
    return commaParts.slice(1, 6);
  }

  return [];
}

function inferCaptureTitle(transcript, checklist = []) {
  const raw = String(transcript || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes(":")) {
    return raw.split(/:(.+)/)[0].trim();
  }

  if (checklist.length) {
    return raw.split(/,|;/)[0].trim();
  }

  return raw;
}

function inferVoiceAction(text, intent) {
  const verbs = ["criar", "adicionar", "agendar", "marcar", "remarcar", "delegar", "registrar", "mudar", "trocar", "gravar", "enviar", "fechar"];
  const verb = verbs.find((item) => text.startsWith(`${item} `) || text.includes(` ${item} `));
  if (verb) {
    return verb;
  }

  return {
    "create-task": "criar",
    "create-habit": "criar",
    "add-checklist-item": "adicionar",
    "change-day-type": "mudar",
    schedule: "agendar",
    "register-weight": "registrar",
    "register-measure": "registrar",
    delegate: "delegar",
    reschedule: "remarcar",
  }[intent] || "registrar";
}

function inferHealthPayload(text, rawTranscript) {
  const normalized = normalizeSearchText(text);
  const raw = String(rawTranscript || "").replace(",", ".");
  const weightMatch = raw.match(/(\d{2,3}(?:\.\d)?)\s*(kg|quilo|quilos)?/);
  const measureKeys = [
    { key: "waist", keywords: ["cintura"] },
    { key: "chest", keywords: ["peito", "torax"] },
    { key: "hip", keywords: ["quadril"] },
    { key: "arm", keywords: ["braco", "braço"] },
    { key: "thigh", keywords: ["coxa"] },
  ];

  const measures = {};
  measureKeys.forEach((entry) => {
    const match = raw.match(new RegExp(`(?:${entry.keywords.join("|")})\\s*(?:de|com)?\\s*(\\d{1,3}(?:\\.\\d)?)`, "i"));
    if (match) {
      measures[entry.key] = Number(match[1]);
    }
  });

  return {
    weight: includesAnyKeyword(normalized, ["peso", "kg", "quilo"]) && weightMatch ? Number(weightMatch[1]) : 0,
    measures,
  };
}

function inferCaptureIntent(text, target = {}) {
  if (target.intent) {
    return { intent: target.intent, reason: "Usou uma associacao personalizada da sua configuracao." };
  }

  if (includesAnyKeyword(text, ["delegar", "passar para", "pedir para"])) {
    return { intent: "delegate", reason: "Reconheceu uma acao de delegacao." };
  }

  if (includesAnyKeyword(text, ["remarcar", "mover para", "jogar para", "empurrar para"])) {
    return { intent: "reschedule", reason: "Reconheceu pedido de remarcar." };
  }

  if (includesAnyKeyword(text, ["agendar", "marcar para", "colocar na agenda"])) {
    return { intent: "schedule", reason: "Reconheceu pedido de agenda." };
  }

  if (includesAnyKeyword(text, ["tipo do dia", "dia de", "mudar a quarta", "mudar a sexta", "dia externo", "dia com reuniao", "futebol"])) {
    return { intent: "change-day-type", reason: "Reconheceu mudanca de tipo de dia." };
  }

  if (includesAnyKeyword(text, ["habito", "todo dia", "toda manha", "toda noite", "todo domingo"])) {
    return { intent: "create-habit", reason: "Reconheceu criacao de habito." };
  }

  if (includesAnyKeyword(text, ["checklist", "adicionar item", "quebrar em etapas", "subtarefa"])) {
    return { intent: "add-checklist-item", reason: "Reconheceu item de checklist." };
  }

  return { intent: "create-task", reason: "Tratou como tarefa nova por padrao." };
}

function inferCaptureAreaProjectContext(text, state, voiceSettings, intent) {
  const manualProject = findAliasValue(text, voiceSettings.projectAliases);
  const manualArea = findAliasValue(text, voiceSettings.areaAliases);
  const learned = findLearnedVoiceTarget(text, voiceSettings.learnedPatterns);
  let merged = mergeVoiceTarget({
    areaId: manualArea?.value || "",
    projectId: manualProject?.value || "",
    context: "",
    intent: "",
    destination: "",
    dayTypeId: "",
    period: "",
  }, learned?.target || {});

  voiceSettings.frequentAssociations.forEach((entry) => {
    if (text.includes(normalizeSearchText(entry.term))) {
      merged = mergeVoiceTarget(merged, entry.target || {});
    }
  });

  const rules = [
    {
      areaId: "area-work",
      projectId: "project-assessoria",
      context: "deep-work",
      reason: "Relacionada a Assessoria.",
      keywords: ["assessoria", "cliente", "clientes", "proposta", "follow up", "follow-up", "lead"],
    },
    {
      areaId: "area-work",
      projectId: "project-financeira",
      context: "deep-work",
      reason: "Relacionada a Financeira.",
      keywords: ["financeira", "briefing", "credito", "analise", "contrato", "consignado"],
    },
    {
      areaId: "area-work",
      projectId: "project-conteudo",
      context: "creative",
      reason: "Relacionada a Conteudo / Movimento.",
      keywords: ["conteudo", "movimento", "comunicacao", "roteiro", "post", "video", "gravar", "publicar"],
    },
    {
      areaId: "area-family",
      projectId: "",
      context: "home",
      reason: "Reconheceu filhos / familia.",
      keywords: ["filho", "filhos", "familia", "escola", "mochila", "uniforme"],
    },
    {
      areaId: "area-home",
      projectId: "",
      context: "home",
      reason: "Reconheceu tarefa de casa.",
      keywords: ["casa", "limpeza", "armario", "cozinha", "lavar", "comprar", "mercado"],
    },
    {
      areaId: "area-move",
      projectId: "",
      context: "planning",
      reason: "Reconheceu tema de mudanca.",
      keywords: ["mudanca", "aluguel", "imovel", "frete", "caixas", "espaco de trabalho"],
    },
    {
      areaId: "area-finance",
      projectId: "",
      context: "admin",
      reason: "Reconheceu financeiro pessoal.",
      keywords: ["financeiro", "boleto", "conta", "cartao", "reserva", "pagamento", "pix"],
    },
    {
      areaId: "area-personal",
      projectId: "",
      context: "planning",
      reason: "Reconheceu tema pessoal ou operacional.",
      keywords: ["pessoal", "organizar mente", "reflexao", "anotacao", "anotar", "semana", "revisao", "checklist"],
    },
  ];

  const matched = rules.find((rule) => includesAnyKeyword(text, rule.keywords));
  const baseAreaId = merged.areaId || matched?.areaId || state.areas[0]?.id || "area-personal";
  const baseProjectId = merged.projectId || matched?.projectId || "";
  const baseContext = merged.context || matched?.context || (intent === "change-day-type" ? "planning" : "flex");
  const reasons = [];

  if (manualProject) reasons.push(`Alias de projeto: ${manualProject.term}.`);
  if (manualArea) reasons.push(`Alias de area: ${manualArea.term}.`);
  if (matched?.reason) reasons.push(matched.reason);
  if (learned?.phrase) reasons.push("Aplicou um aprendizado salvo de correcoes anteriores.");
  if (!reasons.length) reasons.push("Sem match forte, caiu na area padrao.");

  return {
    areaId: baseAreaId,
    projectId: baseProjectId,
    context: baseContext,
    destination: merged.destination || "",
    intent: merged.intent || "",
    period: merged.period || "",
    dayTypeId: merged.dayTypeId || "",
    reasons,
  };
}

function inferVoiceDestination(intent, areaProjectInfo) {
  if (areaProjectInfo.projectId && ["create-task", "delegate", "schedule", "reschedule"].includes(intent) && (!areaProjectInfo.destination || areaProjectInfo.destination === "inbox")) {
    return { destination: "project", reason: "Tem projeto claro e isso pesa mais do que a regra generica da area." };
  }

  if (areaProjectInfo.destination && VOICE_DESTINATIONS[areaProjectInfo.destination]) {
    return { destination: areaProjectInfo.destination, reason: "Usou o destino da sua configuracao personalizada." };
  }

  if (intent === "create-habit" || intent === "add-checklist-item") {
    return { destination: "inbox", reason: "Entra na Inbox para seguir o fluxo central antes de virar execucao." };
  }

  if (intent === "change-day-type") {
    return { destination: "days", reason: "Vai para Dias porque muda a capacidade da semana." };
  }

  if (intent === "schedule" || intent === "reschedule") {
    return { destination: "agenda", reason: "Vai para Agenda por envolver data e encaixe." };
  }

  if (intent === "delegate") {
    return { destination: areaProjectInfo.projectId ? "project" : "inbox", reason: "Vai para projeto/inbox para seguir o fluxo central com delegacao clara." };
  }

  if (areaProjectInfo.projectId) {
    return { destination: "project", reason: "Tem projeto claro e por isso cai no fluxo do projeto." };
  }

  return { destination: "inbox", reason: "Entra na Inbox para seguir GTD, Sapo e Organizar." };
}

function buildVoiceTitle(transcript, intent, checklist = []) {
  const baseTitle = inferCaptureTitle(transcript, checklist);
  if (baseTitle) {
    return baseTitle;
  }

  return {
    "create-habit": "Novo habito por voz",
    "add-checklist-item": "Novo item de checklist por voz",
    "change-day-type": "Ajuste de tipo de dia por voz",
    schedule: "Novo agendamento por voz",
    reschedule: "Reagendamento por voz",
    delegate: "Delegacao por voz",
    "create-task": "Nova tarefa por voz",
  }[intent] || "Nova captura por voz";
}

export function analyzeCaptureText(state, transcript, referenceDate = getCurrentISODate()) {
  const cleanedTranscript = String(transcript || "").trim();
  const normalizedTranscript = normalizeSearchText(cleanedTranscript);
  const voiceSettings = getVoiceAssistantSettings(state);
  const checklist = inferCaptureChecklist(cleanedTranscript);
  const intentInfo = inferCaptureIntent(normalizedTranscript);
  const areaInfo = inferCaptureAreaProjectContext(normalizedTranscript, state, voiceSettings, intentInfo.intent);
  const dateInfo = inferCaptureDate(normalizedTranscript, referenceDate);
  const dueDate = dateInfo.date || "";
  const periodInfo = inferCapturePeriod(normalizedTranscript);
  const urgencyInfo = inferCaptureUrgency(normalizedTranscript);
  const durationInfo = inferCaptureDuration(normalizedTranscript);
  const dayTypeInfo = inferCaptureDayType(normalizedTranscript);
  const healthPayload = inferHealthPayload(normalizedTranscript, cleanedTranscript);
  const mergedIntent = areaInfo.intent || intentInfo.intent;
  const destinationInfo = inferVoiceDestination(mergedIntent, areaInfo);
  const title = buildVoiceTitle(cleanedTranscript, mergedIntent, checklist);
  const action = inferVoiceAction(normalizedTranscript, mergedIntent);
  const reasons = [
    intentInfo.reason,
    ...areaInfo.reasons,
    destinationInfo.reason,
    dateInfo.reason,
    periodInfo.reason,
    urgencyInfo.reason,
    durationInfo.reason,
    dayTypeInfo.reason,
    checklist.length ? "Extraiu proximas acoes do texto falado." : "",
  ].filter(Boolean);

  return {
    transcript: cleanedTranscript,
    action,
    intent: mergedIntent,
    intentLabel: VOICE_INTENTS[mergedIntent]?.label || mergedIntent,
    destination: destinationInfo.destination,
    destinationLabel: VOICE_DESTINATIONS[destinationInfo.destination] || destinationInfo.destination,
    title,
    areaId: areaInfo.areaId,
    projectId: areaInfo.projectId || "",
    scheduledDate: dateInfo.date || "",
    dueDate,
    scheduledPeriod: areaInfo.period || periodInfo.period || "",
    estimatedMinutes: durationInfo.estimatedMinutes,
    priority: urgencyInfo.priority,
    urgency: urgencyInfo.urgency,
    context: areaInfo.context || "flex",
    checklist,
    notes: "",
    suggestedDayTypeId: areaInfo.dayTypeId || dayTypeInfo.dayTypeId || "",
    healthWeight: healthPayload.weight || 0,
    healthMeasures: healthPayload.measures || {},
    reasons,
  };
}

function normalizeDateLogEntries(entries = []) {
  return Array.isArray(entries)
    ? entries
      .map((entry) => ({
        date: entry?.date || "",
        done: Boolean(entry?.done),
      }))
      .filter((entry) => entry.date)
    : [];
}

function pushHistory(state, type, summary, meta = {}) {
  state.history.unshift({
    id: makeId("history"),
    type,
    summary,
    meta,
    createdAt: nowIso(),
  });
  state.history = state.history.slice(0, 250);
}

function touchSettingsState(state) {
  state.settings = state.settings || {};
  state.settings.updatedAt = nowIso();
}

function migrateRemovedModules(state) {
  const removedAreaMap = {
    "area-health": "area-personal",
    "area-routine": "area-personal",
  };
  const removedSections = new Set(["health", "routine"]);
  const removedContexts = new Set(["health"]);
  const removedTypes = new Set(["health"]);

  state.areas = (state.areas || []).filter((area) => !removedAreaMap[area.id]);
  state.objectives = (state.objectives || []).map((objective) => ({
    ...objective,
    areaId: removedAreaMap[objective.areaId] || objective.areaId,
  }));
  state.blocks = (state.blocks || []).map((block) => ({
    ...block,
    areaId: removedAreaMap[block.areaId] || block.areaId,
  }));
  state.tasks = (state.tasks || []).map((task) => ({
    ...task,
    areaId: removedAreaMap[task.areaId] || task.areaId,
    context: removedContexts.has(task.context) ? "flex" : task.context,
    type: removedTypes.has(task.type) ? "task" : task.type,
  }));
  state.sprints = (state.sprints || []).map((sprint) => ({
    ...sprint,
    priorityAreas: (sprint.priorityAreas || []).map((areaId) => removedAreaMap[areaId] || areaId).filter(Boolean),
  }));

  state.ui = state.ui || {};
  if (removedSections.has(state.ui.activeSection)) {
    state.ui.activeSection = "today";
  }
  if (removedSections.has(state.ui.checklistView)) {
    state.ui.checklistView = "all";
  }

  if (state.settings?.voiceAssistant) {
    state.settings.voiceAssistant = {
      ...state.settings.voiceAssistant,
      areaAliases: (state.settings.voiceAssistant.areaAliases || []).map((entry) => ({
        ...entry,
        value: removedAreaMap[entry.value] || entry.value,
      })),
      frequentAssociations: (state.settings.voiceAssistant.frequentAssociations || []).map((entry) => {
        const target = { ...(entry.target || {}) };
        target.areaId = removedAreaMap[target.areaId] || target.areaId || "";
        if (target.context === "health") target.context = "flex";
        if (target.destination === "health" || target.destination === "routine") target.destination = "inbox";
        if (target.intent === "register-weight" || target.intent === "register-measure") target.intent = "create-task";
        return { ...entry, target };
      }),
    };
  }
}

function prepareState(state) {
  state.meta = state.meta || { appName: "Life OS Thz 2026", version: 6 };
  state.profile = state.profile || {};
  state.tasks = state.tasks || [];
  state.areas = state.areas || [];
  state.projects = (state.projects || []).map((project) => normalizeProjectPayload(project, project));
  state.objectives = state.objectives || [];
  state.sprints = normalizeSprints(state.sprints || [], Number(String(state.ui?.selectedDate || getCurrentISODate()).slice(0, 4)));
  state.blocks = state.blocks || [];
  state.dayTypes = state.dayTypes || [];
  state.dayOverrides = state.dayOverrides || [];
  state.habits = state.habits || [];
  state.history = state.history || [];
  state.routines = state.routines || { morning: [], night: [] };
  state.health = {
    weightLogs: Array.isArray(state.health?.weightLogs) ? state.health.weightLogs : [],
    measureLogs: Array.isArray(state.health?.measureLogs) ? state.health.measureLogs : [],
    careItems: Array.isArray(state.health?.careItems) ? state.health.careItems.map((item) => ({
      id: item.id || makeId("care"),
      title: item.title || "Novo cuidado",
      note: item.note || "",
      logs: normalizeDateLogEntries(item.logs || []),
    })) : [],
    workouts: Array.isArray(state.health?.workouts) ? state.health.workouts : [],
    dietMeals: Array.isArray(state.health?.dietMeals) ? state.health.dietMeals.map((meal) => ({
      id: meal.id || makeId("diet"),
      mealKey: meal.mealKey || "custom",
      title: meal.title || "Nova refeicao",
      plan: meal.plan || "",
      checklist: parseChecklist(meal.checklist || [], []),
      note: meal.note || "",
      logs: normalizeDateLogEntries(meal.logs || []),
    })) : [],
  };
  state.weeklyPlan = {
    energyLevel: toNumber(state.weeklyPlan?.energyLevel, 3),
    mainFocus: state.weeklyPlan?.mainFocus || "",
  };
  migrateRemovedModules(state);

  const layoutDefaults = ensureLayoutsWithFrames(normalizeLayouts(state.settings?.layoutDefaults || DEFAULT_LAYOUTS, DEFAULT_LAYOUTS));
  const layouts = ensureLayoutsWithFrames(normalizeLayouts(state.settings?.layouts || layoutDefaults, layoutDefaults));

  state.settings = {
    editMode: Boolean(state.settings?.editMode),
    advancedEditMode: toBoolean(state.settings?.advancedEditMode, false),
    sidebarCollapsed: toBoolean(state.settings?.sidebarCollapsed, true),
    visualDensity: normalizeVisualDensity(state.settings?.visualDensity || "compact"),
    accentTone: state.settings?.accentTone || "forest",
    layoutDefaults,
    layouts,
    layoutMode: toBoolean(state.settings?.advancedEditMode, false) ? "advanced-freeform" : "flex-grid",
    layoutCapabilities: {
      resizeEnabled: toBoolean(state.settings?.layoutCapabilities?.resizeEnabled, true),
      dragEnabled: toBoolean(state.settings?.layoutCapabilities?.dragEnabled, true),
      futureFreeformReady: toBoolean(state.settings?.layoutCapabilities?.futureFreeformReady, true),
      freeformEnabled: true,
    },
    prioritization: {
      moveProtection: toNumber(state.settings?.prioritization?.moveProtection, 1.18),
      familyProtection: toNumber(state.settings?.prioritization?.familyProtection, 1.08),
      futureFocus: toNumber(state.settings?.prioritization?.futureFocus, 1.12),
      delegationBias: toNumber(state.settings?.prioritization?.delegationBias, 1.05),
      overloadLimit: toNumber(state.settings?.prioritization?.overloadLimit, 0.92),
    },
    reasoningLine: state.settings?.reasoningLine || "",
    voiceAssistant: getVoiceAssistantSettings(state),
    cloudSync: getCloudSyncSettings(state),
    googleCalendar: {
      clientId: state.settings?.googleCalendar?.clientId || "",
      apiKey: state.settings?.googleCalendar?.apiKey || "",
      calendarId: state.settings?.googleCalendar?.calendarId || "primary",
    },
    architecture: {
      workModuleMode: state.settings?.architecture?.workModuleMode || "embedded",
      futureApiReady: toBoolean(state.settings?.architecture?.futureApiReady, true),
    },
    updatedAt: state.settings?.updatedAt || state.meta?.updatedAt || nowIso(),
  };

  state.meta = {
    ...(state.meta || {}),
    revision: toNumber(state.meta?.revision, 1),
    updatedAt: state.meta?.updatedAt || state.meta?.seededAt || nowIso(),
    timezone: state.meta?.timezone || APP_TIMEZONE,
  };

  state.ui = {
    activeSection: state.ui?.activeSection || "today",
    selectedDate: state.ui?.selectedDate || getCurrentISODate(),
    selectedProjectId: state.ui?.selectedProjectId || state.projects[0]?.id || "",
    priorityMethod: state.ui?.priorityMethod || "pipeline",
    checklistView: state.ui?.checklistView || "all",
    filters: { ...DEFAULT_FILTERS, ...(state.ui?.filters || {}) },
    editor: {
      kind: state.ui?.editor?.kind || "",
      id: state.ui?.editor?.id || "",
    },
  };

  if (!state.projects.some((project) => project.id === state.ui.selectedProjectId)) {
    state.ui.selectedProjectId = state.projects[0]?.id || "";
  }

  state.areas = state.areas.map((area) => normalizeAreaPayload(area, area));
  state.objectives = state.objectives.map((objective) => normalizeObjectivePayload(objective, objective));
  state.blocks = state.blocks.map((block) => normalizeBlockPayload(block, block));
  state.tasks = state.tasks.map((task) => normalizeTaskPayload(state, task, task));

  state.calendar = {
    provider: state.calendar?.provider || "google",
    connected: Boolean(state.calendar?.connected),
    calendarId: state.calendar?.calendarId || state.settings.googleCalendar.calendarId,
    externalBusyBlocks: state.calendar?.externalBusyBlocks || [],
  };

  return state;
}

function cloneState(state) {
  return prepareState(cloneValue(state));
}

function getAreaById(state, areaId) {
  return state.areas.find((area) => area.id === areaId) || null;
}

function getProjectById(state, projectId) {
  return state.projects.find((project) => project.id === projectId) || null;
}

function getObjectiveById(state, objectiveId) {
  return state.objectives.find((objective) => objective.id === objectiveId) || null;
}

function getSprintById(state, sprintId) {
  return state.sprints.find((sprint) => sprint.id === sprintId) || null;
}

function inferSprintSlot(sprint = {}, index = 0) {
  if (Number.isInteger(Number(sprint.slot))) {
    return clamp(Number(sprint.slot), 1, 4);
  }

  const startMonth = Number(String(sprint.startDate || "").slice(5, 7));
  if (Number.isFinite(startMonth) && startMonth >= 1 && startMonth <= 12) {
    return clamp(Math.floor((startMonth - 1) / 3) + 1, 1, 4);
  }

  return clamp(index + 1, 1, 4);
}

function getSprintRangeForSlot(slot, year) {
  const ranges = {
    1: { startDate: `${year}-01-01`, endDate: `${year}-03-31`, periodLabel: `Jan-Mar ${year}` },
    2: { startDate: `${year}-04-01`, endDate: `${year}-06-30`, periodLabel: `Abr-Jun ${year}` },
    3: { startDate: `${year}-07-01`, endDate: `${year}-09-30`, periodLabel: `Jul-Set ${year}` },
    4: { startDate: `${year}-10-01`, endDate: `${year}-12-31`, periodLabel: `Out-Dez ${year}` },
  };

  return ranges[slot] || ranges[1];
}

function normalizeSprintPayload(payload = {}, existing = null, index = 0, referenceYear = getCurrentYear()) {
  const slot = inferSprintSlot(payload, index);
  const range = getSprintRangeForSlot(slot, referenceYear);
  const existingPriorities = existing?.priorities || existing?.keyResults || [];
  const existingProjects = existing?.projectIds || [];
  const existingKeywords = existing?.keywords || [];

  return {
    id: payload.id || existing?.id || `sprint-${slot}-${referenceYear}`,
    slot,
    title: String(payload.title || payload.name || existing?.title || existing?.name || `Sprint ${slot}`).trim(),
    startDate: payload.startDate || existing?.startDate || range.startDate,
    endDate: payload.endDate || existing?.endDate || range.endDate,
    periodLabel: payload.periodLabel || existing?.periodLabel || range.periodLabel,
    description: payload.description || payload.theme || existing?.description || existing?.theme || "",
    theme: payload.theme || payload.description || existing?.theme || existing?.description || "",
    objectiveIds: parseIdList(payload.objectiveIds, existing?.objectiveIds || []),
    projectIds: parseIdList(payload.projectIds, existingProjects),
    priorities: parseLines(payload.priorities, existingPriorities),
    keywords: parseLines(payload.keywords, existingKeywords),
    priorityAreas: parseIdList(payload.priorityAreas, existing?.priorityAreas || []),
    status: payload.status || existing?.status || "planned",
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function normalizeSprints(source = [], referenceYear = getCurrentYear()) {
  const normalized = Array.isArray(source)
    ? source.map((sprint, index) => normalizeSprintPayload(sprint, sprint, index, referenceYear))
    : [];
  const bySlot = new Map(normalized.map((sprint) => [sprint.slot, sprint]));

  for (let slot = 1; slot <= 4; slot += 1) {
    if (!bySlot.has(slot)) {
      const placeholder = normalizeSprintPayload({
        id: `sprint-${slot}-${referenceYear}`,
        slot,
        title: `Sprint ${slot}`,
        description: "Defina o tema, as prioridades e os projetos relacionados.",
        priorities: [],
        keywords: [],
      }, null, slot - 1, referenceYear);
      bySlot.set(slot, placeholder);
    }
  }

  const ordered = [...bySlot.values()].sort((left, right) => left.slot - right.slot);
  const hasCurrent = ordered.some((sprint) => sprint.status === "current");

  if (!hasCurrent) {
    const today = getCurrentISODate();
    const active = ordered.find((sprint) => sprint.startDate <= today && sprint.endDate >= today) || ordered[0];
    ordered.forEach((sprint) => {
      sprint.status = sprint.id === active.id ? "current" : sprint.status === "current" ? "planned" : sprint.status;
    });
  }

  return ordered.map((sprint, index) => ({
    ...sprint,
    status: sprint.status || (index === 0 ? "current" : "planned"),
  }));
}

function getTaskById(state, taskId) {
  return state.tasks.find((task) => task.id === taskId) || null;
}

function getDayOverride(state, date) {
  return state.dayOverrides.find((entry) => entry.date === date) || null;
}

function getDayTypeById(state, typeId) {
  return (
    state.dayTypes.find((type) => type.id === typeId) ||
    state.dayTypes.find((type) => type.id === "normal") ||
    state.dayTypes[0]
  );
}

function getDefaultDayTypeId(state, date) {
  const weekday = getWeekdayKey(date);

  if (weekday === "sabado") {
    return "saturday";
  }

  if (weekday === "domingo") {
    return "sunday";
  }

  if (weekday === "quarta" || weekday === "sexta") {
    return "soccer";
  }

  return getDayTypeById(state, "normal")?.id || "normal";
}

function defaultPeriodsForType(state, typeId) {
  const type = getDayTypeById(state, typeId);
  return cloneValue(type?.periodDefaults || { morning: typeId, afternoon: typeId, night: typeId });
}

function getWeekEnergyLabel(level) {
  return {
    1: "Muito baixa",
    2: "Baixa",
    3: "Estavel",
    4: "Boa",
    5: "Alta",
  }[Number(level)] || "Estavel";
}

function guessPeriod(task) {
  if (task.scheduledPeriod && PERIODS.some((period) => period.id === task.scheduledPeriod)) {
    return task.scheduledPeriod;
  }

  if (["deep-work", "creative", "planning"].includes(task.context)) {
    return "afternoon";
  }

  if (["health"].includes(task.context)) {
    return "night";
  }

  if (["home", "admin"].includes(task.context) || ["family", "home"].includes(task.type)) {
    return "morning";
  }

  return "afternoon";
}

function resolveDayProfile(state, date) {
  const override = getDayOverride(state, date);
  const typeId = override?.typeId || getDefaultDayTypeId(state, date);
  const type = getDayTypeById(state, typeId);
  const periodMap = { ...defaultPeriodsForType(state, typeId), ...(override?.periods || {}) };
  const energyFactor = ENERGY_FACTOR[toNumber(state.weeklyPlan.energyLevel, 3)] || 1;

  const periods = PERIODS.map((period) => {
    const periodType = getDayTypeById(state, periodMap[period.id] || typeId);
    const percentage = toNumber(periodType?.percentage, 100) / 100;
    const capacity = Math.max(10, Math.round(period.baseMinutes * energyFactor * percentage));

    return {
      ...period,
      type: periodType,
      typeId: periodType?.id || typeId,
      capacity,
    };
  });

  const totalCapacity = periods.reduce((sum, period) => sum + period.capacity, 0);

  return {
    date,
    type,
    note: override?.note || "",
    periods,
    totalCapacity,
    lowCapacity: totalCapacity <= 170 || periods.some((period) => period.typeId === "external"),
    longLabel: formatLongDate(date),
    weekdayLabel: formatWeekday(date),
    shortLabel: formatShortDate(date),
  };
}

function isTemplateTask(task) {
  return task.isTemplate || task.location === "template" || task.status === "template";
}

function isDoneLike(task) {
  return ["done", "discarded", "delegated"].includes(task.status);
}

function isOpenTask(task) {
  return !isDoneLike(task) && !isTemplateTask(task);
}

function reasoningFlags(state) {
  const source = String(state.settings.reasoningLine || "").toLowerCase();

  return {
    protectHealth: source.includes("saude") || source.includes("treino") || source.includes("alimentacao"),
    protectMove: source.includes("mudanca"),
    protectFamily: source.includes("filhos") || source.includes("familia"),
    focusFuture: source.includes("futuro") || source.includes("renda") || source.includes("estabilidade"),
    prefersClarity: source.includes("clareza") || source.includes("proxima acao"),
    avoidOverload: source.includes("sobrecarga") || source.includes("poucas tarefas"),
    delegation: source.includes("deleg"),
    backlogHygiene: source.includes("backlog"),
  };
}

function defaultNextAction(task) {
  if (task.nextAction) {
    return task.nextAction;
  }

  if (task.subtasks?.length) {
    return task.subtasks[0];
  }

  if (toNumber(task.estimatedMinutes, 30) >= 90 || toNumber(task.effort, 3) >= 4) {
    return `quebrar ${task.title.toLowerCase()} em uma proxima acao de 20 a 30 min`;
  }

  if (task.context === "deep-work") {
    return `abrir o material e iniciar a primeira etapa de ${task.title.toLowerCase()}`;
  }

  if (task.type === "health") {
    return `reservar ${task.estimatedMinutes} min para ${task.title.toLowerCase()}`;
  }

  return `comecar por ${task.title.toLowerCase()}`;
}

function collectTaskSearchText(task) {
  return normalizeSearchText([
    task.title,
    task.notes,
    task.nextAction,
    ...(task.subtasks || []),
  ].filter(Boolean).join(" "));
}

function evaluateSprintFit(task, state) {
  const currentSprint = state.sprints.find((sprint) => sprint.status === "current") || null;
  if (!currentSprint) {
    return { currentSprint: null, matched: false, strength: 0, reasons: [] };
  }

  const reasons = [];
  let strength = 0;
  const haystack = collectTaskSearchText(task);

  if (task.sprintId && task.sprintId === currentSprint.id) {
    strength += 4;
    reasons.push("ja esta ligada ao sprint atual");
  }

  if (task.projectId && currentSprint.projectIds.includes(task.projectId)) {
    strength += 3;
    reasons.push("bate com um projeto priorizado no sprint");
  }

  if (task.areaId && currentSprint.priorityAreas.includes(task.areaId)) {
    strength += 2;
    reasons.push("bate com uma area priorizada no sprint");
  }

  if (task.objectiveId && currentSprint.objectiveIds.includes(task.objectiveId)) {
    strength += 3;
    reasons.push("move um objetivo priorizado no sprint");
  }

  if (currentSprint.keywords.some((keyword) => haystack.includes(normalizeSearchText(keyword)))) {
    strength += 2;
    reasons.push("usa linguagem parecida com a prioridade do sprint");
  }

  if (currentSprint.priorities.some((priority) => haystack.includes(normalizeSearchText(priority)))) {
    strength += 1;
    reasons.push("se conecta com uma prioridade declarada do sprint");
  }

  return {
    currentSprint,
    matched: strength > 0,
    strength,
    reasons: [...new Set(reasons)].slice(0, 3),
  };
}

function classifyTask(task, state, referenceDate, flags) {
  const reasons = [];
  const dueDelta = task.dueDate ? differenceInDays(task.dueDate, referenceDate) : 99;
  const scheduledDelta = task.scheduledDate ? differenceInDays(task.scheduledDate, referenceDate) : 99;
  const sprintFit = evaluateSprintFit(task, state);

  if (isTemplateTask(task)) {
    return {
      stage: "template",
      decision: "Modelo",
      bucket: "backlog",
      nextAction: "instanciar quando precisar",
      reasons: ["ja esta salvo como modelo"],
    };
  }

  if (task.status === "discarded" || task.location === "discarded") {
    return {
      stage: "clarify",
      decision: "Descartar",
      bucket: "backlog",
      nextAction: "",
      reasons: ["ja foi descartada"],
    };
  }

  if (task.status === "delegated" || task.location === "delegated") {
    return {
      stage: "organize",
      decision: "Delegar",
      bucket: "delegate",
      nextAction: task.nextAction || "acompanhar retorno",
      reasons: ["ja saiu da sua execucao direta"],
    };
  }

  if (task.status === "waiting" || task.location === "waiting") {
    return {
      stage: "organize",
      decision: "Aguardar",
      bucket: "waiting",
      nextAction: task.nextAction || "acompanhar retorno externo",
      reasons: ["depende de retorno ou resposta"],
    };
  }

  let stage = "clarify";
  let decision = "Executar";
  let bucket = "priority";

  if (task.location === "inbox") {
    stage = "capture";
    decision = "Processar";
    bucket = "backlog";
    reasons.push("entrou pela inbox e ainda precisa de processamento");
  }

  if (task.location === "captured") {
    stage = "clarify";
    decision = "Executar";
    bucket = "priority";
    reasons.push("veio da entrada rapida e ja passou pela interpretacao automatica");
  }

  if (task.type === "idea" && task.location === "inbox") {
    decision = "Backlog";
    stage = "clarify";
    bucket = "backlog";
    reasons.push("e uma ideia e nao precisa competir com a execucao");
  }

  if (task.location === "backlog") {
    decision = "Backlog";
    stage = "organize";
    bucket = "backlog";
    reasons.push("esta reservada para revisao e limpeza futura");
  }

  if (task.delegable && toNumber(task.impact, 3) <= 3 && toNumber(task.effort, 3) >= 4) {
    decision = "Delegar";
    stage = "clarify";
    bucket = "delegate";
    reasons.push("consome energia e pode valer mais delegada");
  }

  if ((toNumber(task.estimatedMinutes, 30) >= 90 || toNumber(task.effort, 3) >= 4) && !task.nextAction) {
    decision = "Projeto";
    stage = "clarify";
    bucket = task.scheduledDate ? "schedule" : "priority";
    reasons.push("esta grande demais para entrar sem refino");
  }

  if (task.scheduledDate && scheduledDelta > 0 && !["Delegar", "Backlog"].includes(decision)) {
    decision = "Agendar";
    stage = "organize";
    bucket = "schedule";
    reasons.push("ja tem dia reservado na semana");
  }

  if (task.scheduledDate && scheduledDelta <= 0 && !["Delegar", "Aguardar", "Descartar", "Backlog"].includes(decision)) {
    decision = "Executar";
    stage = "execute";
    bucket = scheduledDelta === 0 ? "do-now" : "priority";
    reasons.push(scheduledDelta < 0 ? "ja passou do dia planejado" : "cabe no dia selecionado");
  }

  if (dueDelta <= 1 && !["Delegar", "Aguardar", "Descartar", "Backlog"].includes(decision)) {
    decision = "Executar";
    stage = "execute";
    bucket = scheduledDelta === 0 ? "do-now" : "priority";
    reasons.push("tem prazo ou consequencia muito perto");
  }

  if (flags.prefersClarity && !task.nextAction && !isTemplateTask(task)) {
    reasons.push("a linha de raciocinio pede proxima acao clara");
  }

  if (
    sprintFit.currentSprint
    && !sprintFit.matched
    && task.location !== "backlog"
    && !task.scheduledDate
    && dueDelta > 3
    && toNumber(task.urgency, 3) <= 2
    && toNumber(task.impact, 3) <= 3
  ) {
    stage = "organize";
    decision = "Backlog";
    bucket = "backlog";
    reasons.push("nao conversa com o sprint atual e nao pede espaco imediato");
  }

  if (sprintFit.matched) {
    reasons.push(...sprintFit.reasons);
  }

  return {
    stage,
    decision,
    bucket,
    nextAction: defaultNextAction(task),
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

function getMethodBonus(task, method, gtd) {
  const reasons = [];
  let score = 0;

  if (method === "pipeline") {
    if (gtd.decision === "Executar") {
      score += 8;
      reasons.push("ja passou pela triagem e esta pronto para executar");
    }
  }

  if (method === "gtd") {
    if (task.location === "inbox" || gtd.decision === "Projeto") {
      score += 16;
      reasons.push("o metodo GTD quer clareza antes da execucao");
    }
  }

  if (method === "frog") {
    if (toNumber(task.impact, 3) >= 4 && toNumber(task.effort, 3) >= 3) {
      score += 18;
      reasons.push("mistura importancia alta com dificuldade real");
    }
  }

  if (method === "agile") {
    if (toNumber(task.impact, 3) >= 4) {
      score += 8;
      reasons.push("tem impacto alto");
    }
    if (toNumber(task.urgency, 3) >= 4) {
      score += 8;
      reasons.push("tem urgencia alta");
    }
  }

  if (method === "scrum") {
    if (task.sprintId) {
      score += 16;
      reasons.push("move um sprint ativo");
    }
    if (task.projectId) {
      score += 6;
      reasons.push("ajuda a dar previsibilidade ao projeto");
    }
  }

  return { score, reasons };
}

function scoreTask(task, state, referenceDate, dayProfile, gtd, flags, method) {
  const reasons = [...gtd.reasons];
  const settings = state.settings.prioritization;
  const dueDelta = task.dueDate ? differenceInDays(task.dueDate, referenceDate) : 99;
  const scheduledDelta = task.scheduledDate ? differenceInDays(task.scheduledDate, referenceDate) : 99;
  const sprintFit = evaluateSprintFit(task, state);
  let score = PRIORITY_BASE[task.priority] || 30;

  score += toNumber(task.impact, 3) * 8;
  score += toNumber(task.urgency, 3) * 8;
  score -= toNumber(task.effort, 3) * 4;
  score += toNumber(task.scoreAdjustment, 0);

  if (task.objectiveId) {
    score += 12;
    reasons.push("esta ligada a um objetivo maior");
  }

  if (task.sprintId) {
    score += 10;
    reasons.push("esta ligada a um sprint");
  }

  if (sprintFit.matched) {
    score += 10 + sprintFit.strength * 2;
    reasons.push(...sprintFit.reasons);
  } else if (sprintFit.currentSprint && dueDelta > 2 && toNumber(task.urgency, 3) <= 3) {
    score -= 8;
    reasons.push("fora do foco do sprint atual");
  }

  if (task.critical) {
    score += 16;
    reasons.push("foi marcada como critica");
  }

  if (task.projectId) {
    score += 4;
    reasons.push("pertence a um projeto ativo");
  }

  if (task.location === "inbox") {
    score -= 8;
  }

  if (task.location === "backlog") {
    score -= flags.backlogHygiene ? 10 : 4;
    reasons.push(flags.backlogHygiene ? "o sistema desconfia de backlog inflado" : "ainda esta no backlog");
  }

  if (scheduledDelta < 0) {
    score += Math.min(Math.abs(scheduledDelta) * 7, 24);
    reasons.push("ja atrasou no calendario");
  }

  if (dueDelta < 0) {
    score += Math.min(Math.abs(dueDelta) * 8, 28);
    reasons.push("esta vencida");
  } else if (dueDelta <= 2) {
    score += 12;
    reasons.push("tem prazo muito proximo");
  }

  if (flags.protectMove && task.areaId === "area-move") {
    score += Math.round(9 * settings.moveProtection);
    reasons.push("a mudanca tem prioridade estrutural");
  }

  if (flags.protectFamily && task.areaId === "area-family") {
    score += Math.round(6 * settings.familyProtection);
    reasons.push("familia faz parte da base do sistema");
  }

  if (flags.focusFuture && task.projectId) {
    score += Math.round(5 * settings.futureFocus);
    reasons.push("ajuda a construir renda e futuro");
  }

  if (flags.delegation && task.delegable && toNumber(task.effort, 3) >= 4) {
    reasons.push("delegar pode ser melhor do que absorver sozinho");
  }

  if (dayProfile) {
    const taskPeriod = dayProfile.periods.find((period) => period.id === guessPeriod(task));

    if (dayProfile.lowCapacity && !task.critical) {
      score -= 10;
      reasons.push("esta em um dia de capacidade reduzida");
    }

    if (taskPeriod && task.estimatedMinutes > taskPeriod.capacity * settings.overloadLimit) {
      score -= 10;
      reasons.push("esta pesada para o periodo atual");
    }

    if (taskPeriod?.typeId === "soccer" && task.estimatedMinutes > 50) {
      score -= 6;
      reasons.push("bate em um periodo protegido pelo futebol");
    }
  }

  const methodBonus = getMethodBonus(task, method, gtd);
  score += methodBonus.score;
  reasons.push(...methodBonus.reasons);

  return {
    score: Math.max(0, Math.round(score)),
    reasons: [...new Set(reasons)].slice(0, 5),
  };
}

function buildSuggestions(task, gtd, score, selectedDate, dayProfile) {
  const suggestions = [];

  if (gtd.decision === "Processar") {
    suggestions.push("processar na central");
  }

  if (score >= 90 && task.scheduledDate === selectedDate) {
    suggestions.push("entra entre as prioridades de hoje");
  }

  if (gtd.decision === "Projeto" || toNumber(task.estimatedMinutes, 30) >= 90) {
    suggestions.push("quebrar em partes menores");
  }

  if (task.delegable && toNumber(task.effort, 3) >= 4) {
    suggestions.push("avaliar delegacao");
  }

  if (dayProfile?.lowCapacity && !task.critical) {
    suggestions.push("reavaliar o encaixe neste dia");
  }

  if (gtd.decision === "Backlog" && score < 50) {
    suggestions.push("limpar ou descartar depois");
  }

  return suggestions.slice(0, 3);
}

function enrichTask(task, state, referenceDate, method = state.ui.priorityMethod || "pipeline") {
  const area = getAreaById(state, task.areaId);
  const project = getProjectById(state, task.projectId);
  const objective = getObjectiveById(state, task.objectiveId);
  const sprint = getSprintById(state, task.sprintId);
  const dayProfile = task.scheduledDate ? resolveDayProfile(state, task.scheduledDate) : null;
  const flags = reasoningFlags(state);
  const autoGtd = classifyTask(task, state, referenceDate, flags);
  const manualPriority = task.priorityMode === "manual";
  const gtd = {
    stage: manualPriority ? (task.gtdStage || autoGtd.stage) : autoGtd.stage,
    decision: manualPriority ? (task.gtdDecision || autoGtd.decision) : autoGtd.decision,
    nextAction: manualPriority ? (task.nextAction || autoGtd.nextAction) : autoGtd.nextAction,
    bucket: manualPriority ? (task.finalBucket || autoGtd.bucket) : autoGtd.bucket,
    reasons: autoGtd.reasons,
  };
  const scored = scoreTask(task, state, referenceDate, dayProfile, gtd, flags, method);
  const dueDelta = task.dueDate ? differenceInDays(task.dueDate, referenceDate) : 99;
  const scheduledDelta = task.scheduledDate ? differenceInDays(task.scheduledDate, referenceDate) : 99;

  return {
    ...task,
    area,
    areaName: area?.name || "Sem area",
    project,
    projectName: project?.name || "",
    objective,
    objectiveTitle: objective?.title || "",
    sprint,
    sprintTitle: sprint?.title || "",
    scheduledPeriod: guessPeriod(task),
    periodLabel: PERIODS.find((period) => period.id === guessPeriod(task))?.label || "Tarde",
    gtdStage: gtd.stage,
    gtdDecision: gtd.decision,
    nextAction: gtd.nextAction,
    finalBucket: gtd.bucket,
    priorityMode: manualPriority ? "manual" : "auto",
    score: scored.score,
    reasons: scored.reasons,
    suggestions: buildSuggestions(task, gtd, scored.score, referenceDate, dayProfile),
    scheduledLabel: task.scheduledDate ? formatShortDate(task.scheduledDate) : "",
    dueLabel: task.dueDate ? formatShortDate(task.dueDate) : "",
    dueDelta,
    scheduledDelta,
    isOverdue: dueDelta < 0 || scheduledDelta < 0,
    dayTypeId: dayProfile?.type.id || "",
    dayTypeLabel: dayProfile?.type.label || "",
    dayLowCapacity: Boolean(dayProfile?.lowCapacity),
  };
}

function sortByScore(left, right) {
  return right.score - left.score || left.estimatedMinutes - right.estimatedMinutes;
}

function sortByChecklistOrder(left, right) {
  const leftRank = toNumber(left.checklistOrder, 0);
  const rightRank = toNumber(right.checklistOrder, 0);
  if (leftRank !== rightRank) {
    return rightRank - leftRank;
  }

  const leftDate = left.scheduledDate || left.dueDate || "9999-12-31";
  const rightDate = right.scheduledDate || right.dueDate || "9999-12-31";
  return leftDate.localeCompare(rightDate) || sortByScore(left, right);
}

function applyFrogs(tasks, selectedDate) {
  const next = tasks.map((task) => ({ ...task, frogDay: false, frogWeek: false }));
  const dayCandidates = next
    .filter((task) => task.gtdDecision === "Executar" && task.scheduledDate === selectedDate)
    .sort((left, right) => right.score + right.effort * 4 - (left.score + left.effort * 4));
  const weekCandidates = next
    .filter((task) => task.gtdDecision === "Executar" && task.scheduledDate)
    .sort((left, right) => right.score + right.impact * 3 - (left.score + left.impact * 3));

  const dayFrog = next.find((task) => task.frog === "day" || task.frog === "both") || dayCandidates[0];
  const weekFrog = next.find((task) => task.frog === "week" || task.frog === "both") || weekCandidates[0];

  if (dayFrog) {
    dayFrog.frogDay = true;
  }

  if (weekFrog) {
    weekFrog.frogWeek = true;
  }

  next.forEach((task) => {
    task.frogLabel = task.frogDay && task.frogWeek
      ? "Sapo do dia e da semana"
      : task.frogDay
        ? "Sapo do dia"
        : task.frogWeek
          ? "Sapo da semana"
          : "";
  });

  return next;
}
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDateTimeDate(value) {
  return String(value || "").slice(0, 10);
}

function parseDateTimeMinutes(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function buildTimeline(state, daySnapshot) {
  const usage = { morning: 0, afternoon: 0, night: 0 };
  const events = [];

  state.blocks
    .filter((block) => block.date === daySnapshot.date)
    .forEach((block) => {
      events.push({
        id: block.id,
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
        period: block.period || "afternoon",
        kind: block.kind,
        source: "internal",
      });
    });

  state.calendar.externalBusyBlocks
    .filter((block) => parseDateTimeDate(block.start) === daySnapshot.date)
    .forEach((block) => {
      events.push({
        id: block.id,
        title: block.title,
        startTime: minutesToTime(parseDateTimeMinutes(block.start)),
        endTime: minutesToTime(parseDateTimeMinutes(block.end)),
        period: "external",
        kind: "external",
        source: "google",
      });
    });

  daySnapshot.tasks.forEach((task) => {
    const period = task.scheduledPeriod || "afternoon";
    const periodInfo = PERIODS.find((entry) => entry.id === period) || PERIODS[1];
    const startMinute = periodInfo.startMinute + usage[period];
    const endMinute = startMinute + task.estimatedMinutes;
    usage[period] += task.estimatedMinutes + 10;

    events.push({
      id: `task-${task.id}`,
      title: task.title,
      startTime: minutesToTime(startMinute),
      endTime: minutesToTime(endMinute),
      period,
      kind: task.type,
      source: "task",
      critical: task.critical,
    });
  });

  return events.sort((left, right) => {
    const leftMinutes = Number(left.startTime.split(":")[0]) * 60 + Number(left.startTime.split(":")[1]);
    const rightMinutes = Number(right.startTime.split(":")[0]) * 60 + Number(right.startTime.split(":")[1]);
    return leftMinutes - rightMinutes;
  });
}

function buildDaySnapshot(state, tasks, date) {
  const profile = resolveDayProfile(state, date);
  const dayTasks = tasks
    .filter((task) => task.scheduledDate === date)
    .sort(sortByChecklistOrder);
  const periodMap = Object.fromEntries(
    profile.periods.map((period) => [period.id, { ...period, load: 0, tasks: [] }]),
  );

  dayTasks.forEach((task) => {
    const periodId = task.scheduledPeriod || "afternoon";
    const target = periodMap[periodId] || periodMap.afternoon;
    target.load += task.estimatedMinutes;
    target.tasks.push(task);
  });

  const periods = Object.values(periodMap).map((period) => ({
    ...period,
    overload: period.load > period.capacity,
  }));
  const totalLoad = periods.reduce((sum, period) => sum + period.load, 0);

  return {
    ...profile,
    tasks: dayTasks,
    periods,
    totalLoad,
    overload: totalLoad > profile.totalCapacity,
    alerts: dayTasks.filter((task) => task.manualDecision || task.location === "alert").length,
    timeline: buildTimeline(state, { ...profile, date, tasks: dayTasks }),
  };
}

function matchesScope(task, scope) {
  if (scope === "work") {
    return task.area?.type === "work";
  }

  if (scope === "personal") {
    return task.area?.type !== "work";
  }

  return true;
}

function matchesFilters(task, filters) {
  return (
    matchesScope(task, filters.scope) &&
    (filters.areaId === "all" || task.areaId === filters.areaId) &&
    (filters.projectId === "all" || task.projectId === filters.projectId) &&
    (filters.context === "all" || task.context === filters.context) &&
    (filters.dayTypeId === "all" || task.dayTypeId === filters.dayTypeId)
  );
}

function buildWeekData(state, tasks, selectedDate) {
  const dates = getWeekDates(selectedDate);
  const days = dates.map((date) => buildDaySnapshot(state, tasks, date));

  return {
    dates,
    days,
    totalLoad: days.reduce((sum, day) => sum + day.totalLoad, 0),
    totalCapacity: days.reduce((sum, day) => sum + day.totalCapacity, 0),
  };
}

function buildAreaSummaries(state, tasks) {
  return state.areas.map((area) => {
    const areaTasks = tasks.filter((task) => task.areaId === area.id);
    return {
      ...area,
      openCount: areaTasks.length,
      priorityCount: areaTasks.filter((task) => task.score >= 80).length,
      alerts: areaTasks.filter((task) => task.manualDecision || task.location === "alert").length,
      nextTasks: areaTasks.slice(0, 3),
    };
  });
}

function buildProjectSummaries(state, tasks) {
  return state.projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const openTasks = projectTasks.filter((task) => task.status !== "done");
    const doneTasks = projectTasks.filter((task) => task.status === "done");

    return {
      ...project,
      openCount: openTasks.length,
      doneCount: doneTasks.length,
      progress: clamp(
        Math.round(doneTasks.length * 100 / Math.max(1, projectTasks.length)),
        0,
        100,
      ),
      nextTasks: openTasks.slice(0, 3),
      sprintTitle: project.sprintId ? getSprintById(state, project.sprintId)?.title || "" : "",
      active: state.ui?.selectedProjectId === project.id,
    };
  });
}

function buildProjectsWorkspaceModel(state, tasks) {
  const summaries = buildProjectSummaries(state, tasks);
  const selectedProject = state.projects.find((project) => project.id === state.ui.selectedProjectId) || state.projects[0] || null;

  if (!selectedProject) {
    return {
      summaries,
      selected: null,
      templates: PROJECT_TEMPLATES,
    };
  }

  const selectedTasks = tasks.filter((task) => task.projectId === selectedProject.id);
  const generatedTasks = selectedTasks.filter((task) => ["project", "manual", "capture", "voice", "checklist"].includes(task.source));
  const sprint = selectedProject.sprintId ? getSprintById(state, selectedProject.sprintId) : null;

  return {
    summaries,
    templates: PROJECT_TEMPLATES,
    selected: {
      ...selectedProject,
      sprintTitle: sprint?.title || "",
      sprintStatus: sprint?.status || "",
      openTasks: selectedTasks.filter((task) => task.status !== "done"),
      generatedTasks: generatedTasks.filter((task) => task.status !== "done").slice(0, 8),
      completedTasks: selectedTasks.filter((task) => task.status === "done").slice(0, 5),
      backlogCount: selectedProject.backlogItems.length,
      baseCount: selectedProject.baseActivities.length,
      okrCount: selectedProject.okrs.length,
      actionCount: selectedProject.actionPlan.length,
    },
  };
}

function makeChecklistGroup(id, label, entries, emptyMessage = "") {
  return {
    id,
    label,
    entries,
    count: entries.length,
    emptyMessage,
  };
}

function buildTaskTimeGroups(tasks, selectedDate) {
  const nextWeekLimit = formatISODate(addDays(selectedDate, 7));
  const overdue = [];
  const today = [];
  const nextDays = [];
  const later = [];
  const noDate = [];

  tasks.forEach((task) => {
    const anchorDate = task.scheduledDate || task.dueDate || "";
    const isOverdue = (task.dueDate && task.dueDate < selectedDate) || (task.scheduledDate && task.scheduledDate < selectedDate);

    if (isOverdue) {
      overdue.push(task);
      return;
    }

    if (!anchorDate) {
      noDate.push(task);
      return;
    }

    if (anchorDate === selectedDate) {
      today.push(task);
      return;
    }

    if (anchorDate <= nextWeekLimit) {
      nextDays.push(task);
      return;
    }

    later.push(task);
  });

  return [
    makeChecklistGroup("overdue", "Em atraso", overdue.sort(sortByChecklistOrder), "Sem atrasos por aqui."),
    makeChecklistGroup("today", "Hoje", today.sort(sortByChecklistOrder), "Nada previsto para hoje."),
    makeChecklistGroup("next", "Proximos 7 dias", nextDays.sort(sortByChecklistOrder), "Nada entrando nos proximos dias."),
    makeChecklistGroup("later", "Mais tarde", later.sort(sortByChecklistOrder), "Sem tarefas para mais tarde."),
    makeChecklistGroup("no-date", "Sem data", noDate.sort(sortByChecklistOrder), "Nada sem data."),
  ].filter((group) => group.entries.length);
}

function buildChecklistDateGroups(tasks, selectedDate) {
  const nextWeekLimit = formatISODate(addDays(selectedDate, 7));
  const grouped = new Map();

  tasks
    .filter((task) => {
      const anchorDate = task.scheduledDate || task.dueDate || "";
      return anchorDate && anchorDate >= selectedDate && anchorDate <= nextWeekLimit;
    })
    .sort(sortByChecklistOrder)
    .forEach((task) => {
      const key = task.scheduledDate || task.dueDate;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(task);
    });

  return [...grouped.entries()].map(([date, entries]) => makeChecklistGroup(date, formatLongDate(date), entries));
}

function buildChecklistModel(state, openTasks, completedTasks, selectedDate, weekData) {
  const allowedViews = new Set(["all", "today", "completed", "backlog"]);
  const checklistView = allowedViews.has(state.ui.checklistView) ? state.ui.checklistView : "all";
  const backlogTasks = openTasks.filter((task) => task.finalBucket === "backlog" || task.location === "backlog");
  const activeTasks = openTasks.filter((task) => task.finalBucket !== "backlog" && task.location !== "backlog");
  const overdueTasks = activeTasks.filter((task) => task.isOverdue);
  const todayTasks = activeTasks.filter((task) => task.scheduledDate === selectedDate).sort(sortByChecklistOrder);
  const priorityTasks = activeTasks.filter((task) => ["do-now", "priority"].includes(task.finalBucket)).sort(sortByChecklistOrder);
  const scheduledTasks = activeTasks.filter((task) => task.finalBucket === "schedule").sort(sortByChecklistOrder);
  const delegatedTasks = activeTasks.filter((task) => task.finalBucket === "delegate" || task.status === "delegated").sort(sortByChecklistOrder);
  const waitingTasks = activeTasks.filter((task) => task.finalBucket === "waiting" || task.status === "waiting").sort(sortByChecklistOrder);
  const completedToday = completedTasks.filter((task) => String(task.completedAt || "").slice(0, 10) === selectedDate);
  const completedBefore = completedTasks.filter((task) => String(task.completedAt || "").slice(0, 10) !== selectedDate);

  let groups = [];

  if (checklistView === "today") {
    groups = [
      makeChecklistGroup("overdue", "Em atraso", overdueTasks.sort(sortByChecklistOrder), "Sem atrasos relevantes."),
      makeChecklistGroup("today", "Hoje", todayTasks, "Nada marcado para hoje."),
    ].filter((group) => group.entries.length);
  } else if (checklistView === "completed") {
    groups = [
      makeChecklistGroup("done-today", "Concluidas hoje", completedToday.sort(sortByChecklistOrder), "Nada concluido hoje."),
      makeChecklistGroup("done-earlier", "Concluidas antes", completedBefore.sort(sortByChecklistOrder), "Sem historico anterior por enquanto."),
    ].filter((group) => group.entries.length);
  } else if (checklistView === "backlog") {
    groups = [
      makeChecklistGroup("backlog", "Backlog", backlogTasks.sort(sortByChecklistOrder), "Nenhuma tarefa no backlog."),
    ];
  } else {
    groups = [
      makeChecklistGroup("today", "Hoje", todayTasks, "Nada marcado para hoje."),
      makeChecklistGroup("priority", "Prioridade", priorityTasks, "Sem tarefas em prioridade."),
      makeChecklistGroup("schedule", "Agendar", scheduledTasks, "Nada aguardando agendamento."),
      makeChecklistGroup("delegate", "Delegar", delegatedTasks, "Nada em delegacao."),
      makeChecklistGroup("waiting", "Aguardar", waitingTasks, "Nada aguardando retorno."),
    ].filter((group) => group.entries.length);
  }

  return {
    activeView: checklistView,
    views: [
      { id: "all", label: "Lista", count: activeTasks.length },
      { id: "today", label: "Foco operacional", count: overdueTasks.length + todayTasks.length },
      { id: "completed", label: "Concluidas", count: completedTasks.length },
      { id: "backlog", label: "Backlog", count: backlogTasks.length },
    ],
    groups,
    selectedDate,
    weekDates: weekData.dates,
  };
}

function buildTodayChecklistModel(state, tasks, selectedDate, weekData) {
  const quickTasks = tasks
    .filter((task) => task.scheduledDate === selectedDate)
    .sort(sortByChecklistOrder)
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      kind: "task",
      title: task.title,
      period: task.periodLabel,
      done: task.status === "done",
      note: task.nextAction || "",
      areaName: task.areaName,
      projectName: task.projectName,
      subtasks: task.subtasks,
      completedSubtasks: task.completedSubtasks,
    }));

  return {
    items: quickTasks,
    weekDates: weekData.dates,
  };
}

function buildDashboardModel(state, tasks, selectedDate, weekData) {
  const currentSprint = state.sprints.find((sprint) => sprint.status === "current") || null;
  const sprintObjectives = currentSprint
    ? state.objectives.filter((objective) => currentSprint.objectiveIds.includes(objective.id))
    : [];
  const sprintProgress = sprintObjectives.length
    ? Math.round(sprintObjectives.reduce((sum, objective) => sum + toNumber(objective.progress, 0), 0) / sprintObjectives.length)
    : 0;
  const moveDeadline = state.profile.moveDeadline || selectedDate;
  const weekOverload = weekData.days.filter((day) => day.overload).length;

  return {
    currentSprint: currentSprint
      ? { title: currentSprint.title, progress: sprintProgress, theme: currentSprint.theme }
      : null,
    weekProgress: {
      done: state.tasks.filter((task) => task.status === "done" && weekData.dates.includes(task.scheduledDate)).length,
      total: state.tasks.filter((task) => task.scheduledDate && weekData.dates.includes(task.scheduledDate) && !isTemplateTask(task)).length,
      percent: clamp(
        Math.round(
          state.tasks.filter((task) => task.status === "done" && weekData.dates.includes(task.scheduledDate)).length * 100 /
          Math.max(1, state.tasks.filter((task) => task.scheduledDate && weekData.dates.includes(task.scheduledDate) && !isTemplateTask(task)).length),
        ),
        0,
        100,
      ),
    },
    energyLabel: getWeekEnergyLabel(state.weeklyPlan.energyLevel),
    daysToMove: differenceInDays(moveDeadline, selectedDate),
    mainGoals: state.objectives.slice(0, 4),
    radar: weekOverload > 0 ? { label: "Ajustar carga" } : { label: "Semana sob controle" },
    alerts: tasks.filter((task) => task.manualDecision || task.location === "alert").slice(0, 4),
    areaSummaries: buildAreaSummaries(state, tasks),
    projectSummaries: buildProjectSummaries(state, tasks),
    load: {
      total: weekData.totalLoad,
      capacity: weekData.totalCapacity,
      days: weekData.days,
    },
  };
}

function buildPrioritizeModel(tasks, selectedDate) {
  const ranked = [...tasks].sort(sortByScore);
  const stageMap = new Map();

  ranked.forEach((task) => {
    const key = task.gtdDecision;
    if (!stageMap.has(key)) {
      stageMap.set(key, []);
    }
    stageMap.get(key).push(task);
  });

  return {
    ranked: ranked.slice(0, 12),
    dayFrog: ranked.find((task) => task.frogDay) || null,
    weekFrog: ranked.find((task) => task.frogWeek) || null,
    autoPilot: ranked.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      decision: task.gtdDecision,
      bucket: task.finalBucket,
      reasons: task.reasons,
      nextAction: task.nextAction,
      priorityMode: task.priorityMode || "auto",
    })),
    stages: [
      "Processar",
      "Executar",
      "Agendar",
      "Delegar",
      "Aguardar",
      "Backlog",
      "Projeto",
      "Descartar",
    ].map((decision) => ({
      decision,
      tasks: (stageMap.get(decision) || []).slice(0, 4),
      count: (stageMap.get(decision) || []).length,
    })),
    summary: {
      today: ranked.filter((task) => task.scheduledDate === selectedDate && task.score >= 80).slice(0, 4),
      simplify: ranked.filter((task) => task.suggestions.includes("quebrar em partes menores")).slice(0, 4),
      delegate: ranked.filter((task) => task.suggestions.includes("avaliar delegacao")).slice(0, 4),
    },
  };
}

function buildOrganizeModel(tasks) {
  return ORGANIZE_BUCKETS.map((bucket) => ({
    ...bucket,
    tasks: tasks.filter((task) => task.finalBucket === bucket.id),
  }));
}

function buildInboxModel(tasks) {
  const raw = tasks.filter((task) => task.location === "inbox");
  const recent = [...tasks]
    .filter((task) => ["capture", "voice"].includes(task.source) || task.location === "inbox" || task.location === "captured")
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")) || sortByScore(left, right))
    .slice(0, 8);

  return {
    raw,
    recent,
    counts: {
      raw: raw.length,
      recent: recent.length,
    },
  };
}

function buildAgendaModel(state, tasks, weekData, selectedDate) {
  const blocks = state.blocks.filter((block) => weekData.dates.includes(block.date));
  const unscheduled = tasks
    .filter((task) => !task.scheduledDate && ["do-now", "priority", "schedule"].includes(task.finalBucket))
    .sort(sortByChecklistOrder)
    .slice(0, 8);

  return {
    days: weekData.days.map((day) => ({
      ...day,
      tasks: tasks
        .filter((task) => task.scheduledDate === day.date)
        .sort(sortByChecklistOrder),
      blocks: blocks.filter((block) => block.date === day.date),
    })),
    unscheduled,
    connected: state.calendar.connected,
    google: state.settings.googleCalendar,
    selectedDate,
  };
}

function buildPlanningModel(state, tasks) {
  const sprints = state.sprints.map((sprint) => ({
    ...sprint,
    projectNames: sprint.projectIds.map((projectId) => getProjectById(state, projectId)?.name).filter(Boolean),
    objectiveTitles: sprint.objectiveIds.map((objectiveId) => getObjectiveById(state, objectiveId)?.title).filter(Boolean),
  }));

  return {
    currentSprint: state.sprints.find((sprint) => sprint.status === "current") || null,
    upcomingSprint: state.sprints.find((sprint) => sprint.status === "upcoming") || null,
    sprints,
    objectives: state.objectives,
    backlog: tasks.filter((task) => task.location === "backlog" || task.finalBucket === "backlog").slice(0, 10),
    templates: state.tasks.filter((task) => isTemplateTask(task)).slice(0, 10),
  };
}

function buildSettingsModel(state) {
  return {
    editMode: state.settings.editMode,
    advancedEditMode: state.settings.advancedEditMode,
    sidebarCollapsed: state.settings.sidebarCollapsed,
    visualDensity: state.settings.visualDensity,
    accentTone: state.settings.accentTone,
    reasoningLine: state.settings.reasoningLine,
    prioritization: state.settings.prioritization,
    layouts: state.settings.layouts,
    layoutDefaults: state.settings.layoutDefaults,
    layoutMode: state.settings.layoutMode,
    layoutCapabilities: state.settings.layoutCapabilities,
    architecture: state.settings.architecture,
    cloudSync: cloneValue(state.settings.cloudSync),
    voiceAssistant: {
      ...cloneValue(state.settings.voiceAssistant),
      projectAliasesText: formatVoiceAliasLines(state.settings.voiceAssistant.projectAliases),
      areaAliasesText: formatVoiceAliasLines(state.settings.voiceAssistant.areaAliases),
      frequentAssociationsText: formatVoiceAssociationLines(state.settings.voiceAssistant.frequentAssociations),
      history: cloneValue(state.settings.voiceAssistant.history || []).slice(0, 12),
      learnedPatterns: cloneValue(state.settings.voiceAssistant.learnedPatterns || []).slice(0, 10),
    },
  };
}

function blankEntity(kind, state) {
  if (kind === "task") {
    return {
      id: "",
      title: "",
      subtasks: [],
      areaId: state.areas[0]?.id || "",
      projectId: "",
      objectiveId: "",
      sprintId: "",
      type: "task",
      context: "flex",
      scheduledPeriod: "afternoon",
      status: "todo",
      location: "scheduled",
      scheduledDate: state.ui.selectedDate,
      dueDate: state.ui.selectedDate,
      estimatedMinutes: 30,
      priority: "medium",
      impact: 3,
      urgency: 3,
      effort: 3,
      energyCost: 2,
      nextAction: "",
      gtdStage: "clarify",
      gtdDecision: "",
      finalBucket: "",
      priorityMode: "auto",
      frog: "",
      scoreAdjustment: 0,
      notes: "",
      isRecurring: false,
      isTemplate: false,
      delegable: false,
      critical: false,
      manualDecision: false,
      riskAccepted: false,
    };
  }

  if (kind === "area") {
    return { id: "", name: "", type: "life", color: "#8f7a62", description: "" };
  }

  if (kind === "project") {
    const template = getProjectTemplate("work");
    return normalizeProjectPayload({
      id: "",
      name: "",
      templateId: template.id,
      areaId: template.areaId,
      projectType: template.projectType,
      status: "active",
      color: template.color,
      summary: template.summary,
      description: template.description,
      objective: template.objective,
      infoLinks: template.infoLinks,
      referenceEntries: template.referenceEntries,
      observationLines: template.observationLines,
      decisionLines: template.decisionLines,
      okrs: template.okrs,
      backlogItems: template.backlogItems,
      baseActivities: template.baseActivities,
      actionPlan: template.actionPlan,
    }, null);
  }

  if (kind === "objective") {
    return { id: "", title: "", areaId: state.areas[0]?.id || "", projectId: "", progress: 0, dueDate: state.ui.selectedDate, description: "" };
  }

  if (kind === "sprint") {
  const year = Number(String(state.ui.selectedDate || getCurrentISODate()).slice(0, 4));
    return normalizeSprintPayload({ title: "Novo sprint", slot: 1 }, null, 0, year);
  }

  if (kind === "habit") {
    return { id: "", title: "", areaId: "area-health", targetPerWeek: 3, preferredWeekdays: [], note: "", logs: [] };
  }

  if (kind === "block") {
    return { id: "", title: "", areaId: state.areas[0]?.id || "", projectId: "", date: state.ui.selectedDate, startTime: "09:00", endTime: "10:00", period: "afternoon", kind: "routine", note: "" };
  }

  if (kind === "routine") {
    return { id: "", title: "", period: "morning", areaId: "area-routine", order: 1, active: true, recurring: true, note: "" };
  }

  if (kind === "health-weight") {
    return { id: "", date: state.ui.selectedDate, weight: 0, note: "" };
  }

  if (kind === "health-measure") {
    return { id: "", date: state.ui.selectedDate, waist: 0, chest: 0, hip: 0, arm: 0, thigh: 0, note: "" };
  }

  if (kind === "health-care") {
    return { id: "", title: "", note: "" };
  }

  if (kind === "health-workout") {
    return { id: "", date: state.ui.selectedDate, title: "", type: "casa", duration: 30, status: "planned", note: "" };
  }

  if (kind === "diet-meal") {
    return { id: "", mealKey: "custom", title: "", plan: "", checklist: [], note: "" };
  }

  return { id: "", date: state.ui.selectedDate, typeId: getDefaultDayTypeId(state, state.ui.selectedDate), periods: defaultPeriodsForType(state, getDefaultDayTypeId(state, state.ui.selectedDate)), note: "" };
}

function buildEditorView(state) {
  const { kind, id } = state.ui.editor;

  if (!kind) {
    return null;
  }

  const entity = (() => {
    if (!id || id.startsWith("new-")) {
      return blankEntity(kind, state);
    }

    if (kind === "task") return getTaskById(state, id) || blankEntity(kind, state);
    if (kind === "area") return state.areas.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "project") return state.projects.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "objective") return state.objectives.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "sprint") return state.sprints.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "habit") return state.habits.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "block") return state.blocks.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "health-weight") return state.health.weightLogs.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "health-measure") return state.health.measureLogs.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "health-care") return state.health.careItems.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "health-workout") return state.health.workouts.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "diet-meal") return state.health.dietMeals.find((entry) => entry.id === id) || blankEntity(kind, state);
    if (kind === "routine") {
      return [...(state.routines.morning || []), ...(state.routines.night || [])].find((entry) => entry.id === id) || blankEntity(kind, state);
    }
    return state.dayOverrides.find((entry) => entry.id === id) || blankEntity(kind, state);
  })();

  return { kind, entity };
}

export function buildAppModel(inputState, referenceDate = new Date()) {
  const state = prepareState(cloneValue(inputState));
  const today = formatISODate(referenceDate);
  const selectedDate = state.ui.selectedDate || today;
  const projectTasks = state.tasks
    .filter((task) => !isTemplateTask(task))
    .map((task) => enrichTask(task, state, selectedDate));
  const openTasks = applyFrogs(
    state.tasks.filter(isOpenTask).map((task) => enrichTask(task, state, selectedDate)),
    selectedDate,
  );
  const filteredTasks = openTasks.filter((task) => matchesFilters(task, state.ui.filters));
  const completedTasks = state.tasks
    .filter((task) => task.status === "done")
    .map((task) => enrichTask(task, state, selectedDate))
    .filter((task) => matchesFilters(task, state.ui.filters));
  const weekData = buildWeekData(state, filteredTasks, selectedDate);
  const selectedDay = weekData.days.find((day) => day.date === selectedDate) || buildDaySnapshot(state, filteredTasks, selectedDate);
  const dashboard = buildDashboardModel(state, filteredTasks, selectedDate, weekData);
  const prioritize = buildPrioritizeModel(filteredTasks, selectedDate);
  const organize = buildOrganizeModel(filteredTasks);
  const inbox = buildInboxModel(filteredTasks);
  const settings = buildSettingsModel(state);
  const todayChecklist = buildTodayChecklistModel(state, filteredTasks, selectedDate, weekData);
  const checklist = buildChecklistModel(state, filteredTasks, completedTasks, selectedDate, weekData);
  const agenda = buildAgendaModel(state, filteredTasks, weekData, selectedDate);
  const projectsView = buildProjectsWorkspaceModel(state, projectTasks);
  const floatingAlert = selectedDay.tasks.find(
    (task) => task.critical && !task.riskAccepted && (task.manualDecision || selectedDay.lowCapacity || task.location === "alert"),
  ) || null;

  return {
    today,
    activeSection: state.ui.activeSection,
    selectedDate,
    priorityMethod: state.ui.priorityMethod,
    editMode: state.settings.editMode,
    filters: state.ui.filters,
    week: weekData,
    selectedDay,
    filteredTasks,
    dashboard,
    prioritize,
    organize,
    inbox,
    areas: buildAreaSummaries(state, filteredTasks),
    projects: projectsView.summaries,
    projectsView,
    planning: buildPlanningModel(state, filteredTasks),
    agenda,
    todayChecklist,
    checklist,
    settings,
    editorView: buildEditorView(state),
    floatingAlert,
    options: {
      areas: state.areas,
      projects: state.projects,
      projectTemplates: PROJECT_TEMPLATES,
      objectives: state.objectives,
      sprints: state.sprints,
      dayTypes: state.dayTypes,
      periods: PERIODS,
      methods: Object.entries(METHOD_LABELS).map(([id, label]) => ({ id, label, guide: METHOD_GUIDES[id] })),
      buckets: ORGANIZE_BUCKETS,
      taskTypes: TASK_TYPES,
      contexts: TASK_CONTEXTS,
      voiceIntents: Object.entries(VOICE_INTENTS).map(([id, entry]) => ({ id, ...entry })),
      voiceDestinations: Object.entries(VOICE_DESTINATIONS).map(([id, label]) => ({ id, label })),
      scopes: [
        { id: "integrated", label: "Integrado" },
        { id: "personal", label: "Foco pessoal" },
        { id: "work", label: "Foco trabalho" },
      ],
    },
  };
}
function normalizeTaskPayload(state, payload = {}, existing = null) {
  const areaId = payload.areaId || existing?.areaId || state.areas[0]?.id || "";
  const area = getAreaById(state, areaId);
  const projectId = area?.type === "work" ? payload.projectId || existing?.projectId || "" : "";
  const scheduledDate = payload.scheduledDate || existing?.scheduledDate || "";
  const isTemplate = toBoolean(payload.isTemplate, existing?.isTemplate || false);
  const location = payload.location || existing?.location || (isTemplate ? "template" : scheduledDate ? "scheduled" : "inbox");
  const status = payload.status || existing?.status || (location === "inbox" ? "inbox" : "todo");
  const subtasks = parseSubtasks(payload.subtasks, existing?.subtasks || []);

  return {
    id: payload.id || existing?.id || makeId("task"),
    title: String(payload.title || existing?.title || "Nova tarefa").trim(),
    subtasks,
    completedSubtasks: normalizeCompletedSubtasks(payload.completedSubtasks, subtasks, existing?.completedSubtasks || []),
    areaId,
    projectId,
    objectiveId: payload.objectiveId || existing?.objectiveId || "",
    sprintId: payload.sprintId || existing?.sprintId || "",
    type: payload.type || existing?.type || "task",
    context: payload.context || existing?.context || "flex",
    scheduledPeriod: payload.scheduledPeriod || existing?.scheduledPeriod || guessPeriod(payload),
    status: isTemplate ? "template" : status,
    location: isTemplate ? "template" : location,
    scheduledDate: location === "inbox" || location === "backlog" ? "" : scheduledDate,
    dueDate: payload.dueDate || existing?.dueDate || scheduledDate || "",
    estimatedMinutes: toNumber(payload.estimatedMinutes, existing?.estimatedMinutes || 30),
    priority: payload.priority || existing?.priority || "medium",
    impact: toNumber(payload.impact, existing?.impact || 3),
    urgency: toNumber(payload.urgency, existing?.urgency || 3),
    effort: toNumber(payload.effort, existing?.effort || 3),
    energyCost: toNumber(payload.energyCost, existing?.energyCost || 2),
    nextAction: payload.nextAction || existing?.nextAction || "",
    gtdStage: payload.gtdStage || existing?.gtdStage || "clarify",
    gtdDecision: payload.gtdDecision || existing?.gtdDecision || "",
    finalBucket: payload.finalBucket || existing?.finalBucket || "",
    priorityMode: payload.priorityMode || existing?.priorityMode || "auto",
    frog: payload.frog || existing?.frog || "",
    scoreAdjustment: toNumber(payload.scoreAdjustment, existing?.scoreAdjustment || 0),
    notes: payload.notes || existing?.notes || "",
    isRecurring: toBoolean(payload.isRecurring, existing?.isRecurring || false),
    isTemplate,
    delegable: toBoolean(payload.delegable, existing?.delegable || false),
    critical: toBoolean(payload.critical, existing?.critical || false),
    manualDecision: toBoolean(payload.manualDecision, existing?.manualDecision || false),
    riskAccepted: toBoolean(payload.riskAccepted, existing?.riskAccepted || false),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    completedAt: existing?.completedAt || "",
    source: existing?.source || payload.source || "manual",
    lastAction: payload.lastAction || existing?.lastAction || "",
    checklistOrder: toNumber(payload.checklistOrder, existing?.checklistOrder || 0),
  };
}

function normalizeAreaPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("area"),
    name: String(payload.name || existing?.name || "Nova area").trim(),
    type: payload.type || existing?.type || "life",
    color: payload.color || existing?.color || "#8f7a62",
    description: payload.description || existing?.description || "",
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function normalizeProjectPayload(payload = {}, existing = null) {
  const template = getProjectTemplate(payload.templateId || existing?.templateId || "work");
  return {
    id: payload.id || existing?.id || makeId("project"),
    name: String(payload.name || existing?.name || "Novo projeto").trim(),
    areaId: payload.areaId || existing?.areaId || template.areaId || "area-work",
    templateId: payload.templateId || existing?.templateId || template.id,
    projectType: payload.projectType || existing?.projectType || template.projectType || template.label,
    status: payload.status || existing?.status || "active",
    dueDate: payload.dueDate || existing?.dueDate || "",
    priority: payload.priority || existing?.priority || "medium",
    sprintId: payload.sprintId || existing?.sprintId || "",
    color: payload.color || existing?.color || template.color || "#8b6c50",
    summary: payload.summary || existing?.summary || template.summary || "",
    description: payload.description || existing?.description || template.description || "",
    objective: payload.objective || existing?.objective || template.objective || "",
    infoLinks: parseProjectLinkEntries(payload.infoLinks, existing?.infoLinks || template.infoLinks || []),
    referenceEntries: parseProjectLinkEntries(payload.referenceEntries, existing?.referenceEntries || template.referenceEntries || []),
    observationLines: parseLineList(payload.observationLines, existing?.observationLines || template.observationLines || []),
    decisionLines: parseLineList(payload.decisionLines, existing?.decisionLines || template.decisionLines || []),
    freeNotes: payload.freeNotes || existing?.freeNotes || "",
    okrs: parseProjectOkrs(payload.okrs, existing?.okrs || template.okrs || []),
    backlogItems: parseProjectBacklogItems(payload.backlogItems, existing?.backlogItems || template.backlogItems || []),
    baseActivities: parseProjectBaseActivities(payload.baseActivities, existing?.baseActivities || template.baseActivities || []),
    actionPlan: parseProjectActionPlan(payload.actionPlan, existing?.actionPlan || template.actionPlan || []),
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function normalizeObjectivePayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("objective"),
    title: String(payload.title || existing?.title || "Novo objetivo").trim(),
    areaId: payload.areaId || existing?.areaId || "",
    projectId: payload.projectId || existing?.projectId || "",
    progress: toNumber(payload.progress, existing?.progress || 0),
    dueDate: payload.dueDate || existing?.dueDate || "",
    description: payload.description || existing?.description || "",
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function normalizeHabitPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("habit"),
    title: String(payload.title || existing?.title || "Novo habito").trim(),
    areaId: payload.areaId || existing?.areaId || "area-health",
    targetPerWeek: toNumber(payload.targetPerWeek, existing?.targetPerWeek || 3),
    preferredWeekdays: typeof payload.preferredWeekdays === "string"
      ? payload.preferredWeekdays.split(",").map((item) => item.trim()).filter(Boolean)
      : payload.preferredWeekdays || existing?.preferredWeekdays || [],
    logs: existing?.logs || [],
    note: payload.note || existing?.note || "",
  };
}

function normalizeBlockPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("block"),
    title: String(payload.title || existing?.title || "Novo bloco").trim(),
    areaId: payload.areaId || existing?.areaId || "",
    projectId: payload.projectId || existing?.projectId || "",
    date: payload.date || existing?.date || getCurrentISODate(),
    startTime: payload.startTime || existing?.startTime || "09:00",
    endTime: payload.endTime || existing?.endTime || "10:00",
    period: payload.period || existing?.period || "afternoon",
    kind: payload.kind || existing?.kind || "routine",
    fixed: toBoolean(payload.fixed, existing?.fixed !== false),
    note: payload.note || existing?.note || "",
    source: existing?.source || payload.source || "manual",
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function normalizeRoutinePayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("routine"),
    title: String(payload.title || existing?.title || "Novo item").trim(),
    period: payload.period || existing?.period || "morning",
    areaId: payload.areaId || existing?.areaId || "area-routine",
    order: toNumber(payload.order, existing?.order || 1),
    active: toBoolean(payload.active, existing?.active !== false),
    recurring: toBoolean(payload.recurring, existing?.recurring !== false),
    note: payload.note || existing?.note || "",
    logs: existing?.logs || [],
  };
}

function normalizeHealthWeightPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("weight"),
    date: payload.date || existing?.date || getCurrentISODate(),
    weight: toNumber(payload.weight, existing?.weight || 0),
    note: payload.note || existing?.note || "",
  };
}

function normalizeHealthMeasurePayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("measure"),
    date: payload.date || existing?.date || getCurrentISODate(),
    waist: toNumber(payload.waist, existing?.waist || 0),
    chest: toNumber(payload.chest, existing?.chest || 0),
    hip: toNumber(payload.hip, existing?.hip || 0),
    arm: toNumber(payload.arm, existing?.arm || 0),
    thigh: toNumber(payload.thigh, existing?.thigh || 0),
    note: payload.note || existing?.note || "",
  };
}

function normalizeHealthCarePayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("care"),
    title: String(payload.title || existing?.title || "Novo cuidado").trim(),
    note: payload.note || existing?.note || "",
    logs: existing?.logs || [],
  };
}

function normalizeHealthWorkoutPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("workout"),
    date: payload.date || existing?.date || getCurrentISODate(),
    title: String(payload.title || existing?.title || "Novo treino").trim(),
    type: payload.type || existing?.type || "casa",
    duration: toNumber(payload.duration, existing?.duration || 30),
    status: payload.status || existing?.status || "planned",
    note: payload.note || existing?.note || "",
  };
}

function normalizeDietMealPayload(payload = {}, existing = null) {
  return {
    id: payload.id || existing?.id || makeId("diet"),
    mealKey: payload.mealKey || existing?.mealKey || "custom",
    title: String(payload.title || existing?.title || "Nova refeicao").trim(),
    plan: payload.plan || existing?.plan || "",
    checklist: parseChecklist(payload.checklist, existing?.checklist || []),
    note: payload.note || existing?.note || "",
    logs: existing?.logs || [],
  };
}

function normalizeDayOverridePayload(state, payload = {}, existing = null) {
  const typeId = payload.typeId || existing?.typeId || getDefaultDayTypeId(state, payload.date || existing?.date || getCurrentISODate());
  return {
    id: payload.id || existing?.id || makeId("override"),
    date: payload.date || existing?.date || getCurrentISODate(),
    typeId,
    periods: {
      ...defaultPeriodsForType(state, typeId),
      ...(existing?.periods || {}),
      ...(payload.periods || {}),
    },
    note: payload.note || existing?.note || "",
    lastPlan: existing?.lastPlan || null,
    createdAt: existing?.createdAt || payload.createdAt || nowIso(),
    updatedAt: payload.updatedAt || nowIso(),
  };
}

function setRoutineItem(state, item) {
  state.routines.morning = (state.routines.morning || []).filter((entry) => entry.id !== item.id);
  state.routines.night = (state.routines.night || []).filter((entry) => entry.id !== item.id);
  if (item.period === "night") {
    state.routines.night.push(item);
  } else {
    state.routines.morning.push(item);
  }
}

function removeRoutineItem(state, id) {
  state.routines.morning = (state.routines.morning || []).filter((entry) => entry.id !== id);
  state.routines.night = (state.routines.night || []).filter((entry) => entry.id !== id);
}

function pickPeriodForTask(task, state, date, usage = null) {
  const profile = resolveDayProfile(state, date);
  const currentUsage = usage || Object.fromEntries(profile.periods.map((period) => [period.id, 0]));
  const preferred = guessPeriod(task);
  const ordered = [preferred, ...PERIODS.map((period) => period.id).filter((id) => id !== preferred)];

  for (const periodId of ordered) {
    const period = profile.periods.find((entry) => entry.id === periodId);
    if (period && currentUsage[periodId] + task.estimatedMinutes <= period.capacity) {
      return periodId;
    }
  }

  return "";
}

function findNextUsefulSlot(task, state, fromDate) {
  for (let step = 1; step <= 14; step += 1) {
    const date = formatISODate(addDays(fromDate, step));
    const profile = resolveDayProfile(state, date);

    if (task.type === "health" && !["segunda", "terca", "quinta", "sabado"].includes(getWeekdayKey(date))) {
      continue;
    }

    if (task.context === "deep-work" && profile.lowCapacity && !task.critical) {
      continue;
    }

    const slot = pickPeriodForTask(task, state, date);
    if (slot) {
      return { date, period: slot };
    }
  }

  return { date: fromDate, period: guessPeriod(task) };
}

function rebalanceDay(state, date) {
  const profile = resolveDayProfile(state, date);
  const enriched = applyFrogs(
    state.tasks.filter((task) => isOpenTask(task) && task.scheduledDate === date).map((task) => enrichTask(task, state, date)),
    date,
  ).sort(sortByScore);
  const usage = Object.fromEntries(profile.periods.map((period) => [period.id, 0]));
  let movedCount = 0;
  let alertCount = 0;
  let reviewCount = 0;

  enriched.forEach((ranked) => {
    const task = getTaskById(state, ranked.id);
    const slot = pickPeriodForTask(task, state, date, usage);

    if (slot) {
      task.scheduledPeriod = slot;
      usage[slot] += task.estimatedMinutes;
      if (!task.critical) {
        task.manualDecision = false;
      }
      if (task.location === "alert" || task.location === "review") {
        task.location = "scheduled";
      }
      return;
    }

    if (task.critical || task.priority === "high" || (task.dueDate && differenceInDays(task.dueDate, date) <= 0)) {
      task.location = "alert";
      task.manualDecision = true;
      alertCount += 1;
      return;
    }

    if (task.delegable || toNumber(task.effort, 3) >= 4 || toNumber(task.estimatedMinutes, 30) >= 90) {
      task.location = "review";
      task.manualDecision = true;
      reviewCount += 1;
      return;
    }

    const nextSlot = findNextUsefulSlot(task, state, date);
    if (nextSlot.date !== date) {
      task.previousScheduledDate = date;
      task.scheduledDate = nextSlot.date;
      task.scheduledPeriod = nextSlot.period;
      task.location = "scheduled";
      task.manualDecision = false;
      task.lastAction = "auto-moved";
      movedCount += 1;
    }
  });

  const override = getDayOverride(state, date);
  if (override) {
    override.lastPlan = { movedCount, alertCount, reviewCount, at: nowIso() };
  }

  return { movedCount, alertCount, reviewCount };
}

function setTaskFrog(state, taskId, mode) {
  state.tasks.forEach((task) => {
    if (mode === "day" && (task.frog === "day" || task.frog === "both")) {
      task.frog = task.frog === "both" ? "week" : "";
    }
    if (mode === "week" && (task.frog === "week" || task.frog === "both")) {
      task.frog = task.frog === "both" ? "day" : "";
    }
  });

  const task = getTaskById(state, taskId);
  if (!task) {
    return;
  }

  if (mode === "clear") {
    task.frog = "";
    return;
  }

  if (mode === "day") {
    task.frog = task.frog === "week" ? "both" : "day";
  }

  if (mode === "week") {
    task.frog = task.frog === "day" ? "both" : "week";
  }
}

export function setActiveSection(state, section) {
  const nextState = cloneState(state);
  nextState.ui.activeSection = section;
  return nextState;
}

export function setSelectedDate(state, date) {
  const nextState = cloneState(state);
  nextState.ui.selectedDate = date;
  return nextState;
}

export function setFilter(state, name, value) {
  const nextState = cloneState(state);
  nextState.ui.filters[name] = value;
  return nextState;
}

export function clearFilters(state) {
  const nextState = cloneState(state);
  nextState.ui.filters = { ...DEFAULT_FILTERS };
  return nextState;
}

export function setPriorityMethod(state, method) {
  const nextState = cloneState(state);
  nextState.ui.priorityMethod = method;
  pushHistory(nextState, "priority-method", `Metodo de prioridade alterado para ${method}.`);
  return nextState;
}

export function setChecklistView(state, view) {
  const nextState = cloneState(state);
  nextState.ui.checklistView = view;
  return nextState;
}

export function setWeeklyEnergy(state, level) {
  const nextState = cloneState(state);
  nextState.weeklyPlan.energyLevel = toNumber(level, 3);
  pushHistory(nextState, "weekly-energy", `Energia semanal definida como ${getWeekEnergyLabel(level)}.`);
  return nextState;
}

export function toggleHabitForDate(state, habitId, date) {
  const nextState = cloneState(state);
  const habit = nextState.habits.find((entry) => entry.id === habitId);
  if (!habit) return nextState;
  const existing = (habit.logs || []).find((entry) => entry.date === date);
  if (existing) existing.done = !existing.done;
  else {
    habit.logs = habit.logs || [];
    habit.logs.push({ date, done: true });
  }
  pushHistory(nextState, "habit-toggle", `Habito atualizado: ${habit.title}`);
  return nextState;
}

function toggleDateLog(logs = [], date) {
  const nextLogs = Array.isArray(logs) ? [...logs] : [];
  const existing = nextLogs.find((entry) => entry.date === date);
  if (existing) {
    existing.done = !existing.done;
  } else {
    nextLogs.push({ date, done: true });
  }
  return nextLogs;
}

export function toggleHealthCareForDate(state, itemId, date) {
  const nextState = cloneState(state);
  const item = nextState.health.careItems.find((entry) => entry.id === itemId);
  if (!item) return nextState;
  item.logs = toggleDateLog(item.logs || [], date);
  pushHistory(nextState, "health-care-toggle", `Checklist de cuidado atualizado: ${item.title}`);
  return nextState;
}

export function toggleDietMealForDate(state, itemId, date) {
  const nextState = cloneState(state);
  const meal = nextState.health.dietMeals.find((entry) => entry.id === itemId);
  if (!meal) return nextState;
  meal.logs = toggleDateLog(meal.logs || [], date);
  pushHistory(nextState, "diet-toggle", `Refeicao atualizada: ${meal.title}`);
  return nextState;
}

export function toggleRoutineForDate(state, routineId, date) {
  const nextState = cloneState(state);
  const routine = [...(nextState.routines.morning || []), ...(nextState.routines.night || [])].find((entry) => entry.id === routineId);
  if (!routine) return nextState;
  routine.logs = toggleDateLog(routine.logs || [], date);
  pushHistory(nextState, "routine-toggle", `Rotina atualizada: ${routine.title}`);
  return nextState;
}

export function toggleTaskSubtask(state, taskId, subtaskIndex) {
  const nextState = cloneState(state);
  const task = getTaskById(nextState, taskId);
  const parsedIndex = Number(subtaskIndex);
  if (!task || !Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= (task.subtasks || []).length) {
    return nextState;
  }

  const completed = new Set(task.completedSubtasks || []);
  if (completed.has(parsedIndex)) completed.delete(parsedIndex);
  else completed.add(parsedIndex);
  task.completedSubtasks = [...completed].sort((left, right) => left - right);
  task.updatedAt = nowIso();
  pushHistory(nextState, "task-subtask-toggle", `Checklist da tarefa atualizado: ${task.title}`);
  return nextState;
}

export function moveTaskToBucket(state, taskId, bucketId) {
  const nextState = cloneState(state);
  const task = getTaskById(nextState, taskId);
  if (!task) return nextState;
  task.finalBucket = bucketId;
  task.priorityMode = "manual";
  task.location = bucketId === "backlog"
    ? "backlog"
    : bucketId === "delegate"
      ? "delegated"
      : bucketId === "waiting"
        ? "waiting"
        : "scheduled";
  task.status = bucketId === "delegate"
    ? "delegated"
    : bucketId === "waiting"
      ? "waiting"
    : bucketId === "backlog"
      ? "backlog"
      : "todo";
  task.updatedAt = nowIso();
  pushHistory(nextState, "organize-bucket", `Tarefa movida para ${bucketId}: ${task.title}`);
  return nextState;
}

export function reorderChecklistTask(state, taskId, targetTaskId) {
  const nextState = cloneState(state);
  const ordered = nextState.tasks.filter((task) => isOpenTask(task) && !isTemplateTask(task));
  const fromIndex = ordered.findIndex((task) => task.id === taskId);
  const targetIndex = ordered.findIndex((task) => task.id === targetTaskId);
  if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
    return nextState;
  }

  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  const timestamp = nowIso();
  ordered.forEach((task, index) => {
    task.checklistOrder = ordered.length - index;
    task.updatedAt = timestamp;
  });

  pushHistory(nextState, "checklist-reorder", `Ordem operacional atualizada: ${moved.title}`);
  return nextState;
}

function applyDayOrder(tasks) {
  tasks.forEach((task, index) => {
    task.checklistOrder = tasks.length - index;
  });
}

export function reorderAgendaTask(state, taskId, targetTaskId = "", targetDate = "") {
  const nextState = cloneState(state);
  const movedTask = getTaskById(nextState, taskId);
  if (!movedTask) return nextState;

  const sourceDate = movedTask.scheduledDate || "";
  const nextDate = targetDate || sourceDate;
  if (!nextDate) {
    return nextState;
  }

  const targetTask = targetTaskId ? getTaskById(nextState, targetTaskId) : null;
  movedTask.scheduledDate = nextDate;
  movedTask.location = "scheduled";
  movedTask.finalBucket = nextDate === nextState.ui.selectedDate ? "do-now" : "schedule";
  movedTask.status = ["delegated", "waiting", "discarded", "done"].includes(movedTask.status) ? movedTask.status : "todo";
  movedTask.manualDecision = false;
  movedTask.updatedAt = nowIso();

  const rebalanceDate = (date, focusTaskId = "", taskToInsert = null) => {
    if (!date) return;
    const ordered = nextState.tasks
      .filter((task) => isOpenTask(task) && !isTemplateTask(task) && task.scheduledDate === date && task.id !== taskToInsert?.id)
      .sort(sortByChecklistOrder);
    let insertIndex = ordered.length;
    if (focusTaskId) {
      const foundIndex = ordered.findIndex((task) => task.id === focusTaskId);
      if (foundIndex !== -1) {
        insertIndex = foundIndex;
      }
    }
    if (taskToInsert) {
      ordered.splice(insertIndex, 0, taskToInsert);
    }
    applyDayOrder(ordered);
  };

  if (sourceDate && sourceDate !== nextDate) {
    rebalanceDate(sourceDate);
  }
  rebalanceDate(nextDate, targetTask?.id || "", movedTask);

  pushHistory(nextState, "agenda-kanban", `Agenda reorganizada: ${movedTask.title}`);
  return nextState;
}

export function updateTaskSchedule(state, taskId, updates = {}) {
  const nextState = cloneState(state);
  const task = getTaskById(nextState, taskId);
  if (!task) return nextState;
  task.scheduledDate = updates.scheduledDate ?? task.scheduledDate;
  task.scheduledPeriod = updates.scheduledPeriod || task.scheduledPeriod || guessPeriod(task);
  task.location = task.scheduledDate ? "scheduled" : (task.location === "backlog" ? "backlog" : "captured");
  task.finalBucket = task.scheduledDate
    ? (task.scheduledDate === nextState.ui.selectedDate ? "do-now" : "schedule")
    : (task.finalBucket || "priority");
  task.status = ["delegated", "waiting", "discarded", "done"].includes(task.status) ? task.status : "todo";
  task.manualDecision = false;
  task.updatedAt = nowIso();
  pushHistory(nextState, "agenda-task", `Agenda atualizada para ${task.title}.`);
  return nextState;
}

export function updateBlockSchedule(state, blockId, updates = {}) {
  const nextState = cloneState(state);
  const block = nextState.blocks.find((entry) => entry.id === blockId);
  if (!block) return nextState;
  block.date = updates.date || block.date;
  block.period = updates.period || block.period;
  block.startTime = updates.startTime || block.startTime;
  block.endTime = updates.endTime || block.endTime;
  block.note = updates.note ?? block.note;
  block.updatedAt = nowIso();
  pushHistory(nextState, "agenda-block", `Bloco atualizado: ${block.title}.`);
  return nextState;
}

export function saveHealthWeight(state, payload) {
  const nextState = cloneState(state);
  const entry = {
    id: payload.id || makeId("weight"),
    date: payload.date || getCurrentISODate(),
    weight: toNumber(payload.weight, 0),
    note: payload.note || "",
  };
  nextState.health.weightLogs = nextState.health.weightLogs.filter((item) => item.id !== entry.id);
  nextState.health.weightLogs.unshift(entry);
  pushHistory(nextState, "health-weight", `Peso registrado em ${entry.date}.`);
  return nextState;
}

export function saveHealthMeasure(state, payload) {
  const nextState = cloneState(state);
  const entry = {
    id: payload.id || makeId("measure"),
    date: payload.date || getCurrentISODate(),
    waist: toNumber(payload.waist, 0),
    chest: toNumber(payload.chest, 0),
    hip: toNumber(payload.hip, 0),
    arm: toNumber(payload.arm, 0),
    thigh: toNumber(payload.thigh, 0),
    note: payload.note || "",
  };
  nextState.health.measureLogs = nextState.health.measureLogs.filter((item) => item.id !== entry.id);
  nextState.health.measureLogs.unshift(entry);
  pushHistory(nextState, "health-measure", `Medidas registradas em ${entry.date}.`);
  return nextState;
}

export function saveHealthCareItem(state, payload) {
  const nextState = cloneState(state);
  const entry = {
    id: payload.id || makeId("care"),
    title: String(payload.title || "Novo cuidado").trim(),
    note: payload.note || "",
    logs: nextState.health.careItems.find((item) => item.id === payload.id)?.logs || [],
  };
  nextState.health.careItems = nextState.health.careItems.filter((item) => item.id !== entry.id);
  nextState.health.careItems.push(entry);
  pushHistory(nextState, "health-care-item", `Item de cuidado salvo: ${entry.title}.`);
  return nextState;
}

export function saveHealthWorkout(state, payload) {
  const nextState = cloneState(state);
  const entry = {
    id: payload.id || makeId("workout"),
    date: payload.date || getCurrentISODate(),
    title: String(payload.title || "Novo treino").trim(),
    type: payload.type || "casa",
    duration: toNumber(payload.duration, 30),
    status: payload.status || "planned",
    note: payload.note || "",
  };
  nextState.health.workouts = nextState.health.workouts.filter((item) => item.id !== entry.id);
  nextState.health.workouts.unshift(entry);
  pushHistory(nextState, "health-workout", `Treino salvo: ${entry.title}.`);
  return nextState;
}

export function saveDietMeal(state, payload) {
  const nextState = cloneState(state);
  const existing = nextState.health.dietMeals.find((item) => item.id === payload.id);
  const entry = {
    id: payload.id || makeId("diet"),
    mealKey: payload.mealKey || existing?.mealKey || "custom",
    title: String(payload.title || existing?.title || "Nova refeicao").trim(),
    plan: payload.plan || existing?.plan || "",
    checklist: parseChecklist(payload.checklist, existing?.checklist || []),
    note: payload.note || existing?.note || "",
    logs: existing?.logs || [],
  };
  nextState.health.dietMeals = nextState.health.dietMeals.filter((item) => item.id !== entry.id);
  nextState.health.dietMeals.push(entry);
  pushHistory(nextState, "diet-meal", `Refeicao salva: ${entry.title}.`);
  return nextState;
}

export function captureInboxTask(state, transcript, referenceDate = getCurrentISODate()) {
  const nextState = cloneState(state);
  const draft = analyzeCaptureText(nextState, transcript, referenceDate);
  const basePayload = {
    title: draft.title,
    areaId: draft.areaId || nextState.areas[0]?.id || "",
    projectId: draft.projectId || "",
    context: draft.context || "flex",
    dueDate: draft.dueDate || "",
    scheduledDate: draft.scheduledDate || "",
    scheduledPeriod: draft.scheduledPeriod || "",
    estimatedMinutes: draft.estimatedMinutes || 30,
    priority: draft.priority || "medium",
    urgency: draft.urgency || 3,
    subtasks: draft.checklist || [],
    nextAction: draft.checklist?.[0] || "",
    notes: draft.transcript ? `Captura rapida: ${draft.transcript}` : "",
    source: "capture",
    location: "inbox",
    status: "inbox",
  };
  const currentSprint = nextState.sprints.find((sprint) => sprint.status === "current") || null;
  const previewTask = normalizeTaskPayload(nextState, basePayload, null);
  const sprintFit = evaluateSprintFit(previewTask, nextState);
  const task = normalizeTaskPayload(nextState, {
    ...basePayload,
    sprintId: sprintFit.matched && currentSprint ? currentSprint.id : "",
  }, null);

  nextState.tasks.unshift(task);
  pushHistory(nextState, "task-captured", `Captura salva na Inbox: ${task.title}`, {
    areaId: task.areaId,
    projectId: task.projectId,
    sprintId: task.sprintId,
  });

  return {
    nextState,
    task,
    draft,
    message: sprintFit.matched
      ? "Captura salva na Inbox com leitura do sprint atual."
      : "Captura salva na Inbox.",
  };
}

export function addInboxTask(state, payload) {
  const nextState = cloneState(state);
  const task = normalizeTaskPayload(nextState, {
    ...payload,
    subtasks: payload.checklist || payload.subtasks || [],
    location: "inbox",
    status: "inbox",
    source: "capture",
  }, null);
  nextState.tasks.unshift(task);
  pushHistory(nextState, "task-captured", `Nova tarefa capturada: ${task.title}`);
  return nextState;
}

export function addChecklistTask(state, payload) {
  const nextState = cloneState(state);
  const view = payload.checklistView || nextState.ui.checklistView || "all";
  const defaultAreaId = view === "work" || view === "projects"
    ? "area-work"
    : view === "personal"
      ? "area-personal"
      : nextState.areas[0]?.id || "";
  const shouldScheduleToday = !["no-date", "completed"].includes(view);
  const scheduledDate = payload.scheduledDate || (shouldScheduleToday ? (payload.selectedDate || nextState.ui.selectedDate) : "");
  const areaId = payload.areaId || defaultAreaId;
  const projectId = areaId === "area-work"
    ? (payload.projectId || (view === "projects" ? nextState.projects[0]?.id || "" : ""))
    : "";
  const task = normalizeTaskPayload(nextState, {
    ...payload,
    areaId,
    projectId,
    subtasks: payload.checklist || payload.subtasks || [],
    location: scheduledDate ? "scheduled" : "inbox",
    status: scheduledDate ? "todo" : "inbox",
    scheduledDate,
    dueDate: payload.dueDate || scheduledDate || "",
    source: "checklist",
  }, null);

  nextState.tasks.unshift(task);
  pushHistory(nextState, "task-captured", `Nova tarefa criada na checklist: ${task.title}`);
  return nextState;
}

function diffVoiceInterpretation(understood = {}, corrected = {}) {
  const comparedFields = [
    "intent",
    "destination",
    "title",
    "areaId",
    "projectId",
    "scheduledDate",
    "dueDate",
    "scheduledPeriod",
    "priority",
    "urgency",
    "context",
    "suggestedDayTypeId",
  ];

  return comparedFields
    .filter((field) => String(understood?.[field] ?? "") !== String(corrected?.[field] ?? ""))
    .map((field) => ({
      field,
      from: understood?.[field] ?? "",
      to: corrected?.[field] ?? "",
    }));
}

function buildVoiceLearningPhrase(transcript = "") {
  return normalizeSearchText(transcript)
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 8)
    .join(" ");
}

function saveVoiceLearning(state, transcript, corrected = {}, corrections = []) {
  const phrase = buildVoiceLearningPhrase(transcript);
  if (!phrase || !corrections.length) {
    return;
  }

  const target = {
    intent: corrected.intent || "",
    destination: corrected.destination || "",
    areaId: corrected.areaId || "",
    projectId: corrected.projectId || "",
    context: corrected.context || "",
    dayTypeId: corrected.suggestedDayTypeId || "",
    period: corrected.scheduledPeriod || "",
  };

  const existing = state.settings.voiceAssistant.learnedPatterns.find((entry) => entry.phrase === phrase);
  if (existing) {
    existing.target = { ...existing.target, ...target };
    existing.uses = toNumber(existing.uses, 1) + 1;
    existing.updatedAt = nowIso();
    return;
  }

  state.settings.voiceAssistant.learnedPatterns.unshift({
    phrase,
    target,
    uses: 1,
    updatedAt: nowIso(),
  });
  state.settings.voiceAssistant.learnedPatterns = state.settings.voiceAssistant.learnedPatterns.slice(0, 30);
}

function saveVoiceInterpretationHistory(state, meta = {}) {
  const item = {
    id: makeId("voice"),
    transcript: meta.transcript || "",
    sourceSection: meta.sourceSection || "inbox",
    understood: cloneValue(meta.understood || {}),
    corrected: cloneValue(meta.corrected || {}),
    corrections: cloneValue(meta.corrections || []),
    savedAt: nowIso(),
  };

  state.settings.voiceAssistant.history.unshift(item);
  state.settings.voiceAssistant.history = state.settings.voiceAssistant.history.slice(0, 60);
}

export function confirmVoiceCapture(state, payload = {}, meta = {}) {
  const nextState = cloneState(state);
  const transcript = String(payload.transcript || meta.transcript || "").trim();

  if (!transcript) {
    return {
      nextState,
      message: "Fale ou digite algo antes de salvar na Inbox.",
    };
  }

  const understood = meta.understood && Object.keys(meta.understood).length
    ? meta.understood
    : analyzeCaptureText(nextState, transcript, nextState.ui.selectedDate || getCurrentISODate());
  const corrected = {
    ...understood,
    title: transcript,
    transcript,
  };
  const corrections = diffVoiceInterpretation(understood, corrected);

  saveVoiceInterpretationHistory(nextState, {
    transcript,
    sourceSection: meta.sourceSection || "inbox",
    understood,
    corrected,
    corrections,
  });
  saveVoiceLearning(nextState, transcript, corrected, corrections);

  const notesWithTranscript = [corrected.notes || "", transcript ? `Captura por voz: ${transcript}` : ""]
    .filter(Boolean)
    .join("\n");
  const savedState = addInboxTask(nextState, {
    title: corrected.title || transcript,
    areaId: corrected.areaId || nextState.areas[0]?.id || "",
    projectId: corrected.projectId || "",
    dueDate: corrected.dueDate || "",
    estimatedMinutes: corrected.estimatedMinutes || 30,
    context: corrected.context || "flex",
    checklist: corrected.checklist || [],
    notes: notesWithTranscript,
    priority: corrected.priority || "medium",
    urgency: corrected.urgency || 3,
    source: "voice",
  });
  return {
    nextState: savedState,
    message: "Captura por voz salva na Inbox.",
  };
}

export function applyTaskAction(state, taskId, action, _meta = {}, referenceDate = getCurrentISODate()) {
  const nextState = cloneState(state);
  const task = getTaskById(nextState, taskId);
  if (!task) return nextState;

  if (action === "complete") {
    task.status = "done";
    task.location = "done";
    task.finalBucket = "do-now";
    task.completedAt = nowIso();
    task.manualDecision = false;
    task.completedSubtasks = (task.subtasks || []).map((_item, index) => index);
  }

  if (action === "today" || action === "resolve-now") {
    task.status = "todo";
    task.location = "scheduled";
    task.scheduledDate = referenceDate;
    task.scheduledPeriod = guessPeriod(task);
    task.finalBucket = "do-now";
    task.manualDecision = false;
    task.riskAccepted = false;
    task.completedAt = "";
  }

  if (action === "reopen") {
    task.status = task.finalBucket === "backlog" ? "backlog" : "todo";
    task.location = task.scheduledDate
      ? "scheduled"
      : task.finalBucket === "backlog"
        ? "backlog"
        : "inbox";
    task.manualDecision = false;
    task.completedAt = "";
  }

  if (action === "backlog") {
    task.status = "backlog";
    task.location = "backlog";
    task.finalBucket = "backlog";
    task.scheduledDate = "";
    task.manualDecision = false;
  }

  if (action === "inbox") {
    task.status = "inbox";
    task.location = "inbox";
    task.finalBucket = "";
    task.scheduledDate = "";
    task.manualDecision = false;
  }

  if (action === "delegate") {
    task.status = "delegated";
    task.location = "delegated";
    task.finalBucket = "delegate";
    task.manualDecision = false;
  }

  if (action === "waiting") {
    task.status = "waiting";
    task.location = "waiting";
    task.finalBucket = "waiting";
    task.manualDecision = false;
  }

  if (action === "discard") {
    task.status = "discarded";
    task.location = "discarded";
    task.finalBucket = "backlog";
    task.manualDecision = false;
  }

  if (action === "auto-defer") {
    const slot = findNextUsefulSlot(task, nextState, task.scheduledDate || referenceDate);
    task.previousScheduledDate = task.scheduledDate || referenceDate;
    task.scheduledDate = slot.date;
    task.scheduledPeriod = slot.period;
    task.location = "scheduled";
    task.finalBucket = "schedule";
    task.manualDecision = false;
  }

  if (action === "keep-original") {
    task.location = "scheduled";
    task.finalBucket = "priority";
    task.manualDecision = false;
  }

  if (action === "accept-risk") {
    task.location = "scheduled";
    task.finalBucket = "priority";
    task.manualDecision = false;
    task.riskAccepted = true;
  }

  if (action === "mark-frog-day") {
    setTaskFrog(nextState, taskId, "day");
  }

  if (action === "mark-frog-week") {
    setTaskFrog(nextState, taskId, "week");
  }

  if (action === "clear-frog") {
    setTaskFrog(nextState, taskId, "clear");
  }

  if (action === "reprocess") {
    task.gtdStage = "clarify";
    task.gtdDecision = "";
    task.nextAction = "";
    task.finalBucket = "";
    task.priorityMode = "auto";
    task.scoreAdjustment = 0;
    task.manualDecision = false;
  }

  if (action === "as-template") {
    task.isTemplate = true;
    task.status = "template";
    task.location = "template";
    task.finalBucket = "backlog";
    task.scheduledDate = "";
    task.dueDate = "";
  }

  if (action === "instantiate-template" && isTemplateTask(task)) {
    const newTask = normalizeTaskPayload(nextState, { ...task, id: "", isTemplate: false, location: "inbox", status: "inbox", scheduledDate: "", dueDate: "" }, null);
    nextState.tasks.unshift(newTask);
  }

  task.updatedAt = nowIso();
  pushHistory(nextState, "task-action", `Tarefa atualizada: ${task.title}`, { action });
  return nextState;
}

export function openEditor(state, kind, id = "") {
  const nextState = cloneState(state);
  nextState.ui.editor = { kind, id: id || `new-${kind}` };
  return nextState;
}

export function closeEditor(state) {
  const nextState = cloneState(state);
  nextState.ui.editor = { kind: "", id: "" };
  return nextState;
}

export function saveEntity(state, kind, payload) {
  const nextState = cloneState(state);
  const referenceYear = Number(String(nextState.ui.selectedDate || getCurrentISODate()).slice(0, 4));

  if (kind === "task") {
    const existing = payload.id ? getTaskById(nextState, payload.id) : null;
    const task = normalizeTaskPayload(nextState, payload, existing);
    nextState.tasks = nextState.tasks.filter((entry) => entry.id !== task.id);
    nextState.tasks.unshift(task);
  }

  if (kind === "area") {
    const existing = nextState.areas.find((entry) => entry.id === payload.id) || null;
    const area = normalizeAreaPayload(payload, existing);
    nextState.areas = nextState.areas.filter((entry) => entry.id !== area.id);
    nextState.areas.push(area);
  }

  if (kind === "project") {
    const existing = nextState.projects.find((entry) => entry.id === payload.id) || null;
    const project = normalizeProjectPayload(payload, existing);
    nextState.projects = nextState.projects.filter((entry) => entry.id !== project.id);
    nextState.projects.push(project);
    nextState.ui.selectedProjectId = project.id;
  }

  if (kind === "objective") {
    const existing = nextState.objectives.find((entry) => entry.id === payload.id) || null;
    const objective = normalizeObjectivePayload(payload, existing);
    nextState.objectives = nextState.objectives.filter((entry) => entry.id !== objective.id);
    nextState.objectives.push(objective);
  }

  if (kind === "sprint") {
    const existing = nextState.sprints.find((entry) => entry.id === payload.id) || null;
    const sprint = normalizeSprintPayload(payload, existing, inferSprintSlot(payload) - 1, referenceYear);
    if (sprint.status === "current") {
      nextState.sprints = nextState.sprints.map((entry) => ({
        ...entry,
        status: entry.id === sprint.id ? "current" : entry.status === "current" ? "planned" : entry.status,
      }));
    }
    nextState.sprints = nextState.sprints.filter((entry) => entry.id !== sprint.id);
    nextState.sprints.push(sprint);
    nextState.sprints = normalizeSprints(nextState.sprints, referenceYear);
  }

  if (kind === "habit") {
    const existing = nextState.habits.find((entry) => entry.id === payload.id) || null;
    const habit = normalizeHabitPayload(payload, existing);
    nextState.habits = nextState.habits.filter((entry) => entry.id !== habit.id);
    nextState.habits.push(habit);
  }

  if (kind === "block") {
    const existing = nextState.blocks.find((entry) => entry.id === payload.id) || null;
    const item = normalizeBlockPayload(payload, existing);
    nextState.blocks = nextState.blocks.filter((entry) => entry.id !== item.id);
    nextState.blocks.push(item);
  }

  if (kind === "routine") {
    const existing = [...(nextState.routines.morning || []), ...(nextState.routines.night || [])].find((entry) => entry.id === payload.id) || null;
    setRoutineItem(nextState, normalizeRoutinePayload(payload, existing));
  }

  if (kind === "health-weight") {
    const existing = nextState.health.weightLogs.find((entry) => entry.id === payload.id) || null;
    const entry = normalizeHealthWeightPayload(payload, existing);
    nextState.health.weightLogs = nextState.health.weightLogs.filter((item) => item.id !== entry.id);
    nextState.health.weightLogs.unshift(entry);
  }

  if (kind === "health-measure") {
    const existing = nextState.health.measureLogs.find((entry) => entry.id === payload.id) || null;
    const entry = normalizeHealthMeasurePayload(payload, existing);
    nextState.health.measureLogs = nextState.health.measureLogs.filter((item) => item.id !== entry.id);
    nextState.health.measureLogs.unshift(entry);
  }

  if (kind === "health-care") {
    const existing = nextState.health.careItems.find((entry) => entry.id === payload.id) || null;
    const entry = normalizeHealthCarePayload(payload, existing);
    nextState.health.careItems = nextState.health.careItems.filter((item) => item.id !== entry.id);
    nextState.health.careItems.push(entry);
  }

  if (kind === "health-workout") {
    const existing = nextState.health.workouts.find((entry) => entry.id === payload.id) || null;
    const entry = normalizeHealthWorkoutPayload(payload, existing);
    nextState.health.workouts = nextState.health.workouts.filter((item) => item.id !== entry.id);
    nextState.health.workouts.unshift(entry);
  }

  if (kind === "diet-meal") {
    const existing = nextState.health.dietMeals.find((entry) => entry.id === payload.id) || null;
    const entry = normalizeDietMealPayload(payload, existing);
    nextState.health.dietMeals = nextState.health.dietMeals.filter((item) => item.id !== entry.id);
    nextState.health.dietMeals.push(entry);
  }

  if (kind === "day-override") {
    const existing = nextState.dayOverrides.find((entry) => entry.id === payload.id) || null;
    const override = normalizeDayOverridePayload(nextState, payload, existing);
    nextState.dayOverrides = nextState.dayOverrides.filter((entry) => entry.id !== override.id);
    nextState.dayOverrides.push(override);
  }

  nextState.ui.editor = { kind: "", id: "" };
  pushHistory(nextState, "save-entity", `Item salvo: ${kind}`);
  return nextState;
}

export function deleteEntity(state, kind, id) {
  const nextState = cloneState(state);
  if (kind === "task") nextState.tasks = nextState.tasks.filter((entry) => entry.id !== id);
  if (kind === "area") nextState.areas = nextState.areas.filter((entry) => entry.id !== id);
  if (kind === "project") nextState.projects = nextState.projects.filter((entry) => entry.id !== id);
  if (kind === "objective") nextState.objectives = nextState.objectives.filter((entry) => entry.id !== id);
  if (kind === "sprint") nextState.sprints = nextState.sprints.filter((entry) => entry.id !== id);
  if (kind === "habit") nextState.habits = nextState.habits.filter((entry) => entry.id !== id);
  if (kind === "block") nextState.blocks = nextState.blocks.filter((entry) => entry.id !== id);
  if (kind === "health-weight") nextState.health.weightLogs = nextState.health.weightLogs.filter((entry) => entry.id !== id);
  if (kind === "health-measure") nextState.health.measureLogs = nextState.health.measureLogs.filter((entry) => entry.id !== id);
  if (kind === "health-care") nextState.health.careItems = nextState.health.careItems.filter((entry) => entry.id !== id);
  if (kind === "health-workout") nextState.health.workouts = nextState.health.workouts.filter((entry) => entry.id !== id);
  if (kind === "diet-meal") nextState.health.dietMeals = nextState.health.dietMeals.filter((entry) => entry.id !== id);
  if (kind === "routine") removeRoutineItem(nextState, id);
  if (kind === "day-override") nextState.dayOverrides = nextState.dayOverrides.filter((entry) => entry.id !== id);
  nextState.ui.editor = { kind: "", id: "" };
  if (kind === "project" && nextState.ui.selectedProjectId === id) {
    nextState.ui.selectedProjectId = nextState.projects[0]?.id || "";
  }
  pushHistory(nextState, "delete-entity", `Item removido: ${kind}`);
  return nextState;
}

export function duplicateEntity(state, kind, id) {
  const nextState = cloneState(state);
  if (kind === "task") {
    const existing = getTaskById(nextState, id);
    if (existing) nextState.tasks.unshift(normalizeTaskPayload(nextState, { ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "block") {
    const existing = nextState.blocks.find((entry) => entry.id === id);
    if (existing) nextState.blocks.push(normalizeBlockPayload({ ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "project") {
    const existing = nextState.projects.find((entry) => entry.id === id);
    if (existing) {
      const project = normalizeProjectPayload({ ...existing, id: "", name: `${existing.name} (copia)` }, null);
      nextState.projects.push(project);
      nextState.ui.selectedProjectId = project.id;
    }
  }
  if (kind === "health-care") {
    const existing = nextState.health.careItems.find((entry) => entry.id === id);
    if (existing) nextState.health.careItems.push(normalizeHealthCarePayload({ ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "health-workout") {
    const existing = nextState.health.workouts.find((entry) => entry.id === id);
    if (existing) nextState.health.workouts.unshift(normalizeHealthWorkoutPayload({ ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "diet-meal") {
    const existing = nextState.health.dietMeals.find((entry) => entry.id === id);
    if (existing) nextState.health.dietMeals.push(normalizeDietMealPayload({ ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "routine") {
    const existing = [...(nextState.routines.morning || []), ...(nextState.routines.night || [])].find((entry) => entry.id === id);
    if (existing) setRoutineItem(nextState, normalizeRoutinePayload({ ...existing, id: "", title: `${existing.title} (copia)` }, null));
  }
  if (kind === "sprint") {
    const existing = nextState.sprints.find((entry) => entry.id === id);
    if (existing) {
  const year = Number(String(nextState.ui.selectedDate || getCurrentISODate()).slice(0, 4));
      nextState.sprints.push(normalizeSprintPayload({ ...existing, id: "", title: `${existing.title} (copia)`, status: "planned" }, null, inferSprintSlot(existing) - 1, year));
      nextState.sprints = normalizeSprints(nextState.sprints, year);
    }
  }
  pushHistory(nextState, "duplicate-entity", `Item duplicado: ${kind}`);
  return nextState;
}

export function setActiveSprint(state, sprintId) {
  const nextState = cloneState(state);
  const sprint = nextState.sprints.find((entry) => entry.id === sprintId);
  if (!sprint) return nextState;
  nextState.sprints = nextState.sprints.map((entry) => ({
    ...entry,
    status: entry.id === sprintId ? "current" : entry.status === "current" ? "planned" : entry.status,
    updatedAt: entry.id === sprintId || entry.status === "current" ? nowIso() : entry.updatedAt,
  }));
  pushHistory(nextState, "active-sprint", `Sprint atual definida: ${sprint.title}.`);
  return nextState;
}

export function setDayType(state, date, typeId) {
  const nextState = cloneState(state);
  const existing = getDayOverride(nextState, date);
  const payload = normalizeDayOverridePayload(nextState, { ...(existing || {}), date, typeId, periods: defaultPeriodsForType(nextState, typeId) }, existing);
  nextState.dayOverrides = nextState.dayOverrides.filter((entry) => entry.id !== payload.id);
  nextState.dayOverrides.push(payload);
  const result = rebalanceDay(nextState, date);
  pushHistory(nextState, "day-type", `Tipo de dia alterado para ${getDayTypeById(nextState, typeId)?.label || typeId}.`);
  return { nextState, ...result };
}

export function setDayPeriodType(state, date, periodId, typeId) {
  const nextState = cloneState(state);
  const existing = getDayOverride(nextState, date);
  const payload = normalizeDayOverridePayload(nextState, { ...(existing || {}), date, typeId: existing?.typeId || getDefaultDayTypeId(nextState, date), periods: { ...(existing?.periods || defaultPeriodsForType(nextState, existing?.typeId || getDefaultDayTypeId(nextState, date))), [periodId]: typeId } }, existing);
  nextState.dayOverrides = nextState.dayOverrides.filter((entry) => entry.id !== payload.id);
  nextState.dayOverrides.push(payload);
  const result = rebalanceDay(nextState, date);
  pushHistory(nextState, "day-period", `Periodo ${periodId} ajustado.`);
  return { nextState, ...result };
}

export function replanWeek(state, referenceDate = getCurrentISODate()) {
  const nextState = cloneState(state);
  let movedCount = 0;
  let alertCount = 0;
  let reviewCount = 0;
  const timestamp = nowIso();

  nextState.tasks.forEach((task) => {
    if (isOpenTask(task) && task.scheduledDate && differenceInDays(task.scheduledDate, referenceDate) < 0 && !task.critical) {
      const slot = findNextUsefulSlot(task, nextState, referenceDate);
      task.previousScheduledDate = task.scheduledDate;
      task.scheduledDate = slot.date;
      task.scheduledPeriod = slot.period;
      task.location = "scheduled";
      task.manualDecision = false;
      task.updatedAt = timestamp;
      movedCount += 1;
    }
  });

  getWeekDates(referenceDate).forEach((date) => {
    const result = rebalanceDay(nextState, date);
    movedCount += result.movedCount;
    alertCount += result.alertCount;
    reviewCount += result.reviewCount;
  });

  pushHistory(nextState, "replan-week", `Semana reorganizada: ${movedCount} movidas, ${alertCount} alertas e ${reviewCount} revisoes.`);
  return { nextState, movedCount, alertCount, reviewCount };
}

export function toggleEditMode(state) {
  const nextState = cloneState(state);
  nextState.settings.editMode = !nextState.settings.editMode;
  touchSettingsState(nextState);
  pushHistory(nextState, "edit-mode", `Modo edicao ${nextState.settings.editMode ? "ativado" : "desativado"}.`);
  return nextState;
}

export function saveSettings(state, payload) {
  const nextState = cloneState(state);
  nextState.settings.sidebarCollapsed = toBoolean(payload.sidebarCollapsed, nextState.settings.sidebarCollapsed);
  nextState.settings.advancedEditMode = toBoolean(payload.advancedEditMode, nextState.settings.advancedEditMode);
  nextState.settings.visualDensity = normalizeVisualDensity(payload.visualDensity || nextState.settings.visualDensity);
  nextState.settings.accentTone = payload.accentTone || nextState.settings.accentTone;
  nextState.settings.layoutMode = nextState.settings.advancedEditMode ? "advanced-freeform" : "flex-grid";
  nextState.settings.reasoningLine = payload.reasoningLine || nextState.settings.reasoningLine;
  nextState.settings.layoutCapabilities = {
    ...nextState.settings.layoutCapabilities,
    freeformEnabled: true,
  };
  nextState.settings.prioritization = {
    moveProtection: toNumber(payload.moveProtection, nextState.settings.prioritization.moveProtection),
    familyProtection: toNumber(payload.familyProtection, nextState.settings.prioritization.familyProtection),
    futureFocus: toNumber(payload.futureFocus, nextState.settings.prioritization.futureFocus),
    delegationBias: toNumber(payload.delegationBias, nextState.settings.prioritization.delegationBias),
    overloadLimit: toNumber(payload.overloadLimit, nextState.settings.prioritization.overloadLimit),
  };
  nextState.settings.voiceAssistant = {
    ...nextState.settings.voiceAssistant,
    projectAliases: parseVoiceAliasLines(payload.voiceProjectAliases, nextState.settings.voiceAssistant.projectAliases),
    areaAliases: parseVoiceAliasLines(payload.voiceAreaAliases, nextState.settings.voiceAssistant.areaAliases),
    frequentAssociations: parseVoiceAssociationLines(payload.voiceAssociations, nextState.settings.voiceAssistant.frequentAssociations),
  };
  nextState.settings.cloudSync = {
    ...nextState.settings.cloudSync,
    enabled: toBoolean(payload.syncEnabled, nextState.settings.cloudSync.enabled),
    provider: payload.syncProvider || nextState.settings.cloudSync.provider || "supabase",
    projectUrl: String(payload.syncProjectUrl || nextState.settings.cloudSync.projectUrl || "").trim(),
    anonKey: String(payload.syncAnonKey || nextState.settings.cloudSync.anonKey || "").trim(),
    tableName: String(payload.syncTableName || nextState.settings.cloudSync.tableName || "life_os_snapshots").trim() || "life_os_snapshots",
    workspaceKey: String(payload.syncWorkspaceKey || nextState.settings.cloudSync.workspaceKey || "").trim(),
    pollIntervalSeconds: toNumber(payload.syncPollIntervalSeconds, nextState.settings.cloudSync.pollIntervalSeconds || 20),
    lastError: nextState.settings.cloudSync.lastError || "",
    lastSyncedAt: nextState.settings.cloudSync.lastSyncedAt || "",
    lastPulledAt: nextState.settings.cloudSync.lastPulledAt || "",
    deviceId: nextState.settings.cloudSync.deviceId || "",
  };
  touchSettingsState(nextState);
  pushHistory(nextState, "settings", "Configuracoes atualizadas.");
  return nextState;
}

export function setSelectedProject(state, projectId) {
  const nextState = cloneState(state);
  if (!nextState.projects.some((project) => project.id === projectId)) {
    return nextState;
  }
  nextState.ui.selectedProjectId = projectId;
  return nextState;
}

export function createProjectFromTemplate(state, templateId) {
  const nextState = cloneState(state);
  const template = getProjectTemplate(templateId);
  const project = normalizeProjectPayload({
    name: template.label,
    templateId: template.id,
    areaId: template.areaId,
    projectType: template.projectType,
    color: template.color,
    summary: template.summary,
    description: template.description,
    objective: template.objective,
    infoLinks: template.infoLinks,
    referenceEntries: template.referenceEntries,
    observationLines: template.observationLines,
    decisionLines: template.decisionLines,
    okrs: template.okrs,
    backlogItems: template.backlogItems,
    baseActivities: template.baseActivities,
    actionPlan: template.actionPlan,
    status: "active",
    priority: "medium",
    sprintId: "",
  }, null);

  nextState.projects.push(project);
  nextState.ui.selectedProjectId = project.id;
  pushHistory(nextState, "project-template", `Projeto criado a partir do template ${template.label}.`);
  return nextState;
}

function findProjectSourceEntry(project, sourceType, entryId) {
  const sourceMap = {
    backlog: project.backlogItems || [],
    base: project.baseActivities || [],
    action: project.actionPlan || [],
    okr: project.okrs || [],
  };

  const entries = sourceMap[sourceType] || [];
  return entries.find((entry) => entry.id === entryId) || null;
}

export function generateTaskFromProjectSource(state, projectId, sourceType, entryId) {
  const nextState = cloneState(state);
  const project = nextState.projects.find((entry) => entry.id === projectId);
  if (!project) {
    return { nextState, message: "Projeto nao encontrado." };
  }

  const sourceEntry = findProjectSourceEntry(project, sourceType, entryId);
  if (!sourceEntry) {
    return { nextState, message: "Item do projeto nao encontrado." };
  }

  const payloadBySource = {
    backlog: {
      title: sourceEntry.title,
      subtasks: [],
      nextAction: sourceEntry.notes || "",
      notes: `Gerada do backlog do projeto ${project.name}.${sourceEntry.notes ? ` ${sourceEntry.notes}` : ""}`.trim(),
      finalBucket: "backlog",
      priority: project.priority || "medium",
      estimatedMinutes: 20,
      context: "planning",
    },
    base: {
      title: sourceEntry.title,
      subtasks: sourceEntry.checklist || [],
      nextAction: sourceEntry.checklist?.[0] || "",
      notes: `Gerada das atividades base do projeto ${project.name}.`,
      finalBucket: sourceEntry.bucket || "priority",
      priority: sourceEntry.priority || project.priority || "medium",
      estimatedMinutes: sourceEntry.estimatedMinutes || 30,
      context: sourceEntry.context || "flex",
    },
    action: {
      title: sourceEntry.title,
      subtasks: sourceEntry.checklist || [],
      nextAction: sourceEntry.nextAction || sourceEntry.checklist?.[0] || "",
      notes: `Gerada do plano de acao do projeto ${project.name}.`,
      finalBucket: sourceEntry.bucket || "priority",
      priority: project.priority || "medium",
      estimatedMinutes: 35,
      context: "planning",
    },
    okr: {
      title: sourceEntry.title,
      subtasks: sourceEntry.keyResults || [],
      nextAction: sourceEntry.keyResults?.[0] || "",
      notes: `Gerada a partir do OKR do projeto ${project.name}.`,
      finalBucket: "priority",
      priority: project.priority || "high",
      estimatedMinutes: 30,
      context: "planning",
    },
  };

  const taskSeed = payloadBySource[sourceType];
  if (!taskSeed) {
    return { nextState, message: "Origem do projeto nao suportada." };
  }

  const task = normalizeTaskPayload(nextState, {
    ...taskSeed,
    areaId: project.areaId,
    projectId: project.id,
    sprintId: project.sprintId || "",
    status: "todo",
    location: "captured",
    source: "project",
    gtdDecision: "Processar",
    priorityMode: "auto",
  }, null);

  nextState.tasks.unshift(task);
  pushHistory(nextState, "project-task", `Tarefa gerada do projeto ${project.name}: ${task.title}.`);
  return {
    nextState,
    task,
    message: "Tarefa gerada do projeto e enviada para Organizar.",
  };
}

export function saveCurrentLayoutAsDefault(state, page = "") {
  const nextState = cloneState(state);
  const targetPage = page && nextState.settings.layouts[page]
    ? page
    : (nextState.settings.layouts[nextState.ui.activeSection] ? nextState.ui.activeSection : "");

  if (targetPage) {
    nextState.settings.layoutDefaults[targetPage] = ensureLayoutFrames(cloneValue(nextState.settings.layouts[targetPage]));
    touchSettingsState(nextState);
    pushHistory(nextState, "layout-default", `Layout padrao salvo para ${targetPage}.`);
    return nextState;
  }

  nextState.settings.layoutDefaults = cloneLayouts(nextState.settings.layouts);
  touchSettingsState(nextState);
  pushHistory(nextState, "layout-default", "Layout atual salvo como padrao.");
  return nextState;
}

export function restoreLayoutDefault(state, page = "") {
  const nextState = cloneState(state);
  const targetPage = page && nextState.settings.layoutDefaults[page]
    ? page
    : (nextState.settings.layoutDefaults[nextState.ui.activeSection] ? nextState.ui.activeSection : "");

  if (targetPage) {
    nextState.settings.layouts[targetPage] = ensureLayoutFrames(cloneValue(nextState.settings.layoutDefaults[targetPage]));
    touchSettingsState(nextState);
    pushHistory(nextState, "layout-restore", `Layout padrao restaurado para ${targetPage}.`);
    return nextState;
  }

  nextState.settings.layouts = cloneLayouts(nextState.settings.layoutDefaults || DEFAULT_LAYOUTS);
  touchSettingsState(nextState);
  pushHistory(nextState, "layout-restore", "Layout padrao restaurado.");
  return nextState;
}

export function moveLayoutCard(state, page, cardId, targetId) {
  const nextState = cloneState(state);
  const cards = [...(nextState.settings.layouts[page] || [])];
  const fromIndex = cards.findIndex((entry) => entry.id === cardId);
  const toIndex = cards.findIndex((entry) => entry.id === targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return nextState;
  const [entry] = cards.splice(fromIndex, 1);
  cards.splice(toIndex, 0, entry);
  nextState.settings.layouts[page] = cards;
  touchSettingsState(nextState);
  pushHistory(nextState, "layout-move", `Card movido em ${page}: ${cardId}.`);
  return nextState;
}

export function resizeLayoutCard(state, page, cardId, dimension, direction) {
  const nextState = cloneState(state);
  const entry = nextState.settings.layouts[page]?.find((item) => item.id === cardId);
  if (!entry) return nextState;

  if (dimension === "width") {
    entry.width = stepLayoutValue(entry.width, LAYOUT_WIDTH_ORDER, direction, "medium");
  }

  if (dimension === "height") {
    entry.height = stepLayoutValue(entry.height, LAYOUT_HEIGHT_ORDER, direction, "regular");
  }

  const nextSize = getFreeformFrameSize(entry);
  entry.frame = {
    ...(entry.frame || {}),
    w: nextSize.width,
    h: nextSize.height,
    x: Number.isFinite(entry.frame?.x) ? entry.frame.x : 0,
    y: Number.isFinite(entry.frame?.y) ? entry.frame.y : 0,
    z: Number.isFinite(entry.frame?.z) ? entry.frame.z : 1,
  };

  touchSettingsState(nextState);
  pushHistory(nextState, "layout-resize", `Card redimensionado em ${page}: ${cardId}.`, { dimension, direction });
  return nextState;
}

export function nudgeLayoutCard(state, page, cardId, axis, direction) {
  const nextState = cloneState(state);
  const entry = nextState.settings.layouts[page]?.find((item) => item.id === cardId);
  if (!entry) return nextState;

  const nextSize = getFreeformFrameSize(entry);
  entry.frame = {
    ...(entry.frame || {}),
    w: nextSize.width,
    h: nextSize.height,
    x: Number.isFinite(entry.frame?.x) ? entry.frame.x : 0,
    y: Number.isFinite(entry.frame?.y) ? entry.frame.y : 0,
    z: Number.isFinite(entry.frame?.z) ? entry.frame.z : 1,
  };

  const delta = direction === "increase" ? 28 : -28;
  if (axis === "x") {
    entry.frame.x = Math.max(0, entry.frame.x + delta);
  }
  if (axis === "y") {
    entry.frame.y = Math.max(0, entry.frame.y + delta);
  }

  touchSettingsState(nextState);
  pushHistory(nextState, "layout-nudge", `Posicao do bloco ajustada em ${page}: ${cardId}.`, { axis, direction });
  return nextState;
}

export function layerLayoutCard(state, page, cardId, direction) {
  const nextState = cloneState(state);
  const entry = nextState.settings.layouts[page]?.find((item) => item.id === cardId);
  if (!entry) return nextState;

  const nextSize = getFreeformFrameSize(entry);
  entry.frame = {
    ...(entry.frame || {}),
    w: nextSize.width,
    h: nextSize.height,
    x: Number.isFinite(entry.frame?.x) ? entry.frame.x : 0,
    y: Number.isFinite(entry.frame?.y) ? entry.frame.y : 0,
    z: Number.isFinite(entry.frame?.z) ? entry.frame.z : 1,
  };
  entry.frame.z = clamp(entry.frame.z + (direction === "increase" ? 1 : -1), 1, 30);
  touchSettingsState(nextState);
  pushHistory(nextState, "layout-layer", `Camada do bloco ajustada em ${page}: ${cardId}.`, { direction });
  return nextState;
}

export function saveGoogleCalendarConfig(state, config) {
  const nextState = cloneState(state);
  nextState.settings.googleCalendar = {
    clientId: config.clientId || "",
    apiKey: config.apiKey || "",
    calendarId: config.calendarId || "primary",
  };
  nextState.calendar.calendarId = nextState.settings.googleCalendar.calendarId;
  touchSettingsState(nextState);
  return nextState;
}

export function setCalendarConnected(state, connected) {
  const nextState = cloneState(state);
  nextState.calendar.connected = connected;
  return nextState;
}

export function applyGoogleBusyBlocks(state, blocks) {
  const nextState = cloneState(state);
  nextState.calendar.externalBusyBlocks = blocks;
  nextState.calendar.connected = true;
  pushHistory(nextState, "calendar-sync", `${blocks.length} bloco(s) sincronizado(s) do Google Calendar.`);
  return nextState;
}

export function getInternalBlockDateTime(block) {
  return {
    start: createLocalDateTime(block.date, block.startTime),
    end: createLocalDateTime(block.date, block.endTime),
  };
}


