export const STRATEGIC_THEME_LABELS = {
  commercial: "Comercial",
  legal: "Juridico",
  product: "Produto",
  organization: "Organizacao",
  content: "Conteudo",
  visits: "Visitas",
  management: "Gestao",
  bigClose: "Fechamento grande",
  relationship: "Relacionamento",
};

export const STRATEGIC_SPRINTS_2026 = [
  {
    id: "sprint-1-2026",
    slot: 1,
    title: "Sprint 1",
    periodLabel: "Mai-Jul 2026",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    objective: "Ligar o motor comercial e validar o modelo de negocio.",
    description: "Fase para colocar comercial na rua, validar modelo e organizar juridico pendente.",
    goals: [
      "Iniciar prospeccao diaria, minimo 5 dias por semana.",
      "Fechar 3 a 10 clientes em qualquer frente.",
      "Ter o produto de gestao rural completa rodando com 2 a 5 clientes ativos.",
      "Organizar 100% dos casos juridicos pendentes.",
      "Testar pelo menos 2 abordagens comerciais.",
    ],
    priorities: [
      "Comercial / prospeccao ativa",
      "Organizacao juridica",
      "Produto gestao rural completa",
      "Primeiros fechamentos",
    ],
    weights: {
      commercial: 10,
      legal: 7,
      product: 6,
      organization: 5,
      content: 3,
    },
    projectIds: ["project-assessoria", "project-financeira"],
    priorityAreas: ["area-work"],
    keywords: [
      "comercial",
      "prospeccao",
      "cliente",
      "fechamento",
      "juridico",
      "casos",
      "gestao rural",
      "produto",
    ],
  },
  {
    id: "sprint-2-2026",
    slot: 2,
    title: "Sprint 2",
    periodLabel: "Ago-Out 2026",
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    objective: "Ganhar tracao, consistencia e posicionamento regional.",
    description: "Fase para manter comercial forte, aumentar presenca em campo e sustentar entrega.",
    goals: [
      "Manter prospeccao diaria.",
      "Fechar 10 a 20 clientes no periodo.",
      "Ter 5 a 15 clientes ativos em gestao.",
      "Realizar 1 visita por semana.",
      "Produzir 1 conteudo por semana.",
      "Conseguir 2 a 5 depoimentos reais.",
    ],
    priorities: [
      "Comercial",
      "Visitas presenciais",
      "Entrega da gestao",
      "Posicionamento / conteudo",
    ],
    weights: {
      commercial: 10,
      visits: 9,
      management: 8,
      content: 6,
      legal: 4,
    },
    projectIds: ["project-assessoria", "project-financeira", "project-conteudo"],
    priorityAreas: ["area-work"],
    keywords: [
      "comercial",
      "visita",
      "presencial",
      "gestao",
      "cliente ativo",
      "conteudo",
      "depoimento",
    ],
  },
  {
    id: "sprint-3-2026",
    slot: 3,
    title: "Sprint 3",
    periodLabel: "Nov-Dez 2026",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    objective: "Fechar casos maiores, consolidar operacao e planejar 2027.",
    description: "Fase para fechar oportunidades maiores, consolidar a operacao e desenhar o proximo ciclo.",
    goals: [
      "Fechar 1 a 3 casos maiores.",
      "Manter base minima de 10 clientes ativos.",
      "Realizar evento ou acao de relacionamento.",
      "Ter operacao funcionando sem caos.",
      "Planejar 2027 com base em dados reais.",
    ],
    priorities: [
      "Fechamento de casos grandes",
      "Relacionamento com clientes",
      "Consolidacao da operacao",
      "Planejamento futuro",
    ],
    weights: {
      bigClose: 10,
      relationship: 9,
      management: 8,
      commercial: 7,
      content: 5,
    },
    projectIds: ["project-assessoria", "project-financeira", "project-conteudo"],
    priorityAreas: ["area-work"],
    keywords: [
      "caso grande",
      "fechamento grande",
      "relacionamento",
      "clientes",
      "operacao",
      "planejamento 2027",
    ],
  },
];

export function getStrategicSprint2026ById(sprintId = "") {
  return STRATEGIC_SPRINTS_2026.find((sprint) => sprint.id === sprintId) || null;
}

export function getStrategicSprint2026ForDate(referenceDate = "") {
  const isoDate = String(referenceDate || "").slice(0, 10);
  if (!isoDate) {
    return STRATEGIC_SPRINTS_2026[0] || null;
  }

  return STRATEGIC_SPRINTS_2026.find((sprint) => sprint.startDate <= isoDate && sprint.endDate >= isoDate)
    || STRATEGIC_SPRINTS_2026.find((sprint) => sprint.startDate > isoDate)
    || STRATEGIC_SPRINTS_2026[STRATEGIC_SPRINTS_2026.length - 1]
    || null;
}

export function buildStrategicSprintsSeed2026() {
  return STRATEGIC_SPRINTS_2026.map((sprint) => ({
    id: sprint.id,
    slot: sprint.slot,
    title: sprint.title,
    periodLabel: sprint.periodLabel,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: "planned",
    description: sprint.description,
    theme: sprint.objective,
    objective: sprint.objective,
    goals: [...sprint.goals],
    objectiveIds: [],
    projectIds: [...(sprint.projectIds || [])],
    priorityAreas: [...(sprint.priorityAreas || [])],
    priorities: [...sprint.priorities],
    keywords: [...sprint.keywords],
    strategicWeights: { ...sprint.weights },
  }));
}

