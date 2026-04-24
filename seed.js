import {
  addDays,
  formatISODate,
  getQuarterLabel,
  getWeekDates,
} from "./date.js";

function task(overrides) {
  const now = new Date().toISOString();

  return {
    id: overrides.id,
    title: overrides.title,
    subtasks: overrides.subtasks || [],
    completedSubtasks: overrides.completedSubtasks || [],
    areaId: overrides.areaId,
    projectId: overrides.projectId || "",
    objectiveId: overrides.objectiveId || "",
    sprintId: overrides.sprintId || "",
    type: overrides.type || "task",
    context: overrides.context || "flex",
    scheduledPeriod: overrides.scheduledPeriod || "afternoon",
    status: overrides.status || "todo",
    location: overrides.location || "scheduled",
    scheduledDate: overrides.scheduledDate || "",
    dueDate: overrides.dueDate || overrides.scheduledDate || "",
    estimatedMinutes: Number(overrides.estimatedMinutes || 30),
    priority: overrides.priority || "medium",
    impact: Number(overrides.impact || 3),
    urgency: Number(overrides.urgency || 3),
    effort: Number(overrides.effort || 3),
    energyCost: Number(overrides.energyCost || 2),
    nextAction: overrides.nextAction || "",
    gtdStage: overrides.gtdStage || "clarify",
    gtdDecision: overrides.gtdDecision || "Executar",
    finalBucket: overrides.finalBucket || "priority",
    priorityMode: overrides.priorityMode || "auto",
    frog: overrides.frog || "",
    scoreAdjustment: Number(overrides.scoreAdjustment || 0),
    notes: overrides.notes || "",
    isRecurring: Boolean(overrides.isRecurring),
    isTemplate: Boolean(overrides.isTemplate),
    delegable: Boolean(overrides.delegable),
    critical: Boolean(overrides.critical),
    manualDecision: Boolean(overrides.manualDecision),
    riskAccepted: Boolean(overrides.riskAccepted),
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    completedAt: overrides.completedAt || "",
    source: overrides.source || "seed",
    lastAction: overrides.lastAction || "",
    checklistOrder: Number(overrides.checklistOrder || 0),
  };
}

function block(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    areaId: overrides.areaId,
    projectId: overrides.projectId || "",
    date: overrides.date,
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    period: overrides.period || "afternoon",
    kind: overrides.kind || "routine",
    fixed: overrides.fixed !== false,
    note: overrides.note || "",
    source: overrides.source || "seed",
  };
}

function routine(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    period: overrides.period,
    areaId: overrides.areaId || "area-routine",
    order: Number(overrides.order || 1),
    active: overrides.active !== false,
    recurring: overrides.recurring !== false,
    note: overrides.note || "",
    logs: overrides.logs || [],
  };
}

function habit(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    areaId: overrides.areaId || "area-health",
    targetPerWeek: Number(overrides.targetPerWeek || 3),
    preferredWeekdays: overrides.preferredWeekdays || [],
    logs: overrides.logs || [],
    note: overrides.note || "",
  };
}

function log(date, done) {
  return { date, done };
}

function weightEntry(overrides) {
  return {
    id: overrides.id,
    date: overrides.date,
    weight: Number(overrides.weight || 0),
    note: overrides.note || "",
  };
}

function measureEntry(overrides) {
  return {
    id: overrides.id,
    date: overrides.date,
    waist: Number(overrides.waist || 0),
    chest: Number(overrides.chest || 0),
    hip: Number(overrides.hip || 0),
    arm: Number(overrides.arm || 0),
    thigh: Number(overrides.thigh || 0),
    note: overrides.note || "",
  };
}

function careItem(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    note: overrides.note || "",
    logs: overrides.logs || [],
  };
}

function workoutEntry(overrides) {
  return {
    id: overrides.id,
    date: overrides.date,
    title: overrides.title,
    type: overrides.type || "casa",
    duration: Number(overrides.duration || 30),
    status: overrides.status || "planned",
    note: overrides.note || "",
  };
}

function dietMeal(overrides) {
  return {
    id: overrides.id,
    mealKey: overrides.mealKey,
    title: overrides.title,
    plan: overrides.plan || "",
    checklist: overrides.checklist || [],
    note: overrides.note || "",
    logs: overrides.logs || [],
  };
}

function weekBlocks(weekDates) {
  const blocks = [];

  weekDates.forEach((date, index) => {
    blocks.push(
      block({
        id: `block-morning-${date}`,
        title: "Manha de filhos, casa e respostas rapidas",
        areaId: "area-routine",
        date,
        startTime: "07:00",
        endTime: "11:30",
        period: "morning",
        kind: "morning-base",
      }),
    );

    if (index < 5) {
      blocks.push(
        block({
          id: `block-deep-${date}`,
          title: "Trabalho profundo",
          areaId: "area-work",
          date,
          startTime: "13:00",
          endTime: "17:00",
          period: "afternoon",
          kind: "deep-work",
        }),
      );

      blocks.push(
        block({
          id: `block-night-${date}`,
          title: "Trabalho complementar",
          areaId: "area-work",
          date,
          startTime: "22:00",
          endTime: "23:59",
          period: "night",
          kind: "second-shift",
        }),
      );
    }
  });

  blocks.push(
    block({
      id: `block-soccer-${weekDates[2]}`,
      title: "Futebol e social",
      areaId: "area-health",
      date: weekDates[2],
      startTime: "19:30",
      endTime: "21:30",
      period: "night",
      kind: "soccer",
    }),
  );

  blocks.push(
    block({
      id: `block-soccer-${weekDates[4]}`,
      title: "Futebol",
      areaId: "area-health",
      date: weekDates[4],
      startTime: "19:30",
      endTime: "23:00",
      period: "night",
      kind: "soccer",
    }),
  );

  blocks.push(
    block({
      id: `block-saturday-${weekDates[5]}`,
      title: "Sabado de conteudo e projetos",
      areaId: "area-work",
      date: weekDates[5],
      startTime: "10:00",
      endTime: "12:30",
      period: "morning",
      kind: "creative-block",
    }),
  );

  blocks.push(
    block({
      id: `block-sunday-${weekDates[6]}`,
      title: "Revisao leve da semana",
      areaId: "area-routine",
      date: weekDates[6],
      startTime: "18:00",
      endTime: "18:45",
      period: "night",
      kind: "review",
    }),
  );

  return blocks;
}

const REASONING_BASE = `Quero que o sistema pense pela minha vida real, nao por um modelo generico de produtividade. Entrada precisa ser simples: eu capturo rapido e o sistema interpreta area, projeto, urgencia, proxima acao e relacao com o sprint atual antes de mandar para Organizar. Clareza vem antes da execucao: nenhuma tarefa entra no fluxo sem uma proxima acao clara. Quando uma tarefa tiver checklist, esse checklist deve virar base de entendimento e refinamento automatico. Prioridade deve considerar impacto real na vida, impacto financeiro, consequencia de nao fazer, crescimento dos projetos, estabilidade futura e protecao da mudanca. Saude, rotina, filhos, familia, casa, alimentacao e treino sao base estrutural e nao devem ser sacrificados sempre pelo trabalho. Trabalho deve gerar resultado, previsibilidade e avancos reais, nao so ocupacao. O sistema deve evitar sobrecarga artificial, preferindo poucas tarefas bem executadas. Deve respeitar a rotina real: manha operacional e familiar, tarde de trabalho profundo, noite complementar, quarta e sexta com futebol, sabado para conteudo e projetos, domingo leve e dias de viagem com capacidade reduzida. O sprint atual deve influenciar o peso das novas tarefas: o que conversa com o sprint sobe, o que nao conversa e nao e urgente pode ir para backlog ou esperar melhor momento. Tarefas grandes devem ser quebradas em proximas acoes menores. Delegar e estrategico quando fizer sentido. Backlog nao e deposito infinito e precisa de limpeza constante. Habitos, saude, dieta e rotina precisam aparecer como execucao diaria e acompanhamento semanal manual. A frente do sistema deve continuar simples: Fazer agora, Prioridade, Agendar, Delegar, Aguardar e Backlog. Alertas criticos precisam ficar visiveis e persistentes em dias de baixa capacidade. O sistema sugere automaticamente com base nessa logica, mas eu continuo com a decisao final.`;

export function buildSeedState(baseDate = new Date()) {
  const today = formatISODate(baseDate);
  const tomorrow = formatISODate(addDays(today, 1));
  const plus2 = formatISODate(addDays(today, 2));
  const plus3 = formatISODate(addDays(today, 3));
  const plus4 = formatISODate(addDays(today, 4));
  const minus1 = formatISODate(addDays(today, -1));
  const minus2 = formatISODate(addDays(today, -2));
  const weekDates = getWeekDates(today);
  const [monday, tuesday, wednesday, thursday, friday, saturday, sunday] = weekDates;
  const currentQuarter = getQuarterLabel(today);

  const areas = [
    { id: "area-work", name: "Trabalho", type: "work", color: "#8b6c50", description: "Projetos, receita e entregas." },
    { id: "area-personal", name: "Pessoal", type: "life", color: "#8f7a62", description: "Vida pessoal e clareza mental." },
    { id: "area-health", name: "Saude", type: "life", color: "#718d6c", description: "Treino, alimentacao e energia." },
    { id: "area-family", name: "Filhos / Familia", type: "life", color: "#9a8652", description: "Filhos, escola e presenca real." },
    { id: "area-home", name: "Casa", type: "life", color: "#90765f", description: "Casa e operacao pratica." },
    { id: "area-move", name: "Mudanca", type: "life", color: "#a97249", description: "Transicao ate novembro." },
    { id: "area-routine", name: "Rotina", type: "life", color: "#7a8190", description: "Ritmo, revisoes e checklists." },
    { id: "area-finance", name: "Financeiro pessoal", type: "life", color: "#6d876f", description: "Reserva, custos e seguranca pessoal." },
  ];

  const projects = [
    { id: "project-assessoria", name: "Assessoria", areaId: "area-work", status: "active", color: "#8b6c50", summary: "Clientes e follow-up com impacto financeiro." },
    { id: "project-financeira", name: "Financeira", areaId: "area-work", status: "active", color: "#6e7f93", summary: "Analise, briefing e revisoes mais densas." },
    { id: "project-conteudo", name: "Conteudo / Movimento / Comunicacao", areaId: "area-work", status: "active", color: "#8d6d7d", summary: "Posicionamento e tracao futura." },
  ];

  const objectives = [
    { id: "objective-move", title: "Chegar em novembro com a mudanca resolvida", areaId: "area-move", projectId: "", progress: 34, dueDate: "2026-11-01", description: "Lugar, custos e estrutura de trabalho definidos." },
    { id: "objective-health", title: "Criar consistencia de saude e energia", areaId: "area-health", projectId: "", progress: 29, dueDate: "2026-12-31", description: "Treinar, comer melhor e reduzir caos." },
    { id: "objective-work", title: "Manter os projetos de trabalho previsiveis", areaId: "area-work", projectId: "", progress: 46, dueDate: "2026-12-31", description: "Menos retrabalho, mais resultado real." },
    { id: "objective-routine", title: "Criar uma semana mais leve e organizada", areaId: "area-routine", projectId: "", progress: 41, dueDate: "2026-12-15", description: "Separar decisao, visao e execucao." },
  ];

  const sprints = [
    {
      id: "sprint-1-2026",
      slot: 1,
      title: "Sprint 1",
      periodLabel: "Jan-Mar 2026",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      status: "planned",
      description: "Base do ano, limpeza inicial e estabilidade da rotina.",
      theme: "Base do ano, limpeza inicial e estabilidade da rotina.",
      objectiveIds: ["objective-routine", "objective-work"],
      projectIds: ["project-assessoria"],
      priorityAreas: ["area-routine", "area-work"],
      priorities: ["limpar backlog antigo", "organizar rotina da semana", "ganhar previsibilidade no trabalho"],
      keywords: ["rotina", "backlog", "organizacao", "cliente"],
    },
    {
      id: "sprint-2-2026",
      slot: 2,
      title: "Sprint 2",
      periodLabel: "Abr-Jun 2026",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      status: "current",
      description: "Clareza, saude e estrutura do app junto da preparacao da mudanca.",
      theme: "Clareza, saude e estrutura do app junto da preparacao da mudanca.",
      objectiveIds: ["objective-move", "objective-health", "objective-work", "objective-routine"],
      projectIds: ["project-assessoria", "project-conteudo"],
      priorityAreas: ["area-health", "area-move", "area-routine", "area-work"],
      priorities: ["proteger treino em casa", "estruturar o Life OS", "mapear custos da mudanca", "limpar backlog dos projetos"],
      keywords: ["saude", "treino", "mudanca", "life os", "organizar semana", "conteudo"],
    },
    {
      id: "sprint-3-2026",
      slot: 3,
      title: "Sprint 3",
      periodLabel: "Jul-Set 2026",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      status: "upcoming",
      description: "Escolha da nova base e consolidacao do espaco de trabalho.",
      theme: "Escolha da nova base e consolidacao do espaco de trabalho.",
      objectiveIds: ["objective-move", "objective-work"],
      projectIds: ["project-financeira", "project-assessoria"],
      priorityAreas: ["area-move", "area-work", "area-finance"],
      priorities: ["shortlist de imoveis", "plano financeiro validado", "estrutura do novo escritorio"],
      keywords: ["imovel", "aluguel", "espaco de trabalho", "financeiro"],
    },
    {
      id: "sprint-4-2026",
      slot: 4,
      title: "Sprint 4",
      periodLabel: "Out-Dez 2026",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      status: "planned",
      description: "Mudanca executada, consolidacao da nova base e ritmo sustentavel.",
      theme: "Mudanca executada, consolidacao da nova base e ritmo sustentavel.",
      objectiveIds: ["objective-move", "objective-health", "objective-work"],
      projectIds: ["project-conteudo", "project-financeira"],
      priorityAreas: ["area-move", "area-health", "area-work"],
      priorities: ["executar a mudanca", "estabilizar a nova casa", "manter projetos rodando sem caos"],
      keywords: ["mudanca", "estabilizar", "nova casa", "ritmo"],
    },
  ];

  const routines = {
    morning: [
      routine({ id: "routine-morning-1", title: "Filhos, escola, banho e casa", period: "morning", areaId: "area-family", order: 1 }),
      routine({ id: "routine-morning-2", title: "Responder clientes prioritarios", period: "morning", areaId: "area-work", order: 2 }),
      routine({ id: "routine-morning-3", title: "Definir 3 prioridades reais do dia", period: "morning", areaId: "area-routine", order: 3 }),
    ],
    night: [
      routine({ id: "routine-night-1", title: "Fechar pontas soltas", period: "night", areaId: "area-routine", order: 1 }),
      routine({ id: "routine-night-2", title: "Registrar energia, treino ou peso", period: "night", areaId: "area-health", order: 2 }),
      routine({ id: "routine-night-3", title: "Preparar a manha seguinte", period: "night", areaId: "area-family", order: 3 }),
    ],
  };

  const habits = [
    habit({ id: "habit-water", title: "Beber 2,5L de agua", targetPerWeek: 7, preferredWeekdays: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"], logs: [log(minus2, true), log(minus1, true), log(today, true)] }),
    habit({ id: "habit-workout", title: "Treinar em casa", targetPerWeek: 3, preferredWeekdays: ["segunda", "terca", "quinta"], logs: [log(minus2, true), log(today, false)] }),
    habit({ id: "habit-food", title: "Almoco com proteina e legumes", targetPerWeek: 5, preferredWeekdays: ["segunda", "terca", "quarta", "quinta", "sexta"], logs: [log(minus1, true), log(today, false)] }),
  ];

  const health = {
    weightLogs: [
      weightEntry({ id: "weight-1", date: minus2, weight: 97.4, note: "Inicio de acompanhamento" }),
      weightEntry({ id: "weight-2", date: minus1, weight: 97.1, note: "Dia bom de rotina" }),
      weightEntry({ id: "weight-3", date: today, weight: 96.8, note: "Peso da manha" }),
    ],
    measureLogs: [
      measureEntry({ id: "measure-1", date: minus2, waist: 104, chest: 111, hip: 103, arm: 36, thigh: 62, note: "Base inicial" }),
      measureEntry({ id: "measure-2", date: today, waist: 103, chest: 111, hip: 102.5, arm: 36, thigh: 62, note: "Revisao da semana" }),
    ],
    careItems: [
      careItem({ id: "care-water", title: "Beber agua", note: "Meta 2,5L", logs: [log(minus1, true), log(today, true)] }),
      careItem({ id: "care-supplement", title: "Tomar suplemento", note: "Pela manha", logs: [log(minus1, true), log(today, false)] }),
      careItem({ id: "care-stretch", title: "Alongamento rapido", note: "5 a 10 min", logs: [log(minus1, false), log(today, false)] }),
    ],
    workouts: [
      workoutEntry({ id: "workout-1", date: minus2, title: "Treino A em casa", type: "casa", duration: 38, status: "done", note: "Bom ritmo" }),
      workoutEntry({ id: "workout-2", date: tuesday, title: "Treino B em casa", type: "casa", duration: 40, status: "planned", note: "Preferencial antes da noite" }),
    ],
    dietMeals: [
      dietMeal({ id: "diet-breakfast", mealKey: "breakfast", title: "Cafe da manha", plan: "Proteina + fruta + cafe", checklist: ["proteina", "fruta"], logs: [log(today, true)] }),
      dietMeal({ id: "diet-lunch", mealKey: "lunch", title: "Almoco", plan: "Proteina + legumes + arroz", checklist: ["proteina", "legumes"], logs: [log(today, false)] }),
      dietMeal({ id: "diet-dinner", mealKey: "dinner", title: "Janta", plan: "Refeicao leve e organizada", checklist: ["evitar excesso", "fechar cedo"], logs: [log(today, false)] }),
      dietMeal({ id: "diet-snack", mealKey: "snack", title: "Lanches", plan: "Fruta ou iogurte", checklist: ["evitar impulso"], logs: [log(today, false)] }),
    ],
  };

  const tasks = [
    task({ id: "task-review-week", title: "Fechar revisao semanal e foco principal", subtasks: ["listar o que concluiu", "mover atrasos", "escolher foco da semana"], areaId: "area-routine", objectiveId: "objective-routine", sprintId: "sprint-q2-2026", type: "review", context: "planning", scheduledDate: today, scheduledPeriod: "night", dueDate: today, estimatedMinutes: 45, priority: "high", impact: 5, urgency: 4, effort: 2, nextAction: "abrir a semana e decidir o que entra e o que sai", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now", critical: true, isRecurring: true }),
    task({ id: "task-move-costs", title: "Fechar mapa de custos da mudanca", subtasks: ["levantamento de aluguel", "somar frete e internet", "definir reserva minima"], areaId: "area-move", objectiveId: "objective-move", sprintId: "sprint-q2-2026", type: "strategic", context: "deep-work", scheduledDate: today, scheduledPeriod: "afternoon", dueDate: plus2, estimatedMinutes: 90, priority: "high", impact: 5, urgency: 4, effort: 4, nextAction: "abrir a planilha e fechar a primeira versao dos custos", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "priority" }),
    task({ id: "task-assessoria-proposal", title: "Fechar proposta importante da Assessoria", subtasks: ["validar escopo", "revisar valores", "enviar proposta final"], areaId: "area-work", projectId: "project-assessoria", objectiveId: "objective-work", sprintId: "sprint-q2-2026", type: "strategic", context: "deep-work", scheduledDate: today, scheduledPeriod: "afternoon", dueDate: today, estimatedMinutes: 105, priority: "high", impact: 5, urgency: 5, effort: 4, nextAction: "abrir a ultima versao e ajustar os pontos finais", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now", critical: true }),
    task({ id: "task-family-week", title: "Preparar agenda e materiais dos filhos", areaId: "area-family", objectiveId: "objective-routine", type: "family", context: "home", scheduledDate: today, scheduledPeriod: "morning", dueDate: today, estimatedMinutes: 25, priority: "medium", impact: 4, urgency: 4, effort: 1, nextAction: "separar mochila, uniforme e recados", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now" }),
    task({ id: "task-health-check", title: "Registrar peso e cintura", areaId: "area-health", objectiveId: "objective-health", sprintId: "sprint-q2-2026", type: "health", context: "health", scheduledDate: today, scheduledPeriod: "morning", dueDate: today, estimatedMinutes: 15, priority: "medium", impact: 3, urgency: 2, effort: 1, nextAction: "medir e registrar no historico", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "priority", isRecurring: true }),
    task({ id: "task-financeira-overdue", title: "Revisar briefing atrasado da Financeira", subtasks: ["ler pendencias abertas", "definir resposta objetiva"], areaId: "area-work", projectId: "project-financeira", objectiveId: "objective-work", sprintId: "sprint-q2-2026", type: "work", context: "deep-work", scheduledDate: minus2, scheduledPeriod: "afternoon", dueDate: minus1, estimatedMinutes: 65, priority: "high", impact: 5, urgency: 5, effort: 3, nextAction: "abrir o briefing atrasado e fechar o proximo passo", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "priority", manualDecision: true, critical: true }),
    task({ id: "task-train-a", title: "Treino A em casa", areaId: "area-health", objectiveId: "objective-health", sprintId: "sprint-q2-2026", type: "health", context: "health", scheduledDate: tomorrow, scheduledPeriod: "night", dueDate: tomorrow, estimatedMinutes: 40, priority: "medium", impact: 4, urgency: 3, effort: 2, nextAction: "separar halteres e iniciar treino", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule", isRecurring: true }),
    task({ id: "task-home-simplify", title: "Separar excesso da casa em doar, vender e levar", subtasks: ["esvaziar um armario", "marcar o que sai", "deixar pilhas prontas"], areaId: "area-home", objectiveId: "objective-move", type: "home", context: "home", scheduledDate: tomorrow, scheduledPeriod: "morning", dueDate: plus4, estimatedMinutes: 60, priority: "medium", impact: 4, urgency: 2, effort: 3, nextAction: "atacar o primeiro armario e separar em tres grupos", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule" }),
    task({ id: "task-finance-map", title: "Conferir contas pessoais e reserva da mudanca", areaId: "area-finance", objectiveId: "objective-move", type: "finance", context: "admin", scheduledDate: tomorrow, scheduledPeriod: "night", dueDate: plus2, estimatedMinutes: 35, priority: "medium", impact: 4, urgency: 4, effort: 1, nextAction: "abrir contas e atualizar valor disponivel", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule" }),
    task({ id: "task-visit-imoveis", title: "Mapear 3 opcoes de imovel com espaco de trabalho", subtasks: ["filtrar bairros", "salvar tres opcoes", "anotar custo e espaco"], areaId: "area-move", objectiveId: "objective-move", sprintId: "sprint-q2-2026", type: "strategic", context: "deep-work", scheduledDate: thursday, scheduledPeriod: "afternoon", dueDate: plus4, estimatedMinutes: 95, priority: "high", impact: 5, urgency: 4, effort: 4, nextAction: "abrir pesquisa e montar shortlist inicial", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "priority" }),
    task({ id: "task-content-roteiro", title: "Definir roteiro do proximo conteudo", subtasks: ["escolher tema", "escrever estrutura", "definir CTA"], areaId: "area-work", projectId: "project-conteudo", objectiveId: "objective-work", type: "creative", context: "creative", scheduledDate: saturday, scheduledPeriod: "afternoon", dueDate: saturday, estimatedMinutes: 70, priority: "medium", impact: 4, urgency: 3, effort: 3, nextAction: "abrir notas e montar o esqueleto do conteudo", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule" }),
    task({ id: "task-inbox-field", title: "Possivel visita externa com deslocamento", areaId: "area-work", projectId: "project-assessoria", type: "visit", context: "outside", status: "inbox", location: "inbox", dueDate: plus2, estimatedMinutes: 90, priority: "medium", impact: 4, urgency: 3, effort: 3, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog", notes: "Ainda precisa decidir o dia e o impacto na semana." }),
    task({ id: "task-inbox-boxes", title: "Comprar caixas organizadoras para a mudanca", areaId: "area-move", type: "move", context: "street", status: "inbox", location: "inbox", dueDate: plus4, estimatedMinutes: 40, priority: "medium", impact: 3, urgency: 2, effort: 1, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog" }),
    task({ id: "task-inbox-idea", title: "Anotar ideia de conteudo para o Movimento", areaId: "area-work", projectId: "project-conteudo", type: "idea", context: "creative", status: "inbox", location: "inbox", estimatedMinutes: 15, priority: "low", impact: 2, urgency: 1, effort: 1, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog" }),
    task({ id: "task-backlog-clean", title: "Limpar backlog dos projetos de trabalho", areaId: "area-work", objectiveId: "objective-work", sprintId: "sprint-q2-2026", type: "planning", context: "planning", status: "backlog", location: "backlog", dueDate: plus4, estimatedMinutes: 55, priority: "medium", impact: 4, urgency: 3, effort: 2, nextAction: "revisar backlog e descartar o que nao move resultado", gtdStage: "someday", gtdDecision: "Backlog", finalBucket: "backlog" }),
    task({ id: "task-move-docs", title: "Organizar documentos para negociacao de aluguel", areaId: "area-move", objectiveId: "objective-move", status: "backlog", location: "backlog", dueDate: plus4, estimatedMinutes: 45, priority: "high", impact: 5, urgency: 3, effort: 2, nextAction: "listar documentos obrigatorios", gtdStage: "someday", gtdDecision: "Backlog", finalBucket: "backlog" }),
    task({ id: "task-template-review", title: "Template - Revisao semanal", areaId: "area-routine", type: "template", context: "planning", status: "template", location: "template", estimatedMinutes: 45, priority: "high", impact: 4, urgency: 2, effort: 2, isTemplate: true, isRecurring: true, gtdStage: "template", gtdDecision: "Modelo", finalBucket: "backlog" }),
  ];

  const dayTypes = [
    { id: "normal", label: "Normal", percentage: 100, explanation: "Capacidade completa dentro da rotina padrao.", periodDefaults: { morning: "normal", afternoon: "normal", night: "normal" } },
    { id: "soccer", label: "Futebol", percentage: 80, explanation: "Protege a noite e reduz excesso.", periodDefaults: { morning: "normal", afternoon: "normal", night: "soccer" } },
    { id: "trip-short", label: "Viagem curta", percentage: 60, explanation: "Mantem poucas entregas e reduz deslocamento mental.", periodDefaults: { morning: "trip-short", afternoon: "trip-short", night: "trip-short" } },
    { id: "meeting", label: "Dia com reuniao", percentage: 40, explanation: "Capacidade menor por reunioes e interrupcoes.", periodDefaults: { morning: "normal", afternoon: "meeting", night: "normal" } },
    { id: "external", label: "Dia externo", percentage: 10, explanation: "Quase todo o dia vai para deslocamento ou campo.", periodDefaults: { morning: "external", afternoon: "external", night: "meeting" } },
    { id: "saturday", label: "Sabado", percentage: 80, explanation: "Bom para conteudo, revisao leve e projetos.", periodDefaults: { morning: "saturday", afternoon: "saturday", night: "meeting" } },
    { id: "sunday", label: "Domingo", percentage: 20, explanation: "Dia leve de descanso e revisao curta.", periodDefaults: { morning: "sunday", afternoon: "sunday", night: "sunday" } },
  ];

  return {
    meta: { appName: "Life OS Thz 2026", version: 5, seededAt: new Date().toISOString() },
    profile: {
      ownerName: "Thz",
      moveDeadline: "2026-11-01",
      phase: "Transicao pessoal em 2026 equilibrando vida, familia, saude, mudanca e tres projetos de trabalho.",
      routineWindows: { morning: "07:00-12:00", deepWork: "13:00-17:00", secondShift: "22:00-00:00" },
      notes: "O sistema precisa parecer calmo na frente e ser inteligente por tras.",
    },
  ui: {
    activeSection: "today",
    selectedDate: today,
    priorityMethod: "pipeline",
    checklistView: "all",
    filters: { scope: "integrated", areaId: "all", projectId: "all", context: "all", dayTypeId: "all" },
      editor: { kind: "", id: "" },
    },
    weeklyPlan: { energyLevel: 3, mainFocus: "Avancar na mudanca e nos projetos sem sacrificar saude e familia." },
    settings: {
      editMode: false,
      visualDensity: "calm",
      accentTone: "forest",
      layoutDefaults: {
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
      },
      layouts: {
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
      },
      layoutMode: "flex-grid",
      layoutCapabilities: { resizeEnabled: true, dragEnabled: true, futureFreeformReady: true },
      prioritization: { healthProtection: 1.1, moveProtection: 1.18, familyProtection: 1.08, futureFocus: 1.12, delegationBias: 1.05, overloadLimit: 0.92 },
      reasoningLine: REASONING_BASE,
      voiceAssistant: {
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
          { term: "saude", value: "area-health" },
        ],
        frequentAssociations: [
          { term: "gravar", target: { projectId: "project-conteudo", areaId: "area-work", context: "creative", intent: "create-task", destination: "project" } },
          { term: "cliente", target: { areaId: "area-work", context: "admin", intent: "create-task", destination: "inbox" } },
          { term: "peso", target: { areaId: "area-health", context: "health", intent: "register-weight", destination: "health" } },
          { term: "cintura", target: { areaId: "area-health", context: "health", intent: "register-measure", destination: "health" } },
        ],
        learnedPatterns: [],
        history: [],
      },
      googleCalendar: { clientId: "", apiKey: "", calendarId: "primary" },
      architecture: { workModuleMode: "embedded", futureApiReady: true },
    },
    areas,
    projects,
    objectives,
    sprints,
    routines,
    habits,
    health,
    tasks,
    blocks: weekBlocks(weekDates),
    dayTypes,
    dayOverrides: [
      { id: "override-tuesday", date: tuesday, typeId: "normal", periods: { morning: "normal", afternoon: "meeting", night: "normal" }, note: "Tarde com reunioes e alinhamentos.", lastPlan: null },
      { id: "override-wednesday", date: wednesday, typeId: "soccer", periods: { morning: "normal", afternoon: "normal", night: "soccer" }, note: "Futebol e social a noite.", lastPlan: null },
      { id: "override-friday", date: friday, typeId: "soccer", periods: { morning: "normal", afternoon: "normal", night: "soccer" }, note: "Futebol na sexta e capacidade menor a noite.", lastPlan: null },
    ],
    calendar: { provider: "google", connected: false, calendarId: "primary", externalBusyBlocks: [] },
    history: [{ id: "history-seed", type: "seed", createdAt: new Date().toISOString(), summary: "Seed criada com Dashboard, Hoje, Dias, Entrada, Priorizar, Organizar, Agenda e Configuracoes." }],
    references: { weekDates, today, monday, tuesday, wednesday, thursday, friday, saturday, sunday, tomorrow, plus2, plus3, plus4, currentQuarter },
  };
}

