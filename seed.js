import {
  addDays,
  formatISODate,
  getQuarterLabel,
  getWeekDates,
} from "./date.js";
import {
  STRATEGIC_SPRINTS_2026,
  buildStrategicSprintsSeed2026,
  getStrategicSprint2026ForDate,
} from "./strategic-sprints-2026.js";

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
    kind: overrides.kind || "scheduled-block",
    fixed: overrides.fixed !== false,
    note: overrides.note || "",
    source: overrides.source || "seed",
  };
}

function weekBlocks(weekDates) {
  const blocks = [];

  weekDates.forEach((date, index) => {
    blocks.push(
      block({
        id: `block-morning-${date}`,
        title: "Filhos, escola, casa e respostas rapidas",
        areaId: "area-family",
        date,
        startTime: "07:00",
        endTime: "11:30",
        period: "morning",
        kind: "family-base",
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
      areaId: "area-personal",
      date: weekDates[2],
      startTime: "19:30",
      endTime: "21:30",
      period: "night",
      kind: "soccer",
      note: "Protege a noite e reduz carga do resto do dia.",
    }),
  );

  blocks.push(
    block({
      id: `block-soccer-${weekDates[4]}`,
      title: "Futebol",
      areaId: "area-personal",
      date: weekDates[4],
      startTime: "19:30",
      endTime: "23:00",
      period: "night",
      kind: "soccer",
      note: "Noite curta para tarefas secundarias.",
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
      areaId: "area-personal",
      date: weekDates[6],
      startTime: "18:00",
      endTime: "18:45",
      period: "night",
      kind: "review",
    }),
  );

  return blocks;
}

const REASONING_BASE = `Quero que o sistema pense pela minha vida real, nao por um modelo generico de produtividade. Entrada precisa ser simples: eu capturo rapido e o sistema interpreta area, projeto, urgencia, proxima acao e relacao com o sprint atual antes de mandar para Organizar. Clareza vem antes da execucao: nenhuma tarefa entra no fluxo sem uma proxima acao clara. Quando uma tarefa tiver checklist, esse checklist deve virar base de entendimento e refinamento automatico. Prioridade deve considerar impacto real na vida, impacto financeiro, consequencia de nao fazer, crescimento dos projetos, estabilidade futura e protecao da mudanca. O sprint estrategico atual de 2026 precisa puxar a priorizacao: tarefas comerciais, de cliente, diagnostico, proposta, visita, receita, fechamento e entregas ligadas ao sprint atual sobem naturalmente. Neste ano, consistencia vem primeiro. Crescimento vem depois. Manha deve proteger casa, filhos, mensagens, respostas leves e urgencias curtas. Tarde deve favorecer execucao principal, comercial, reunioes, visitas, diagnosticos, juridico estrategico e trabalho profundo. Noite deve favorecer organizacao leve, planejamento, backlog, revisao do dia, ajustes de IA e preparacao do proximo dia. Se houver excesso de tarefas, o sistema deve esconder ou rebaixar temas com peso estrategico baixo. Trabalho, familia, casa, vida pessoal, mudanca e financeiro pessoal precisam conviver no mesmo sistema, sem modulos paralelos. O sistema deve evitar sobrecarga artificial, preferindo poucas tarefas bem executadas. Deve respeitar a rotina real: manha operacional e familiar, tarde de trabalho profundo, noite complementar, quarta e sexta com futebol, sabado para conteudo e projetos, domingo leve e dias de viagem com capacidade reduzida. O sprint atual deve influenciar o peso das novas tarefas: o que conversa com o sprint sobe, o que nao conversa e nao e urgente pode ir para backlog ou esperar melhor momento. Tarefas grandes devem ser quebradas em proximas acoes menores. Delegar e estrategico quando fizer sentido. Backlog nao e deposito infinito e precisa de limpeza constante. A frente do sistema deve continuar simples: Fazer agora, Prioridade, Agendar, Delegar, Aguardar e Backlog. Alertas criticos precisam ficar visiveis e persistentes em dias de baixa capacidade. O sistema sugere automaticamente com base nessa logica, mas eu continuo com a decisao final.`;

export function buildSeedState(baseDate = new Date()) {
  const today = formatISODate(baseDate);
  const tomorrow = formatISODate(addDays(today, 1));
  const plus2 = formatISODate(addDays(today, 2));
  const plus3 = formatISODate(addDays(today, 3));
  const plus4 = formatISODate(addDays(today, 4));
  const minus1 = formatISODate(addDays(today, -1));
  const minus2 = formatISODate(addDays(today, -2));
  const weekDates = getWeekDates(today);
  const [, tuesday, wednesday, thursday, friday, saturday] = weekDates;
  const currentQuarter = getQuarterLabel(today);
  const currentStrategicSprint = getStrategicSprint2026ForDate(today);
  const nextStrategicSprint = STRATEGIC_SPRINTS_2026.find((sprint) => sprint.startDate > today) || null;

  const areas = [
    { id: "area-work", name: "Trabalho", type: "work", color: "#5f7859", description: "Projetos, receita e entregas." },
    { id: "area-personal", name: "Pessoal", type: "life", color: "#8c8574", description: "Vida pessoal, clareza e operacao semanal." },
    { id: "area-family", name: "Filhos / Familia", type: "life", color: "#9a8652", description: "Filhos, escola e presenca real." },
    { id: "area-home", name: "Casa", type: "life", color: "#90765f", description: "Casa e operacao pratica." },
    { id: "area-move", name: "Mudanca", type: "life", color: "#8f6a47", description: "Transicao ate novembro." },
    { id: "area-finance", name: "Financeiro pessoal", type: "life", color: "#6d876f", description: "Reserva, custos e seguranca pessoal." },
  ];

  const projects = [
    {
      id: "project-assessoria",
      name: "Assessoria",
      areaId: "area-work",
      templateId: "client",
      projectType: "Projeto de cliente",
      status: "active",
      dueDate: formatISODate(addDays(today, 21)),
      priority: "high",
      sprintId: "sprint-2-2026",
      color: "#5f7859",
      summary: "Clientes e follow-up com impacto financeiro.",
      description: "Workspace para briefing, follow-up, contratos, decisoes e proxima entrega da Assessoria.",
      objective: "Manter o projeto previsivel, com entregas claras e follow-up forte.",
      infoLinks: [
        { label: "Drive da Assessoria", url: "https://drive.google.com/" },
        { label: "CRM / acompanhamento", url: "https://example.com/assessoria" },
      ],
      referenceEntries: [
        { label: "Checklist de proposta", url: "" },
        { label: "Historico de contratos", url: "" },
      ],
      observationLines: ["Clientes com impacto financeiro precisam de resposta rapida e objetiva."],
      decisionLines: ["Toda proposta grande precisa sair com checklist de validacao final."],
      freeNotes: "Priorizar clareza comercial e fechamento sem retrabalho.",
      okrs: [
        { id: "okr-assessoria-1", title: "Aumentar previsibilidade comercial", status: "active", progress: 56, keyResults: ["Fechar proposta principal", "Padronizar follow-up", "Reduzir travas no envio final"] },
      ],
      backlogItems: [
        { id: "backlog-assessoria-1", title: "Mapear novos clientes potenciais", notes: "Ainda nao entra na semana atual." },
        { id: "backlog-assessoria-2", title: "Revisar modelo padrao de proposta", notes: "Pode virar atividade base." },
      ],
      baseActivities: [
        { id: "base-assessoria-1", title: "Fechar proposta importante", checklist: ["revisar escopo", "validar valores", "preparar envio"], context: "deep-work", estimatedMinutes: 75, priority: "high", bucket: "priority" },
        { id: "base-assessoria-2", title: "Rodar follow-up de cliente", checklist: ["abrir historico", "definir mensagem", "registrar resposta"], context: "admin", estimatedMinutes: 25, priority: "medium", bucket: "priority" },
      ],
      actionPlan: [
        { id: "plan-assessoria-1", title: "Fechar proposta da semana", nextAction: "Abrir a versao atual da proposta e ajustar os ultimos pontos.", checklist: ["revisar documento", "validar preco", "enviar"], bucket: "priority" },
      ],
    },
    {
      id: "project-financeira",
      name: "Financeira",
      areaId: "area-work",
      templateId: "work",
      projectType: "Projeto de trabalho",
      status: "active",
      dueDate: formatISODate(addDays(today, 30)),
      priority: "high",
      sprintId: "sprint-2-2026",
      color: "#6e7f93",
      summary: "Analise, briefing e revisoes mais densas.",
      description: "Projeto para organizar briefing, revisoes e decisoes mais densas da Financeira.",
      objective: "Diminuir atrasos e deixar o projeto mais previsivel.",
      infoLinks: [
        { label: "Pasta Financeira", url: "https://drive.google.com/" },
      ],
      referenceEntries: [
        { label: "Briefing principal", url: "" },
      ],
      observationLines: ["Quando a Financeira atrasa, costuma travar toda a semana."],
      decisionLines: ["Tarefas grandes precisam ser quebradas antes de entrar no dia."],
      freeNotes: "Manter respostas objetivas e proxima acao clara.",
      okrs: [
        { id: "okr-financeira-1", title: "Reduzir gargalos de revisao", status: "active", progress: 44, keyResults: ["Fechar briefing atrasado", "Padronizar resposta", "Evitar retrabalho"] },
      ],
      backlogItems: [
        { id: "backlog-financeira-1", title: "Revisar estrutura padrao de briefing", notes: "" },
      ],
      baseActivities: [
        { id: "base-financeira-1", title: "Rodar revisao do briefing", checklist: ["ler pendencias", "responder principal trava", "registrar proximo passo"], context: "deep-work", estimatedMinutes: 60, priority: "high", bucket: "priority" },
      ],
      actionPlan: [
        { id: "plan-financeira-1", title: "Limpar atraso principal", nextAction: "Abrir o briefing atrasado e fechar a resposta objetiva.", checklist: ["ler contexto", "responder", "agendar retorno"], bucket: "priority" },
      ],
    },
    {
      id: "project-conteudo",
      name: "Conteudo / Movimento / Comunicacao",
      areaId: "area-work",
      templateId: "content",
      projectType: "Projeto de conteudo",
      status: "active",
      dueDate: formatISODate(addDays(today, 40)),
      priority: "medium",
      sprintId: "sprint-2-2026",
      color: "#8d6d7d",
      summary: "Posicionamento e tracao futura.",
      description: "Workspace para ideias, backlog de pautas, referencias, roteiros e execucao de conteudo.",
      objective: "Criar consistencia e tracao de conteudo sem bagunca operacional.",
      infoLinks: [
        { label: "Pasta de referencias", url: "https://drive.google.com/" },
      ],
      referenceEntries: [
        { label: "Banco de ideias", url: "" },
      ],
      observationLines: ["Conteudo cresce melhor quando parte de um backlog filtrado."],
      decisionLines: ["Toda ideia boa precisa virar roteiro simples antes de entrar na semana."],
      freeNotes: "Separar ideia, roteiro e execucao para reduzir travamento criativo.",
      okrs: [
        { id: "okr-conteudo-1", title: "Ganhar consistencia de producao", status: "active", progress: 38, keyResults: ["Fechar proximo roteiro", "Organizar backlog de pautas", "Publicar com menos atrito"] },
      ],
      backlogItems: [
        { id: "backlog-conteudo-1", title: "Guardar 10 ideias de conteudo", notes: "" },
        { id: "backlog-conteudo-2", title: "Montar biblioteca de referencias", notes: "" },
      ],
      baseActivities: [
        { id: "base-conteudo-1", title: "Abrir pauta e montar roteiro", checklist: ["escolher tema", "definir estrutura", "fechar CTA"], context: "creative", estimatedMinutes: 45, priority: "medium", bucket: "priority" },
      ],
      actionPlan: [
        { id: "plan-conteudo-1", title: "Gerar o proximo roteiro", nextAction: "Abrir o backlog e escolher uma pauta com mais aderencia ao sprint.", checklist: ["escolher pauta", "escrever estrutura"], bucket: "priority" },
      ],
    },
  ];

  const objectives = [
    { id: "objective-move", title: "Chegar em novembro com a mudanca resolvida", areaId: "area-move", projectId: "", progress: 34, dueDate: "2026-11-01", description: "Lugar, custos e estrutura de trabalho definidos." },
    { id: "objective-work", title: "Manter os projetos de trabalho previsiveis", areaId: "area-work", projectId: "", progress: 46, dueDate: "2026-12-31", description: "Menos retrabalho, mais resultado real." },
    { id: "objective-system", title: "Criar uma operacao semanal leve e confiavel", areaId: "area-personal", projectId: "", progress: 41, dueDate: "2026-12-15", description: "Separar visao, decisao, execucao e agenda." },
  ];

  const sprints = buildStrategicSprintsSeed2026().map((sprint) => ({
    ...sprint,
    status: sprint.id === currentStrategicSprint?.id
      ? "current"
      : sprint.id === nextStrategicSprint?.id
        ? "upcoming"
        : "planned",
    objectiveIds: sprint.id === "sprint-2-2026"
      ? ["objective-work", "objective-system"]
      : sprint.id === "sprint-3-2026"
        ? ["objective-work"]
        : ["objective-work", "objective-system"],
  }));

  const tasks = [
    task({ id: "task-review-week", title: "Fechar revisao semanal e foco principal", subtasks: ["listar o que concluiu", "mover atrasos", "escolher foco da semana"], areaId: "area-personal", objectiveId: "objective-system", sprintId: "sprint-2-2026", type: "review", context: "planning", scheduledDate: today, scheduledPeriod: "night", dueDate: today, estimatedMinutes: 45, priority: "high", impact: 5, urgency: 4, effort: 2, nextAction: "abrir a semana e decidir o que entra e o que sai", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now", critical: true, isRecurring: true, checklistOrder: 10 }),
    task({ id: "task-move-costs", title: "Fechar mapa de custos da mudanca", subtasks: ["levantamento de aluguel", "somar frete e internet", "definir reserva minima"], areaId: "area-move", objectiveId: "objective-move", type: "strategic", context: "deep-work", scheduledDate: today, scheduledPeriod: "afternoon", dueDate: plus2, estimatedMinutes: 90, priority: "high", impact: 5, urgency: 4, effort: 4, nextAction: "abrir a planilha e fechar a primeira versao dos custos", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "priority", checklistOrder: 9 }),
    task({ id: "task-assessoria-proposal", title: "Fechar proposta importante da Assessoria", subtasks: ["validar escopo", "revisar valores", "enviar proposta final"], areaId: "area-work", projectId: "project-assessoria", objectiveId: "objective-work", sprintId: "sprint-2-2026", type: "strategic", context: "deep-work", scheduledDate: today, scheduledPeriod: "afternoon", dueDate: today, estimatedMinutes: 105, priority: "high", impact: 5, urgency: 5, effort: 4, nextAction: "abrir a ultima versao e ajustar os pontos finais", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now", critical: true, checklistOrder: 8 }),
    task({ id: "task-family-week", title: "Preparar agenda e materiais dos filhos", areaId: "area-family", objectiveId: "objective-system", type: "family", context: "home", scheduledDate: today, scheduledPeriod: "morning", dueDate: today, estimatedMinutes: 25, priority: "medium", impact: 4, urgency: 4, effort: 1, nextAction: "separar mochila, uniforme e recados", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "do-now", checklistOrder: 7 }),
    task({ id: "task-financeira-overdue", title: "Revisar briefing atrasado da Financeira", subtasks: ["ler pendencias abertas", "definir resposta objetiva"], areaId: "area-work", projectId: "project-financeira", objectiveId: "objective-work", sprintId: "sprint-2-2026", type: "work", context: "deep-work", scheduledDate: minus2, scheduledPeriod: "afternoon", dueDate: minus1, estimatedMinutes: 65, priority: "high", impact: 5, urgency: 5, effort: 3, nextAction: "abrir o briefing atrasado e fechar o proximo passo", gtdStage: "execute", gtdDecision: "Executar", finalBucket: "priority", manualDecision: true, critical: true, checklistOrder: 6 }),
    task({ id: "task-home-simplify", title: "Separar excesso da casa em doar, vender e levar", subtasks: ["esvaziar um armario", "marcar o que sai", "deixar pilhas prontas"], areaId: "area-home", objectiveId: "objective-move", type: "home", context: "home", scheduledDate: tomorrow, scheduledPeriod: "morning", dueDate: plus4, estimatedMinutes: 60, priority: "medium", impact: 4, urgency: 2, effort: 3, nextAction: "atacar o primeiro armario e separar em tres grupos", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule", checklistOrder: 5 }),
    task({ id: "task-finance-map", title: "Conferir contas pessoais e reserva da mudanca", areaId: "area-finance", objectiveId: "objective-move", type: "finance", context: "admin", scheduledDate: tomorrow, scheduledPeriod: "night", dueDate: plus2, estimatedMinutes: 35, priority: "medium", impact: 4, urgency: 4, effort: 1, nextAction: "abrir contas e atualizar valor disponivel", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule", checklistOrder: 4 }),
    task({ id: "task-visit-imoveis", title: "Mapear 3 opcoes de imovel com espaco de trabalho", subtasks: ["filtrar bairros", "salvar tres opcoes", "anotar custo e espaco"], areaId: "area-move", objectiveId: "objective-move", type: "strategic", context: "deep-work", scheduledDate: thursday, scheduledPeriod: "afternoon", dueDate: plus4, estimatedMinutes: 95, priority: "high", impact: 5, urgency: 4, effort: 4, nextAction: "abrir pesquisa e montar shortlist inicial", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "priority", checklistOrder: 3 }),
    task({ id: "task-content-roteiro", title: "Definir roteiro do proximo conteudo", subtasks: ["escolher tema", "escrever estrutura", "definir CTA"], areaId: "area-work", projectId: "project-conteudo", objectiveId: "objective-work", sprintId: "sprint-2-2026", type: "creative", context: "creative", scheduledDate: saturday, scheduledPeriod: "afternoon", dueDate: saturday, estimatedMinutes: 70, priority: "medium", impact: 4, urgency: 3, effort: 3, nextAction: "abrir notas e montar o esqueleto do conteudo", gtdStage: "schedule", gtdDecision: "Agendar", finalBucket: "schedule", checklistOrder: 2 }),
    task({ id: "task-inbox-field", title: "Possivel visita externa com deslocamento", areaId: "area-work", projectId: "project-assessoria", type: "visit", context: "outside", status: "inbox", location: "inbox", dueDate: plus2, estimatedMinutes: 90, priority: "medium", impact: 4, urgency: 3, effort: 3, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog", notes: "Ainda precisa decidir o dia e o impacto na semana." }),
    task({ id: "task-inbox-boxes", title: "Comprar caixas organizadoras para a mudanca", areaId: "area-move", type: "move", context: "street", status: "inbox", location: "inbox", dueDate: plus4, estimatedMinutes: 40, priority: "medium", impact: 3, urgency: 2, effort: 1, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog" }),
    task({ id: "task-inbox-idea", title: "Anotar ideia de conteudo para o Movimento", areaId: "area-work", projectId: "project-conteudo", type: "idea", context: "creative", status: "inbox", location: "inbox", estimatedMinutes: 15, priority: "low", impact: 2, urgency: 1, effort: 1, gtdStage: "clarify", gtdDecision: "Processar", finalBucket: "backlog" }),
    task({ id: "task-backlog-clean", title: "Limpar backlog dos projetos de trabalho", areaId: "area-work", objectiveId: "objective-work", sprintId: "sprint-2-2026", type: "planning", context: "planning", status: "backlog", location: "backlog", dueDate: plus4, estimatedMinutes: 55, priority: "medium", impact: 4, urgency: 3, effort: 2, nextAction: "revisar backlog e descartar o que nao move resultado", gtdStage: "someday", gtdDecision: "Backlog", finalBucket: "backlog" }),
    task({ id: "task-move-docs", title: "Organizar documentos para negociacao de aluguel", areaId: "area-move", objectiveId: "objective-move", status: "backlog", location: "backlog", dueDate: plus4, estimatedMinutes: 45, priority: "high", impact: 5, urgency: 3, effort: 2, nextAction: "listar documentos obrigatorios", gtdStage: "someday", gtdDecision: "Backlog", finalBucket: "backlog" }),
    task({ id: "task-template-review", title: "Template - Revisao semanal", areaId: "area-personal", objectiveId: "objective-system", type: "template", context: "planning", status: "template", location: "template", estimatedMinutes: 45, priority: "high", impact: 4, urgency: 2, effort: 2, isTemplate: true, isRecurring: true, gtdStage: "template", gtdDecision: "Modelo", finalBucket: "backlog" }),
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
    meta: {
      appName: "Life OS Thz 2026",
      version: 6,
      seededAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
      timezone: "America/Sao_Paulo",
    },
    profile: {
      ownerName: "Thz",
      moveDeadline: "2026-11-01",
      phase: "Transicao pessoal em 2026 equilibrando familia, casa, mudanca e tres projetos de trabalho.",
      routineWindows: { morning: "07:00-12:00", deepWork: "13:00-17:00", secondShift: "22:00-00:00" },
      notes: "O sistema precisa parecer calmo na frente e ser inteligente por tras.",
    },
    ui: {
      activeSection: "today",
      selectedDate: today,
      selectedProjectId: "project-assessoria",
      priorityMethod: "pipeline",
      checklistView: "all",
      filters: { scope: "integrated", areaId: "all", projectId: "all", context: "all", dayTypeId: "all" },
      editor: { kind: "", id: "" },
    },
    weeklyPlan: { energyLevel: 3, mainFocus: "Avancar na mudanca e nos projetos com clareza de agenda." },
    settings: {
      editMode: false,
      advancedEditMode: false,
      sidebarCollapsed: true,
      visualDensity: "compact",
      accentTone: "forest",
      updatedAt: new Date().toISOString(),
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
        checklist: [
          { id: "views", width: "compact", height: "compact", frame: null },
          { id: "capture", width: "compact", height: "compact", frame: null },
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
          { id: "sprint", width: "full", height: "regular", frame: null },
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
        checklist: [
          { id: "views", width: "compact", height: "compact", frame: null },
          { id: "capture", width: "compact", height: "compact", frame: null },
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
          { id: "sprint", width: "full", height: "regular", frame: null },
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
      },
      layoutMode: "flex-grid",
      layoutCapabilities: { resizeEnabled: true, dragEnabled: true, futureFreeformReady: true, freeformEnabled: true },
      prioritization: { moveProtection: 1.18, familyProtection: 1.08, futureFocus: 1.12, delegationBias: 1.05, overloadLimit: 0.92 },
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
          { term: "mudanca", value: "area-move" },
        ],
        frequentAssociations: [
          { term: "gravar", target: { projectId: "project-conteudo", areaId: "area-work", context: "creative", intent: "create-task", destination: "project" } },
          { term: "cliente", target: { areaId: "area-work", context: "admin", intent: "create-task", destination: "inbox" } },
          { term: "reuniao", target: { areaId: "area-work", context: "planning", intent: "schedule", destination: "agenda" } },
        ],
        learnedPatterns: [],
        history: [],
      },
      cloudSync: {
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
      },
      googleCalendar: { clientId: "", apiKey: "", calendarId: "primary" },
      architecture: { workModuleMode: "embedded", futureApiReady: true },
    },
    areas,
    projects,
    objectives,
    sprints,
    routines: { morning: [], night: [] },
    habits: [],
    health: { weightLogs: [], measureLogs: [], careItems: [], workouts: [], dietMeals: [] },
    tasks,
    blocks: weekBlocks(weekDates),
    dayTypes,
    dayOverrides: [
      { id: "override-tuesday", date: tuesday, typeId: "normal", periods: { morning: "normal", afternoon: "meeting", night: "normal" }, note: "Tarde com reunioes e alinhamentos.", lastPlan: null },
      { id: "override-wednesday", date: wednesday, typeId: "soccer", periods: { morning: "normal", afternoon: "normal", night: "soccer" }, note: "Futebol e social a noite.", lastPlan: null },
      { id: "override-friday", date: friday, typeId: "soccer", periods: { morning: "normal", afternoon: "normal", night: "soccer" }, note: "Futebol na sexta e capacidade menor a noite.", lastPlan: null },
    ],
    calendar: { provider: "google", connected: false, calendarId: "primary", externalBusyBlocks: [] },
    history: [{ id: "history-seed", type: "seed", createdAt: new Date().toISOString(), summary: "Seed criada com Dashboard, Hoje, Entrada, Priorizar, Organizar, Checklist, Agenda e Configuracoes." }],
    references: { weekDates, today, tuesday, wednesday, thursday, friday, saturday, tomorrow, plus2, plus3, plus4, minus1, minus2, currentQuarter },
  };
}
