import assert from "node:assert/strict";

import { buildAppModel, setActiveSprint } from "../engine.js";
import { buildSeedState } from "../seed.js";

function isoDate(value) {
  return `${value}T12:00:00.000Z`;
}

function makeTask(overrides = {}) {
  const date = overrides.scheduledDate || overrides.dueDate || "2026-05-15";
  return {
    id: overrides.id || `task-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title || "Nova tarefa",
    subtasks: overrides.subtasks || [],
    completedSubtasks: overrides.completedSubtasks || [],
    areaId: overrides.areaId || "area-work",
    projectId: overrides.projectId || "",
    objectiveId: overrides.objectiveId || "",
    sprintId: overrides.sprintId || "",
    type: overrides.type || "task",
    context: overrides.context || "deep-work",
    scheduledPeriod: overrides.scheduledPeriod || "afternoon",
    status: overrides.status || "todo",
    location: overrides.location || "scheduled",
    scheduledDate: overrides.scheduledDate || date,
    dueDate: overrides.dueDate || date,
    estimatedMinutes: overrides.estimatedMinutes || 45,
    priority: overrides.priority || "medium",
    impact: overrides.impact ?? 4,
    urgency: overrides.urgency ?? 3,
    effort: overrides.effort ?? 2,
    energyCost: overrides.energyCost ?? 2,
    nextAction: overrides.nextAction || "",
    gtdStage: overrides.gtdStage || "clarify",
    gtdDecision: overrides.gtdDecision || "",
    finalBucket: overrides.finalBucket || "",
    priorityMode: overrides.priorityMode || "auto",
    frog: overrides.frog || "",
    scoreAdjustment: overrides.scoreAdjustment || 0,
    notes: overrides.notes || "",
    isRecurring: Boolean(overrides.isRecurring),
    isTemplate: Boolean(overrides.isTemplate),
    delegable: Boolean(overrides.delegable),
    critical: Boolean(overrides.critical),
    manualDecision: Boolean(overrides.manualDecision),
    riskAccepted: Boolean(overrides.riskAccepted),
    createdAt: overrides.createdAt || isoDate(date),
    updatedAt: overrides.updatedAt || isoDate(date),
    completedAt: overrides.completedAt || "",
    source: overrides.source || "test",
    lastAction: overrides.lastAction || "",
    checklistOrder: overrides.checklistOrder || 0,
  };
}

function buildModelForSprint(sprintId, referenceDate, task) {
  let state = buildSeedState(new Date(`${referenceDate}T12:00:00-03:00`));
  state = setActiveSprint(state, sprintId);
  state.tasks.unshift(task);
  return buildAppModel(state, new Date(`${referenceDate}T15:00:00-03:00`));
}

function findTask(model, taskId) {
  return model.filteredTasks.find((task) => task.id === taskId)
    || model.prioritize.ranked.find((task) => task.id === taskId)
    || null;
}

{
  const commercialTask = makeTask({
    id: "test-commercial-s1",
    title: "Fechar proposta comercial com cliente novo",
    scheduledDate: "2026-05-15",
    dueDate: "2026-05-15",
    scheduledPeriod: "afternoon",
    nextAction: "enviar proposta e buscar fechamento",
  });
  const contentTask = makeTask({
    id: "test-content-s1",
    title: "Definir pauta estetica do proximo conteudo",
    projectId: "project-conteudo",
    type: "creative",
    scheduledDate: "2026-05-15",
    dueDate: "2026-05-18",
    scheduledPeriod: "afternoon",
    impact: 2,
    urgency: 1,
  });
  let state = buildSeedState(new Date("2026-05-15T12:00:00-03:00"));
  state = setActiveSprint(state, "sprint-1-2026");
  state.tasks.unshift(contentTask);
  state.tasks.unshift(commercialTask);
  const model = buildAppModel(state, new Date("2026-05-15T15:00:00-03:00"));
  const commercial = findTask(model, "test-commercial-s1");
  const content = findTask(model, "test-content-s1");

  assert.ok(commercial, "tarefa comercial do Sprint 1 deve existir");
  assert.ok(content, "tarefa de conteudo do Sprint 1 deve existir");
  assert.equal(commercial.strategicWeight, 10, "tarefa comercial no Sprint 1 deve herdar peso 10");
  assert.equal(commercial.strategicPriorityLevel, "alta", "tarefa comercial no Sprint 1 deve ficar em prioridade alta");
  assert.equal(content.strategicWeight, 3, "tarefa de conteudo no Sprint 1 deve herdar peso 3");
  assert.equal(content.strategicPriorityLevel, "baixa", "tarefa de conteudo no Sprint 1 deve ficar em prioridade baixa");
  assert.ok(commercial.score > content.score, "tarefa comercial deve superar tarefa de conteudo no Sprint 1");
}

{
  const visitTask = makeTask({
    id: "test-visit-s2",
    title: "Realizar visita presencial a cliente da regiao",
    type: "visit",
    scheduledDate: "2026-08-20",
    dueDate: "2026-08-20",
    scheduledPeriod: "afternoon",
    nextAction: "confirmar horario da visita presencial",
  });
  const model = buildModelForSprint("sprint-2-2026", "2026-08-20", visitTask);
  const task = findTask(model, "test-visit-s2");

  assert.ok(task, "tarefa de visita do Sprint 2 deve existir");
  assert.equal(task.strategicWeight, 9, "tarefa de visita no Sprint 2 deve herdar peso 9");
  assert.equal(task.strategicPriorityLevel, "alta", "tarefa de visita no Sprint 2 deve ficar em prioridade alta");
}

{
  const bigCloseTask = makeTask({
    id: "test-big-close-s3",
    title: "Fechar caso grande com cliente estrategico",
    scheduledDate: "2026-11-12",
    dueDate: "2026-11-12",
    scheduledPeriod: "afternoon",
    nextAction: "ligar para confirmar fechamento grande",
    impact: 5,
    urgency: 5,
  });
  const model = buildModelForSprint("sprint-3-2026", "2026-11-12", bigCloseTask);
  const task = findTask(model, "test-big-close-s3");

  assert.ok(task, "tarefa de fechamento grande do Sprint 3 deve existir");
  assert.equal(task.strategicWeight, 10, "tarefa de fechamento grande no Sprint 3 deve herdar peso 10");
  assert.equal(task.strategicPriorityLevel, "maxima", "tarefa de fechamento grande no Sprint 3 deve ficar em prioridade maxima");
}

console.log("Strategic sprint priority tests passed.");
