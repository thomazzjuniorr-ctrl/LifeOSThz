import { buildSeedState } from "./seed.js";
import { GoogleCalendarService } from "./google-calendar.js";
import { loadAppState, resetAppState, saveAppState } from "./storage.js";
import { createVoiceRecognizer, getVoiceCaptureSupport } from "./voice-capture.js";
import {
  addChecklistTask,
  addInboxTask,
  analyzeCaptureText,
  applyGoogleBusyBlocks,
  applyTaskAction,
  buildAppModel,
  clearFilters,
  closeEditor,
  deleteEntity,
  duplicateEntity,
  moveLayoutCard,
  moveTaskToBucket,
  openEditor,
  replanWeek,
  resizeLayoutCard,
  restoreLayoutDefault,
  reorderChecklistTask,
  saveCurrentLayoutAsDefault,
  confirmVoiceCapture,
  saveEntity,
  saveGoogleCalendarConfig,
  saveDietMeal,
  saveHealthCareItem,
  saveHealthMeasure,
  saveHealthWeight,
  saveHealthWorkout,
  saveSettings,
  setActiveSection,
  setCalendarConnected,
  setDayPeriodType,
  setDayType,
  setFilter,
  setChecklistView,
  setPriorityMethod,
  setSelectedDate,
  toggleDietMealForDate,
  toggleHealthCareForDate,
  toggleRoutineForDate,
  toggleTaskSubtask,
  setWeeklyEnergy,
  toggleEditMode,
  toggleHabitForDate,
  updateBlockSchedule,
  updateTaskSchedule,
} from "./engine.js";
import { formatISODate, formatShortDate } from "./date.js";

const APP_VERSION = 5;
const MOBILE_BREAKPOINT = 900;

const SECTION_GROUPS = [
  {
    label: "Visao",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "today", label: "Hoje" },
      { id: "checklist", label: "Checklist" },
      { id: "days", label: "Dias" },
      { id: "agenda", label: "Agenda" },
    ],
  },
  {
    label: "Decidir",
    items: [
      { id: "inbox", label: "Entrada" },
      { id: "prioritize", label: "Priorizar" },
      { id: "organize", label: "Organizar" },
    ],
  },
  {
    label: "Estrutura",
    items: [
      { id: "areas", label: "Areas" },
      { id: "projects", label: "Projetos" },
      { id: "routine", label: "Rotina" },
      { id: "health", label: "Saude" },
      { id: "planning", label: "Planejamento" },
      { id: "settings", label: "Configuracoes" },
    ],
  },
];

const PAGE_META = {
  dashboard: { kicker: "Controle", title: "Dashboard", text: "Visao geral, resultados, gargalos e carga semanal." },
  today: { kicker: "Execucao", title: "Hoje", text: "Poucas coisas, muita clareza e zero ruido desnecessario." },
  checklist: { kicker: "Operacao", title: "Checklist", text: "Execucao rapida, listas claras e andamento sincronizado com o resto do sistema." },
  days: { kicker: "Capacidade", title: "Dias", text: "Semana editavel por dia e por periodo." },
  inbox: { kicker: "Captura", title: "Entrada", text: "Caixa de entrada rapida para tudo que surgir no dia." },
  prioritize: { kicker: "Decisao", title: "Priorizar", text: "GTD, Sapo e refino agil explicados visualmente." },
  organize: { kicker: "Saida", title: "Organizar", text: "Complexo por tras, simples na frente." },
  areas: { kicker: "Mapa", title: "Areas", text: "Uma vida so, separada por frentes e nao por sistemas diferentes." },
  projects: { kicker: "Trabalho", title: "Projetos", text: "Cada projeto com sua leitura, dentro do mesmo banco unico." },
  routine: { kicker: "Apoio", title: "Rotina", text: "Checklists, habitos, treino e energia semanal." },
  health: { kicker: "Saude", title: "Saude", text: "Execucao diaria, disciplina e evolucao em um bloco limpo." },
  planning: { kicker: "Estrutura", title: "Planejamento", text: "Sprint, objetivos, backlog e modelos." },
  agenda: { kicker: "Tempo", title: "Agenda", text: "Calendario interno estilo workspace com suporte futuro ao Google." },
  settings: { kicker: "Sistema", title: "Configuracoes", text: "Linha de raciocinio, modo edicao, layout e parametros." },
};

const LAYOUT_WIDTH_LABELS = {
  compact: "Estreito",
  medium: "Medio",
  full: "Largo",
};

const LAYOUT_HEIGHT_LABELS = {
  compact: "Baixo",
  regular: "Medio",
  tall: "Alto",
};

function createVoiceCaptureState() {
  return {
    open: false,
    supported: false,
    mode: "manual-fallback",
    listening: false,
    transcript: "",
    interim: "",
    draft: null,
    originalDraft: null,
    error: "",
    sourceSection: "inbox",
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value = "", limit = 180) {
  const text = String(value).trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
}

function cloneDraft(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function badge(label, tone = "") {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function metaPills(values) {
  return values.filter(Boolean).map((value) => `<span class="meta-pill">${escapeHtml(value)}</span>`).join("");
}

function metricCard(label, value, foot) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(foot)}</p>
    </article>
  `;
}

function progressBar(value) {
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${Math.max(0, Math.min(100, value))}%"></div>
    </div>
  `;
}

function taskActions(task, mode = "default") {
  const buttons = [];

  if (!task.isTemplate && task.status !== "done") {
    if (mode === "alert") {
      buttons.push(`<button class="tiny-button" data-task-action="resolve-now" data-task-id="${task.id}">Resolver agora</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="auto-defer" data-task-id="${task.id}">Adiar</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="delegate" data-task-id="${task.id}">Delegar</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="accept-risk" data-task-id="${task.id}">Ignorar com risco</button>`);
    } else if (mode === "mobile-prioritize") {
      buttons.push(`<button class="tiny-button" data-action="open-editor" data-kind="task" data-id="${task.id}">Editar</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="today" data-task-id="${task.id}">Hoje</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="auto-defer" data-task-id="${task.id}">Agendar</button>`);
    } else {
      buttons.push(`<button class="tiny-button" data-task-action="today" data-task-id="${task.id}">Hoje</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="complete" data-task-id="${task.id}">Concluir</button>`);
      buttons.push(`<button class="tiny-button ghost" data-task-action="auto-defer" data-task-id="${task.id}">Mover</button>`);
    }

    if (task.delegable) {
      buttons.push(`<button class="tiny-button ghost" data-task-action="delegate" data-task-id="${task.id}">Delegar</button>`);
    }
  }

  if (task.isTemplate) {
    buttons.push(`<button class="tiny-button" data-task-action="instantiate-template" data-task-id="${task.id}">Usar modelo</button>`);
  }

  buttons.push(`<button class="tiny-button ghost" data-task-action="mark-frog-day" data-task-id="${task.id}">Sapo</button>`);
  if (mode !== "mobile-prioritize") {
    buttons.push(`<button class="tiny-button ghost" data-action="open-editor" data-kind="task" data-id="${task.id}">Editar</button>`);
  }
  return `<div class="task-actions">${buttons.join("")}</div>`;
}

function taskCard(task, options = {}) {
  const headerPills = metaPills([
    task.areaName,
    task.projectName || "",
    task.periodLabel,
    task.dayTypeLabel,
  ]);
  const reasonLine = task.reasons?.length ? `<p class="reason-line">${escapeHtml(task.reasons.join(" | "))}</p>` : "";
  const subtaskList = task.subtasks?.length
    ? `<ul class="mini-list">${task.subtasks.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return `
    <article class="task-card ${options.emphasis ? "emphasis" : ""}">
      <div class="task-card-top">
        <div>
          <div class="meta-row">${headerPills}</div>
          <h4>${escapeHtml(task.title)}</h4>
          <p>${escapeHtml(task.gtdDecision)}${task.frogLabel ? ` • ${escapeHtml(task.frogLabel)}` : ""}</p>
        </div>
        ${badge(`Score ${Math.round(task.score)}`, task.critical ? "danger" : "")}
      </div>
      ${task.nextAction ? `<p class="next-action"><strong>Proxima acao:</strong> ${escapeHtml(task.nextAction)}</p>` : ""}
      ${subtaskList}
      ${reasonLine}
      ${task.suggestions?.length ? `<div class="meta-row">${metaPills(task.suggestions)}</div>` : ""}
      ${task.notes ? `<p class="muted-copy">${escapeHtml(task.notes)}</p>` : ""}
      ${taskActions(task, options.mode)}
    </article>
  `;
}

function taskList(tasks, options = {}) {
  if (!tasks?.length) {
    return emptyState(options.empty || "Nada por aqui.");
  }

  return `<div class="stack-list">${tasks.map((task) => taskCard(task, options)).join("")}</div>`;
}

function panel(title, body, options = {}) {
  return `
    <section class="panel-card ${options.wide ? "wide" : ""}">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ""}
        </div>
        ${options.badge ? badge(options.badge, options.badgeTone || "") : ""}
      </div>
      ${body}
    </section>
  `;
}

function getLayoutItem(model, page, cardId, options = {}) {
  const fallbackWidth = options.wide ? "full" : "medium";
  return model.settings.layouts[page]?.find((entry) => entry.id === cardId) || {
    id: cardId,
    width: fallbackWidth,
    height: "regular",
    frame: null,
  };
}

function layoutCard(page, cardId, title, body, model, options = {}) {
  const layoutItem = getLayoutItem(model, page, cardId, options);
  const widthClass = `layout-width-${layoutItem.width}`;
  const heightClass = `layout-height-${layoutItem.height}`;
  const editTools = model.editMode
    ? `
      <div class="layout-edit-bar">
        <div class="layout-handle">Arraste para reorganizar</div>
        <div class="layout-edit-actions">
          <button class="ghost-button small" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="width" data-layout-direction="decrease" aria-label="Diminuir largura ${escapeHtml(title)}">- largura</button>
          <button class="ghost-button small" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="width" data-layout-direction="increase" aria-label="Aumentar largura ${escapeHtml(title)}">+ largura</button>
          <button class="ghost-button small" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="height" data-layout-direction="decrease" aria-label="Diminuir altura ${escapeHtml(title)}">- altura</button>
          <button class="ghost-button small" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="height" data-layout-direction="increase" aria-label="Aumentar altura ${escapeHtml(title)}">+ altura</button>
          <span class="layout-size-pill">${escapeHtml(LAYOUT_WIDTH_LABELS[layoutItem.width] || layoutItem.width)} • ${escapeHtml(LAYOUT_HEIGHT_LABELS[layoutItem.height] || layoutItem.height)}</span>
        </div>
      </div>
    `
    : "";

  return `
    <div
      class="layout-card ${model.editMode ? "editable" : ""} ${widthClass} ${heightClass}"
      ${model.editMode ? 'draggable="true"' : ""}
      data-layout-page="${page}"
      data-layout-card="${cardId}"
    >
      ${editTools}
      ${panel(title, body, { ...options, wide: false })}
    </div>
  `;
}

function renderChecklistItems(items, _selectedDate) {
  if (!items?.length) {
    return emptyState("Sem itens de acompanhamento para hoje.");
  }

  return `
    <div class="stack-list compact-stack">
      ${items.map((item) => {
        const action = item.kind === "habit"
          ? `<button class="tiny-button ${item.done ? "ghost" : ""}" data-action="toggle-habit-inline" data-habit-id="${item.id}" data-date="${_selectedDate}" aria-label="${item.done ? "Desmarcar" : "Marcar"} habito ${escapeHtml(item.title)}">${item.done ? "Feito" : "Marcar"}</button>`
          : item.kind === "routine"
            ? `<button class="tiny-button ${item.done ? "ghost" : ""}" data-action="toggle-routine-inline" data-routine-id="${item.id}" data-date="${_selectedDate}" aria-label="${item.done ? "Desmarcar" : "Marcar"} rotina ${escapeHtml(item.title)}">${item.done ? "Feito" : "Marcar"}</button>`
          : item.kind === "care"
            ? `<button class="tiny-button ${item.done ? "ghost" : ""}" data-action="toggle-care-inline" data-care-id="${item.id}" data-date="${_selectedDate}" aria-label="${item.done ? "Desmarcar" : "Marcar"} cuidado ${escapeHtml(item.title)}">${item.done ? "Feito" : "Marcar"}</button>`
            : item.kind === "diet"
              ? `<button class="tiny-button ${item.done ? "ghost" : ""}" data-action="toggle-diet-inline" data-diet-id="${item.id}" data-date="${_selectedDate}" aria-label="${item.done ? "Desmarcar" : "Marcar"} refeicao ${escapeHtml(item.title)}">${item.done ? "Seguido" : "Marcar"}</button>`
              : `<button class="tiny-button ${item.done ? "ghost" : ""}" data-task-action="${item.done ? "reopen" : "complete"}" data-task-id="${item.id}" aria-label="${item.done ? "Reabrir" : "Concluir"} tarefa ${escapeHtml(item.title)}">${item.done ? "Reabrir" : "Concluir"}</button>`;

        return `
          <article class="checklist-card ${item.done ? "done" : ""}">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.period)}${item.note ? ` • ${escapeHtml(item.note)}` : ""}${item.areaName ? ` • ${escapeHtml(item.areaName)}` : ""}</p>
            </div>
            ${action}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderChecklistViewButtons(model) {
  return model.checklist.views.map((view) => `
    <button
      class="checklist-nav-button ${model.checklist.activeView === view.id ? "active" : ""}"
      data-action="set-checklist-view"
      data-checklist-view="${view.id}"
    >
      <span>${escapeHtml(view.label)}</span>
      <strong>${view.count}</strong>
    </button>
  `).join("");
}

function renderChecklistRow(entry) {
  const isTask = entry.kind === "task";
  const isDone = Boolean(entry.done || entry.status === "done");
  const doneAction = isTask
    ? `data-task-action="${isDone ? "reopen" : "complete"}" data-task-id="${entry.id}"`
    : entry.kind === "habit"
      ? `data-action="toggle-habit-inline" data-habit-id="${entry.id}" data-date="${entry.scheduledDate}"`
      : entry.kind === "routine"
        ? `data-action="toggle-routine-inline" data-routine-id="${entry.id}" data-date="${entry.scheduledDate}"`
        : entry.kind === "care"
          ? `data-action="toggle-care-inline" data-care-id="${entry.id}" data-date="${entry.scheduledDate}"`
          : `data-action="toggle-diet-inline" data-diet-id="${entry.id}" data-date="${entry.scheduledDate}"`;
  const toggleLabel = isTask
    ? `${isDone ? "Reabrir" : "Concluir"} tarefa ${entry.title}`
    : `${isDone ? "Desmarcar" : "Marcar"} ${entry.title}`;
  const subtaskList = isTask && entry.subtasks?.length
    ? `
      <div class="checklist-subtasks">
        ${entry.subtasks.map((subtask, index) => {
          const checked = (entry.completedSubtasks || []).includes(index);
          return `
            <button
              class="checklist-subtask-chip ${checked ? "done" : ""}"
              data-action="toggle-task-subtask"
              data-task-id="${entry.id}"
              data-subtask-index="${index}"
              aria-label="${checked ? "Desmarcar" : "Marcar"} subtarefa ${escapeHtml(subtask)}"
            >
              <span>${checked ? "OK" : "..."}</span>
              <small>${escapeHtml(subtask)}</small>
            </button>
          `;
        }).join("")}
      </div>
    `
    : "";
  const meta = isTask
    ? metaPills([
      entry.areaName,
      entry.projectName || "",
      entry.priority ? `Prioridade ${entry.priority}` : "",
      entry.dueLabel ? `Prazo ${entry.dueLabel}` : "",
    ])
    : metaPills([
      entry.areaName || "",
      entry.sectionLabel || "",
      entry.period || "",
    ]);
  const editKind = isTask
    ? "task"
    : entry.kind === "habit"
      ? "habit"
      : entry.kind === "routine"
        ? "routine"
        : entry.kind === "care"
          ? "health-care"
          : "diet-meal";

  return `
    <article
      class="checklist-row ${isDone ? "done" : ""} ${isTask ? "task" : "support"}"
      ${isTask && !isDone ? 'draggable="true"' : ""}
      ${isTask && !isDone ? `data-checklist-task="${entry.id}" data-checklist-drop-task="${entry.id}"` : ""}
    >
      <button class="check-toggle ${isDone ? "done" : ""}" ${doneAction} aria-label="${escapeHtml(toggleLabel)}">
        ${isDone ? "OK" : ""}
      </button>
      <div class="checklist-row-main">
        <div class="checklist-row-copy">
          <strong>${escapeHtml(entry.title)}</strong>
          ${meta ? `<div class="meta-row">${meta}</div>` : ""}
          ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
        </div>
        ${subtaskList}
      </div>
      <div class="checklist-row-side">
        ${isTask ? `<span class="checklist-score">${Math.round(entry.score || 0)}</span>` : `<span class="badge">${escapeHtml(entry.period || entry.sectionLabel || "Checklist")}</span>`}
        <div class="task-actions compact-actions">
          ${isTask && !isDone ? `<button class="ghost-button small" data-task-action="today" data-task-id="${entry.id}">Hoje</button>` : ""}
          <button class="ghost-button small" data-action="open-editor" data-kind="${editKind}" data-id="${entry.id}">Editar</button>
        </div>
      </div>
    </article>
  `;
}

function renderChecklistQuickAdd(model) {
  const defaults = model.checklist.quickDefaults || {};
  return `
    <section class="checklist-quick-add">
      <div class="checklist-quick-copy">
        <span class="page-kicker">Nova tarefa</span>
        <strong>Adicionar rapido</strong>
        <p>Capture e execute sem sair da tela operacional.</p>
      </div>
      <form class="checklist-quick-form" data-form="checklist-quick-add">
        <input type="hidden" name="checklistView" value="${escapeHtml(model.checklist.activeView)}" />
        <input type="hidden" name="selectedDate" value="${escapeHtml(model.selectedDate)}" />
        <label class="field">
          <span>Titulo</span>
          <input name="title" placeholder="Ex: ligar para cliente e fechar documento" required />
        </label>
        <div class="field-grid three">
          <label class="field compact">
            <span>Area</span>
            <select name="areaId">
              ${model.options.areas.map((area) => `<option value="${area.id}" ${defaults.areaId === area.id ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field compact">
            <span>Projeto</span>
            <select name="projectId">
              <option value="">Sem projeto</option>
              ${model.options.projects.map((project) => `<option value="${project.id}" ${defaults.projectId === project.id ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field compact">
            <span>Prazo</span>
            <input type="date" name="dueDate" value="${model.checklist.activeView === "today" ? escapeHtml(model.selectedDate) : ""}" />
          </label>
        </div>
        <label class="field">
          <span>Checklist / subtarefas</span>
          <textarea name="checklist" placeholder="Uma linha por item"></textarea>
        </label>
        <div class="toolbar-row">
          <button class="primary-button" type="submit">Adicionar tarefa</button>
          <button class="ghost-button" type="button" data-action="navigate" data-section="inbox">Abrir Entrada</button>
        </div>
      </form>
    </section>
  `;
}

function renderChecklistPage(model, options = {}) {
  const mainGroups = model.checklist.groups?.length
    ? model.checklist.groups.map((group) => `
        <section class="checklist-group">
          <div class="checklist-group-head">
            <h3>${escapeHtml(group.label)}</h3>
            ${badge(`${group.count}`)}
          </div>
          <div class="checklist-group-body">
            ${group.entries.length
              ? group.entries.map((entry) => renderChecklistRow(entry)).join("")
              : emptyState(group.emptyMessage || "Sem itens nesta lista.")}
          </div>
        </section>
      `).join("")
    : emptyState("Nada para executar nesta lista agora.");

  const rail = `
    <aside class="checklist-rail">
      <div class="checklist-rail-card">
        <span class="page-kicker">Listas</span>
        <h3>Execucao rapida</h3>
        <p>Inspirado no TickTick: menos friccao, mais clareza operacional.</p>
      </div>
      <div class="checklist-nav-list">
        ${renderChecklistViewButtons(model, options)}
      </div>
    </aside>
  `;

  const summaryPills = metaPills([
    `${model.checklist.views.find((view) => view.id === model.checklist.activeView)?.label || "Lista atual"}`,
    `${model.checklist.groups.reduce((sum, group) => sum + group.count, 0)} item(ns)`,
    `${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min no dia`,
  ]);

  return `
    <section class="checklist-workspace ${options.isMobile ? "mobile" : ""}">
      ${options.isMobile ? "" : rail}
      <div class="checklist-main">
        <section class="checklist-header">
          <div>
            <span class="page-kicker">Checklist operacional</span>
            <h3>${escapeHtml(model.checklist.views.find((view) => view.id === model.checklist.activeView)?.label || "Checklist")}</h3>
            <p>Marque, edite, arraste e reorganize. O que voce concluir aqui reflete no Hoje e no resto do sistema.</p>
          </div>
          <div class="meta-row">${summaryPills}</div>
        </section>
        ${options.isMobile ? `<div class="checklist-mobile-rail">${renderChecklistViewButtons(model, options)}</div>` : ""}
        ${renderChecklistQuickAdd(model)}
        <section class="checklist-groups">
          ${mainGroups}
        </section>
      </div>
    </section>
  `;
}

function renderOrganizeTaskCard(task, options = {}) {
  return `
    <article class="task-card organize-task-card" draggable="true" data-organize-task="${task.id}">
      <div class="task-card-top">
        <div>
          <div class="meta-row">${metaPills([task.areaName, task.projectName || "", task.gtdDecision, `Score ${Math.round(task.score)}`])}</div>
          <h4>${escapeHtml(task.title)}</h4>
          <p>${escapeHtml(task.nextAction || "Sem proxima acao clara ainda.")}</p>
        </div>
      </div>
      ${task.suggestions?.length ? `<div class="meta-row">${metaPills(task.suggestions)}</div>` : ""}
      <div class="bucket-move-grid">
        ${options.buckets.map((bucket) => `
          <button
            class="bucket-move-button ${task.finalBucket === bucket.id ? "active" : ""}"
            data-action="move-task-bucket"
            data-task-id="${task.id}"
            data-bucket-id="${bucket.id}"
          >
            ${escapeHtml(bucket.label)}
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderHealthStats(stats = {}) {
  return `
    <div class="metric-grid four">
      ${metricCard("Peso", stats.weight ? `${stats.weight} kg` : "Sem dado", stats.weightDelta ? `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta} kg desde o ultimo registro` : "Sem variacao ainda")}
      ${metricCard("Treinos", String(stats.workouts || 0), "Treinos registrados nesta semana")}
      ${metricCard("Cuidados", stats.careDone || "0/0", "Checklist de saude do dia")}
      ${metricCard("Dieta", stats.dietDone || "0/0", "Refeicoes seguidas hoje")}
    </div>
  `;
}

function renderAutoPilotList(autoPilot = []) {
  if (!autoPilot.length) {
    return emptyState("Sem decisoes automaticas relevantes agora.");
  }

  return `
    <div class="stack-list compact-stack">
      ${autoPilot.map((entry) => `
        <article class="reading-card auto-pilot-card">
          <div class="task-card-top">
            <div>
              <strong>${escapeHtml(entry.title)}</strong>
              <p>${escapeHtml(entry.decision)} • ${escapeHtml(entry.bucket)}</p>
            </div>
            ${badge(entry.priorityMode === "manual" ? "Manual" : "Automatico", entry.priorityMode === "manual" ? "warning" : "success")}
          </div>
          ${entry.nextAction ? `<p class="next-action"><strong>Proxima acao:</strong> ${escapeHtml(entry.nextAction)}</p>` : ""}
          ${entry.reasons?.length ? `<div class="meta-row">${metaPills(entry.reasons)}</div>` : ""}
          <div class="toolbar-row">
            <button class="ghost-button small" data-action="open-editor" data-kind="task" data-id="${entry.id}">Ajustar</button>
            <button class="ghost-button small" data-task-action="today" data-task-id="${entry.id}">Mandar para hoje</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHabitWeekMatrixCard(habit) {
  return `
    <article class="habit-week-card">
      <div class="habit-week-head">
        <div>
          <strong>${escapeHtml(habit.title)}</strong>
          <p>${habit.done}/${habit.targetPerWeek} na semana</p>
        </div>
        <button class="ghost-button small" data-action="open-editor" data-kind="habit" data-id="${habit.id}">Editar</button>
      </div>
      ${progressBar(habit.percent)}
      <div class="habit-week-grid">
        ${habit.week.map((day) => `
          <button
            class="habit-day-chip ${day.done ? "done" : ""} ${day.selected ? "selected" : ""}"
            data-action="toggle-habit"
            data-habit-id="${habit.id}"
            data-date="${day.date}"
          >
            <span>${escapeHtml(day.shortLabel.slice(0, 2))}</span>
            <strong>${day.done ? "OK" : "..."}</strong>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function renderAgendaTaskEditor(tasks, model) {
  if (!tasks?.length) {
    return emptyState("Nenhuma tarefa agendada neste dia.");
  }

  return `
    <div class="stack-list compact-stack">
      ${tasks.map((task) => `
        <article class="agenda-editor-card">
          <div class="agenda-editor-top">
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              <p>${escapeHtml(task.areaName)}${task.projectName ? ` • ${escapeHtml(task.projectName)}` : ""}</p>
            </div>
            <button class="ghost-button small" data-action="open-editor" data-kind="task" data-id="${task.id}">Editar</button>
          </div>
          <div class="field-grid two">
            <label class="field compact">
              <span>Dia</span>
              <select data-agenda-task-id="${task.id}" data-agenda-field="scheduledDate">
                ${model.agenda.days.map((day) => `<option value="${day.date}" ${task.scheduledDate === day.date ? "selected" : ""}>${escapeHtml(day.weekdayLabel.slice(0, 3))} • ${escapeHtml(day.shortLabel)}</option>`).join("")}
              </select>
            </label>
            <label class="field compact">
              <span>Periodo</span>
              <select data-agenda-task-id="${task.id}" data-agenda-field="scheduledPeriod">
                ${model.options.periods.map((period) => `<option value="${period.id}" ${task.scheduledPeriod === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("")}
              </select>
            </label>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAgendaBlockEditor(blocks, model) {
  if (!blocks?.length) {
    return emptyState("Nenhum bloco interno neste dia.");
  }

  return `
    <div class="stack-list compact-stack">
      ${blocks.map((block) => `
        <article class="agenda-editor-card">
          <div class="agenda-editor-top">
            <div>
              <strong>${escapeHtml(block.title)}</strong>
              <p>${escapeHtml(block.startTime)} - ${escapeHtml(block.endTime)} • ${escapeHtml(block.period)}</p>
            </div>
            <button class="ghost-button small" data-action="open-editor" data-kind="block" data-id="${block.id}">Editar</button>
          </div>
          <div class="field-grid three">
            <label class="field compact">
              <span>Dia</span>
              <select data-agenda-block-id="${block.id}" data-agenda-field="date">
                ${model.agenda.days.map((day) => `<option value="${day.date}" ${block.date === day.date ? "selected" : ""}>${escapeHtml(day.weekdayLabel.slice(0, 3))} • ${escapeHtml(day.shortLabel)}</option>`).join("")}
              </select>
            </label>
            <label class="field compact">
              <span>Periodo</span>
              <select data-agenda-block-id="${block.id}" data-agenda-field="period">
                ${model.options.periods.map((period) => `<option value="${period.id}" ${block.period === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("")}
              </select>
            </label>
            <label class="field compact">
              <span>Nota</span>
              <input value="${escapeHtml(block.note || "")}" data-agenda-block-id="${block.id}" data-agenda-field="note" />
            </label>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderVoiceCaptureButton(copy = "Captura por voz", section = "inbox") {
  return `
    <button class="ghost-button voice-entry-button" data-action="open-voice-capture" data-source-section="${section}">
      Microfone • ${escapeHtml(copy)}
    </button>
  `;
}

function renderVoiceCaptureModal(voiceState, model) {
  if (!voiceState?.open) {
    return "";
  }

  const draft = voiceState.draft || {
    action: "criar",
    intent: "create-task",
    destination: "inbox",
    title: "",
    areaId: model.options.areas[0]?.id || "",
    projectId: "",
    scheduledDate: "",
    dueDate: "",
    scheduledPeriod: "",
    estimatedMinutes: 30,
    priority: "medium",
    urgency: 3,
    context: "flex",
    checklist: [],
    notes: "",
    suggestedDayTypeId: "",
    healthWeight: 0,
    healthMeasures: {},
    reasons: [],
  };
  const measures = draft.healthMeasures || {};
  const intentLabel = model.options.voiceIntents.find((entry) => entry.id === draft.intent)?.label || draft.intent;
  const destinationLabel = model.options.voiceDestinations.find((entry) => entry.id === draft.destination)?.label || draft.destination;
  const dayTypeLabel = model.options.dayTypes.find((type) => type.id === draft.suggestedDayTypeId)?.label || draft.suggestedDayTypeId;
  const showHealthWeight = draft.intent === "register-weight";
  const showHealthMeasures = draft.intent === "register-measure";
  const showDayType = draft.intent === "change-day-type";

  return `
    <div class="modal-shell" data-action="close-voice-capture-backdrop">
      <div class="modal-card voice-capture-modal" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <span class="page-kicker">Entrada por voz</span>
            <h3>Falar, interpretar e confirmar</h3>
            <p>Voz entra no mesmo motor central do app: o sistema interpreta a intencao, sugere destino e voce confirma antes de salvar.</p>
          </div>
          <button class="ghost-button" type="button" data-action="close-voice-capture">Fechar</button>
        </div>

        <div class="voice-toolbar">
          ${voiceState.supported
            ? `<button class="primary-button" type="button" data-action="${voiceState.listening ? "stop-voice-capture" : "start-voice-capture"}">${voiceState.listening ? "Parar gravacao" : "Iniciar microfone"}</button>`
            : `<span class="badge warning">Navegador sem voz nativa. Use a caixa de texto abaixo.</span>`}
          <button class="secondary-button" type="button" data-action="analyze-voice-capture">Analisar texto</button>
          ${voiceState.listening ? `<span class="voice-live-pill">Ouvindo...</span>` : ""}
        </div>

        <form class="form-grid" data-form="voice-capture-confirm">
          <label class="field">
            <span>Transcricao</span>
            <textarea name="transcript">${escapeHtml(voiceState.transcript || "")}</textarea>
          </label>
          ${voiceState.interim ? `<p class="muted-copy">Ao vivo: ${escapeHtml(voiceState.interim)}</p>` : ""}
          ${voiceState.error ? `<div class="callout warning"><strong>Atencao</strong><p>${escapeHtml(voiceState.error)}</p></div>` : ""}

          <div class="voice-stage-grid">
            <article class="reading-card">
              <span class="page-kicker">Etapa 1</span>
              <strong>Extracao</strong>
              <div class="meta-row">${metaPills([
                `Acao: ${draft.action || "-"}`,
                `Area: ${(model.options.areas.find((area) => area.id === draft.areaId)?.name) || "-"}`,
                `Projeto: ${(model.options.projects.find((project) => project.id === draft.projectId)?.name) || "Sem projeto"}`,
                `Data: ${draft.scheduledDate || draft.dueDate || "-"}`,
                `Periodo: ${(model.options.periods.find((period) => period.id === draft.scheduledPeriod)?.label) || "-"}`,
                `Urgencia: ${draft.urgency || 3}/5`,
                `Contexto: ${draft.context || "-"}`,
              ])}</div>
            </article>
            <article class="reading-card">
              <span class="page-kicker">Etapa 2</span>
              <strong>Intencao</strong>
              <div class="meta-row">${metaPills([intentLabel, destinationLabel])}</div>
              <p class="muted-copy">O sistema tenta entender se voce quer criar tarefa, habito, registrar saude, mudar tipo de dia, agendar, delegar ou remarcar.</p>
            </article>
            <article class="reading-card">
              <span class="page-kicker">Etapa 3</span>
              <strong>Confirmacao assistida</strong>
              <p class="muted-copy">Voce revisa o que foi entendido, corrige se precisar e so depois salva no destino sugerido.</p>
            </article>
          </div>

          <div class="voice-analysis-grid">
            <label class="field"><span>Intencao sugerida</span><select name="intent">${model.options.voiceIntents.map((item) => `<option value="${item.id}" ${draft.intent === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
            <label class="field"><span>Destino sugerido</span><select name="destination">${model.options.voiceDestinations.map((item) => `<option value="${item.id}" ${draft.destination === item.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
            <label class="field"><span>Acao</span><input name="action" value="${escapeHtml(draft.action || "")}" /></label>
            <label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(draft.title || "")}" required /></label>
            <label class="field"><span>Area sugerida</span><select name="areaId">${model.options.areas.map((area) => `<option value="${area.id}" ${draft.areaId === area.id ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("")}</select></label>
            <label class="field"><span>Projeto sugerido</span><select name="projectId"><option value="">Sem projeto</option>${model.options.projects.map((project) => `<option value="${project.id}" ${draft.projectId === project.id ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}</select></label>
            <label class="field"><span>Data sugerida</span><input type="date" name="scheduledDate" value="${escapeHtml(draft.scheduledDate || "")}" /></label>
            <label class="field"><span>Prazo sugerido</span><input type="date" name="dueDate" value="${escapeHtml(draft.dueDate || "")}" /></label>
            <label class="field"><span>Periodo</span><select name="scheduledPeriod"><option value="">Sem periodo</option>${model.options.periods.map((period) => `<option value="${period.id}" ${draft.scheduledPeriod === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("")}</select></label>
            <label class="field"><span>Duracao</span><input type="number" min="5" name="estimatedMinutes" value="${escapeHtml(draft.estimatedMinutes || 30)}" /></label>
            <label class="field"><span>Prioridade</span><select name="priority"><option value="low" ${draft.priority === "low" ? "selected" : ""}>Baixa</option><option value="medium" ${draft.priority === "medium" ? "selected" : ""}>Media</option><option value="high" ${draft.priority === "high" ? "selected" : ""}>Alta</option></select></label>
            <label class="field"><span>Urgencia</span><input type="number" min="1" max="5" name="urgency" value="${escapeHtml(draft.urgency || 3)}" /></label>
            <label class="field"><span>Contexto</span><select name="context">${model.options.contexts.map((context) => `<option value="${context}" ${draft.context === context ? "selected" : ""}>${escapeHtml(context)}</option>`).join("")}</select></label>
          </div>

          ${showDayType ? `
            <div class="field-grid two">
              <label class="field"><span>Tipo de dia</span><select name="suggestedDayTypeId"><option value="">Sem sugestao</option>${model.options.dayTypes.map((type) => `<option value="${type.id}" ${draft.suggestedDayTypeId === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}</select></label>
              <label class="field"><span>Dia alvo</span><input type="date" name="scheduledDate" value="${escapeHtml(draft.scheduledDate || draft.dueDate || "")}" /></label>
            </div>
          ` : ""}

          ${showHealthWeight ? `
            <div class="field-grid two">
              <label class="field"><span>Peso</span><input type="number" step="0.1" name="healthWeight" value="${escapeHtml(draft.healthWeight || "")}" /></label>
              <label class="field"><span>Data do registro</span><input type="date" name="scheduledDate" value="${escapeHtml(draft.scheduledDate || draft.dueDate || "")}" /></label>
            </div>
          ` : ""}

          ${showHealthMeasures ? `
            <div class="field-grid five">
              <label class="field"><span>Cintura</span><input type="number" step="0.1" name="waist" value="${escapeHtml(draft.waist ?? measures.waist ?? "")}" /></label>
              <label class="field"><span>Peito</span><input type="number" step="0.1" name="chest" value="${escapeHtml(draft.chest ?? measures.chest ?? "")}" /></label>
              <label class="field"><span>Quadril</span><input type="number" step="0.1" name="hip" value="${escapeHtml(draft.hip ?? measures.hip ?? "")}" /></label>
              <label class="field"><span>Braco</span><input type="number" step="0.1" name="arm" value="${escapeHtml(draft.arm ?? measures.arm ?? "")}" /></label>
              <label class="field"><span>Coxa</span><input type="number" step="0.1" name="thigh" value="${escapeHtml(draft.thigh ?? measures.thigh ?? "")}" /></label>
            </div>
          ` : ""}

          <label class="field">
            <span>Checklist / proximas acoes</span>
            <textarea name="checklist">${escapeHtml((draft.checklist || []).join("\n"))}</textarea>
          </label>
          <label class="field">
            <span>Observacao</span>
            <textarea name="notes">${escapeHtml(draft.notes || "")}</textarea>
          </label>

          ${draft.suggestedDayTypeId && !showDayType
            ? `<div class="meta-row">${metaPills([`Tipo de dia sugerido: ${dayTypeLabel}`])}</div>`
            : ""}
          ${draft.reasons?.length ? `<div class="meta-row">${metaPills(draft.reasons)}</div>` : ""}

          <div class="toolbar-row">
            <button class="primary-button" type="submit">Confirmar e salvar</button>
            <button class="ghost-button" type="button" data-action="analyze-voice-capture">Atualizar sugestoes</button>
          </div>
        </form>

        <div class="reading-card">
          <strong>Base pronta para evolucao</strong>
          <p>Quando o WhatsApp entrar, ele pode usar esse mesmo rascunho interpretado, com intencao, destino e historico das suas correcoes.</p>
        </div>
      </div>
    </div>
  `;
}

function renderMobileTopbar(model, options = {}) {
  const page = PAGE_META[model.activeSection] || PAGE_META.today;
  return `
    <section class="mobile-topbar-card">
      <div class="mobile-topbar-row">
        <button
          class="ghost-button small icon-button"
          data-action="${options.navOpen ? "close-mobile-nav" : "toggle-mobile-nav"}"
          aria-label="${options.navOpen ? "Fechar menu" : "Abrir menu"}"
        >
          ${options.navOpen ? "Fechar" : "Menu"}
        </button>
        <div class="mobile-topbar-copy">
          <span class="page-kicker">${escapeHtml(page.kicker)}</span>
          <strong>${escapeHtml(page.title)}</strong>
        </div>
        <button class="ghost-button small" data-action="navigate" data-section="inbox">Entrada</button>
      </div>
    </section>
  `;
}

function renderSidebar(model, options = {}) {
  const mobileClass = options.isMobile ? "mobile-drawer" : "";
  const openClass = options.isMobile && options.navOpen ? "open" : "";
  return `
    <aside class="workspace-sidebar ${mobileClass} ${openClass}" ${options.isMobile ? `aria-hidden="${options.navOpen ? "false" : "true"}"` : ""}>
      ${options.isMobile ? `
        <div class="mobile-sidebar-head">
          <span class="page-kicker">Navegacao</span>
          <button class="ghost-button small" data-action="close-mobile-nav">Fechar</button>
        </div>
      ` : ""}
      <div class="brand-block">
        <span class="brand-kicker">Life OS Thz 2026</span>
        <h1>Workspace de vida e trabalho</h1>
        <p>Um sistema unico para decidir, executar e reorganizar a semana real.</p>
      </div>
      ${SECTION_GROUPS.map((group) => `
        <div class="nav-group">
          <h2>${escapeHtml(group.label)}</h2>
          ${group.items.map((item) => `
            <button class="nav-button ${model.activeSection === item.id ? "active" : ""}" data-action="navigate" data-section="${item.id}">
              ${escapeHtml(item.label)}
            </button>
          `).join("")}
        </div>
      `).join("")}
      <div class="sidebar-footer">
        <button class="ghost-button full" data-action="toggle-edit-mode">${model.editMode ? "Sair do modo edicao" : "Entrar no modo edicao"}</button>
        <button class="ghost-button full" data-action="reset-app">Resetar base local</button>
      </div>
    </aside>
  `;
}

function renderWeekRail(model, options = {}) {
  return `
    <section class="week-rail ${options.isMobile ? "mobile-rail" : ""}">
      ${model.week.days.map((day) => `
        <article class="day-chip ${day.date === model.selectedDate ? "selected" : ""}">
          <button class="day-chip-hit" data-action="select-day" data-date="${day.date}">
            <strong>${escapeHtml(day.weekdayLabel.slice(0, 3))}</strong>
            <span>${escapeHtml(day.shortLabel)}</span>
            <small>${escapeHtml(day.type.label)}</small>
            <small>${day.totalLoad}/${day.totalCapacity} min</small>
            <small>${day.alerts} alerta(s)</small>
          </button>
          ${day.date === model.selectedDate ? `
            <select class="inline-select" data-day-type-date="${day.date}">
              ${model.options.dayTypes.map((type) => `<option value="${type.id}" ${day.type.id === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}
            </select>
          ` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function renderScopeFilters(model) {
  return `
    <div class="filters-row">
      ${model.options.scopes.map((scope) => `
        <button class="chip-button ${model.filters.scope === scope.id ? "active" : ""}" data-action="set-filter" data-filter-name="scope" data-filter-value="${scope.id}">${escapeHtml(scope.label)}</button>
      `).join("")}
    </div>
  `;
}

function renderFilterGrid(model) {
  return `
    <div class="filter-grid">
      <label class="field compact"><span>Area</span><select data-filter="areaId"><option value="all">Todas</option>${model.options.areas.map((area) => `<option value="${area.id}" ${model.filters.areaId === area.id ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("")}</select></label>
      <label class="field compact"><span>Projeto</span><select data-filter="projectId"><option value="all">Todos</option>${model.options.projects.map((project) => `<option value="${project.id}" ${model.filters.projectId === project.id ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}</select></label>
      <label class="field compact"><span>Contexto</span><select data-filter="context"><option value="all">Todos</option>${model.options.contexts.map((context) => `<option value="${context}" ${model.filters.context === context ? "selected" : ""}>${escapeHtml(context)}</option>`).join("")}</select></label>
      <label class="field compact"><span>Tipo do dia</span><select data-filter="dayTypeId"><option value="all">Todos</option>${model.options.dayTypes.map((type) => `<option value="${type.id}" ${model.filters.dayTypeId === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}</select></label>
    </div>
  `;
}

function renderHeaderToolbar(model, options = {}) {
  return `
    <div class="toolbar-row ${options.subtle ? "subtle-toolbar" : ""}">
      <button class="ghost-button" data-action="clear-filters">Limpar filtros</button>
      <button class="secondary-button" data-action="replan-week">Reorganizar semana</button>
      <button class="primary-button" data-action="navigate" data-section="inbox">${options.mobileCopy ? "Nova captura" : "Nova captura"}</button>
    </div>
  `;
}

function renderHeader(model, options = {}) {
  const page = PAGE_META[model.activeSection] || PAGE_META.today;
  if (options.isMobile) {
    return `
      <section class="workspace-header-card mobile-header-card">
        <div class="workspace-cover-band compact">
          <span class="cover-title">${escapeHtml(page.title)}</span>
        </div>
        <div class="header-main-row">
          <div>
            <span class="page-kicker">${escapeHtml(page.kicker)}</span>
            <h2>${escapeHtml(page.title)}</h2>
            <p>${escapeHtml(page.text)}</p>
          </div>
          <div class="header-badges mobile-header-badges">
            ${badge(`Energia ${model.dashboard.energyLabel}`)}
            ${model.selectedDay.alerts ? badge(`${model.selectedDay.alerts} alerta(s)`, "warning") : badge("Sem alertas", "success")}
          </div>
        </div>
        ${renderWeekRail(model, options)}
        <div class="mobile-header-summary">
          <span>${escapeHtml(model.selectedDay.type.label)}</span>
          <span>${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min</span>
          <span>${escapeHtml(model.selectedDay.longLabel)}</span>
        </div>
        <div class="toolbar-row mobile-quick-actions">
          <button class="secondary-button" data-action="replan-week">Reorganizar</button>
          <button class="ghost-button" data-action="navigate" data-section="prioritize">Priorizar</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="workspace-context-stack">
      <article class="workspace-page-card">
        <div class="workspace-cover-band">
          <div class="cover-badge">Life OS Thz 2026</div>
          <div class="cover-copy">
            <strong>${escapeHtml(page.title)}</strong>
            <span>${escapeHtml(page.text)}</span>
          </div>
        </div>
        <div class="header-main-row">
          <div>
            <span class="page-kicker">${escapeHtml(page.kicker)}</span>
            <h2>${escapeHtml(page.title)}</h2>
            <p>${escapeHtml(page.text)}</p>
          </div>
          <div class="header-badges">
            ${badge(`Energia ${model.dashboard.energyLabel}`)}
            ${badge(`Metodo ${model.options.methods.find((item) => item.id === model.priorityMethod)?.label || model.priorityMethod}`)}
          </div>
        </div>
      </article>
      <article class="workspace-week-card">
        <div class="panel-head">
          <div>
            <span class="page-kicker">Semana ativa</span>
            <h3>${escapeHtml(model.selectedDay.longLabel)}</h3>
            <p>${escapeHtml(model.selectedDay.type.label)} • ${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min • ${model.selectedDay.alerts} alerta(s)</p>
          </div>
          <div class="meta-row">
            ${metaPills([
              model.dashboard.currentSprint ? `Sprint: ${model.dashboard.currentSprint.title}` : "Sem sprint ativo",
              `${model.dashboard.weekProgress.percent}% da semana concluida`,
              `${model.dashboard.daysToMove} dias para mudanca`,
            ])}
          </div>
        </div>
        ${renderWeekRail(model, options)}
      </article>
      <article class="workspace-controls-card">
        ${renderScopeFilters(model)}
        ${renderFilterGrid(model)}
        ${renderHeaderToolbar(model, { subtle: true })}
      </article>
    </section>
  `;
}

function renderDashboardPage(model) {
  const cards = {
    overview: layoutCard("dashboard", "overview", "Panorama da semana", `
      <div class="metric-grid four">
        ${metricCard("Sprint", model.dashboard.currentSprint ? `${model.dashboard.currentSprint.progress}%` : "Sem sprint", model.dashboard.currentSprint?.title || "Sem dado")}
        ${metricCard("Semana", `${model.dashboard.weekProgress.percent}%`, `${model.dashboard.weekProgress.done}/${model.dashboard.weekProgress.total} concluidas`) }
        ${metricCard("Energia", model.dashboard.energyLabel, "Usada para capacidade real")}
        ${metricCard("Dias para mudanca", String(model.dashboard.daysToMove), "Meta ate novembro")}
      </div>
    `, model),
    radar: layoutCard("dashboard", "radar", "Radar da semana", `
      <div class="stack-list">
        ${(model.dashboard.alerts.length ? model.dashboard.alerts : [{ title: "Semana sob controle", gtdDecision: "OK", areaName: "Sistema", score: 0, reasons: ["sem gargalos criticos"], suggestions: [], subtasks: [] }]).map((task) => task.id ? taskCard(task, { mode: "alert" }) : `<div class="callout success"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.reasons[0])}</p></div>`).join("")}
      </div>
    `, model),
    goals: layoutCard("dashboard", "goals", "Metas principais", `
      <div class="stack-list compact-stack">
        ${model.dashboard.mainGoals.map((goal) => `
          <div class="goal-row">
            <div><strong>${escapeHtml(goal.title)}</strong><p>${escapeHtml(goal.description)}</p></div>
            <div class="goal-meter">${progressBar(goal.progress)}<span>${goal.progress}%</span></div>
          </div>
        `).join("")}
      </div>
    `, model),
    areas: layoutCard("dashboard", "areas", "Resumo das areas", `
      <div class="stack-list compact-stack">
        ${model.dashboard.areaSummaries.map((area) => `
          <article class="summary-row">
            <div><strong>${escapeHtml(area.name)}</strong><p>${escapeHtml(area.description)}</p></div>
            <div class="meta-row">${metaPills([`${area.openCount} abertas`, `${area.priorityCount} fortes`, `${area.alerts} alertas`])}</div>
          </article>
        `).join("")}
      </div>
    `, model),
    projects: layoutCard("dashboard", "projects", "Resumo dos projetos", `
      <div class="stack-list compact-stack">
        ${model.dashboard.projectSummaries.map((project) => `
          <article class="summary-row">
            <div><strong>${escapeHtml(project.name)}</strong><p>${escapeHtml(project.summary)}</p></div>
            <div class="meta-row">${metaPills([`${project.openCount} abertas`, `${project.progress}% previsivel`])}</div>
          </article>
        `).join("")}
      </div>
    `, model),
    load: layoutCard("dashboard", "load", "Carga semanal", `
      <div class="week-load-grid">
        ${model.dashboard.load.days.map((day) => `
          <article class="load-cell ${day.overload ? "overload" : ""}">
            <strong>${escapeHtml(day.weekdayLabel.slice(0, 3))}</strong>
            <span>${escapeHtml(day.type.label)}</span>
            <small>${day.totalLoad}/${day.totalCapacity} min</small>
          </article>
        `).join("")}
      </div>
    `, model),
  };

  return `<section class="layout-grid">${model.settings.layouts.dashboard.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderTodayPage(model, options = {}) {
  const topPriorities = model.selectedDay.tasks.slice(0, 3);
  const queue = model.selectedDay.tasks.slice(3, options.isMobile ? 8 : 10);
  const alertTasks = model.selectedDay.tasks.filter((task) => task.manualDecision || task.location === "alert");
  const cards = {
    focus: layoutCard("today", "focus", "3 prioridades do dia", taskList(topPriorities, { emphasis: true, empty: "O dia esta leve. Use para recuperar energia ou simplificar backlog." }), model, { wide: true }),
    queue: layoutCard("today", "queue", "Fila do dia", taskList(queue, { empty: "Sem fila pendente para hoje." }), model),
    checklist: layoutCard("today", "checklist", "Checklist do dia", `
      <div class="today-checklist-head">
        <div class="meta-row">${metaPills([
          `${model.todayChecklist.items.filter((item) => item.done).length} feito(s)`,
          `${model.todayChecklist.items.length} item(ns)`,
          model.health.stats.careDone,
        ])}</div>
        <p class="muted-copy">Rotina, habitos, saude e acompanhamento rapido em uma so visao.</p>
      </div>
      ${renderChecklistItems(model.todayChecklist.items, model.selectedDate)}
    `, model),
    alerts: layoutCard("today", "alerts", "Tipo de dia, carga e alertas", `
      <div class="stack-list compact-stack">
        <div class="callout ${model.selectedDay.lowCapacity ? "warning" : "success"}">
          <strong>${escapeHtml(model.selectedDay.type.label)}</strong>
          <p>${escapeHtml(model.selectedDay.type.explanation)} ${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min previstos.</p>
        </div>
        <div class="period-grid">
          ${model.selectedDay.periods.map((period) => `
            <article class="mini-period ${period.overload ? "overload" : ""}">
              <strong>${escapeHtml(period.label)}</strong>
              <span>${escapeHtml(period.type.label)}</span>
              <small>${period.load}/${period.capacity} min</small>
            </article>
          `).join("")}
        </div>
        ${taskList(alertTasks, { empty: "Nenhuma decisao manual pendente.", mode: "alert" })}
      </div>
    `, model),
  };

  const mobileAlertStrip = options.isMobile
    ? `
      <section class="mobile-alert-strip">
        ${alertTasks.length
          ? alertTasks.slice(0, 2).map((task) => `
              <article class="callout warning">
                <strong>${escapeHtml(task.title)}</strong>
                <p>${escapeHtml(task.reasons?.[0] || "Precisa de decisao manual.")}</p>
                <div class="task-actions compact-actions">
                  <button class="tiny-button" data-task-action="resolve-now" data-task-id="${task.id}">Resolver</button>
                  <button class="tiny-button ghost" data-task-action="auto-defer" data-task-id="${task.id}">Adiar</button>
                  <button class="tiny-button ghost" data-action="open-editor" data-kind="task" data-id="${task.id}">Editar</button>
                </div>
              </article>
            `).join("")
          : `<article class="callout success"><strong>Dia limpo</strong><p>Sem alertas manuais pendentes.</p></article>`}
      </section>
    `
    : "";

  return `
    <section class="today-hero">
      <div>
        <span class="page-kicker">${escapeHtml(model.selectedDay.type.label)}</span>
        <h3>${escapeHtml(topPriorities[0]?.title || model.dashboard.currentSprint?.title || "Dia organizado para caber na sua rotina real")}</h3>
        <p>${escapeHtml(model.selectedDay.longLabel)} • ${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min • ${model.selectedDay.alerts} alerta(s)</p>
      </div>
      <div class="toolbar-row">
        <button class="primary-button" data-action="navigate" data-section="checklist">Abrir checklist</button>
        <button class="secondary-button" data-action="navigate" data-section="prioritize">Abrir priorizacao</button>
        <button class="ghost-button" data-action="navigate" data-section="inbox">Capturar algo novo</button>
        ${renderVoiceCaptureButton("Entrada rapida", "today")}
      </div>
    </section>
    ${mobileAlertStrip}
    <section class="layout-grid">${model.settings.layouts.today.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>
  `;
}

function renderDaysPage(model) {
  return `
    <section class="page-grid two">
      ${panel("Leitura do dia", `
        <div class="callout ${model.selectedDay.lowCapacity ? "warning" : ""}">
          <strong>${escapeHtml(model.selectedDay.type.label)}</strong>
          <p>${escapeHtml(model.selectedDay.type.explanation)} ${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min usados.</p>
        </div>
        <div class="period-editor-grid">
          ${model.selectedDay.periods.map((period) => `
            <article class="period-card ${period.overload ? "overload" : ""}">
              <div class="period-head"><strong>${escapeHtml(period.label)}</strong><span>${period.load}/${period.capacity} min</span></div>
              <select data-period-type-date="${model.selectedDay.date}" data-period-id="${period.id}">
                ${model.options.dayTypes.map((type) => `<option value="${type.id}" ${period.type.id === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("")}
              </select>
              ${taskList(period.tasks, { empty: "Sem tarefas neste periodo." })}
            </article>
          `).join("")}
        </div>
      `, { badge: model.selectedDay.lowCapacity ? "Capacidade baixa" : "Capacidade ok", badgeTone: model.selectedDay.lowCapacity ? "warning" : "success" })}
      ${panel("Urgentes e alertas", taskList(model.selectedDay.tasks.filter((task) => task.critical || task.manualDecision || task.location === "alert"), { empty: "Nenhum item urgente no dia.", mode: "alert" }))}
    </section>
  `;
}
function renderInboxPage(model) {
  return `
    <section class="page-grid two">
      ${panel("Nova captura", `
        <div class="toolbar-row">
          ${renderVoiceCaptureButton("Nova tarefa falada", "inbox")}
          <span class="muted-copy">Fale, revise e mande para a mesma Inbox do app.</span>
        </div>
        <form class="form-grid" data-form="capture-task">
          <label class="field"><span>Titulo</span><input name="title" required /></label>
          <div class="field-grid two">
            <label class="field"><span>Area</span><select name="areaId">${model.options.areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}</select></label>
            <label class="field"><span>Projeto</span><select name="projectId"><option value="">Sem projeto</option>${model.options.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")}</select></label>
          </div>
          <div class="field-grid three">
            <label class="field"><span>Prazo</span><input type="date" name="dueDate" /></label>
            <label class="field"><span>Duracao</span><input type="number" name="estimatedMinutes" min="5" value="30" /></label>
            <label class="field"><span>Contexto</span><select name="context">${model.options.contexts.map((context) => `<option value="${context}">${escapeHtml(context)}</option>`).join("")}</select></label>
          </div>
          <label class="field">
            <span>Checklist / proximas acoes</span>
            <textarea name="checklist" placeholder="Uma linha por item&#10;Ex: abrir planilha&#10;validar valores&#10;enviar resposta"></textarea>
          </label>
          <label class="field"><span>Observacao opcional</span><textarea name="notes" placeholder="Contexto extra, se precisar."></textarea></label>
          <button class="primary-button" type="submit">Adicionar na entrada</button>
        </form>
      `)}
      ${panel("Inbox", `
        <div class="callout success">
          <strong>Capturar primeiro, organizar depois.</strong>
          <p>O checklist vira base de proxima acao e ajuda a priorizacao automatica.</p>
        </div>
        ${taskList(model.inbox, { empty: "Inbox limpa. Capture com poucas friccoes." })}
      `)}
    </section>
  `;
}

function renderPrioritizePage(model, options = {}) {
  if (options.isMobile) {
    return `
      <section class="mobile-prioritize-stack">
        ${panel("Metodo atual", `
          <div class="method-strip mobile-method-strip">${model.options.methods.map((item) => `<button class="chip-button ${model.priorityMethod === item.id ? "active" : ""}" data-action="set-priority-method" data-method="${item.id}">${escapeHtml(item.label)}</button>`).join("")}</div>
          <p class="muted-copy">${escapeHtml(model.options.methods.find((item) => item.id === model.priorityMethod)?.guide || "")}</p>
          <div class="mobile-stage-summary">
            ${model.prioritize.stages.map((stage) => `<article class="stage-summary-card"><strong>${stage.count}</strong><span>${escapeHtml(stage.decision)}</span></article>`).join("")}
          </div>
        `)}
        ${panel("Sapo do dia e da semana", `
          <div class="stack-list compact-stack">
            ${model.prioritize.dayFrog ? taskCard(model.prioritize.dayFrog, { emphasis: true, mode: "mobile-prioritize" }) : emptyState("Nenhum sapo do dia definido.")}
            ${model.prioritize.weekFrog ? taskCard(model.prioritize.weekFrog, { emphasis: true, mode: "mobile-prioritize" }) : emptyState("Nenhum sapo da semana definido.")}
          </div>
        `)}
        ${panel("Piloto automatico", renderAutoPilotList(model.prioritize.autoPilot))}
        ${panel("Fila para decidir", taskList(model.prioritize.ranked.slice(0, 6), { empty: "Nada para refinar agora.", mode: "mobile-prioritize" }))}
        ${panel("Linha de raciocinio", `
          <div class="reading-card">
            <p>${escapeHtml(truncateText(model.settings.reasoningLine, 240))}</p>
            <button class="ghost-button" data-action="navigate" data-section="settings">Editar linha de raciocinio</button>
          </div>
        `)}
      </section>
    `;
  }

  const cards = {
    pipeline: layoutCard("prioritize", "pipeline", "Pipeline de priorizacao", `
      <div class="method-strip">${model.options.methods.map((item) => `<button class="chip-button ${model.priorityMethod === item.id ? "active" : ""}" data-action="set-priority-method" data-method="${item.id}">${escapeHtml(item.label)}</button>`).join("")}</div>
      <p class="muted-copy">${escapeHtml(model.options.methods.find((item) => item.id === model.priorityMethod)?.guide || "")}</p>
      <div class="stage-grid">${model.prioritize.stages.map((stage) => `<article class="stage-card"><strong>${escapeHtml(stage.decision)}</strong><span>${stage.count} tarefa(s)</span><div class="stage-mini-list">${stage.tasks.slice(0, 3).map((task) => `<small>${escapeHtml(task.title)}</small>`).join("") || "<small>Sem itens</small>"}</div></article>`).join("")}</div>
    `, model, { wide: true }),
    frogs: layoutCard("prioritize", "frogs", "Sapo do dia e da semana", `
      <div class="stack-list compact-stack">
        ${model.prioritize.dayFrog ? taskCard(model.prioritize.dayFrog, { emphasis: true }) : emptyState("Nenhum sapo do dia definido.")}
        ${model.prioritize.weekFrog ? taskCard(model.prioritize.weekFrog, { emphasis: true }) : emptyState("Nenhum sapo da semana definido.")}
      </div>
    `, model),
    auto: layoutCard("prioritize", "auto", "Piloto automatico", `
      <div class="callout success">
        <strong>Priorizacao automatica ligada.</strong>
        <p>A linha de raciocinio orienta GTD, Sapo e refino agil. Voce ajusta so quando precisar corrigir.</p>
      </div>
      ${renderAutoPilotList(model.prioritize.autoPilot)}
    `, model),
    ranked: layoutCard("prioritize", "ranked", "Refino final e explicacao", `
      ${taskList(model.prioritize.ranked, { empty: "Nada para refinar agora." })}
      <div class="reading-card">
        <strong>Linha de raciocinio</strong>
        <p>${escapeHtml(model.settings.reasoningLine)}</p>
        <button class="ghost-button small" data-action="navigate" data-section="settings">Editar linha de raciocinio</button>
      </div>
    `, model, { wide: true }),
  };

  return `<section class="layout-grid">${model.settings.layouts.prioritize.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderOrganizePage(model, options = {}) {
  if (options.isMobile) {
    return `
      <section class="organize-mobile-stack">
        ${model.organize.map((bucket) => panel(bucket.label, `
          <div class="stack-list compact-stack">
            ${bucket.tasks.length
              ? bucket.tasks.map((task) => renderOrganizeTaskCard(task, { buckets: model.options.buckets })).join("")
              : emptyState("Sem tarefas nesta secao.")}
          </div>
        `, { badge: `${bucket.tasks.length}` }))}
      </section>
    `;
  }

  const cards = {
    board: layoutCard("organize", "board", "Quadro operacional", `
      <section class="organize-board">
        ${model.organize.map((bucket) => `
          <article class="board-column organize-drop-zone" data-organize-bucket="${bucket.id}">
            <div class="panel-head">
              <h3>${escapeHtml(bucket.label)}</h3>
              ${badge(`${bucket.tasks.length}`)}
            </div>
            <p class="muted-copy">Arraste tarefas entre as caixas ou use os botoes dentro do card.</p>
            <div class="stack-list compact-stack">
              ${bucket.tasks.length
                ? bucket.tasks.map((task) => renderOrganizeTaskCard(task, { buckets: model.options.buckets })).join("")
                : emptyState("Sem tarefas nesta coluna.")}
            </div>
          </article>
        `).join("")}
      </section>
    `, model, { wide: true }),
    summary: layoutCard("organize", "summary", "Leitura simples da organizacao", `
      <div class="metric-grid four">
        ${metricCard("Fazer agora", String(model.organize.find((bucket) => bucket.id === "do-now")?.tasks.length || 0), "Execucao imediata")}
        ${metricCard("Prioridade", String(model.organize.find((bucket) => bucket.id === "priority")?.tasks.length || 0), "Importantes sem engessar o dia")}
        ${metricCard("Agendar", String(model.organize.find((bucket) => bucket.id === "schedule")?.tasks.length || 0), "Tarefas com encaixe futuro")}
        ${metricCard("Backlog", String(model.organize.find((bucket) => bucket.id === "backlog")?.tasks.length || 0), "Precisa de limpeza continua")}
      </div>
      <div class="callout">
        <strong>Complexo por tras, simples na frente.</strong>
        <p>As tarefas chegam aqui processadas pela priorizacao automatica. Esta tela serve para o ajuste final do fluxo de execucao.</p>
      </div>
    `, model, { wide: true }),
  };

  return `<section class="layout-grid">${model.settings.layouts.organize.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderAreasPage(model) {
  return `<section class="page-grid two">${model.areas.map((area) => panel(area.name, `<p class="muted-copy">${escapeHtml(area.description)}</p><div class="meta-row">${metaPills([`${area.openCount} abertas`, `${area.priorityCount} em destaque`, `${area.alerts} alertas`])}</div>${taskList(area.nextTasks, { empty: "Sem tarefas abertas nesta area." })}<div class="toolbar-row"><button class="ghost-button" data-action="open-editor" data-kind="area" data-id="${area.id}">Editar area</button></div>`)).join("")}</section>`;
}

function renderProjectsPage(model) {
  return `<section class="page-grid two">${model.projects.map((project) => panel(project.name, `<p class="muted-copy">${escapeHtml(project.summary)}</p><div class="meta-row">${metaPills([`${project.openCount} abertas`, `${project.progress}% previsivel`])}</div>${taskList(project.nextTasks, { empty: "Sem tarefas abertas neste projeto." })}<div class="toolbar-row"><button class="ghost-button" data-action="open-editor" data-kind="project" data-id="${project.id}">Editar projeto</button></div>`)).join("")}</section>`;
}

function renderRoutinePage(model) {
  const cards = {
    today: layoutCard("routine", "today", "Checklist e ritmo do dia", `
      <div class="routine-dual-grid">
        <div class="reading-card">
          <div class="panel-head">
            <div><strong>Manha</strong><p>Base da casa, filhos e ajuste inicial do dia.</p></div>
            <button class="ghost-button small" data-action="open-editor" data-kind="routine" data-id="new-routine">Novo item</button>
          </div>
          <div class="stack-list compact-stack">
            ${model.routine.morning.map((item) => `<label class="check-row"><span>${escapeHtml(item.title)}</span><div class="task-actions compact-actions"><button class="tiny-button ${(item.doneToday || false) ? "ghost" : ""}" data-action="toggle-routine-inline" data-routine-id="${item.id}" data-date="${model.selectedDate}">${(item.doneToday || false) ? "Feito" : "Marcar"}</button><button class="ghost-button small" data-action="open-editor" data-kind="routine" data-id="${item.id}">Editar</button></div></label>`).join("") || emptyState("Sem itens de manha.")}
          </div>
        </div>
        <div class="reading-card">
          <div class="panel-head">
            <div><strong>Noite</strong><p>Fechamento leve e preparo do proximo dia.</p></div>
            <button class="ghost-button small" data-action="open-editor" data-kind="routine" data-id="new-routine">Novo item</button>
          </div>
          <div class="stack-list compact-stack">
            ${model.routine.night.map((item) => `<label class="check-row"><span>${escapeHtml(item.title)}</span><div class="task-actions compact-actions"><button class="tiny-button ${(item.doneToday || false) ? "ghost" : ""}" data-action="toggle-routine-inline" data-routine-id="${item.id}" data-date="${model.selectedDate}">${(item.doneToday || false) ? "Feito" : "Marcar"}</button><button class="ghost-button small" data-action="open-editor" data-kind="routine" data-id="${item.id}">Editar</button></div></label>`).join("") || emptyState("Sem itens de noite.")}
          </div>
        </div>
      </div>
    `, model, { wide: true }),
    habits: layoutCard("routine", "habits", "Habitos do dia", `
      <div class="toolbar-row">
        <button class="primary-button" data-action="open-editor" data-kind="habit" data-id="new-habit">Novo habito</button>
        <span class="muted-copy">Tudo editavel e marcavel por dia.</span>
      </div>
      <div class="stack-list compact-stack">
        ${model.routine.habits.map((habit) => `
          <article class="habit-row">
            <div>
              <strong>${escapeHtml(habit.title)}</strong>
              <p>${habit.done}/${habit.targetPerWeek} na semana</p>
              ${progressBar(habit.percent)}
            </div>
            <div class="task-actions compact-actions">
              <button class="secondary-button" data-action="toggle-habit" data-habit-id="${habit.id}" data-date="${model.selectedDate}">${habit.doneToday ? "Desmarcar hoje" : "Marcar hoje"}</button>
              <button class="ghost-button small" data-action="open-editor" data-kind="habit" data-id="${habit.id}">Editar</button>
            </div>
          </article>
        `).join("") || emptyState("Sem habitos cadastrados ainda.")}
      </div>
    `, model),
    calendar: layoutCard("routine", "calendar", "Calendario simples dos habitos", `
      <div class="stack-list compact-stack">
        ${model.routine.habits.map((habit) => renderHabitWeekMatrixCard(habit, model.selectedDate)).join("") || emptyState("Sem habitos para acompanhar por semana.")}
      </div>
    `, model),
    energy: layoutCard("routine", "energy", "Energia e saude da semana", `
      <div class="energy-strip">${[1, 2, 3, 4, 5].map((level) => `<button class="chip-button" data-action="set-energy" data-energy="${level}">${level}</button>`).join("")}</div>
      <div class="stack-list compact-stack">
        ${model.routine.careItems.map((item) => `
          <label class="check-row">
            <span>${escapeHtml(item.title)}</span>
            <div class="task-actions compact-actions">
              <button class="tiny-button ${item.doneToday ? "ghost" : ""}" data-action="toggle-care-inline" data-care-id="${item.id}" data-date="${model.selectedDate}">${item.doneToday ? "Feito" : "Marcar"}</button>
              <button class="ghost-button small" data-action="open-editor" data-kind="health-care" data-id="${item.id}">Editar</button>
            </div>
          </label>
        `).join("") || emptyState("Sem checklist de saude por aqui.")}
      </div>
      ${taskList(model.routine.healthTasks, { empty: "Sem tarefas de saude nesta semana." })}
    `, model, { wide: true }),
  };

  return `<section class="layout-grid">${model.settings.layouts.routine.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderPlanningPage(model) {
  return `
    <section class="page-grid two">
      ${panel("Sprint atual", model.planning.currentSprint ? `<div class="reading-card"><strong>${escapeHtml(model.planning.currentSprint.title)}</strong><p>${escapeHtml(model.planning.currentSprint.theme)}</p><div class="meta-row">${metaPills(model.planning.currentSprint.keyResults)}</div></div>` : emptyState("Sem sprint atual."), { wide: true })}
      ${panel("Objetivos", `<div class="stack-list compact-stack">${model.planning.objectives.map((objective) => `<article class="goal-row"><div><strong>${escapeHtml(objective.title)}</strong><p>${escapeHtml(objective.description)}</p></div><div class="goal-meter">${progressBar(objective.progress)}<span>${objective.progress}%</span></div></article>`).join("")}</div>`)}
      ${panel("Backlog", taskList(model.planning.backlog, { empty: "Backlog limpo." }))}
      ${panel("Modelos", taskList(model.planning.templates, { empty: "Sem modelos ainda." }))}
    </section>
  `;
}

function renderHealthPage(model) {
  const latestMeasures = model.health.latestMeasures;
  const cards = {
    overview: layoutCard("health", "overview", "Saude do dia e evolucao", `
      ${renderHealthStats(model.health.stats)}
      <div class="health-quick-grid">
        <form class="form-grid mini-form" data-form="health-weight">
          <div class="panel-head">
            <div><h3>Peso</h3><p>Registro rapido para manter frequencia.</p></div>
            <button class="ghost-button small" type="button" data-action="open-editor" data-kind="health-weight" data-id="new-health-weight">Abrir editor</button>
          </div>
          <div class="field-grid three">
            <label class="field compact"><span>Data</span><input type="date" name="date" value="${escapeHtml(model.selectedDate)}" /></label>
            <label class="field compact"><span>Peso</span><input type="number" step="0.1" name="weight" /></label>
            <label class="field compact"><span>Nota</span><input name="note" /></label>
          </div>
          <button class="primary-button" type="submit">Salvar peso</button>
        </form>
        <form class="form-grid mini-form" data-form="health-measure">
          <div class="panel-head">
            <div><h3>Medidas</h3><p>Cintura, peito, quadril, braco e coxa.</p></div>
            <button class="ghost-button small" type="button" data-action="open-editor" data-kind="health-measure" data-id="new-health-measure">Abrir editor</button>
          </div>
          <div class="field-grid three">
            <label class="field compact"><span>Data</span><input type="date" name="date" value="${escapeHtml(model.selectedDate)}" /></label>
            <label class="field compact"><span>Cintura</span><input type="number" step="0.1" name="waist" /></label>
            <label class="field compact"><span>Peito</span><input type="number" step="0.1" name="chest" /></label>
          </div>
          <div class="field-grid three">
            <label class="field compact"><span>Quadril</span><input type="number" step="0.1" name="hip" /></label>
            <label class="field compact"><span>Braco</span><input type="number" step="0.1" name="arm" /></label>
            <label class="field compact"><span>Coxa</span><input type="number" step="0.1" name="thigh" /></label>
          </div>
          <button class="primary-button" type="submit">Salvar medidas</button>
        </form>
      </div>
    `, model, { wide: true }),
    care: layoutCard("health", "care", "Checklist de cuidados", `
      <form class="form-grid mini-form" data-form="health-care">
        <div class="field-grid two">
          <label class="field compact"><span>Novo item</span><input name="title" placeholder="Beber agua, suplemento, alongamento..." /></label>
          <label class="field compact"><span>Nota</span><input name="note" placeholder="Meta ou detalhe" /></label>
        </div>
        <button class="primary-button" type="submit">Adicionar cuidado</button>
      </form>
      <div class="stack-list compact-stack">
        ${model.health.careItems.map((item) => `
          <article class="checklist-card ${item.doneToday ? "done" : ""}">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.note || "Rotina de cuidado diario")}</p>
            </div>
            <div class="task-actions compact-actions">
              <button class="tiny-button ${item.doneToday ? "ghost" : ""}" data-action="toggle-care-inline" data-care-id="${item.id}" data-date="${model.selectedDate}">${item.doneToday ? "Feito" : "Marcar"}</button>
              <button class="ghost-button small" data-action="open-editor" data-kind="health-care" data-id="${item.id}">Editar</button>
            </div>
          </article>
        `).join("") || emptyState("Sem itens de cuidado ainda.")}
      </div>
    `, model),
    diet: layoutCard("health", "diet", "Dieta e refeicoes", `
      <form class="form-grid mini-form" data-form="diet-meal">
        <div class="field-grid two">
          <label class="field compact"><span>Refeicao</span><select name="mealKey"><option value="breakfast">Cafe da manha</option><option value="lunch">Almoco</option><option value="dinner">Janta</option><option value="snack">Lanche</option><option value="custom">Personalizada</option></select></label>
          <label class="field compact"><span>Titulo</span><input name="title" placeholder="Cafe da manha proteico" /></label>
        </div>
        <label class="field compact"><span>Plano alimentar</span><input name="plan" placeholder="Proteina + fruta + cafe" /></label>
        <label class="field compact"><span>Checklist</span><textarea name="checklist" placeholder="Uma linha por item"></textarea></label>
        <label class="field compact"><span>Observacao</span><input name="note" /></label>
        <button class="primary-button" type="submit">Salvar refeicao</button>
      </form>
      <div class="stack-list compact-stack">
        ${model.health.dietMeals.map((meal) => `
          <article class="reading-card">
            <div class="task-card-top">
              <div>
                <strong>${escapeHtml(meal.title)}</strong>
                <p>${escapeHtml(meal.plan || meal.mealKey)}</p>
              </div>
              ${badge(meal.doneToday ? "Seguida hoje" : "Pendente", meal.doneToday ? "success" : "")}
            </div>
            ${meal.checklist?.length ? `<ul class="mini-list">${meal.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
            ${meal.note ? `<p class="muted-copy">${escapeHtml(meal.note)}</p>` : ""}
            <div class="task-actions compact-actions">
              <button class="tiny-button ${meal.doneToday ? "ghost" : ""}" data-action="toggle-diet-inline" data-diet-id="${meal.id}" data-date="${model.selectedDate}">${meal.doneToday ? "Desmarcar" : "Marcar como seguida"}</button>
              <button class="ghost-button small" data-action="open-editor" data-kind="diet-meal" data-id="${meal.id}">Editar</button>
            </div>
          </article>
        `).join("") || emptyState("Sem refeicoes cadastradas ainda.")}
      </div>
    `, model),
    measurements: layoutCard("health", "measurements", "Peso e medidas recentes", `
      <div class="reading-card">
        <strong>Ultimo registro de medidas</strong>
        <p>${latestMeasures ? escapeHtml(latestMeasures.date) : "Sem medidas ainda"}</p>
        ${latestMeasures ? `<div class="meta-row">${metaPills([
          `Cintura ${latestMeasures.waist || 0}`,
          `Peito ${latestMeasures.chest || 0}`,
          `Quadril ${latestMeasures.hip || 0}`,
          `Braco ${latestMeasures.arm || 0}`,
          `Coxa ${latestMeasures.thigh || 0}`,
        ])}</div>` : ""}
      </div>
      <div class="stack-list compact-stack">
        ${model.health.weightLogs.map((entry) => `<article class="summary-row"><div><strong>${entry.weight} kg</strong><p>${escapeHtml(entry.date)}</p></div><button class="ghost-button small" data-action="open-editor" data-kind="health-weight" data-id="${entry.id}">Editar</button></article>`).join("") || emptyState("Sem historico de peso ainda.")}
        ${model.health.measureLogs.map((entry) => `<article class="summary-row"><div><strong>Medidas</strong><p>${escapeHtml(entry.date)}</p></div><button class="ghost-button small" data-action="open-editor" data-kind="health-measure" data-id="${entry.id}">Editar</button></article>`).join("") || ""}
      </div>
    `, model),
    workouts: layoutCard("health", "workouts", "Treinos e disciplina", `
      <form class="form-grid mini-form" data-form="health-workout">
        <div class="field-grid two">
          <label class="field compact"><span>Data</span><input type="date" name="date" value="${escapeHtml(model.selectedDate)}" /></label>
          <label class="field compact"><span>Treino</span><input name="title" placeholder="Treino A em casa" /></label>
        </div>
        <div class="field-grid three">
          <label class="field compact"><span>Tipo</span><input name="type" value="casa" /></label>
          <label class="field compact"><span>Duracao</span><input type="number" name="duration" value="30" /></label>
          <label class="field compact"><span>Status</span><select name="status"><option value="planned">Planejado</option><option value="done">Concluido</option><option value="skipped">Pulou</option></select></label>
        </div>
        <label class="field compact"><span>Nota</span><input name="note" /></label>
        <button class="primary-button" type="submit">Salvar treino</button>
      </form>
      <div class="stack-list compact-stack">
        ${model.health.workouts.map((entry) => `<article class="summary-row"><div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.date)} • ${escapeHtml(entry.type)} • ${entry.duration} min</p></div><button class="ghost-button small" data-action="open-editor" data-kind="health-workout" data-id="${entry.id}">Editar</button></article>`).join("") || emptyState("Sem treinos registrados ainda.")}
      </div>
      ${taskList(model.health.healthTasks, { empty: "Sem tarefas de saude em aberto." })}
    `, model),
    evolution: layoutCard("health", "evolution", "Evolucao simples", `
      <div class="evolution-grid">
        <div class="reading-card">
          <strong>Peso por data</strong>
          <div class="stack-list compact-stack">
            ${model.health.evolution.weights.map((entry) => `<div class="evolution-row"><span>${escapeHtml(entry.date)}</span><strong>${entry.weight} kg</strong></div>`).join("") || emptyState("Sem pontos de peso ainda.")}
          </div>
        </div>
        <div class="reading-card">
          <strong>Medidas por data</strong>
          <div class="stack-list compact-stack">
            ${model.health.evolution.measures.map((entry) => `<div class="evolution-row"><span>${escapeHtml(entry.date)}</span><strong>Cintura ${entry.waist || 0}</strong></div>`).join("") || emptyState("Sem pontos de medida ainda.")}
          </div>
        </div>
      </div>
      <div class="callout success">
        <strong>Integrada ao resto do sistema.</strong>
        <p>Os itens de saude tambem aparecem na Rotina e no checklist do dia em Hoje.</p>
      </div>
    `, model, { wide: true }),
  };

  return `<section class="layout-grid">${model.settings.layouts.health.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderAgendaPage(model) {
  const cards = {
    week: layoutCard("agenda", "week", "Semana editavel", `
      <div class="week-calendar-grid">
        ${model.agenda.days.map((day) => `
          <article class="calendar-day-column">
            <div class="calendar-day-head">
              <strong>${escapeHtml(day.weekdayLabel.slice(0, 3))}</strong>
              <span>${escapeHtml(day.shortLabel)}</span>
            </div>
            <div class="meta-row">${metaPills([day.type.label, `${day.totalLoad}/${day.totalCapacity} min`, `${day.alerts} alerta(s)`])}</div>
            <div class="calendar-events">
              ${day.timeline.map((entry) => `<div class="calendar-event ${entry.source}"><small>${escapeHtml(entry.startTime)} - ${escapeHtml(entry.endTime)}</small><strong>${escapeHtml(entry.title)}</strong></div>`).join("") || "<small>Dia vazio</small>"}
            </div>
          </article>
        `).join("")}
      </div>
    `, model, { wide: true }),
    editor: layoutCard("agenda", "editor", "Editar semana e blocos", `
      <div class="reading-card">
        <div class="panel-head">
          <div>
            <strong>${escapeHtml(model.selectedDay.longLabel)}</strong>
            <p>Edite tarefas e blocos sem sair da leitura da semana.</p>
          </div>
          <div class="meta-row">${metaPills([model.selectedDay.type.label, `${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min`])}</div>
        </div>
      </div>
      <div class="page-grid two">
        ${panel("Tarefas do dia", renderAgendaTaskEditor(model.agenda.editor.tasks, model))}
        ${panel("Blocos internos", renderAgendaBlockEditor(model.agenda.editor.blocks, model))}
      </div>
      ${panel("Google Calendar", `<form class="form-grid" data-form="google-config"><label class="field"><span>Client ID</span><input name="clientId" value="${escapeHtml(model.agenda.google.clientId || "")}" /></label><label class="field"><span>API Key</span><input name="apiKey" value="${escapeHtml(model.agenda.google.apiKey || "")}" /></label><label class="field"><span>Calendar ID</span><input name="calendarId" value="${escapeHtml(model.agenda.google.calendarId || "primary")}" /></label><div class="toolbar-row"><button class="primary-button" type="submit">Salvar</button><button class="secondary-button" type="button" data-action="connect-google">Conectar Google</button><button class="ghost-button" type="button" data-action="sync-google">Sincronizar blocos</button></div></form><p class="muted-copy">Status: ${model.agenda.connected ? "conectado" : "nao conectado"}</p>`)}
    `, model, { wide: true }),
  };

  return `<section class="layout-grid">${model.settings.layouts.agenda.map((entry) => cards[entry.id]).filter(Boolean).join("")}</section>`;
}

function renderSettingsPage(model) {
  return `
    <section class="page-grid two">
      ${panel("Modo edicao e layout", `<div class="callout ${model.settings.editMode ? "warning" : ""}"><strong>${model.settings.editMode ? "Modo edicao ativo" : "Modo visualizacao ativo"}</strong><p>${model.settings.editMode ? "Voce pode arrastar e redimensionar cards em um grid flexivel, sem perder a organizacao." : "Layout travado para uso diario seguro."}</p></div><div class="toolbar-row"><button class="secondary-button" data-action="toggle-edit-mode">${model.settings.editMode ? "Desligar modo edicao" : "Ligar modo edicao"}</button><button class="ghost-button" data-action="save-layout-default">Salvar layout atual</button><button class="ghost-button" data-action="restore-layout-default">Restaurar layout padrao</button></div><div class="meta-row">${metaPills([`Modo: ${model.settings.layoutMode}`, model.settings.layoutCapabilities.resizeEnabled ? "Resize ativo" : "Resize inativo", model.settings.layoutCapabilities.futureFreeformReady ? "Base pronta para layout livre" : "Grid fixo"])}</div><div class="layout-summary-grid">${renderLayoutSummary(model.settings.layouts)}</div>`, { wide: true })}
      ${panel("Configuracoes do sistema", `
        <form class="form-grid" data-form="settings-form">
          <div class="field-grid two">
            <label class="field"><span>Densidade visual</span><select name="visualDensity"><option value="calm" ${model.settings.visualDensity === "calm" ? "selected" : ""}>Calma</option><option value="compact" ${model.settings.visualDensity === "compact" ? "selected" : ""}>Compacta</option></select></label>
            <label class="field"><span>Tom visual</span><select name="accentTone"><option value="forest" ${model.settings.accentTone === "forest" ? "selected" : ""}>Forest</option><option value="meadow" ${model.settings.accentTone === "meadow" ? "selected" : ""}>Meadow</option><option value="stone" ${model.settings.accentTone === "stone" ? "selected" : ""}>Stone</option></select></label>
          </div>
          <div class="field-grid three">
            <label class="field"><span>Saude</span><input type="number" step="0.01" name="healthProtection" value="${escapeHtml(model.settings.prioritization.healthProtection)}" /></label>
            <label class="field"><span>Mudanca</span><input type="number" step="0.01" name="moveProtection" value="${escapeHtml(model.settings.prioritization.moveProtection)}" /></label>
            <label class="field"><span>Familia</span><input type="number" step="0.01" name="familyProtection" value="${escapeHtml(model.settings.prioritization.familyProtection)}" /></label>
          </div>
          <div class="field-grid three">
            <label class="field"><span>Futuro</span><input type="number" step="0.01" name="futureFocus" value="${escapeHtml(model.settings.prioritization.futureFocus)}" /></label>
            <label class="field"><span>Delegacao</span><input type="number" step="0.01" name="delegationBias" value="${escapeHtml(model.settings.prioritization.delegationBias)}" /></label>
            <label class="field"><span>Limite de carga</span><input type="number" step="0.01" name="overloadLimit" value="${escapeHtml(model.settings.prioritization.overloadLimit)}" /></label>
          </div>
          <label class="field"><span>Linha de raciocinio</span><textarea name="reasoningLine">${escapeHtml(model.settings.reasoningLine)}</textarea></label>
          <div class="callout">
            <strong>Vocabulario de voz</strong>
            <p>Use aliases e associacoes para o sistema entender melhor como voce fala no celular e no dia a dia.</p>
          </div>
          <div class="field-grid two">
            <label class="field">
              <span>Aliases de projetos</span>
              <textarea name="voiceProjectAliases" placeholder="movimento => project-conteudo&#10;financeira => project-financeira">${escapeHtml(model.settings.voiceAssistant.projectAliasesText || "")}</textarea>
            </label>
            <label class="field">
              <span>Aliases de areas</span>
              <textarea name="voiceAreaAliases" placeholder="cliente => area-work&#10;filhos => area-family">${escapeHtml(model.settings.voiceAssistant.areaAliasesText || "")}</textarea>
            </label>
          </div>
          <label class="field">
            <span>Associacoes frequentes</span>
            <textarea name="voiceAssociations" placeholder="gravar => projeto:project-conteudo, contexto:creative, intencao:create-task, destino:project&#10;peso => area:area-health, contexto:health, intencao:register-weight, destino:health">${escapeHtml(model.settings.voiceAssistant.frequentAssociationsText || "")}</textarea>
          </label>
          <button class="primary-button" type="submit">Salvar configuracoes</button>
        </form>
      `)}
      ${panel("Historico de interpretacao de voz", `
        <div class="callout success">
          <strong>Assistido, nao caixa-preta.</strong>
          <p>O sistema guarda o que voce falou, o que entendeu e o que voce corrigiu para melhorar o entendimento com o tempo.</p>
        </div>
        <div class="stack-list compact-stack">
          ${(model.settings.voiceAssistant.history || []).length
            ? model.settings.voiceAssistant.history.map((entry) => `
                <article class="reading-card">
                  <div class="task-card-top">
                    <div>
                      <strong>${escapeHtml(entry.transcript || "Captura sem texto")}</strong>
                      <p>${escapeHtml(formatShortDate(entry.savedAt?.slice(0, 10) || model.selectedDate))}</p>
                    </div>
                    ${badge(`${(entry.corrections || []).length} correcao(oes)`, (entry.corrections || []).length ? "warning" : "success")}
                  </div>
                  <div class="meta-row">${metaPills([
                    `Entendeu: ${model.options.voiceIntents.find((item) => item.id === entry.understood?.intent)?.label || entry.understood?.intent || "-"}`,
                    `Destino: ${model.options.voiceDestinations.find((item) => item.id === entry.corrected?.destination)?.label || entry.corrected?.destination || "-"}`,
                    entry.corrected?.projectId ? `Projeto: ${model.options.projects.find((item) => item.id === entry.corrected.projectId)?.name || entry.corrected.projectId}` : "",
                  ])}</div>
                  ${(entry.corrections || []).length ? `<p class="muted-copy">Corrigido em: ${(entry.corrections || []).map((item) => `${item.field}: ${item.from || "-"} -> ${item.to || "-"}`).join(" | ")}</p>` : `<p class="muted-copy">Sem correcoes manuais nessa captura.</p>`}
                </article>
              `).join("")
            : emptyState("Ainda nao ha historico de voz salvo.")}
        </div>
      `)}
    </section>
  `;
}
function renderFloatingAlert(task, options = {}) {
  if (!task) return "";
  const mobileClass = options.isMobile ? " mobile" : "";
  return `<div class="floating-alert-shell${mobileClass}"><div class="floating-alert-card${mobileClass}" role="alertdialog" aria-modal="true"><span class="page-kicker">Alerta critico</span><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.areaName)}${task.projectName ? ` • ${escapeHtml(task.projectName)}` : ""}</p><p class="muted-copy">Motivo: ${escapeHtml(task.reasons.join(" | "))}</p><div class="toolbar-row"><button class="primary-button" data-task-action="resolve-now" data-task-id="${task.id}">Resolver agora</button><button class="secondary-button" data-task-action="auto-defer" data-task-id="${task.id}">Adiar</button><button class="ghost-button" data-task-action="delegate" data-task-id="${task.id}">Delegar</button><button class="ghost-button" data-task-action="accept-risk" data-task-id="${task.id}">Ignorar com risco</button></div></div></div>`;
}

function renderEditorModal(editorView, options) {
  if (!editorView) return "";
  const { kind, entity } = editorView;
  const areaOptions = options.areas.map((area) => `<option value="${area.id}" ${entity.areaId === area.id ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("");
  const projectOptions = options.projects.map((project) => `<option value="${project.id}" ${entity.projectId === project.id ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("");
  const objectiveOptions = options.objectives.map((objective) => `<option value="${objective.id}" ${entity.objectiveId === objective.id ? "selected" : ""}>${escapeHtml(objective.title)}</option>`).join("");
  const dayTypeOptions = options.dayTypes.map((type) => `<option value="${type.id}" ${entity.typeId === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("");
  const periodOptions = options.periods.map((period) => `<option value="${period.id}" ${entity.scheduledPeriod === period.id || entity.period === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("");
  const bucketOptions = options.buckets.map((bucket) => `<option value="${bucket.id}" ${entity.finalBucket === bucket.id ? "selected" : ""}>${escapeHtml(bucket.label)}</option>`).join("");
  const gtdOptions = ["Processar", "Executar", "Agendar", "Delegar", "Aguardar", "Backlog", "Projeto", "Descartar", "Modelo"].map((decision) => `<option value="${decision}" ${entity.gtdDecision === decision ? "selected" : ""}>${escapeHtml(decision)}</option>`).join("");
  const actions = entity.id ? `<div class="toolbar-row"><button class="ghost-button" type="button" data-action="duplicate-entity" data-kind="${kind}" data-id="${entity.id}">Duplicar</button><button class="ghost-button danger" type="button" data-action="delete-entity" data-kind="${kind}" data-id="${entity.id}">Excluir</button></div>` : "";
  const taskFields = `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" required /></label><label class="field"><span>Checklist / proximas acoes</span><textarea name="subtasks">${escapeHtml((entity.subtasks || []).join("\n"))}</textarea></label><div class="field-grid two"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Projeto</span><select name="projectId"><option value="">Sem projeto</option>${projectOptions}</select></label></div><div class="field-grid two"><label class="field"><span>Objetivo</span><select name="objectiveId"><option value="">Sem objetivo</option>${objectiveOptions}</select></label><label class="field"><span>Contexto</span><input name="context" value="${escapeHtml(entity.context || "")}" /></label></div><div class="field-grid four"><label class="field"><span>Periodo</span><select name="scheduledPeriod">${periodOptions}</select></label><label class="field"><span>Prioridade</span><input name="priority" value="${escapeHtml(entity.priority || "medium")}" /></label><label class="field"><span>Impacto</span><input type="number" name="impact" value="${escapeHtml(entity.impact || 3)}" /></label><label class="field"><span>Urgencia</span><input type="number" name="urgency" value="${escapeHtml(entity.urgency || 3)}" /></label></div><div class="field-grid four"><label class="field"><span>Esforco</span><input type="number" name="effort" value="${escapeHtml(entity.effort || 3)}" /></label><label class="field"><span>Duracao</span><input type="number" name="estimatedMinutes" value="${escapeHtml(entity.estimatedMinutes || 30)}" /></label><label class="field"><span>GTD</span><select name="gtdDecision"><option value="">Automatica</option>${gtdOptions}</select></label><label class="field"><span>Bucket</span><select name="finalBucket"><option value="">Automatico</option>${bucketOptions}</select></label></div><div class="field-grid four"><label class="field"><span>Modo de prioridade</span><select name="priorityMode"><option value="auto" ${entity.priorityMode !== "manual" ? "selected" : ""}>Automatica</option><option value="manual" ${entity.priorityMode === "manual" ? "selected" : ""}>Manual</option></select></label><label class="field"><span>Dia</span><input type="date" name="scheduledDate" value="${escapeHtml(entity.scheduledDate || "")}" /></label><label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(entity.dueDate || "")}" /></label><label class="field"><span>Ajuste de score</span><input type="number" name="scoreAdjustment" value="${escapeHtml(entity.scoreAdjustment || 0)}" /></label></div><label class="field"><span>Proxima acao</span><textarea name="nextAction">${escapeHtml(entity.nextAction || "")}</textarea></label><label class="field"><span>Observacoes</span><textarea name="notes">${escapeHtml(entity.notes || "")}</textarea></label><div class="checkbox-row"><label><input type="checkbox" name="critical" ${entity.critical ? "checked" : ""}/> Critica</label><label><input type="checkbox" name="delegable" ${entity.delegable ? "checked" : ""}/> Delegavel</label><label><input type="checkbox" name="isRecurring" ${entity.isRecurring ? "checked" : ""}/> Recorrente</label><label><input type="checkbox" name="isTemplate" ${entity.isTemplate ? "checked" : ""}/> Modelo</label><label><input type="checkbox" name="manualDecision" ${entity.manualDecision ? "checked" : ""}/> Decisao manual</label></div>`;
  const fieldMap = {
    task: taskFields,
    area: `<label class="field"><span>Nome</span><input name="name" value="${escapeHtml(entity.name || "")}" /></label><div class="field-grid two"><label class="field"><span>Tipo</span><input name="type" value="${escapeHtml(entity.type || "life")}" /></label><label class="field"><span>Cor</span><input name="color" value="${escapeHtml(entity.color || "")}" /></label></div><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || "")}</textarea></label>`,
    project: `<label class="field"><span>Nome</span><input name="name" value="${escapeHtml(entity.name || "")}" /></label><div class="field-grid two"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Status</span><input name="status" value="${escapeHtml(entity.status || "active")}" /></label></div><label class="field"><span>Resumo</span><textarea name="summary">${escapeHtml(entity.summary || "")}</textarea></label>`,
    objective: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid three"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Projeto</span><select name="projectId"><option value="">Sem projeto</option>${projectOptions}</select></label><label class="field"><span>Progresso</span><input type="number" name="progress" value="${escapeHtml(entity.progress || 0)}" /></label></div><label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(entity.dueDate || "")}" /></label><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || "")}</textarea></label>`,
    habit: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid two"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Meta semanal</span><input type="number" name="targetPerWeek" value="${escapeHtml(entity.targetPerWeek || 3)}" /></label></div><label class="field"><span>Dias preferidos</span><input name="preferredWeekdays" value="${escapeHtml((entity.preferredWeekdays || []).join(", "))}" /></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    block: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid three"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><label class="field"><span>Periodo</span><select name="period">${periodOptions}</select></label></div><div class="field-grid two"><label class="field"><span>Inicio</span><input type="time" name="startTime" value="${escapeHtml(entity.startTime || "09:00")}" /></label><label class="field"><span>Fim</span><input type="time" name="endTime" value="${escapeHtml(entity.endTime || "10:00")}" /></label></div><label class="field"><span>Tipo</span><input name="kind" value="${escapeHtml(entity.kind || "routine")}" /></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    routine: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid three"><label class="field"><span>Periodo</span><select name="period">${periodOptions}</select></label><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Ordem</span><input type="number" name="order" value="${escapeHtml(entity.order || 1)}" /></label></div><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label><div class="checkbox-row"><label><input type="checkbox" name="active" ${entity.active ? "checked" : ""}/> Ativo</label><label><input type="checkbox" name="recurring" ${entity.recurring ? "checked" : ""}/> Recorrente</label></div>`,
    "health-weight": `<div class="field-grid three"><label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><label class="field"><span>Peso</span><input type="number" step="0.1" name="weight" value="${escapeHtml(entity.weight || 0)}" /></label><label class="field"><span>Nota</span><input name="note" value="${escapeHtml(entity.note || "")}" /></label></div>`,
    "health-measure": `<label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><div class="field-grid three"><label class="field"><span>Cintura</span><input type="number" step="0.1" name="waist" value="${escapeHtml(entity.waist || 0)}" /></label><label class="field"><span>Peito</span><input type="number" step="0.1" name="chest" value="${escapeHtml(entity.chest || 0)}" /></label><label class="field"><span>Quadril</span><input type="number" step="0.1" name="hip" value="${escapeHtml(entity.hip || 0)}" /></label></div><div class="field-grid two"><label class="field"><span>Braco</span><input type="number" step="0.1" name="arm" value="${escapeHtml(entity.arm || 0)}" /></label><label class="field"><span>Coxa</span><input type="number" step="0.1" name="thigh" value="${escapeHtml(entity.thigh || 0)}" /></label></div><label class="field"><span>Nota</span><input name="note" value="${escapeHtml(entity.note || "")}" /></label>`,
    "health-care": `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    "health-workout": `<div class="field-grid two"><label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label></div><div class="field-grid three"><label class="field"><span>Tipo</span><input name="type" value="${escapeHtml(entity.type || "")}" /></label><label class="field"><span>Duracao</span><input type="number" name="duration" value="${escapeHtml(entity.duration || 30)}" /></label><label class="field"><span>Status</span><input name="status" value="${escapeHtml(entity.status || "planned")}" /></label></div><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    "diet-meal": `<div class="field-grid two"><label class="field"><span>Refeicao</span><input name="mealKey" value="${escapeHtml(entity.mealKey || "")}" /></label><label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label></div><label class="field"><span>Plano</span><textarea name="plan">${escapeHtml(entity.plan || "")}</textarea></label><label class="field"><span>Checklist</span><textarea name="checklist">${escapeHtml((entity.checklist || []).join("\n"))}</textarea></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    "day-override": `<label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><label class="field"><span>Tipo de dia</span><select name="typeId">${dayTypeOptions}</select></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
  };
  return `<div class="modal-shell" data-action="close-editor-backdrop"><div class="modal-card" role="dialog" aria-modal="true"><div class="panel-head"><h3>Editar ${escapeHtml(kind)}</h3><button class="ghost-button" type="button" data-action="close-editor">Fechar</button></div>${actions}<form class="form-grid" data-form="entity-editor"><input type="hidden" name="kind" value="${escapeHtml(kind)}" /><input type="hidden" name="id" value="${escapeHtml(entity.id || "")}" />${fieldMap[kind] || fieldMap["day-override"]}<div class="toolbar-row"><button class="primary-button" type="submit">Salvar</button><button class="ghost-button" type="button" data-action="close-editor">Cancelar</button></div></form></div></div>`;
}

function formDataToObject(form) {
  const payload = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) payload[key] = value;
  form.querySelectorAll('input[type="checkbox"]').forEach((field) => { payload[field.name] = field.checked; });
  return payload;
}

function renderActivePage(model, options = {}) {
  switch (model.activeSection) {
    case "dashboard": return renderDashboardPage(model);
    case "checklist": return renderChecklistPage(model, options);
    case "days": return renderDaysPage(model);
    case "inbox": return renderInboxPage(model);
    case "prioritize": return renderPrioritizePage(model, options);
    case "organize": return renderOrganizePage(model, options);
    case "areas": return renderAreasPage(model);
    case "projects": return renderProjectsPage(model);
    case "routine": return renderRoutinePage(model);
    case "health": return renderHealthPage(model);
    case "planning": return renderPlanningPage(model);
    case "agenda": return renderAgendaPage(model);
    case "settings": return renderSettingsPage(model);
    case "today":
    default:
      return renderTodayPage(model, options);
  }
}

function renderFooter(model) {
  return `
    <footer class="workspace-footer">
      <p>Persistencia local em IndexedDB. Para Google Calendar, rode em servidor local e siga <a href="./docs/google-calendar.md">docs/google-calendar.md</a>.</p>
      <p>Data de hoje: ${escapeHtml(formatShortDate(model.today))}</p>
    </footer>
  `;
}

function renderLayoutSummary(layouts = {}) {
  const labels = {
    dashboard: "Dashboard",
    today: "Hoje",
    prioritize: "Priorizar",
    organize: "Organizar",
    routine: "Rotina",
    health: "Saude",
    agenda: "Agenda",
  };
  return Object.entries(layouts).map(([page, entries]) => `
    <article class="layout-summary-card">
      <strong>${escapeHtml(labels[page] || page)}</strong>
      <div class="layout-summary-list">
        ${(entries || []).map((entry) => `<span class="meta-pill">${escapeHtml(entry.id)} • ${escapeHtml(LAYOUT_WIDTH_LABELS[entry.width] || entry.width)} • ${escapeHtml(LAYOUT_HEIGHT_LABELS[entry.height] || entry.height)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

export class LifeOSApp {
  constructor(root) {
    this.root = root;
    this.state = null;
    this.toast = "";
    this.toastTimer = null;
    this.dragItem = null;
    this.mobileNavOpen = false;
    this.lastIsMobile = false;
    this.voiceCapture = createVoiceCaptureState();
    this.voiceRecognizer = null;
  }

  async init() {
    const loaded = await loadAppState(() => buildSeedState(new Date()));
    const incompatible = !loaded?.meta || Number(loaded.meta.version || 0) < APP_VERSION;
    this.state = incompatible ? await resetAppState(() => buildSeedState(new Date())) : loaded;
    this.lastIsMobile = this.isMobileViewport();
    if (this.lastIsMobile && this.state?.ui?.activeSection !== "today") {
      this.state = setActiveSection(this.state, "today");
      await saveAppState(this.state);
    }
    const support = getVoiceCaptureSupport();
    this.voiceCapture = {
      ...this.voiceCapture,
      supported: support.supported,
      mode: support.mode,
    };
    this.bindEvents();
    this.render();
    window.requestAnimationFrame(() => this.handleResize());
    window.setTimeout(() => this.handleResize(), 120);
  }

  bindEvents() {
    this.root.addEventListener("click", (event) => void this.handleClick(event));
    this.root.addEventListener("submit", (event) => void this.handleSubmit(event));
    this.root.addEventListener("change", (event) => void this.handleChange(event));
    this.root.addEventListener("dragstart", (event) => this.handleDragStart(event));
    this.root.addEventListener("dragover", (event) => this.handleDragOver(event));
    this.root.addEventListener("drop", (event) => void this.handleDrop(event));
    this.root.addEventListener("dragend", () => this.handleDragEnd());
    window.addEventListener("resize", () => this.handleResize());
  }

  isMobileViewport() {
    const widths = [
      window.innerWidth,
      window.document?.documentElement?.clientWidth,
      window.visualViewport?.width,
      window.screen?.width,
    ].filter((value) => Number.isFinite(value) && value > 0);
    const smallestWidth = widths.length ? Math.min(...widths) : Number.POSITIVE_INFINITY;
    const mobileAgent = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || "");
    const touchMobile = (window.navigator.maxTouchPoints || 0) > 1 && smallestWidth <= 1024;
    return smallestWidth <= MOBILE_BREAKPOINT || window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches || mobileAgent || touchMobile;
  }

  handleResize() {
    const isMobile = this.isMobileViewport();
    if (isMobile === this.lastIsMobile) return;
    this.lastIsMobile = isMobile;
    if (isMobile && this.state?.ui?.activeSection !== "today") {
      this.state = setActiveSection(this.state, "today");
    }
    if (!isMobile) this.mobileNavOpen = false;
    this.render();
  }

  showToast(message) {
    this.toast = message;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast = "";
      this.render();
    }, 2800);
  }

  async persist(message = "") {
    await saveAppState(this.state);
    if (message) this.showToast(message);
    this.render();
  }

  openVoiceCapture(sourceSection = "inbox") {
    const support = getVoiceCaptureSupport();
    this.voiceCapture = {
      ...createVoiceCaptureState(),
      open: true,
      supported: support.supported,
      mode: support.mode,
      sourceSection,
    };
    this.render();
  }

  closeVoiceCapture() {
    if (this.voiceRecognizer) {
      this.voiceRecognizer.abort();
      this.voiceRecognizer = null;
    }
    this.voiceCapture = {
      ...createVoiceCaptureState(),
      supported: this.voiceCapture.supported,
      mode: this.voiceCapture.mode,
    };
    this.render();
  }

  analyzeVoiceDraft(transcript) {
    const cleanedTranscript = String(transcript || "").trim();
    if (!cleanedTranscript) {
      this.voiceCapture = {
        ...this.voiceCapture,
        error: "Fale ou digite algo antes de analisar.",
      };
      this.render();
      return;
    }

    const draft = analyzeCaptureText(this.state, cleanedTranscript, this.state.ui.selectedDate || formatISODate(new Date()));
    this.voiceCapture = {
      ...this.voiceCapture,
      transcript: cleanedTranscript,
      draft,
      originalDraft: cloneDraft(draft),
      error: "",
    };
    this.render();
  }

  startVoiceCapture() {
    if (this.voiceRecognizer) {
      this.voiceRecognizer.abort();
      this.voiceRecognizer = null;
    }

    try {
      this.voiceRecognizer = createVoiceRecognizer({
        lang: "pt-BR",
        onStart: () => {
          if (!this.voiceCapture.open) return;
          this.voiceCapture = {
            ...this.voiceCapture,
            listening: true,
            error: "",
          };
          this.render();
        },
        onEnd: (finalTranscript) => {
          if (!this.voiceCapture.open) return;
          const transcript = finalTranscript || this.voiceCapture.transcript || "";
          this.voiceCapture = {
            ...this.voiceCapture,
            listening: false,
            transcript,
            interim: "",
          };
          this.voiceRecognizer = null;
          if (transcript) {
            const draft = analyzeCaptureText(this.state, transcript, this.state.ui.selectedDate || formatISODate(new Date()));
            this.voiceCapture = {
              ...this.voiceCapture,
              draft,
              originalDraft: cloneDraft(draft),
              error: "",
            };
          }
          this.render();
        },
        onError: (message) => {
          if (!this.voiceCapture.open) return;
          this.voiceCapture = {
            ...this.voiceCapture,
            listening: false,
            error: message,
          };
          this.voiceRecognizer = null;
          this.render();
        },
        onResult: (payload) => {
          if (!this.voiceCapture.open) return;
          this.voiceCapture = {
            ...this.voiceCapture,
            transcript: payload.transcript || this.voiceCapture.transcript,
            interim: payload.interim || "",
            error: "",
          };
          if (payload.isFinal && payload.finalText) {
            const draft = analyzeCaptureText(this.state, payload.finalText, this.state.ui.selectedDate || formatISODate(new Date()));
            this.voiceCapture.draft = draft;
            this.voiceCapture.originalDraft = cloneDraft(draft);
          }
          this.render();
        },
      });

      this.voiceRecognizer.start();
    } catch (error) {
      this.voiceCapture = {
        ...this.voiceCapture,
        error: error instanceof Error ? error.message : "Nao foi possivel iniciar o microfone.",
      };
      this.render();
    }
  }

  stopVoiceCapture() {
    if (!this.voiceRecognizer) {
      this.voiceCapture = {
        ...this.voiceCapture,
        listening: false,
      };
      this.render();
      return;
    }

    this.voiceRecognizer.stop();
  }

  async handleClick(event) {
    const trigger = event.target.closest("[data-action], [data-task-action]");
    if (!trigger) return;
    const today = formatISODate(new Date());

    if (trigger.dataset.taskAction) {
      this.state = applyTaskAction(this.state, trigger.dataset.taskId, trigger.dataset.taskAction, {}, this.state.ui.selectedDate || today);
      await this.persist("Tarefa atualizada.");
      return;
    }

    const action = trigger.dataset.action;
    if (action === "open-voice-capture") { this.openVoiceCapture(trigger.dataset.sourceSection || this.state.ui.activeSection || "inbox"); return; }
    if (action === "close-voice-capture") { this.closeVoiceCapture(); return; }
    if (action === "close-voice-capture-backdrop") { if (event.target !== trigger) return; this.closeVoiceCapture(); return; }
    if (action === "start-voice-capture") { this.startVoiceCapture(); return; }
    if (action === "stop-voice-capture") { this.stopVoiceCapture(); return; }
    if (action === "analyze-voice-capture") { this.analyzeVoiceDraft(this.voiceCapture.transcript || this.voiceCapture.interim || ""); return; }
    if (action === "toggle-mobile-nav") { this.mobileNavOpen = true; this.render(); return; }
    if (action === "close-mobile-nav") { this.mobileNavOpen = false; this.render(); return; }
    if (action === "navigate") { this.state = setActiveSection(this.state, trigger.dataset.section); this.mobileNavOpen = false; await this.persist(); return; }
    if (action === "select-day") { this.state = setSelectedDate(this.state, trigger.dataset.date); await this.persist(); return; }
    if (action === "set-checklist-view") { this.state = setChecklistView(this.state, trigger.dataset.checklistView); await this.persist(); return; }
    if (action === "set-filter") { this.state = setFilter(this.state, trigger.dataset.filterName, trigger.dataset.filterValue); await this.persist(); return; }
    if (action === "clear-filters") { this.state = clearFilters(this.state); await this.persist("Filtros limpos."); return; }
    if (action === "set-priority-method") { this.state = setPriorityMethod(this.state, trigger.dataset.method); await this.persist("Metodo atualizado."); return; }
    if (action === "set-energy") { this.state = setWeeklyEnergy(this.state, trigger.dataset.energy); await this.persist("Energia semanal ajustada."); return; }
    if (action === "toggle-habit") { this.state = toggleHabitForDate(this.state, trigger.dataset.habitId, trigger.dataset.date || today); await this.persist("Habito atualizado."); return; }
    if (action === "toggle-habit-inline") { this.state = toggleHabitForDate(this.state, trigger.dataset.habitId, trigger.dataset.date || today); await this.persist("Checklist do dia atualizado."); return; }
    if (action === "toggle-routine-inline") { this.state = toggleRoutineForDate(this.state, trigger.dataset.routineId, trigger.dataset.date || today); await this.persist("Rotina do dia atualizada."); return; }
    if (action === "toggle-care-inline") { this.state = toggleHealthCareForDate(this.state, trigger.dataset.careId, trigger.dataset.date || today); await this.persist("Checklist de saude atualizado."); return; }
    if (action === "toggle-diet-inline") { this.state = toggleDietMealForDate(this.state, trigger.dataset.dietId, trigger.dataset.date || today); await this.persist("Dieta do dia atualizada."); return; }
    if (action === "toggle-task-subtask") { this.state = toggleTaskSubtask(this.state, trigger.dataset.taskId, trigger.dataset.subtaskIndex); await this.persist("Checklist da tarefa atualizado."); return; }
    if (action === "move-task-bucket") { this.state = moveTaskToBucket(this.state, trigger.dataset.taskId, trigger.dataset.bucketId); await this.persist("Fluxo da tarefa atualizado."); return; }
    if (action === "open-editor") { this.state = openEditor(this.state, trigger.dataset.kind, trigger.dataset.id || ""); this.render(); return; }
    if (action === "close-editor" || action === "close-editor-backdrop") { if (action === "close-editor-backdrop" && event.target !== trigger) return; this.state = closeEditor(this.state); this.render(); return; }
    if (action === "duplicate-entity") { this.state = duplicateEntity(this.state, trigger.dataset.kind, trigger.dataset.id); await this.persist("Item duplicado."); return; }
    if (action === "delete-entity") { if (!window.confirm("Deseja excluir este item?")) return; this.state = deleteEntity(this.state, trigger.dataset.kind, trigger.dataset.id); await this.persist("Item removido."); return; }
    if (action === "replan-week") { const result = replanWeek(this.state, this.state.ui.selectedDate || today); this.state = result.nextState; await this.persist(`Semana reorganizada: ${result.movedCount} movidas, ${result.alertCount} alertas e ${result.reviewCount} revisoes.`); return; }
    if (action === "toggle-edit-mode") { this.state = toggleEditMode(this.state); await this.persist("Modo de edicao atualizado."); return; }
    if (action === "resize-layout-card") {
      this.state = resizeLayoutCard(
        this.state,
        trigger.dataset.layoutPage,
        trigger.dataset.layoutCard,
        trigger.dataset.layoutDimension,
        trigger.dataset.layoutDirection,
      );
      await this.persist("Tamanho do bloco atualizado.");
      return;
    }
    if (action === "save-layout-default") { this.state = saveCurrentLayoutAsDefault(this.state); await this.persist("Layout atual salvo."); return; }
    if (action === "restore-layout-default") { this.state = restoreLayoutDefault(this.state); await this.persist("Layout restaurado."); return; }
    if (action === "connect-google") { await this.handleGoogleConnect(); return; }
    if (action === "sync-google") { await this.handleGoogleSync(); return; }
    if (action === "reset-app") { if (!window.confirm("Deseja resetar a base local para a seed atual?")) return; this.state = await resetAppState(() => buildSeedState(new Date())); this.showToast("Base local resetada."); this.render(); }
  }

  async handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    const voiceForm = target.closest('[data-form="voice-capture-confirm"]');
    if (voiceForm) {
      if (target.name === "transcript") {
        this.voiceCapture = {
          ...this.voiceCapture,
          transcript: target.value,
          interim: "",
        };
      } else {
        this.voiceCapture = {
          ...this.voiceCapture,
          draft: {
            ...(this.voiceCapture.draft || {}),
            [target.name]: target.name === "checklist"
              ? target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
              : target.value,
          },
        };
      }
      return;
    }
    if (target.dataset.filter) { this.state = setFilter(this.state, target.dataset.filter, target.value); await this.persist(); return; }
    if (target.dataset.dayTypeDate) { const result = setDayType(this.state, target.dataset.dayTypeDate, target.value); this.state = result.nextState; await this.persist(`Dia recalculado: ${result.movedCount} movidas, ${result.alertCount} alertas.`); return; }
    if (target.dataset.periodTypeDate) { const result = setDayPeriodType(this.state, target.dataset.periodTypeDate, target.dataset.periodId, target.value); this.state = result.nextState; await this.persist(`Periodo recalculado: ${result.movedCount} movidas, ${result.alertCount} alertas.`); return; }
    if (target.dataset.agendaTaskId) {
      this.state = updateTaskSchedule(this.state, target.dataset.agendaTaskId, { [target.dataset.agendaField]: target.value });
      await this.persist("Agenda da tarefa atualizada.");
      return;
    }
    if (target.dataset.agendaBlockId) {
      this.state = updateBlockSchedule(this.state, target.dataset.agendaBlockId, { [target.dataset.agendaField]: target.value });
      await this.persist("Bloco da agenda atualizado.");
    }
  }

  async handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.dataset.form === "capture-task") { this.state = addInboxTask(this.state, formDataToObject(form)); form.reset(); await this.persist("Nova tarefa capturada na inbox."); return; }
    if (form.dataset.form === "checklist-quick-add") { this.state = addChecklistTask(this.state, formDataToObject(form)); form.reset(); await this.persist("Nova tarefa criada na checklist."); return; }
    if (form.dataset.form === "voice-capture-confirm") {
      const payload = formDataToObject(form);
      const result = confirmVoiceCapture(this.state, payload, {
        transcript: payload.transcript || this.voiceCapture.transcript || "",
        understood: this.voiceCapture.originalDraft || this.voiceCapture.draft || {},
        sourceSection: this.voiceCapture.sourceSection || this.state.ui.activeSection || "inbox",
      });
      this.state = result.nextState;
      this.voiceCapture = {
        ...createVoiceCaptureState(),
        supported: this.voiceCapture.supported,
        mode: this.voiceCapture.mode,
      };
      await this.persist(result.message || "Captura por voz salva.");
      return;
    }
    if (form.dataset.form === "google-config") { this.state = saveGoogleCalendarConfig(this.state, formDataToObject(form)); await this.persist("Configuracao do Google salva."); return; }
    if (form.dataset.form === "health-weight") { this.state = saveHealthWeight(this.state, formDataToObject(form)); form.reset(); await this.persist("Peso salvo."); return; }
    if (form.dataset.form === "health-measure") { this.state = saveHealthMeasure(this.state, formDataToObject(form)); form.reset(); await this.persist("Medidas salvas."); return; }
    if (form.dataset.form === "health-care") { this.state = saveHealthCareItem(this.state, formDataToObject(form)); form.reset(); await this.persist("Item de cuidado salvo."); return; }
    if (form.dataset.form === "health-workout") { this.state = saveHealthWorkout(this.state, formDataToObject(form)); form.reset(); await this.persist("Treino salvo."); return; }
    if (form.dataset.form === "diet-meal") { this.state = saveDietMeal(this.state, formDataToObject(form)); form.reset(); await this.persist("Refeicao salva."); return; }
    if (form.dataset.form === "entity-editor") { const payload = formDataToObject(form); this.state = saveEntity(this.state, payload.kind, payload); await this.persist("Item salvo."); return; }
    if (form.dataset.form === "settings-form") { this.state = saveSettings(this.state, formDataToObject(form)); await this.persist("Configuracoes salvas."); }
  }

  handleDragStart(event) {
    const checklistItem = event.target.closest("[data-checklist-task]");
    if (checklistItem) {
      this.dragItem = { kind: "checklist-task", taskId: checklistItem.dataset.checklistTask };
      checklistItem.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      return;
    }

    const organizeItem = event.target.closest("[data-organize-task]");
    if (organizeItem) {
      this.dragItem = { kind: "organize-task", taskId: organizeItem.dataset.organizeTask };
      organizeItem.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      return;
    }

    const item = event.target.closest("[data-layout-card]");
    if (!item || !this.state?.settings?.editMode || !this.state?.settings?.layoutCapabilities?.dragEnabled) return;
    this.dragItem = { kind: "layout", page: item.dataset.layoutPage, cardId: item.dataset.layoutCard };
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  }

  handleDragOver(event) {
    if (!this.dragItem) return;
    if (this.dragItem.kind === "checklist-task") {
      const row = event.target.closest("[data-checklist-drop-task]");
      if (!row) return;
      event.preventDefault();
      this.root.querySelectorAll(".checklist-row.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      row.classList.add("drag-target");
      return;
    }

    if (this.dragItem.kind === "layout") {
      const item = event.target.closest("[data-layout-card]");
      if (!item) return;
      event.preventDefault();
      return;
    }

    if (this.dragItem.kind === "organize-task") {
      const bucket = event.target.closest("[data-organize-bucket]");
      if (!bucket) return;
      event.preventDefault();
      this.root.querySelectorAll(".organize-drop-zone.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      bucket.classList.add("drag-target");
    }
  }

  async handleDrop(event) {
    if (!this.dragItem) return;
    event.preventDefault();

    if (this.dragItem.kind === "layout") {
      const item = event.target.closest("[data-layout-card]");
      if (!item) return;
      if (this.dragItem.page !== item.dataset.layoutPage) {
        this.dragItem = null;
        return;
      }
      this.state = moveLayoutCard(this.state, this.dragItem.page, this.dragItem.cardId, item.dataset.layoutCard);
      this.dragItem = null;
      await this.persist("Layout reorganizado.");
      return;
    }

    if (this.dragItem.kind === "checklist-task") {
      const row = event.target.closest("[data-checklist-drop-task]");
      if (!row) return;
      this.state = reorderChecklistTask(this.state, this.dragItem.taskId, row.dataset.checklistDropTask);
      this.root.querySelectorAll(".checklist-row.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      this.dragItem = null;
      await this.persist("Ordem da checklist atualizada.");
      return;
    }

    if (this.dragItem.kind === "organize-task") {
      const bucket = event.target.closest("[data-organize-bucket]");
      if (!bucket) return;
      this.state = moveTaskToBucket(this.state, this.dragItem.taskId, bucket.dataset.organizeBucket);
      this.root.querySelectorAll(".organize-drop-zone.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      this.dragItem = null;
      await this.persist("Tarefa movida entre caixas.");
      return;
    }

    this.dragItem = null;
  }

  handleDragEnd() {
    this.dragItem = null;
    this.root.querySelectorAll(".layout-card.dragging").forEach((card) => card.classList.remove("dragging"));
    this.root.querySelectorAll("[data-checklist-task].dragging").forEach((card) => card.classList.remove("dragging"));
    this.root.querySelectorAll(".checklist-row.drag-target").forEach((card) => card.classList.remove("drag-target"));
    this.root.querySelectorAll("[data-organize-task].dragging").forEach((card) => card.classList.remove("dragging"));
    this.root.querySelectorAll(".organize-drop-zone.drag-target").forEach((card) => card.classList.remove("drag-target"));
  }

  async handleGoogleConnect() {
    try {
      const service = new GoogleCalendarService(this.state.settings.googleCalendar);
      await service.connect();
      this.state = setCalendarConnected(this.state, true);
      await this.persist("Google Calendar conectado.");
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : "Falha ao conectar com Google Calendar.");
      this.render();
    }
  }

  async handleGoogleSync() {
    try {
      const service = new GoogleCalendarService(this.state.settings.googleCalendar);
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const blocks = await service.listBusyBlocks({ calendarId: this.state.settings.googleCalendar.calendarId || "primary", timeMin, timeMax });
      this.state = applyGoogleBusyBlocks(this.state, blocks);
      await this.persist(`${blocks.length} bloco(s) sincronizado(s).`);
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : "Falha ao sincronizar Google Calendar.");
      this.render();
    }
  }

  render() {
    if (!this.state) {
      this.root.innerHTML = `<div class="app-shell"><div class="panel-card">Carregando Life OS Thz 2026...</div></div>`;
      return;
    }

    const model = buildAppModel(this.state, new Date());
    const isMobile = this.isMobileViewport();
    this.lastIsMobile = isMobile;
    if (!isMobile) this.mobileNavOpen = false;
    this.root.innerHTML = isMobile
      ? `<div class="app-shell mobile-shell density-${escapeHtml(model.settings.visualDensity)} tone-${escapeHtml(model.settings.accentTone)}">${this.toast ? `<div class="toast">${escapeHtml(this.toast)}</div>` : ""}${this.mobileNavOpen ? `<button class="mobile-nav-backdrop" data-action="close-mobile-nav" aria-label="Fechar menu"></button>` : ""}${renderSidebar(model, { isMobile: true, navOpen: this.mobileNavOpen })}<main class="workspace-main mobile-main">${renderMobileTopbar(model, { navOpen: this.mobileNavOpen })}${renderHeader(model, { isMobile: true })}<div class="page-shell">${renderActivePage(model, { isMobile: true })}</div>${renderFooter(model)}</main>${renderFloatingAlert(model.activeSection === "today" ? model.floatingAlert : null, { isMobile: true })}${renderVoiceCaptureModal(this.voiceCapture, model)}${renderEditorModal(model.editorView, model.options)}</div>`
      : `<div class="app-shell desktop-shell density-${escapeHtml(model.settings.visualDensity)} tone-${escapeHtml(model.settings.accentTone)}">${this.toast ? `<div class="toast">${escapeHtml(this.toast)}</div>` : ""}<main class="workspace-root">${renderHeader(model, { isMobile: false })}<section class="workspace-desktop-grid"><div class="workspace-sidebar-column">${renderSidebar(model, { isMobile: false, navOpen: false })}</div><section class="workspace-content-column"><div class="page-shell">${renderActivePage(model, { isMobile: false })}</div>${renderFooter(model)}</section></section></main>${renderFloatingAlert(model.activeSection === "today" ? model.floatingAlert : null, { isMobile: false })}${renderVoiceCaptureModal(this.voiceCapture, model)}${renderEditorModal(model.editorView, model.options)}</div>`;
  }
}




