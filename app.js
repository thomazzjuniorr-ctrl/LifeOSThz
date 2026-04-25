import { buildSeedState } from "./seed.js";
import { GoogleCalendarService } from "./google-calendar.js";
import { createWorkspaceKey, getCloudSyncConfig, hasCloudSyncConfigured } from "./cloud-sync.js";
import { loadAppState, pullRemoteAppState, resetAppState, saveAppState } from "./storage.js";
import { createVoiceRecognizer, getVoiceCaptureSupport } from "./voice-capture.js";
import {
  addChecklistTask,
  analyzeCaptureText,
  applyGoogleBusyBlocks,
  applyTaskAction,
  buildAppModel,
  captureInboxTask,
  clearFilters,
  closeEditor,
  createProjectFromTemplate,
  deleteEntity,
  duplicateEntity,
  generateTaskFromProjectSource,
  layerLayoutCard,
  moveLayoutCard,
  moveTaskToBucket,
  nudgeLayoutCard,
  openEditor,
  replanWeek,
  reorderAgendaTask,
  resizeLayoutCard,
  restoreLayoutDefault,
  reorderChecklistTask,
  saveCurrentLayoutAsDefault,
  confirmVoiceCapture,
  saveEntity,
  saveGoogleCalendarConfig,
  saveSettings,
  setActiveSection,
  setActiveSprint,
  setCalendarConnected,
  setDayPeriodType,
  setSelectedProject,
  setDayType,
  setFilter,
  setChecklistView,
  setPriorityMethod,
  setSelectedDate,
  toggleTaskSubtask,
  setWeeklyEnergy,
  toggleEditMode,
  updateBlockSchedule,
  updateTaskSchedule,
} from "./engine.js";
import { APP_TIMEZONE, formatShortDate, getCurrentISODate } from "./date.js";

const APP_VERSION = 6;
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
  inbox: { kicker: "Captura", title: "Entrada", text: "Capture rapido, sem preencher campos. A organizacao vem depois." },
  prioritize: { kicker: "Decisao", title: "Priorizar", text: "GTD, Sapo e refino agil explicados visualmente." },
  organize: { kicker: "Saida", title: "Organizar", text: "Complexo por tras, simples na frente." },
  areas: { kicker: "Mapa", title: "Areas", text: "Uma vida so, separada por frentes e nao por sistemas diferentes." },
  projects: { kicker: "Trabalho", title: "Projetos", text: "Cada projeto com sua leitura, dentro do mesmo banco unico." },
  planning: { kicker: "Estrutura", title: "Planejamento", text: "Sprint, objetivos, backlog e modelos." },
  agenda: { kicker: "Tempo", title: "Agenda", text: "Calendario interno estilo workspace com suporte futuro ao Google." },
  settings: { kicker: "Sistema", title: "Configuracoes", text: "Linha de raciocinio, modo edicao, layout e parametros." },
};

const PAGE_LABELS = {
  dashboard: "Dashboard",
  today: "Hoje",
  checklist: "Checklist",
  days: "Dias",
  inbox: "Entrada",
  prioritize: "Priorizar",
  organize: "Organizar",
  areas: "Areas",
  projects: "Projetos",
  planning: "Planejamento",
  agenda: "Agenda",
  settings: "Configuracoes",
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

function usesWeekContext(section = "") {
  return ["today", "days", "agenda"].includes(section);
}

function usesHeaderControls(section = "") {
  return ["today", "checklist", "prioritize", "organize", "areas", "dashboard"].includes(section);
}

function renderSyncBadge(model) {
  const ready = hasCloudSyncConfigured({ settings: { cloudSync: model.settings.cloudSync } });
  const syncing = Boolean(model.settings.cloudSync.enabled);
  if (ready) {
    return `<span class="sync-badge ready">Sync ativo</span>`;
  }
  if (syncing) {
    return `<span class="sync-badge waiting">Configurar sync</span>`;
  }
  return `<span class="sync-badge local">So local</span>`;
}

function getChecklistToggleMeta(_entry = {}) {
  return null;
}

function buildChecklistToggleButton(entry, date) {
  const meta = getChecklistToggleMeta(entry);
  if (!meta) {
    return "";
  }

  return `<button class="check-toggle ${entry.done ? "done" : ""}" data-action="${meta.action}" ${meta.attr}="${entry.id}" data-date="${date}" aria-label="${escapeHtml(`${entry.done ? "Desmarcar" : "Marcar"} ${meta.label} ${entry.title}`)}">${entry.done ? "OK" : ""}</button>`;
}

function getTaskActionMessage(action, taskTitle = "") {
  const label = taskTitle ? `: ${taskTitle}` : "";
  const map = {
    complete: `Tarefa concluida${label}.`,
    reopen: `Tarefa reaberta${label}.`,
    today: `Tarefa enviada para hoje${label}.`,
    "resolve-now": `Tarefa puxada para agora${label}.`,
    "auto-defer": `Tarefa reagendada${label}.`,
    backlog: `Tarefa movida para backlog${label}.`,
    inbox: `Tarefa voltou para a entrada${label}.`,
    delegate: `Tarefa marcada para delegacao${label}.`,
    waiting: `Tarefa marcada como aguardando${label}.`,
    discard: `Tarefa descartada${label}.`,
    "mark-frog-day": `Sapo do dia atualizado${label}.`,
    "mark-frog-week": `Sapo da semana atualizado${label}.`,
    "clear-frog": `Marcacao de sapo limpa${label}.`,
    reprocess: `Tarefa enviada para reprocessamento${label}.`,
    "as-template": `Tarefa transformada em modelo${label}.`,
    "instantiate-template": `Modelo instanciado${label}.`,
    "keep-original": `Tarefa mantida no dia atual${label}.`,
    "accept-risk": `Risco aceito para a tarefa${label}.`,
  };
  return map[action] || `Tarefa atualizada${label}.`;
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

function isAdvancedLayoutMode(model, options = {}) {
  return Boolean(model.settings.advancedEditMode && model.editMode && !options.isMobile);
}

function getFreeformCardStyle(layoutItem) {
  const frame = layoutItem?.frame;
  if (!frame) return "";
  const x = Number.isFinite(frame.x) ? frame.x : 0;
  const y = Number.isFinite(frame.y) ? frame.y : 0;
  const width = Number.isFinite(frame.w) ? frame.w : 360;
  const height = Number.isFinite(frame.h) ? frame.h : 260;
  const z = Number.isFinite(frame.z) ? frame.z : 1;
  return `left:${x}px;top:${y}px;width:${width}px;min-height:${height}px;z-index:${z};`;
}

function getLayoutCanvasHeight(entries = []) {
  const maxBottom = entries.reduce((highest, entry) => {
    const frame = entry?.frame;
    if (!frame || !Number.isFinite(frame.y) || !Number.isFinite(frame.h)) {
      return highest;
    }
    return Math.max(highest, frame.y + frame.h);
  }, 0);
  return Math.max(420, maxBottom + 40);
}

function layoutCard(page, cardId, title, body, model, options = {}) {
  const layoutItem = getLayoutItem(model, page, cardId, options);
  const widthClass = `layout-width-${layoutItem.width}`;
  const heightClass = `layout-height-${layoutItem.height}`;
  const advancedMode = Boolean(options.advancedMode);
  const editTools = model.editMode
    ? `
      <div class="layout-edit-bar">
        <div class="layout-handle">${advancedMode ? "Modo avancado • ajuste livre" : "Arraste para reorganizar"}</div>
        <div class="layout-edit-actions">
          <button class="ghost-button small" type="button" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="width" data-layout-direction="decrease" aria-label="Diminuir largura ${escapeHtml(title)}">- largura</button>
          <button class="ghost-button small" type="button" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="width" data-layout-direction="increase" aria-label="Aumentar largura ${escapeHtml(title)}">+ largura</button>
          <button class="ghost-button small" type="button" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="height" data-layout-direction="decrease" aria-label="Diminuir altura ${escapeHtml(title)}">- altura</button>
          <button class="ghost-button small" type="button" data-action="resize-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-dimension="height" data-layout-direction="increase" aria-label="Aumentar altura ${escapeHtml(title)}">+ altura</button>
          ${advancedMode ? `
            <button class="ghost-button small" type="button" data-action="nudge-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-axis="x" data-layout-direction="decrease" aria-label="Mover ${escapeHtml(title)} para a esquerda">esq</button>
            <button class="ghost-button small" type="button" data-action="nudge-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-axis="x" data-layout-direction="increase" aria-label="Mover ${escapeHtml(title)} para a direita">dir</button>
            <button class="ghost-button small" type="button" data-action="nudge-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-axis="y" data-layout-direction="decrease" aria-label="Mover ${escapeHtml(title)} para cima">cima</button>
            <button class="ghost-button small" type="button" data-action="nudge-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-axis="y" data-layout-direction="increase" aria-label="Mover ${escapeHtml(title)} para baixo">baixo</button>
            <button class="ghost-button small" type="button" data-action="layer-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-direction="decrease" aria-label="Enviar ${escapeHtml(title)} para tras">- camada</button>
            <button class="ghost-button small" type="button" data-action="layer-layout-card" data-layout-page="${page}" data-layout-card="${cardId}" data-layout-direction="increase" aria-label="Trazer ${escapeHtml(title)} para frente">+ camada</button>
          ` : ""}
          <span class="layout-size-pill">${escapeHtml(LAYOUT_WIDTH_LABELS[layoutItem.width] || layoutItem.width)} • ${escapeHtml(LAYOUT_HEIGHT_LABELS[layoutItem.height] || layoutItem.height)}</span>
        </div>
      </div>
    `
    : "";
  const inlineStyle = advancedMode ? getFreeformCardStyle(layoutItem) : "";

  return `
    <div
      class="layout-card ${model.editMode ? "editable" : ""} ${advancedMode ? "freeform" : ""} ${widthClass} ${heightClass}"
      ${model.editMode && !advancedMode ? 'draggable="true"' : ""}
      data-layout-page="${page}"
      data-layout-card="${cardId}"
      ${inlineStyle ? `style="${inlineStyle}"` : ""}
    >
      ${editTools}
      ${panel(title, body, { ...options, wide: false })}
    </div>
  `;
}

function renderLayoutPage(page, model, cards, options = {}) {
  const entries = model.settings.layouts[page] || [];
  const advancedMode = isAdvancedLayoutMode(model, options);
  const canvasHeight = advancedMode ? getLayoutCanvasHeight(entries) : 0;
  return `
    <section
      class="layout-grid ${advancedMode ? "layout-grid-freeform" : ""}"
      ${advancedMode ? `style="--layout-canvas-height:${canvasHeight}px"` : ""}
      data-layout-surface="${page}"
    >
      ${entries.map((entry) => cards[entry.id]).filter(Boolean).join("")}
    </section>
  `;
}

function renderChecklistItems(items, _selectedDate) {
  if (!items?.length) {
    return emptyState("Sem itens de acompanhamento para hoje.");
  }

  return `
    <div class="stack-list compact-stack">
      ${items.map((item) => {
        const supportToggle = getChecklistToggleMeta(item);
        const action = supportToggle
          ? `<button class="tiny-button ${item.done ? "ghost" : ""}" data-action="${supportToggle.action}" ${supportToggle.attr}="${item.id}" data-date="${_selectedDate}" aria-label="${item.done ? "Desmarcar" : "Marcar"} ${supportToggle.label} ${escapeHtml(item.title)}">${item.done ? "Feito" : "Marcar"}</button>`
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
  const supportToggle = getChecklistToggleMeta(entry);
  const doneAction = isTask
    ? `data-task-action="${isDone ? "reopen" : "complete"}" data-task-id="${entry.id}"`
    : supportToggle
      ? `data-action="${supportToggle.action}" ${supportToggle.attr}="${entry.id}" data-date="${entry.scheduledDate}"`
      : "";
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
  const editKind = "task";

  return `
    <article
      class="checklist-row ${isDone ? "done" : ""} ${isTask ? "task" : "support"}"
      ${isTask && !isDone ? 'draggable="true"' : ""}
      ${isTask && !isDone ? `data-checklist-task="${entry.id}" data-checklist-drop-task="${entry.id}"` : ""}
    >
      ${isTask
        ? `<button class="check-toggle ${isDone ? "done" : ""}" ${doneAction} aria-label="${escapeHtml(toggleLabel)}">${isDone ? "OK" : ""}</button>`
        : (buildChecklistToggleButton({ ...entry, done: isDone }, entry.scheduledDate) || `<span class="check-toggle static"></span>`)}
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
            ${isTask ? `<button class="ghost-button small" data-task-action="${isDone ? "reopen" : "complete"}" data-task-id="${entry.id}">${isDone ? "Reabrir" : "Concluir"}</button>` : ""}
            ${isTask ? `<button class="ghost-button small" data-task-action="backlog" data-task-id="${entry.id}">Backlog</button>` : ""}
            ${isTask ? `<button class="ghost-button small" data-task-action="inbox" data-task-id="${entry.id}">Entrada</button>` : ""}
            <button class="ghost-button small" data-action="open-editor" data-kind="${editKind}" data-id="${entry.id}">Editar</button>
          </div>
        </div>
      </article>
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
  const summaryPills = metaPills([
    `${model.checklist.views.find((view) => view.id === model.checklist.activeView)?.label || "Lista atual"}`,
    `${model.checklist.groups.reduce((sum, group) => sum + group.count, 0)} item(ns)`,
    `${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min no dia`,
  ]);
    const advancedMode = isAdvancedLayoutMode(model, options);
    const cards = {
      views: layoutCard("checklist", "views", "Listas e foco operacional", `
        <div class="checklist-rail-card">
          <span class="page-kicker">Listas</span>
          <h3>Checklist operacional</h3>
          <p>Use esta barra para trocar a leitura da lista. A maior parte da tela fica dedicada as atividades.</p>
        </div>
        <div class="checklist-nav-list">${renderChecklistViewButtons(model, options)}</div>
        <div class="meta-row">${summaryPills}</div>
      `, model, { advancedMode }),
      lists: layoutCard("checklist", "lists", model.checklist.views.find((view) => view.id === model.checklist.activeView)?.label || "Checklist", `
        <section class="checklist-groups checklist-groups-scroll">
          ${mainGroups}
        </section>
      `, model, { wide: true, advancedMode }),
  };

  return renderLayoutPage("checklist", model, cards, options);
}

function renderOrganizeTaskCard(task, options = {}) {
  const periodOptions = options.periods?.map((period) => `<option value="${period.id}" ${task.scheduledPeriod === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("") || "";
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
      <div class="organize-decision-grid">
        <label class="field compact">
          <span>Dia</span>
          <input type="date" value="${escapeHtml(task.scheduledDate || "")}" data-organize-task-id="${task.id}" data-organize-field="scheduledDate" />
        </label>
        <label class="field compact">
          <span>Periodo</span>
          <select data-organize-task-id="${task.id}" data-organize-field="scheduledPeriod">
            ${periodOptions}
          </select>
        </label>
      </div>
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
      <div class="toolbar-row">
        <button class="ghost-button small" data-task-action="today" data-task-id="${task.id}">Hoje</button>
        <button class="ghost-button small" data-task-action="reprocess" data-task-id="${task.id}">Reprocessar</button>
        <button class="ghost-button small" data-action="open-editor" data-kind="task" data-id="${task.id}">Destrinchar</button>
      </div>
    </article>
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

function renderAgendaKanbanTask(task, model) {
  return `
    <article class="agenda-kanban-task" draggable="true" data-agenda-task="${task.id}" data-agenda-drop-task="${task.id}" data-agenda-drop-date="${task.scheduledDate || ""}">
      <div class="task-card-top">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <p>${escapeHtml(task.areaName)}${task.projectName ? ` • ${escapeHtml(task.projectName)}` : ""}</p>
        </div>
        ${badge(task.priority ? `P ${task.priority}` : `Score ${Math.round(task.score || 0)}`)}
      </div>
      <div class="meta-row">${metaPills([task.periodLabel || "", task.dueLabel ? `Prazo ${task.dueLabel}` : "", `${task.estimatedMinutes} min`])}</div>
      <div class="agenda-drop-hint">Arraste entre os dias ou solte sobre outro card para reordenar.</div>
      <div class="field-grid two compact-inline-grid">
        <label class="field compact">
          <span>Dia</span>
          <select data-agenda-task-id="${task.id}" data-agenda-field="scheduledDate">
            ${model.agenda.days.map((day) => `<option value="${day.date}" ${task.scheduledDate === day.date ? "selected" : ""}>${escapeHtml(day.weekdayLabel)}</option>`).join("")}
          </select>
        </label>
        <label class="field compact">
          <span>Periodo</span>
          <select data-agenda-task-id="${task.id}" data-agenda-field="scheduledPeriod">
            ${model.options.periods.map((period) => `<option value="${period.id}" ${task.scheduledPeriod === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="toolbar-row">
        <button class="ghost-button small" data-action="open-editor" data-kind="task" data-id="${task.id}">Editar</button>
        <button class="ghost-button small" data-task-action="today" data-task-id="${task.id}">Hoje</button>
      </div>
    </article>
  `;
}

function renderAgendaBlockCard(block) {
  return `
    <article class="agenda-block-card">
      <div class="task-card-top">
        <div>
          <strong>${escapeHtml(block.title)}</strong>
          <p>Bloco interno • ${escapeHtml(block.period)}</p>
        </div>
        ${badge("Bloco")}
      </div>
      <div class="meta-row">${metaPills([`${block.startTime} - ${block.endTime}`, block.note || "Sem nota"])}</div>
    </article>
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
  const label = copy === "Microfone" ? "Microfone" : `Microfone • ${copy}`;
  return `
    <button class="ghost-button voice-entry-button" data-action="open-voice-capture" data-source-section="${section}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderVoiceCaptureModal(voiceState) {
  if (!voiceState?.open) {
    return "";
  }

  return `
    <div class="modal-shell" data-action="close-voice-capture-backdrop">
      <div class="modal-card voice-capture-modal simple-voice-modal" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <span class="page-kicker">Entrada por voz</span>
            <h3>Falar, revisar e salvar</h3>
            <p>O microfone aqui serve so para capturar rapido. O texto fica editavel, voce confirma e a captura vai para a Inbox.</p>
          </div>
          <button class="ghost-button" type="button" data-action="close-voice-capture">Fechar</button>
        </div>

        <div class="voice-toolbar">
          ${voiceState.supported
            ? `<button class="primary-button" type="button" data-action="${voiceState.listening ? "stop-voice-capture" : "start-voice-capture"}">${voiceState.listening ? "Parar gravacao" : "Iniciar microfone"}</button>`
            : `<span class="badge warning">Navegador sem voz nativa. Use a caixa de texto abaixo.</span>`}
          ${voiceState.listening ? `<span class="voice-live-pill">Ouvindo...</span>` : ""}
        </div>

        <form class="form-grid simple-voice-form" data-form="voice-capture-confirm">
          <label class="field">
            <span>Texto capturado</span>
            <textarea name="transcript" placeholder="Fale ou digite uma atividade para salvar direto na Inbox.">${escapeHtml(voiceState.transcript || "")}</textarea>
          </label>
          ${voiceState.interim ? `<p class="muted-copy">Ao vivo: ${escapeHtml(voiceState.interim)}</p>` : ""}
          ${voiceState.error ? `<div class="callout warning"><strong>Atencao</strong><p>${escapeHtml(voiceState.error)}</p></div>` : ""}

          <div class="callout success">
            <strong>Confirmacao simples.</strong>
            <p>Assim que voce salvar, a captura entra na Inbox e voce continua na mesma aba para registrar o proximo item.</p>
          </div>

          <div class="toolbar-row">
            <button class="primary-button" type="submit">Salvar na Inbox</button>
            <button class="ghost-button" type="button" data-action="close-voice-capture">Cancelar</button>
          </div>
        </form>
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
          data-action="${options.navOpen ? "close-sidebar" : "toggle-sidebar"}"
          aria-label="${options.navOpen ? "Fechar menu" : "Abrir menu"}"
        >
          ${options.navOpen ? "✕" : "☰"}
        </button>
        <div class="mobile-topbar-copy">
          <span class="page-kicker">${escapeHtml(page.kicker)}</span>
          <h2 class="mobile-topbar-title">${escapeHtml(page.title)}</h2>
        </div>
        ${model.activeSection === "inbox"
          ? `<button class="ghost-button small" data-action="open-voice-capture" data-source-section="inbox">Microfone</button>`
          : `<button class="primary-button small" data-action="navigate" data-section="inbox">Nova</button>`}
      </div>
      <div class="mobile-topbar-meta">
        ${renderSyncBadge(model)}
        <span class="mobile-topbar-date">${escapeHtml(model.selectedDay.longLabel)}</span>
      </div>
    </section>
  `;
}

function renderSidebar(model, options = {}) {
  const mobileClass = options.isMobile ? "mobile-drawer" : "desktop-drawer";
  const openClass = options.navOpen ? "open" : "";
  return `
    <aside class="workspace-sidebar ${mobileClass} ${openClass}" aria-hidden="${options.navOpen ? "false" : "true"}">
      <div class="mobile-sidebar-head">
        <span class="page-kicker">Navegacao</span>
        <button class="ghost-button small icon-button" data-action="close-sidebar" aria-label="Fechar menu">✕</button>
      </div>
      <div class="brand-block">
        <span class="brand-kicker">Life OS Thz 2026</span>
        <h1>Workspace de vida e trabalho</h1>
        <p>Um sistema unico para decidir, executar e reorganizar a semana real.</p>
      </div>
      <div class="sidebar-scroll-region">
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
          <button class="ghost-button full" type="button" data-action="toggle-edit-mode">${model.editMode ? "Sair do modo edicao" : "Entrar no modo edicao"}</button>
          <button class="ghost-button full" type="button" data-action="reset-app">Resetar base local</button>
        </div>
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
    const showWeekContext = usesWeekContext(model.activeSection);
    return `
      <section class="workspace-header-card mobile-header-card">
        <div class="mobile-context-row">
          <div>
            <span class="page-kicker">${escapeHtml(page.kicker)}</span>
            <p class="mobile-context-copy">${escapeHtml(page.text)}</p>
          </div>
          <div class="header-badges mobile-header-badges">
            ${badge(`Energia ${model.dashboard.energyLabel}`)}
            ${model.selectedDay.alerts ? badge(`${model.selectedDay.alerts} alerta(s)`, "warning") : badge("Sem alertas", "success")}
          </div>
        </div>
        ${showWeekContext ? `
          ${renderWeekRail(model, options)}
          <div class="mobile-header-summary">
            <span>${escapeHtml(model.selectedDay.type.label)}</span>
            <span>${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min</span>
            <span>${escapeHtml(model.selectedDay.longLabel)}</span>
          </div>
          <div class="toolbar-row mobile-quick-actions">
            <button class="secondary-button" data-action="replan-week">Reorganizar</button>
            <button class="ghost-button" data-action="navigate" data-section="agenda">Agenda</button>
            <button class="ghost-button" data-action="navigate" data-section="prioritize">Priorizar</button>
          </div>
        ` : ""}
      </section>
    `;
  }

  const showWeekContext = usesWeekContext(model.activeSection);
  const showControls = usesHeaderControls(model.activeSection);
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
            <button class="ghost-button small icon-button" data-action="toggle-sidebar" aria-label="Abrir menu">☰</button>
            ${badge(`Energia ${model.dashboard.energyLabel}`)}
            ${badge(`Metodo ${model.options.methods.find((item) => item.id === model.priorityMethod)?.label || model.priorityMethod}`)}
          </div>
        </div>
      </article>
      ${showWeekContext ? `
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
      ` : ""}
      ${showControls ? `
        <article class="workspace-controls-card">
          ${renderScopeFilters(model)}
          ${renderFilterGrid(model)}
          ${renderHeaderToolbar(model, { subtle: true })}
        </article>
      ` : ""}
    </section>
  `;
}

function renderDashboardPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    overview: layoutCard("dashboard", "overview", "Panorama da semana", `
      <div class="metric-grid four">
        ${metricCard("Sprint", model.dashboard.currentSprint ? `${model.dashboard.currentSprint.progress}%` : "Sem sprint", model.dashboard.currentSprint?.title || "Sem dado")}
        ${metricCard("Semana", `${model.dashboard.weekProgress.percent}%`, `${model.dashboard.weekProgress.done}/${model.dashboard.weekProgress.total} concluidas`) }
        ${metricCard("Energia", model.dashboard.energyLabel, "Usada para capacidade real")}
        ${metricCard("Dias para mudanca", String(model.dashboard.daysToMove), "Meta ate novembro")}
      </div>
    `, model, { advancedMode }),
    radar: layoutCard("dashboard", "radar", "Radar da semana", `
      <div class="stack-list">
        ${(model.dashboard.alerts.length ? model.dashboard.alerts : [{ title: "Semana sob controle", gtdDecision: "OK", areaName: "Sistema", score: 0, reasons: ["sem gargalos criticos"], suggestions: [], subtasks: [] }]).map((task) => task.id ? taskCard(task, { mode: "alert" }) : `<div class="callout success"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.reasons[0])}</p></div>`).join("")}
      </div>
    `, model, { advancedMode }),
    goals: layoutCard("dashboard", "goals", "Metas principais", `
      <div class="stack-list compact-stack">
        ${model.dashboard.mainGoals.map((goal) => `
          <div class="goal-row">
            <div><strong>${escapeHtml(goal.title)}</strong><p>${escapeHtml(goal.description)}</p></div>
            <div class="goal-meter">${progressBar(goal.progress)}<span>${goal.progress}%</span></div>
          </div>
        `).join("")}
      </div>
    `, model, { advancedMode }),
    areas: layoutCard("dashboard", "areas", "Resumo das areas", `
      <div class="stack-list compact-stack">
        ${model.dashboard.areaSummaries.map((area) => `
          <article class="summary-row">
            <div><strong>${escapeHtml(area.name)}</strong><p>${escapeHtml(area.description)}</p></div>
            <div class="meta-row">${metaPills([`${area.openCount} abertas`, `${area.priorityCount} fortes`, `${area.alerts} alertas`])}</div>
          </article>
        `).join("")}
      </div>
    `, model, { advancedMode }),
    projects: layoutCard("dashboard", "projects", "Resumo dos projetos", `
      <div class="stack-list compact-stack">
        ${model.dashboard.projectSummaries.map((project) => `
          <article class="summary-row">
            <div><strong>${escapeHtml(project.name)}</strong><p>${escapeHtml(project.summary)}</p></div>
            <div class="meta-row">${metaPills([`${project.openCount} abertas`, `${project.progress}% previsivel`])}</div>
          </article>
        `).join("")}
      </div>
    `, model, { advancedMode }),
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
    `, model, { advancedMode }),
  };

  return renderLayoutPage("dashboard", model, cards, options);
}

function renderTodayPage(model, options = {}) {
  const topPriorities = model.selectedDay.tasks.slice(0, 3);
  const queue = model.selectedDay.tasks.slice(3, options.isMobile ? 8 : 10);
  const alertTasks = model.selectedDay.tasks.filter((task) => task.manualDecision || task.location === "alert");
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    focus: layoutCard("today", "focus", "3 prioridades do dia", taskList(topPriorities, { emphasis: true, empty: "O dia esta leve. Use para recuperar energia ou simplificar backlog." }), model, { wide: true, advancedMode }),
    queue: layoutCard("today", "queue", "Fila do dia", taskList(queue, { empty: "Sem fila pendente para hoje." }), model, { advancedMode }),
    checklist: layoutCard("today", "checklist", "Checklist do dia", `
      <div class="today-checklist-head">
        <div class="meta-row">${metaPills([
          `${model.todayChecklist.items.filter((item) => item.done).length} feito(s)`,
          `${model.todayChecklist.items.length} item(ns)`,
        ])}</div>
        <p class="muted-copy">Checklist operacional do dia, ligado ao que realmente entrou na execucao.</p>
      </div>
      ${renderChecklistItems(model.todayChecklist.items, model.selectedDate)}
    `, model, { advancedMode }),
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
    `, model, { advancedMode }),
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
  <h3>${escapeHtml(topPriorities[0]?.title || model.dashboard.currentSprint?.title || "Dia organizado para caber no que realmente importa")}</h3>
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
    ${renderLayoutPage("today", model, cards, options)}
  `;
}

function renderDaysPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    snapshot: layoutCard("days", "snapshot", "Leitura do dia", `
      <div class="callout ${model.selectedDay.lowCapacity ? "warning" : ""}">
        <strong>${escapeHtml(model.selectedDay.type.label)}</strong>
        <p>${escapeHtml(model.selectedDay.type.explanation)} ${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min usados.</p>
      </div>
      <div class="meta-row">${metaPills([
        model.selectedDay.longLabel,
        `${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min`,
        `${model.selectedDay.alerts} alerta(s)`,
      ])}</div>
    `, model, { advancedMode }),
    periods: layoutCard("days", "periods", "Capacidade por periodo", `
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
    `, model, { wide: true, advancedMode }),
    alerts: layoutCard("days", "alerts", "Urgentes e alertas", taskList(model.selectedDay.tasks.filter((task) => task.critical || task.manualDecision || task.location === "alert"), { empty: "Nenhum item urgente no dia.", mode: "alert" }), model, { advancedMode }),
  };
  return renderLayoutPage("days", model, cards, options);
}
function renderInboxPage(model, options = {}) {
  if (options.isMobile) {
    return `
      <section class="mobile-inbox-stack">
        <article class="panel-card mobile-capture-card">
          <div class="panel-head compact">
            <div>
              <span class="page-kicker">Captura rapida</span>
              <h3>Jogue a tarefa e siga</h3>
            </div>
            ${renderSyncBadge(model)}
          </div>
          <p class="muted-copy">Sem area, sem projeto e sem prazo aqui. Capture agora e organize depois.</p>
          <form class="simple-capture-form minimal-capture-form mobile-capture-form" data-form="capture-task">
            <label class="field">
              <span>Nova captura</span>
              <input name="title" placeholder="Ex: ligar para o cliente, revisar proposta, separar documentos..." autocomplete="off" autofocus required />
            </label>
            <div class="toolbar-row mobile-capture-actions">
              ${renderVoiceCaptureButton("Microfone", "inbox")}
              <button class="primary-button" type="submit">Enviar</button>
            </div>
          </form>
        </article>
        <article class="panel-card">
          <div class="panel-head compact">
            <div>
              <strong>Capturas recentes</strong>
              <p>${model.inbox.counts.raw} na inbox • ${model.inbox.counts.recent} recentes</p>
            </div>
          </div>
          ${taskList(model.inbox.recent, { empty: "Sem capturas recentes. Use o campo acima ou o microfone." })}
        </article>
      </section>
    `;
  }

  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    capture: layoutCard("inbox", "capture", "Captura rapida", `
      <div class="simple-capture-shell">
        <div class="callout success">
          <strong>So capture.</strong>
          <p>Sem area, sem projeto, sem prazo. Registre rapido aqui e organize depois.</p>
        </div>
        <form class="simple-capture-form minimal-capture-form" data-form="capture-task">
          <label class="field">
            <span>Nova captura</span>
            <input name="title" placeholder="Ex: ligar para o cliente, revisar proposta, separar documentos..." required />
          </label>
          <div class="toolbar-row">
            ${renderVoiceCaptureButton("Microfone", "inbox")}
            <button class="primary-button" type="submit">Enviar</button>
          </div>
        </form>
      </div>
    `, model, { advancedMode }),
    recent: layoutCard("inbox", "recent", "Capturas recentes", `
      <div class="meta-row">${metaPills([
        `${model.inbox.counts.raw} na inbox`,
        `${model.inbox.counts.recent} recentes`,
      ])}</div>
      ${taskList(model.inbox.recent, { empty: "Sem capturas recentes. Use o campo acima ou o microfone." })}
    `, model, { advancedMode }),
  };
  return renderLayoutPage("inbox", model, cards, options);
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
    `, model, { wide: true, advancedMode: isAdvancedLayoutMode(model, options) }),
    frogs: layoutCard("prioritize", "frogs", "Sapo do dia e da semana", `
      <div class="stack-list compact-stack">
        ${model.prioritize.dayFrog ? taskCard(model.prioritize.dayFrog, { emphasis: true }) : emptyState("Nenhum sapo do dia definido.")}
        ${model.prioritize.weekFrog ? taskCard(model.prioritize.weekFrog, { emphasis: true }) : emptyState("Nenhum sapo da semana definido.")}
      </div>
    `, model, { advancedMode: isAdvancedLayoutMode(model, options) }),
    auto: layoutCard("prioritize", "auto", "Piloto automatico", `
      <div class="callout success">
        <strong>Priorizacao automatica ligada.</strong>
        <p>A linha de raciocinio orienta GTD, Sapo e refino agil. Voce ajusta so quando precisar corrigir.</p>
      </div>
      ${renderAutoPilotList(model.prioritize.autoPilot)}
    `, model, { advancedMode: isAdvancedLayoutMode(model, options) }),
    ranked: layoutCard("prioritize", "ranked", "Refino final e explicacao", `
      ${taskList(model.prioritize.ranked, { empty: "Nada para refinar agora." })}
      <div class="reading-card">
        <strong>Linha de raciocinio</strong>
        <p>${escapeHtml(model.settings.reasoningLine)}</p>
        <button class="ghost-button small" data-action="navigate" data-section="settings">Editar linha de raciocinio</button>
      </div>
    `, model, { wide: true, advancedMode: isAdvancedLayoutMode(model, options) }),
  };

  return renderLayoutPage("prioritize", model, cards, options);
}

  function renderOrganizePage(model, options = {}) {
  if (options.isMobile) {
    return `
      <section class="organize-mobile-stack">
        ${model.organize.map((bucket) => panel(bucket.label, `
          <div class="stack-list compact-stack">
            ${bucket.tasks.length
              ? bucket.tasks.map((task) => renderOrganizeTaskCard(task, { buckets: model.options.buckets, periods: model.options.periods })).join("")
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
              <p class="muted-copy">Ajuste bucket, destrinche e pre-agende antes de mandar para a Agenda.</p>
              <div class="stack-list compact-stack organize-column-scroll">
                ${bucket.tasks.length
                  ? bucket.tasks.map((task) => renderOrganizeTaskCard(task, { buckets: model.options.buckets, periods: model.options.periods })).join("")
                  : emptyState("Sem tarefas nesta coluna.")}
              </div>
            </article>
        `).join("")}
      </section>
    `, model, { wide: true, advancedMode: isAdvancedLayoutMode(model, options) }),
    summary: layoutCard("organize", "summary", "Leitura simples da organizacao", `
      <div class="metric-grid four">
        ${metricCard("Fazer agora", String(model.organize.find((bucket) => bucket.id === "do-now")?.tasks.length || 0), "Execucao imediata")}
        ${metricCard("Prioridade", String(model.organize.find((bucket) => bucket.id === "priority")?.tasks.length || 0), "Importantes sem engessar o dia")}
        ${metricCard("Agendar", String(model.organize.find((bucket) => bucket.id === "schedule")?.tasks.length || 0), "Tarefas com encaixe futuro")}
        ${metricCard("Backlog", String(model.organize.find((bucket) => bucket.id === "backlog")?.tasks.length || 0), "Precisa de limpeza continua")}
      </div>
      <div class="callout">
        <strong>Organizar = ajuste final antes da semana.</strong>
        <p>A Entrada captura, o motor interpreta e esta tela fica com a decisao humana final: revisar, destrinchar, agendar e mandar para a Agenda.</p>
      </div>
    `, model, { wide: true, advancedMode: isAdvancedLayoutMode(model, options) }),
  };

  return renderLayoutPage("organize", model, cards, options);
}

function renderAreasPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const totals = model.areas.reduce((accumulator, area) => ({
    open: accumulator.open + area.openCount,
    priority: accumulator.priority + area.priorityCount,
    alerts: accumulator.alerts + area.alerts,
  }), { open: 0, priority: 0, alerts: 0 });
  const cards = {
    overview: layoutCard("areas", "overview", "Mapa das areas", `
      <div class="metric-grid four">
        ${metricCard("Areas", String(model.areas.length), "Frentes organizadas no sistema")}
        ${metricCard("Abertas", String(totals.open), "Tarefas em andamento")}
        ${metricCard("Destaque", String(totals.priority), "Itens em evidencia")}
        ${metricCard("Alertas", String(totals.alerts), "Pontos que pedem atencao")}
      </div>
    `, model, { advancedMode }),
    list: layoutCard("areas", "list", "Resumo por area", `
      <div class="page-grid two">
        ${model.areas.map((area) => panel(area.name, `<p class="muted-copy">${escapeHtml(area.description)}</p><div class="meta-row">${metaPills([`${area.openCount} abertas`, `${area.priorityCount} em destaque`, `${area.alerts} alertas`])}</div>${taskList(area.nextTasks, { empty: "Sem tarefas abertas nesta area." })}<div class="toolbar-row"><button class="ghost-button" data-action="open-editor" data-kind="area" data-id="${area.id}">Editar area</button></div>`)).join("")}
      </div>
    `, model, { wide: true, advancedMode }),
  };
  return renderLayoutPage("areas", model, cards, options);
}

function renderProjectLinkList(entries = [], emptyMessage) {
  if (!entries.length) {
    return emptyState(emptyMessage);
  }

  return `<div class="project-rich-list">${entries.map((entry) => `
    <article class="project-item-card">
      <strong>${escapeHtml(entry.label || entry.url || "Link")}</strong>
      ${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a>` : `<p class="muted-copy">Sem URL cadastrada.</p>`}
    </article>
  `).join("")}</div>`;
}

function renderProjectPlainList(entries = [], emptyMessage, options = {}) {
  if (!entries.length) {
    return emptyState(emptyMessage);
  }

  return `<div class="project-rich-list">${entries.map((entry) => `
    <article class="project-item-card">
      <strong>${escapeHtml(entry.title || entry)}</strong>
      ${entry.notes ? `<p class="muted-copy">${escapeHtml(entry.notes)}</p>` : ""}
      ${entry.nextAction ? `<p class="muted-copy">Proxima acao: ${escapeHtml(entry.nextAction)}</p>` : ""}
      ${entry.checklist?.length ? `<p class="muted-copy">Checklist: ${escapeHtml(entry.checklist.join(" • "))}</p>` : ""}
      ${entry.keyResults?.length ? `<p class="muted-copy">KRs: ${escapeHtml(entry.keyResults.join(" • "))}</p>` : ""}
      ${options.taskButton ? `<div class="toolbar-row"><button class="ghost-button" type="button" data-action="generate-project-task" data-project-id="${options.projectId}" data-project-source="${options.sourceType}" data-project-entry="${entry.id}">${escapeHtml(options.taskButton)}</button></div>` : ""}
    </article>
  `).join("")}</div>`;
}

function renderProjectOkrs(entries = [], projectId) {
  if (!entries.length) {
    return emptyState("Sem OKRs cadastrados para este projeto.");
  }

  return `<div class="project-rich-list project-okr-list">${entries.map((okr) => `
    <article class="project-item-card project-okr-card">
      <div class="task-card-top">
        <strong>${escapeHtml(okr.title)}</strong>
        ${badge(`${okr.progress}%`, okr.progress >= 70 ? "success" : okr.progress >= 40 ? "" : "warning")}
      </div>
      <div class="meta-row">${metaPills([okr.status || "active", `${(okr.keyResults || []).length} KR(s)`])}</div>
      ${(okr.keyResults || []).length ? `<p class="muted-copy">${escapeHtml(okr.keyResults.join(" • "))}</p>` : ""}
      <div class="toolbar-row"><button class="ghost-button" type="button" data-action="generate-project-task" data-project-id="${projectId}" data-project-source="okr" data-project-entry="${okr.id}">Gerar acao</button></div>
    </article>
  `).join("")}</div>`;
}

function renderProjectsPage(model, options = {}) {
  const projectView = model.projectsView;
  const selected = projectView.selected;
  const advancedMode = isAdvancedLayoutMode(model, options);
  const selectorBody = `
    <div class="project-context-head">
      <div>
        <span class="page-kicker">Projetos</span>
        <h3>Escolha o projeto</h3>
        <p>Use esta faixa para trocar de projeto sem misturar tudo na rolagem da pagina.</p>
      </div>
    </div>
    <div class="project-template-grid project-template-strip">
      ${projectView.templates.map((template) => `<button class="ghost-button" type="button" data-action="create-project-template" data-project-template="${template.id}">${escapeHtml(template.label)}</button>`).join("")}
    </div>
    <p class="muted-copy">Cada template abre um workspace base com blocos sugeridos.</p>
    <div class="project-selector-list project-selector-strip" role="tablist" aria-label="Projetos">
      ${projectView.summaries.map((project) => `
        <button class="project-selector-card ${project.active ? "active" : ""}" type="button" data-action="select-project" data-project-id="${project.id}" role="tab" aria-selected="${project.active ? "true" : "false"}">
          <span class="page-kicker">${escapeHtml(project.projectType || "Projeto")}</span>
          <strong>${escapeHtml(project.name)}</strong>
          <p>${escapeHtml(project.summary || "Sem resumo ainda.")}</p>
          <div class="meta-row">${metaPills([`${project.openCount} abertas`, `${project.progress}%`, project.sprintTitle || "Sem sprint"])}</div>
        </button>
      `).join("")}
    </div>
  `;

  if (!selected) {
    const emptyCards = {
      selector: layoutCard("projects", "selector", "Projetos e templates", selectorBody, model, { advancedMode }),
      overview: layoutCard("projects", "overview", "Visao geral", emptyState("Crie ou selecione um projeto para abrir a pagina dele."), model, { advancedMode }),
      info: layoutCard("projects", "info", "Central de informacoes", emptyState("Links, referencias e notas ficam aqui."), model, { advancedMode }),
      okrs: layoutCard("projects", "okrs", "OKRs do projeto", emptyState("Os OKRs do projeto aparecem aqui."), model, { advancedMode }),
      backlog: layoutCard("projects", "backlog", "Backlog do projeto", emptyState("Ideias e pendencias futuras aparecem aqui."), model, { advancedMode }),
      base: layoutCard("projects", "base", "Atividades base", emptyState("Checklists e tarefas-modelo ficam aqui."), model, { advancedMode }),
      action: layoutCard("projects", "action", "Plano de acao", emptyState("As proximas acoes do projeto ficam aqui."), model, { advancedMode }),
      generated: layoutCard("projects", "generated", "Tarefas geradas no sistema", emptyState("As tarefas geradas vao primeiro para Organizar."), model, { wide: true, advancedMode }),
    };
    return renderLayoutPage("projects", model, emptyCards, options);
  }

  const areaOptions = model.options.areas.map((area) => `<option value="${area.id}" ${selected.areaId === area.id ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("");
  const sprintOptions = `<option value="">Sem sprint</option>${model.options.sprints.map((sprint) => `<option value="${sprint.id}" ${selected.sprintId === sprint.id ? "selected" : ""}>${escapeHtml(sprint.title)}</option>`).join("")}`;
  const templateOptions = model.options.projectTemplates.map((template) => `<option value="${template.id}" ${selected.templateId === template.id ? "selected" : ""}>${escapeHtml(template.label)}</option>`).join("");

  const cards = {
    selector: layoutCard("projects", "selector", "Projetos e templates", selectorBody, model, { advancedMode }),
    overview: layoutCard("projects", "overview", "Visao geral", `
      <div class="project-hero-card">
        <div>
          <span class="page-kicker">${escapeHtml(selected.projectType || "Projeto")}</span>
          <h3>${escapeHtml(selected.name)}</h3>
          <p>${escapeHtml(selected.summary || "Sem resumo ainda.")}</p>
        </div>
        <div class="meta-row">${metaPills([
          `${selected.openTasks.length} abertas`,
          `${selected.generatedTasks.length} no fluxo`,
          selected.sprintTitle || "Sem sprint",
          selected.priority ? `Prioridade ${selected.priority}` : "",
        ])}</div>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Nome do projeto</span><input name="name" value="${escapeHtml(selected.name || "")}" /></label>
        <label class="field"><span>Template / tipo</span><select name="templateId">${templateOptions}</select></label>
      </div>
      <div class="field-grid four">
        <label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label>
        <label class="field"><span>Status</span><input name="status" value="${escapeHtml(selected.status || "active")}" /></label>
        <label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(selected.dueDate || "")}" /></label>
        <label class="field"><span>Prioridade</span><select name="priority"><option value="low" ${selected.priority === "low" ? "selected" : ""}>Baixa</option><option value="medium" ${selected.priority === "medium" ? "selected" : ""}>Media</option><option value="high" ${selected.priority === "high" ? "selected" : ""}>Alta</option></select></label>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Sprint relacionado</span><select name="sprintId">${sprintOptions}</select></label>
        <label class="field"><span>Tipo exibido</span><input name="projectType" value="${escapeHtml(selected.projectType || "")}" /></label>
      </div>
      <label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(selected.description || "")}</textarea></label>
      <label class="field"><span>Objetivo principal</span><textarea name="objective">${escapeHtml(selected.objective || "")}</textarea></label>
      <label class="field"><span>Resumo curto</span><textarea name="summary">${escapeHtml(selected.summary || "")}</textarea></label>
    `, model, { advancedMode }),
    info: layoutCard("projects", "info", "Central de informacoes", `
      <div class="project-section-scroll">
        ${renderProjectLinkList(selected.infoLinks, "Sem links principais ainda.")}
        ${renderProjectLinkList(selected.referenceEntries, "Sem referencias ainda.")}
      </div>
      <div class="field-grid two">
        <label class="field"><span>Links (um por linha: titulo | url)</span><textarea name="infoLinks" placeholder="Drive | https://...&#10;Notion | https://...">${escapeHtml((selected.infoLinks || []).map((entry) => [entry.label || "", entry.url || ""].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
        <label class="field"><span>Arquivos / referencias (titulo | url)</span><textarea name="referenceEntries" placeholder="Briefing | https://...">${escapeHtml((selected.referenceEntries || []).map((entry) => [entry.label || "", entry.url || ""].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Decisoes importantes</span><textarea name="decisionLines" placeholder="Uma decisao por linha">${escapeHtml((selected.decisionLines || []).join("\n"))}</textarea></label>
        <label class="field"><span>Observacoes</span><textarea name="observationLines" placeholder="Uma observacao por linha">${escapeHtml((selected.observationLines || []).join("\n"))}</textarea></label>
      </div>
      <label class="field"><span>Notas livres</span><textarea name="freeNotes">${escapeHtml(selected.freeNotes || "")}</textarea></label>
    `, model, { advancedMode }),
    okrs: layoutCard("projects", "okrs", "OKRs do projeto", `
      <div class="project-section-scroll">${renderProjectOkrs(selected.okrs || [], selected.id)}</div>
      <label class="field"><span>Editar OKRs (objetivo | status | progresso | KR1 ; KR2 ; KR3)</span><textarea name="okrs">${escapeHtml((selected.okrs || []).map((entry) => [entry.title || "", entry.status || "active", entry.progress || 0, (entry.keyResults || []).join("; ")].join(" | ")).join("\n"))}</textarea></label>
    `, model, { advancedMode }),
    backlog: layoutCard("projects", "backlog", "Backlog do projeto", `
      <div class="project-section-scroll">${renderProjectPlainList(selected.backlogItems || [], "Sem backlog ainda.", { projectId: selected.id, sourceType: "backlog", taskButton: "Gerar tarefa" })}</div>
      <label class="field"><span>Backlog (titulo | observacao)</span><textarea name="backlogItems">${escapeHtml((selected.backlogItems || []).map((entry) => [entry.title || "", entry.notes || ""].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
    `, model, { advancedMode }),
    base: layoutCard("projects", "base", "Atividades base", `
      <div class="project-section-scroll">${renderProjectPlainList(selected.baseActivities || [], "Sem atividades base ainda.", { projectId: selected.id, sourceType: "base", taskButton: "Virar tarefa" })}</div>
      <label class="field"><span>Atividades base (titulo | item 1 ; item 2 ; item 3)</span><textarea name="baseActivities">${escapeHtml((selected.baseActivities || []).map((entry) => [entry.title || "", (entry.checklist || []).join("; ")].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
    `, model, { advancedMode }),
    action: layoutCard("projects", "action", "Plano de acao", `
      <div class="project-section-scroll">${renderProjectPlainList(selected.actionPlan || [], "Sem plano de acao ainda.", { projectId: selected.id, sourceType: "action", taskButton: "Gerar tarefa" })}</div>
      <label class="field"><span>Plano de acao (titulo | proxima acao | item 1 ; item 2)</span><textarea name="actionPlan">${escapeHtml((selected.actionPlan || []).map((entry) => [entry.title || "", entry.nextAction || "", (entry.checklist || []).join("; ")].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
    `, model, { advancedMode }),
    generated: layoutCard("projects", "generated", "Tarefas geradas no sistema", `
      <div class="callout">
        <strong>Fluxo do projeto</strong>
        <p>Projeto -> gerar tarefas -> Organizar -> Agenda -> Hoje. Nada vem direto para Hoje.</p>
      </div>
      <div class="project-section-scroll">${taskList(selected.generatedTasks, { empty: "Nenhuma tarefa gerada ainda para este projeto." })}</div>
    `, model, { wide: true, advancedMode }),
  };

  return `
    <form class="project-workspace-form" data-form="project-workspace">
      <input type="hidden" name="id" value="${escapeHtml(selected.id)}" />
      ${renderLayoutPage("projects", model, cards, options)}
      <div class="toolbar-row project-form-actions">
        <button class="primary-button" type="submit">Salvar projeto</button>
        <button class="ghost-button" type="button" data-action="open-editor" data-kind="project" data-id="${selected.id}">Editor avancado</button>
      </div>
    </form>
  `;
}

function renderPlanningPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    sprints: layoutCard("planning", "sprints", "Sprints do ano", `
      <div class="callout success">
        <strong>${model.planning.currentSprint ? escapeHtml(model.planning.currentSprint.title) : "Sem sprint atual"}</strong>
        <p>A linha de raciocinio e o sprint atual influenciam automaticamente a prioridade das tarefas capturadas na Entrada.</p>
      </div>
      <div class="stack-list compact-stack">
        ${model.planning.sprints.map((sprint) => `
          <article class="reading-card sprint-card ${sprint.status === "current" ? "active" : ""}">
            <div class="task-card-top">
              <div>
                <div class="meta-row">${metaPills([`Sprint ${sprint.slot}`, sprint.periodLabel, sprint.status === "current" ? "Atual" : sprint.status === "upcoming" ? "Proximo" : "Planejado"])}</div>
                <strong>${escapeHtml(sprint.title)}</strong>
                <p>${escapeHtml(sprint.description || sprint.theme || "Sem descricao ainda.")}</p>
              </div>
              ${badge(sprint.status === "current" ? "Ativo" : "Livre", sprint.status === "current" ? "success" : "")}
            </div>
            ${sprint.priorities?.length ? `<div class="meta-row">${metaPills(sprint.priorities)}</div>` : ""}
            <div class="meta-row">${metaPills([
              sprint.projectNames?.length ? `Projetos: ${sprint.projectNames.join(", ")}` : "",
              sprint.objectiveTitles?.length ? `Objetivos: ${sprint.objectiveTitles.length}` : "",
            ])}</div>
            <div class="toolbar-row">
              <button class="secondary-button" data-action="set-active-sprint" data-sprint-id="${sprint.id}">Marcar como atual</button>
              <button class="ghost-button" data-action="open-editor" data-kind="sprint" data-id="${sprint.id}">Editar sprint</button>
            </div>
          </article>
        `).join("")}
      </div>
    `, model, { wide: true, advancedMode }),
    objectives: layoutCard("planning", "objectives", "Objetivos", `<div class="stack-list compact-stack">${model.planning.objectives.map((objective) => `<article class="goal-row"><div><strong>${escapeHtml(objective.title)}</strong><p>${escapeHtml(objective.description)}</p></div><div class="goal-meter">${progressBar(objective.progress)}<span>${objective.progress}%</span></div></article>`).join("")}</div>`, model, { advancedMode }),
    backlog: layoutCard("planning", "backlog", "Backlog", taskList(model.planning.backlog, { empty: "Backlog limpo." }), model, { advancedMode }),
    templates: layoutCard("planning", "templates", "Modelos", taskList(model.planning.templates, { empty: "Sem modelos ainda." }), model, { advancedMode }),
  };
  return renderLayoutPage("planning", model, cards, options);
}

function renderAgendaPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    week: layoutCard("agenda", "week", "Kanban semanal editavel", `
        <div class="callout success compact-agenda-callout">
          <strong>Arraste tarefas entre os dias.</strong>
          <p>O dia da tarefa muda aqui e o resto do sistema acompanha automaticamente: Hoje, Organizar e leitura de carga semanal.</p>
        </div>
        <div class="agenda-kanban-grid">
        ${model.agenda.days.map((day) => `
          <article class="calendar-day-column agenda-day-drop-zone" data-agenda-date="${day.date}">
            <div class="calendar-day-head">
              <strong>${escapeHtml(day.weekdayLabel)}</strong>
              <span>${escapeHtml(day.shortLabel)}</span>
            </div>
            <div class="meta-row">${metaPills([day.type.label, `${day.totalLoad}/${day.totalCapacity} min`, `${day.alerts} alerta(s)`])}</div>
            <div class="agenda-day-stack">
              ${day.tasks.length
                ? day.tasks.map((task) => renderAgendaKanbanTask(task, model)).join("")
                : emptyState("Dia livre para encaixar algo.")}
              ${day.blocks?.length ? day.blocks.map((entry) => renderAgendaBlockCard(entry)).join("") : ""}
              <div class="agenda-drop-tail" data-agenda-date="${day.date}">Soltar no fim do dia</div>
            </div>
          </article>
        `).join("")}
      </div>
    `, model, { wide: true, advancedMode }),
    editor: layoutCard("agenda", "editor", "Fila para encaixar e blocos", `
      <div class="reading-card">
        <div class="panel-head">
          <div>
            <strong>${escapeHtml(model.selectedDay.longLabel)}</strong>
            <p>O que ainda nao tem dia claro pode ser refinado aqui e depois arrastado para a semana.</p>
          </div>
          <div class="meta-row">${metaPills([model.selectedDay.type.label, `${model.selectedDay.totalLoad}/${model.selectedDay.totalCapacity} min`])}</div>
        </div>
      </div>
      <div class="page-grid two">
        ${panel("Sem dia definido", `
          <div class="stack-list compact-stack">
            ${model.agenda.unscheduled.length
              ? model.agenda.unscheduled.map((task) => renderAgendaKanbanTask(task, model)).join("")
              : emptyState("Nada pendente para encaixar na semana.")}
          </div>
        `)}
        ${panel("Blocos do dia selecionado", renderAgendaBlockEditor(model.agenda.days.find((day) => day.date === model.selectedDate)?.blocks || [], model))}
      </div>
      ${panel("Google Calendar", `<form class="form-grid" data-form="google-config"><label class="field"><span>Client ID</span><input name="clientId" value="${escapeHtml(model.agenda.google.clientId || "")}" /></label><label class="field"><span>API Key</span><input name="apiKey" value="${escapeHtml(model.agenda.google.apiKey || "")}" /></label><label class="field"><span>Calendar ID</span><input name="calendarId" value="${escapeHtml(model.agenda.google.calendarId || "primary")}" /></label><div class="toolbar-row"><button class="primary-button" type="submit">Salvar</button><button class="secondary-button" type="button" data-action="connect-google">Conectar Google</button><button class="ghost-button" type="button" data-action="sync-google">Sincronizar blocos</button></div></form><p class="muted-copy">Status: ${model.agenda.connected ? "conectado" : "nao conectado"}</p>`)}
    `, model, { wide: true, advancedMode }),
  };

  return renderLayoutPage("agenda", model, cards, options);
}

function renderSettingsPage(model, options = {}) {
  const advancedMode = isAdvancedLayoutMode(model, options);
  const cards = {
    layout: layoutCard("settings", "layout", "Layout e Aparencia", `
      <div class="callout ${model.settings.editMode ? "warning" : ""}">
        <strong>${model.settings.editMode ? "Modo edicao ativo" : "Modo visualizacao ativo"}</strong>
        <p>${model.settings.advancedEditMode ? "Modo avancado ligado: ajuste livre, inclusive com sobreposicao." : "Use o grid editavel para reorganizar os blocos sem bagunca."}</p>
      </div>
      <div class="toolbar-row">
        <button class="secondary-button" type="button" data-action="toggle-edit-mode">${model.settings.editMode ? "Desligar modo edicao" : "Ligar modo edicao"}</button>
        <button class="ghost-button" type="button" data-action="save-layout-default" data-layout-page="${model.activeSection}">Salvar layout desta aba</button>
        <button class="ghost-button" type="button" data-action="restore-layout-default" data-layout-page="${model.activeSection}">Restaurar layout desta aba</button>
      </div>
      <div class="meta-row">${metaPills([`Modo: ${model.settings.layoutMode}`, model.settings.layoutCapabilities.resizeEnabled ? "Resize ativo" : "Resize inativo", model.settings.layoutCapabilities.futureFreeformReady ? "Modo avancado pronto" : "Grid fixo"])}</div>
      <div class="layout-summary-grid">${renderLayoutSummary(model.settings.layouts)}</div>
    `, model, { wide: true, advancedMode }),
    system: layoutCard("settings", "system", "Sistema e priorizacao", `
      <div class="callout success">
        <strong>Calendario interno alinhado ao Brasil.</strong>
        <p>Timezone padrao do app: ${escapeHtml(APP_TIMEZONE)}. O Google Calendar continua opcional e pode entrar depois sem quebrar o calendario interno.</p>
      </div>
      <div class="field-grid three">
        <label class="field"><span>Mudanca</span><input type="number" step="0.01" name="moveProtection" value="${escapeHtml(model.settings.prioritization.moveProtection)}" /></label>
        <label class="field"><span>Familia</span><input type="number" step="0.01" name="familyProtection" value="${escapeHtml(model.settings.prioritization.familyProtection)}" /></label>
        <label class="field"><span>Limite de carga</span><input type="number" step="0.01" name="overloadLimit" value="${escapeHtml(model.settings.prioritization.overloadLimit)}" /></label>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Futuro</span><input type="number" step="0.01" name="futureFocus" value="${escapeHtml(model.settings.prioritization.futureFocus)}" /></label>
        <label class="field"><span>Delegacao</span><input type="number" step="0.01" name="delegationBias" value="${escapeHtml(model.settings.prioritization.delegationBias)}" /></label>
      </div>
      <label class="field"><span>Linha de raciocinio</span><textarea name="reasoningLine">${escapeHtml(model.settings.reasoningLine)}</textarea></label>
    `, model, { advancedMode }),
    sync: layoutCard("settings", "sync", "Sincronizacao", `
      <div class="callout">
        <strong>Sincronizacao entre celular e desktop</strong>
        <p>Modo recomendado: Supabase com workspace unico. Isso sincroniza Entrada, Checklist, Agenda, Organizar, Projetos, Sprints e configuracoes importantes entre celular e desktop.</p>
      </div>
      <div class="meta-row">${metaPills([
        "Mobile + desktop no mesmo workspace",
        "Captura continua local-first",
        "Sync automatico por intervalo, foco e envio",
      ])}</div>
      <div class="field-grid two">
        <label class="field">
          <span>Ativar sincronizacao</span>
          <select name="syncEnabled">
            <option value="false" ${!model.settings.cloudSync.enabled ? "selected" : ""}>Desligada</option>
            <option value="true" ${model.settings.cloudSync.enabled ? "selected" : ""}>Ligada</option>
          </select>
        </label>
        <label class="field">
          <span>Provider</span>
          <select name="syncProvider">
            <option value="supabase" ${model.settings.cloudSync.provider === "supabase" ? "selected" : ""}>Supabase</option>
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label class="field"><span>Project URL</span><input name="syncProjectUrl" value="${escapeHtml(model.settings.cloudSync.projectUrl || "")}" placeholder="https://SEU-PROJETO.supabase.co" /></label>
        <label class="field"><span>Anon / Publishable Key</span><input name="syncAnonKey" value="${escapeHtml(model.settings.cloudSync.anonKey || "")}" placeholder="sb_publishable_... ou anon key" /></label>
      </div>
      <div class="field-grid three">
        <label class="field"><span>Tabela</span><input name="syncTableName" value="${escapeHtml(model.settings.cloudSync.tableName || "life_os_snapshots")}" /></label>
        <label class="field"><span>Workspace Key</span><input name="syncWorkspaceKey" value="${escapeHtml(model.settings.cloudSync.workspaceKey || "")}" placeholder="chave privada do workspace" /></label>
        <label class="field"><span>Intervalo (s)</span><input type="number" min="10" name="syncPollIntervalSeconds" value="${escapeHtml(model.settings.cloudSync.pollIntervalSeconds || 20)}" /></label>
      </div>
      <div class="toolbar-row">
        <button class="ghost-button" type="button" data-action="generate-sync-key">Gerar workspace key</button>
        <button class="ghost-button" type="button" data-action="sync-cloud-now">Sincronizar agora</button>
      </div>
      <div class="callout subtle">
        <strong>Setup rapido</strong>
        <p>1. Publique na Vercel. 2. Crie a tabela no Supabase. 3. Repita os mesmos dados no celular e no desktop. 4. Clique em salvar e depois em sincronizar agora nos dois dispositivos.</p>
      </div>
      <div class="meta-row">${metaPills([
        model.settings.cloudSync.lastSyncedAt ? `Ultimo envio: ${formatShortDate(model.settings.cloudSync.lastSyncedAt.slice(0, 10))}` : "Sem envio ainda",
        model.settings.cloudSync.lastPulledAt ? `Ultima leitura: ${formatShortDate(model.settings.cloudSync.lastPulledAt.slice(0, 10))}` : "Sem leitura ainda",
        model.settings.cloudSync.lastError ? `Erro: ${model.settings.cloudSync.lastError}` : "Sincronizacao sem erro registrado",
      ])}</div>
    `, model, { advancedMode }),
    voice: layoutCard("settings", "voice", "Voz e layout", `
      <div class="callout">
        <strong>Layout e assistentes</strong>
        <p>Controle aqui a sidebar recolhida por padrao, a densidade visual e o vocabulario da captura por voz.</p>
      </div>
      <div class="field-grid two">
        <label class="field">
          <span>Sidebar recolhida por padrao</span>
          <select name="sidebarCollapsed">
            <option value="true" ${model.settings.sidebarCollapsed ? "selected" : ""}>Sim</option>
            <option value="false" ${!model.settings.sidebarCollapsed ? "selected" : ""}>Nao</option>
          </select>
        </label>
        <label class="field">
          <span>Densidade visual</span>
          <select name="visualDensity">
            <option value="compact" ${model.settings.visualDensity === "compact" ? "selected" : ""}>Compacto</option>
            <option value="comfortable" ${model.settings.visualDensity === "comfortable" ? "selected" : ""}>Confortavel</option>
            <option value="ample" ${model.settings.visualDensity === "ample" ? "selected" : ""}>Amplo</option>
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label class="field">
          <span>Modo edicao avancado</span>
          <select name="advancedEditMode">
            <option value="false" ${!model.settings.advancedEditMode ? "selected" : ""}>Desligado</option>
            <option value="true" ${model.settings.advancedEditMode ? "selected" : ""}>Ligado</option>
          </select>
        </label>
        <label class="field">
          <span>Tom visual</span>
          <select name="accentTone"><option value="forest" ${model.settings.accentTone === "forest" ? "selected" : ""}>Forest</option><option value="meadow" ${model.settings.accentTone === "meadow" ? "selected" : ""}>Meadow</option><option value="stone" ${model.settings.accentTone === "stone" ? "selected" : ""}>Stone</option></select>
        </label>
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
        <textarea name="voiceAssociations" placeholder="gravar => projeto:project-conteudo, contexto:creative, intencao:create-task, destino:project&#10;reuniao => area:area-work, contexto:planning, intencao:schedule, destino:agenda">${escapeHtml(model.settings.voiceAssistant.frequentAssociationsText || "")}</textarea>
      </label>
    `, model, { advancedMode }),
    history: layoutCard("settings", "history", "Historico de interpretacao de voz", `
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
    `, model, { wide: true, advancedMode }),
  };

  return `
    <form class="form-grid settings-layout-form" data-form="settings-form">
      ${renderLayoutPage("settings", model, cards, options)}
      <div class="toolbar-row settings-submit-row">
        <button class="primary-button" type="submit">Salvar configuracoes</button>
      </div>
    </form>
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
  const sprintOptions = options.sprints.map((sprint) => `<option value="${sprint.id}" ${entity.sprintId === sprint.id ? "selected" : ""}>${escapeHtml(sprint.title)}</option>`).join("");
  const dayTypeOptions = options.dayTypes.map((type) => `<option value="${type.id}" ${entity.typeId === type.id ? "selected" : ""}>${escapeHtml(type.label)}</option>`).join("");
  const periodOptions = options.periods.map((period) => `<option value="${period.id}" ${entity.scheduledPeriod === period.id || entity.period === period.id ? "selected" : ""}>${escapeHtml(period.label)}</option>`).join("");
  const bucketOptions = options.buckets.map((bucket) => `<option value="${bucket.id}" ${entity.finalBucket === bucket.id ? "selected" : ""}>${escapeHtml(bucket.label)}</option>`).join("");
  const gtdOptions = ["Processar", "Executar", "Agendar", "Delegar", "Aguardar", "Backlog", "Projeto", "Descartar", "Modelo"].map((decision) => `<option value="${decision}" ${entity.gtdDecision === decision ? "selected" : ""}>${escapeHtml(decision)}</option>`).join("");
  const actions = entity.id ? `<div class="toolbar-row"><button class="ghost-button" type="button" data-action="duplicate-entity" data-kind="${kind}" data-id="${entity.id}">Duplicar</button><button class="ghost-button danger" type="button" data-action="delete-entity" data-kind="${kind}" data-id="${entity.id}">Excluir</button></div>` : "";
  const taskFields = `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" required /></label><label class="field"><span>Checklist / proximas acoes</span><textarea name="subtasks">${escapeHtml((entity.subtasks || []).join("\n"))}</textarea></label><div class="field-grid two"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Projeto</span><select name="projectId"><option value="">Sem projeto</option>${projectOptions}</select></label></div><div class="field-grid three"><label class="field"><span>Objetivo</span><select name="objectiveId"><option value="">Sem objetivo</option>${objectiveOptions}</select></label><label class="field"><span>Sprint</span><select name="sprintId"><option value="">Sem sprint</option>${sprintOptions}</select></label><label class="field"><span>Contexto</span><input name="context" value="${escapeHtml(entity.context || "")}" /></label></div><div class="field-grid four"><label class="field"><span>Periodo</span><select name="scheduledPeriod">${periodOptions}</select></label><label class="field"><span>Prioridade</span><input name="priority" value="${escapeHtml(entity.priority || "medium")}" /></label><label class="field"><span>Impacto</span><input type="number" name="impact" value="${escapeHtml(entity.impact || 3)}" /></label><label class="field"><span>Urgencia</span><input type="number" name="urgency" value="${escapeHtml(entity.urgency || 3)}" /></label></div><div class="field-grid four"><label class="field"><span>Esforco</span><input type="number" name="effort" value="${escapeHtml(entity.effort || 3)}" /></label><label class="field"><span>Duracao</span><input type="number" name="estimatedMinutes" value="${escapeHtml(entity.estimatedMinutes || 30)}" /></label><label class="field"><span>GTD</span><select name="gtdDecision"><option value="">Automatica</option>${gtdOptions}</select></label><label class="field"><span>Bucket</span><select name="finalBucket"><option value="">Automatico</option>${bucketOptions}</select></label></div><div class="field-grid four"><label class="field"><span>Modo de prioridade</span><select name="priorityMode"><option value="auto" ${entity.priorityMode !== "manual" ? "selected" : ""}>Automatica</option><option value="manual" ${entity.priorityMode === "manual" ? "selected" : ""}>Manual</option></select></label><label class="field"><span>Dia</span><input type="date" name="scheduledDate" value="${escapeHtml(entity.scheduledDate || "")}" /></label><label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(entity.dueDate || "")}" /></label><label class="field"><span>Ajuste de score</span><input type="number" name="scoreAdjustment" value="${escapeHtml(entity.scoreAdjustment || 0)}" /></label></div><label class="field"><span>Proxima acao</span><textarea name="nextAction">${escapeHtml(entity.nextAction || "")}</textarea></label><label class="field"><span>Observacoes</span><textarea name="notes">${escapeHtml(entity.notes || "")}</textarea></label><div class="checkbox-row"><label><input type="checkbox" name="critical" ${entity.critical ? "checked" : ""}/> Critica</label><label><input type="checkbox" name="delegable" ${entity.delegable ? "checked" : ""}/> Delegavel</label><label><input type="checkbox" name="isRecurring" ${entity.isRecurring ? "checked" : ""}/> Recorrente</label><label><input type="checkbox" name="isTemplate" ${entity.isTemplate ? "checked" : ""}/> Modelo</label><label><input type="checkbox" name="manualDecision" ${entity.manualDecision ? "checked" : ""}/> Decisao manual</label></div>`;
  const fieldMap = {
    task: taskFields,
    area: `<label class="field"><span>Nome</span><input name="name" value="${escapeHtml(entity.name || "")}" /></label><div class="field-grid two"><label class="field"><span>Tipo</span><input name="type" value="${escapeHtml(entity.type || "life")}" /></label><label class="field"><span>Cor</span><input name="color" value="${escapeHtml(entity.color || "")}" /></label></div><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || "")}</textarea></label>`,
    project: `<label class="field"><span>Nome</span><input name="name" value="${escapeHtml(entity.name || "")}" /></label><div class="field-grid three"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Status</span><input name="status" value="${escapeHtml(entity.status || "active")}" /></label><label class="field"><span>Template</span><select name="templateId">${options.projectTemplates.map((template) => `<option value="${template.id}" ${entity.templateId === template.id ? "selected" : ""}>${escapeHtml(template.label)}</option>`).join("")}</select></label></div><div class="field-grid three"><label class="field"><span>Tipo</span><input name="projectType" value="${escapeHtml(entity.projectType || "")}" /></label><label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(entity.dueDate || "")}" /></label><label class="field"><span>Prioridade</span><select name="priority"><option value="low" ${entity.priority === "low" ? "selected" : ""}>Baixa</option><option value="medium" ${entity.priority === "medium" ? "selected" : ""}>Media</option><option value="high" ${entity.priority === "high" ? "selected" : ""}>Alta</option></select></label></div><label class="field"><span>Sprint</span><select name="sprintId"><option value="">Sem sprint</option>${sprintOptions}</select></label><label class="field"><span>Resumo</span><textarea name="summary">${escapeHtml(entity.summary || "")}</textarea></label><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || "")}</textarea></label><label class="field"><span>Objetivo principal</span><textarea name="objective">${escapeHtml(entity.objective || "")}</textarea></label>`,
    objective: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid three"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Projeto</span><select name="projectId"><option value="">Sem projeto</option>${projectOptions}</select></label><label class="field"><span>Progresso</span><input type="number" name="progress" value="${escapeHtml(entity.progress || 0)}" /></label></div><label class="field"><span>Prazo</span><input type="date" name="dueDate" value="${escapeHtml(entity.dueDate || "")}" /></label><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || "")}</textarea></label>`,
    sprint: `<div class="field-grid two"><label class="field"><span>Nome</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><label class="field"><span>Slot</span><select name="slot">${[1, 2, 3, 4].map((slot) => `<option value="${slot}" ${Number(entity.slot) === slot ? "selected" : ""}>Sprint ${slot}</option>`).join("")}</select></label></div><div class="field-grid three"><label class="field"><span>Inicio</span><input type="date" name="startDate" value="${escapeHtml(entity.startDate || "")}" /></label><label class="field"><span>Fim</span><input type="date" name="endDate" value="${escapeHtml(entity.endDate || "")}" /></label><label class="field"><span>Status</span><select name="status"><option value="planned" ${entity.status === "planned" ? "selected" : ""}>Planejado</option><option value="upcoming" ${entity.status === "upcoming" ? "selected" : ""}>Proximo</option><option value="current" ${entity.status === "current" ? "selected" : ""}>Atual</option></select></label></div><label class="field"><span>Periodo</span><input name="periodLabel" value="${escapeHtml(entity.periodLabel || "")}" /></label><label class="field"><span>Descricao</span><textarea name="description">${escapeHtml(entity.description || entity.theme || "")}</textarea></label><label class="field"><span>Prioridades do sprint</span><textarea name="priorities">${escapeHtml((entity.priorities || []).join("\n"))}</textarea></label><label class="field"><span>Projetos relacionados</span><textarea name="projectIds">${escapeHtml((entity.projectIds || []).join("\n"))}</textarea></label><label class="field"><span>Objetivos relacionados</span><textarea name="objectiveIds">${escapeHtml((entity.objectiveIds || []).join("\n"))}</textarea></label><label class="field"><span>Palavras-chave do sprint</span><textarea name="keywords">${escapeHtml((entity.keywords || []).join("\n"))}</textarea></label><label class="field"><span>Areas priorizadas</span><textarea name="priorityAreas">${escapeHtml((entity.priorityAreas || []).join("\n"))}</textarea></label>`,
    habit: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid two"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Meta semanal</span><input type="number" name="targetPerWeek" value="${escapeHtml(entity.targetPerWeek || 3)}" /></label></div><label class="field"><span>Dias preferidos</span><input name="preferredWeekdays" value="${escapeHtml((entity.preferredWeekdays || []).join(", "))}" /></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
    block: `<label class="field"><span>Titulo</span><input name="title" value="${escapeHtml(entity.title || "")}" /></label><div class="field-grid three"><label class="field"><span>Area</span><select name="areaId">${areaOptions}</select></label><label class="field"><span>Data</span><input type="date" name="date" value="${escapeHtml(entity.date || "")}" /></label><label class="field"><span>Periodo</span><select name="period">${periodOptions}</select></label></div><div class="field-grid two"><label class="field"><span>Inicio</span><input type="time" name="startTime" value="${escapeHtml(entity.startTime || "09:00")}" /></label><label class="field"><span>Fim</span><input type="time" name="endTime" value="${escapeHtml(entity.endTime || "10:00")}" /></label></div><label class="field"><span>Tipo</span><input name="kind" value="${escapeHtml(entity.kind || "focus")}" /></label><label class="field"><span>Nota</span><textarea name="note">${escapeHtml(entity.note || "")}</textarea></label>`,
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
    case "dashboard": return renderDashboardPage(model, options);
    case "checklist": return renderChecklistPage(model, options);
    case "days": return renderDaysPage(model, options);
    case "inbox": return renderInboxPage(model, options);
    case "prioritize": return renderPrioritizePage(model, options);
    case "organize": return renderOrganizePage(model, options);
    case "areas": return renderAreasPage(model, options);
    case "projects": return renderProjectsPage(model, options);
    case "planning": return renderPlanningPage(model, options);
    case "agenda": return renderAgendaPage(model, options);
    case "settings": return renderSettingsPage(model, options);
    case "today":
    default:
      return renderTodayPage(model, options);
  }
}

function renderFooter(model) {
  return `
    <footer class="workspace-footer">
      <p>Persistencia local-first com sincronizacao opcional via nuvem. Para Google Calendar, rode em servidor local e siga <a href="./docs/google-calendar.md">docs/google-calendar.md</a>.</p>
      <p>Data de hoje: ${escapeHtml(formatShortDate(model.today))}</p>
    </footer>
  `;
}

function renderMobileFab(model) {
  if (model.activeSection === "inbox") {
    return "";
  }

  return `<button class="mobile-fab" data-action="navigate" data-section="inbox" aria-label="Nova tarefa">+</button>`;
}

function renderLayoutSummary(layouts = {}) {
  return Object.entries(layouts).map(([page, entries]) => `
    <article class="layout-summary-card">
      <strong>${escapeHtml(PAGE_LABELS[page] || page)}</strong>
      <div class="layout-summary-list">
        ${(entries || []).map((entry) => `<span class="meta-pill">${escapeHtml(entry.id)} • ${escapeHtml(LAYOUT_WIDTH_LABELS[entry.width] || entry.width)} • ${escapeHtml(LAYOUT_HEIGHT_LABELS[entry.height] || entry.height)}</span>`).join("")}
      </div>
      <div class="toolbar-row compact-actions">
        <button class="ghost-button small" type="button" data-action="save-layout-default" data-layout-page="${page}">Salvar</button>
        <button class="ghost-button small" type="button" data-action="restore-layout-default" data-layout-page="${page}">Restaurar</button>
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
    this.cloudSyncTimer = null;
    this.cloudSyncInFlight = false;
    this.dragItem = null;
    this.mobileNavOpen = false;
    this.lastIsMobile = false;
    this.voiceCapture = createVoiceCaptureState();
    this.voiceRecognizer = null;
  }

  async init() {
    const loaded = await loadAppState(() => buildSeedState());
    const incompatible = !loaded?.meta || Number(loaded.meta.version || 0) < APP_VERSION;
    this.state = incompatible ? await resetAppState(() => buildSeedState()) : loaded;
    this.lastIsMobile = this.isMobileViewport();
    this.mobileNavOpen = !this.state?.settings?.sidebarCollapsed && !this.lastIsMobile;
    if (this.lastIsMobile && this.state?.ui?.activeSection !== "today") {
      this.state = setActiveSection(this.state, "today");
      this.state = await saveAppState(this.state);
      this.mobileNavOpen = false;
    }
    const support = getVoiceCaptureSupport();
    this.voiceCapture = {
      ...this.voiceCapture,
      supported: support.supported,
      mode: support.mode,
    };
    this.bindEvents();
    this.refreshCloudSyncLoop();
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
    window.addEventListener("focus", () => void this.syncCloudState("focus"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void this.syncCloudState("visibility");
      }
    });
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
    this.mobileNavOpen = isMobile ? false : !this.state?.settings?.sidebarCollapsed;
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
    this.state = await saveAppState(this.state);
    this.refreshCloudSyncLoop();
    if (message) this.showToast(message);
    this.render();
  }

  refreshCloudSyncLoop() {
    if (this.cloudSyncTimer) {
      window.clearInterval(this.cloudSyncTimer);
      this.cloudSyncTimer = null;
    }

    if (!this.state || !hasCloudSyncConfigured(this.state)) {
      return;
    }

    const config = getCloudSyncConfig(this.state);
    const intervalMs = Math.max(10, Number(config.pollIntervalSeconds || 20)) * 1000;
    this.cloudSyncTimer = window.setInterval(() => {
      void this.syncCloudState("interval");
    }, intervalMs);
  }

  async syncCloudState(reason = "manual") {
    if (!this.state) {
      return;
    }

    if (!hasCloudSyncConfigured(this.state)) {
      if (reason === "manual") {
        this.showToast("Preencha a configuracao de sincronizacao antes de conectar os dispositivos.");
      }
      return;
    }

    if (this.cloudSyncInFlight) {
      return;
    }

    this.cloudSyncInFlight = true;
    const previousRevision = Number(this.state.meta?.revision || 0);
    const previousUpdatedAt = String(this.state.meta?.updatedAt || "");
    const previousPulledAt = String(this.state.settings?.cloudSync?.lastPulledAt || "");

    try {
      const nextState = await pullRemoteAppState(this.state);
      const changed = previousRevision !== Number(nextState.meta?.revision || 0)
        || previousUpdatedAt !== String(nextState.meta?.updatedAt || "")
        || previousPulledAt !== String(nextState.settings?.cloudSync?.lastPulledAt || "");

      this.state = nextState;
      this.refreshCloudSyncLoop();

      if (reason === "manual") {
        this.showToast(this.state.settings?.cloudSync?.lastError || "Sincronizacao concluida.");
      } else if (changed && !this.state.settings?.cloudSync?.lastError) {
        this.showToast("Dados atualizados da nuvem.");
      }

      this.render();
    } finally {
      this.cloudSyncInFlight = false;
    }
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
            draft: null,
            originalDraft: null,
            error: "",
          };
          this.voiceRecognizer = null;
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
    const today = getCurrentISODate();

    if (trigger.dataset.taskAction) {
      const taskTitle = this.state.tasks.find((task) => task.id === trigger.dataset.taskId)?.title || "";
      this.state = applyTaskAction(this.state, trigger.dataset.taskId, trigger.dataset.taskAction, {}, this.state.ui.selectedDate || today);
      await this.persist(getTaskActionMessage(trigger.dataset.taskAction, taskTitle));
      return;
    }

    const action = trigger.dataset.action;
    if (action === "open-voice-capture") { this.openVoiceCapture(trigger.dataset.sourceSection || this.state.ui.activeSection || "inbox"); return; }
    if (action === "close-voice-capture") { this.closeVoiceCapture(); return; }
    if (action === "close-voice-capture-backdrop") { if (event.target !== trigger) return; this.closeVoiceCapture(); return; }
    if (action === "start-voice-capture") { this.startVoiceCapture(); return; }
    if (action === "stop-voice-capture") { this.stopVoiceCapture(); return; }
    if (action === "toggle-mobile-nav" || action === "toggle-sidebar") { this.mobileNavOpen = !this.mobileNavOpen; this.render(); return; }
    if (action === "close-mobile-nav" || action === "close-sidebar") { this.mobileNavOpen = false; this.render(); return; }
    if (action === "navigate") { this.state = setActiveSection(this.state, trigger.dataset.section); this.mobileNavOpen = false; await this.persist(); return; }
    if (action === "select-day") { this.state = setSelectedDate(this.state, trigger.dataset.date); await this.persist(); return; }
    if (action === "set-checklist-view") { this.state = setChecklistView(this.state, trigger.dataset.checklistView); await this.persist(); return; }
    if (action === "set-filter") { this.state = setFilter(this.state, trigger.dataset.filterName, trigger.dataset.filterValue); await this.persist(); return; }
    if (action === "clear-filters") { this.state = clearFilters(this.state); await this.persist("Filtros limpos."); return; }
    if (action === "set-priority-method") { this.state = setPriorityMethod(this.state, trigger.dataset.method); await this.persist("Metodo atualizado."); return; }
    if (action === "set-active-sprint") { this.state = setActiveSprint(this.state, trigger.dataset.sprintId); await this.persist("Sprint atualizada."); return; }
    if (action === "select-project") { this.state = setSelectedProject(this.state, trigger.dataset.projectId); await this.persist(); return; }
    if (action === "create-project-template") { this.state = createProjectFromTemplate(this.state, trigger.dataset.projectTemplate); await this.persist("Projeto criado a partir do template."); return; }
    if (action === "generate-project-task") {
      const result = generateTaskFromProjectSource(this.state, trigger.dataset.projectId, trigger.dataset.projectSource, trigger.dataset.projectEntry);
      this.state = result.nextState;
      await this.persist(result.message);
      return;
    }
    if (action === "set-energy") { this.state = setWeeklyEnergy(this.state, trigger.dataset.energy); await this.persist("Energia semanal ajustada."); return; }
    if (action === "toggle-task-subtask") {
      const taskTitle = this.state.tasks.find((task) => task.id === trigger.dataset.taskId)?.title || "";
      this.state = toggleTaskSubtask(this.state, trigger.dataset.taskId, trigger.dataset.subtaskIndex);
      await this.persist(taskTitle ? `Checklist da tarefa atualizado: ${taskTitle}.` : "Checklist da tarefa atualizado.");
      return;
    }
    if (action === "move-task-bucket") { this.state = moveTaskToBucket(this.state, trigger.dataset.taskId, trigger.dataset.bucketId); await this.persist("Fluxo da tarefa atualizado."); return; }
    if (action === "open-editor") { this.state = openEditor(this.state, trigger.dataset.kind, trigger.dataset.id || ""); this.render(); return; }
    if (action === "close-editor" || action === "close-editor-backdrop") { if (action === "close-editor-backdrop" && event.target !== trigger) return; this.state = closeEditor(this.state); this.render(); return; }
    if (action === "duplicate-entity") { this.state = duplicateEntity(this.state, trigger.dataset.kind, trigger.dataset.id); await this.persist("Item duplicado."); return; }
    if (action === "delete-entity") { if (!window.confirm("Deseja excluir este item?")) return; this.state = deleteEntity(this.state, trigger.dataset.kind, trigger.dataset.id); await this.persist("Item removido."); return; }
    if (action === "replan-week") { const result = replanWeek(this.state, this.state.ui.selectedDate || today); this.state = result.nextState; await this.persist(`Semana reorganizada: ${result.movedCount} movidas, ${result.alertCount} alertas e ${result.reviewCount} revisoes.`); return; }
    if (action === "toggle-edit-mode") { this.state = toggleEditMode(this.state); await this.persist("Modo de edicao atualizado."); return; }
    if (action === "nudge-layout-card") {
      this.state = nudgeLayoutCard(this.state, trigger.dataset.layoutPage, trigger.dataset.layoutCard, trigger.dataset.layoutAxis, trigger.dataset.layoutDirection);
      await this.persist("Posicao do bloco atualizada.");
      return;
    }
    if (action === "layer-layout-card") {
      this.state = layerLayoutCard(this.state, trigger.dataset.layoutPage, trigger.dataset.layoutCard, trigger.dataset.layoutDirection);
      await this.persist("Camada do bloco atualizada.");
      return;
    }
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
    if (action === "save-layout-default") { this.state = saveCurrentLayoutAsDefault(this.state, trigger.dataset.layoutPage || this.state.ui.activeSection); await this.persist("Layout salvo."); return; }
    if (action === "restore-layout-default") { this.state = restoreLayoutDefault(this.state, trigger.dataset.layoutPage || this.state.ui.activeSection); await this.persist("Layout restaurado."); return; }
    if (action === "generate-sync-key") {
      const field = this.root.querySelector('input[name="syncWorkspaceKey"]');
      if (field instanceof HTMLInputElement) {
        field.value = createWorkspaceKey();
      }
      return;
    }
    if (action === "sync-cloud-now") { await this.syncCloudState("manual"); return; }
    if (action === "connect-google") { await this.handleGoogleConnect(); return; }
    if (action === "sync-google") { await this.handleGoogleSync(); return; }
    if (action === "reset-app") { if (!window.confirm("Deseja resetar a base local para a seed atual?")) return; this.state = await resetAppState(() => buildSeedState()); this.refreshCloudSyncLoop(); this.showToast("Base local resetada."); this.render(); }
  }

  async handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    const voiceForm = target.closest('[data-form="voice-capture-confirm"]');
    if (voiceForm) {
      this.voiceCapture = {
        ...this.voiceCapture,
        transcript: target.value,
        interim: "",
        draft: null,
        originalDraft: null,
      };
      return;
    }
    if (target.dataset.filter) { this.state = setFilter(this.state, target.dataset.filter, target.value); await this.persist(); return; }
    if (target.dataset.dayTypeDate) { const result = setDayType(this.state, target.dataset.dayTypeDate, target.value); this.state = result.nextState; await this.persist(`Dia recalculado: ${result.movedCount} movidas, ${result.alertCount} alertas.`); return; }
    if (target.dataset.periodTypeDate) { const result = setDayPeriodType(this.state, target.dataset.periodTypeDate, target.dataset.periodId, target.value); this.state = result.nextState; await this.persist(`Periodo recalculado: ${result.movedCount} movidas, ${result.alertCount} alertas.`); return; }
    if (target.dataset.organizeTaskId) {
      this.state = updateTaskSchedule(this.state, target.dataset.organizeTaskId, { [target.dataset.organizeField]: target.value });
      await this.persist("Pre-agendamento atualizado.");
      return;
    }
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
    if (form.dataset.form === "capture-task") {
      const payload = formDataToObject(form);
      const result = captureInboxTask(this.state, payload.title || "", this.state.ui.selectedDate || getCurrentISODate());
      this.state = result.nextState;
      form.reset();
      await this.persist(result.message);
      return;
    }
    if (form.dataset.form === "project-workspace") {
      this.state = saveEntity(this.state, "project", formDataToObject(form));
      await this.persist("Projeto atualizado.");
      return;
    }
    if (form.dataset.form === "checklist-quick-add") { this.state = addChecklistTask(this.state, formDataToObject(form)); form.reset(); await this.persist("Nova tarefa criada na checklist."); return; }
    if (form.dataset.form === "voice-capture-confirm") {
      const payload = formDataToObject(form);
      const transcript = String(payload.transcript || this.voiceCapture.transcript || "").trim();
      if (!transcript) {
        this.voiceCapture = {
          ...this.voiceCapture,
          error: "Fale ou digite algo antes de salvar na Inbox.",
        };
        this.render();
        return;
      }
      const result = confirmVoiceCapture(this.state, payload, {
        transcript,
        understood: analyzeCaptureText(this.state, transcript, this.state.ui.selectedDate || getCurrentISODate()),
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
    if (form.dataset.form === "entity-editor") { const payload = formDataToObject(form); this.state = saveEntity(this.state, payload.kind, payload); await this.persist("Item salvo."); return; }
    if (form.dataset.form === "settings-form") {
      this.state = saveSettings(this.state, formDataToObject(form));
      this.mobileNavOpen = this.lastIsMobile ? false : !this.state.settings.sidebarCollapsed;
      this.refreshCloudSyncLoop();
      await this.persist("Configuracoes salvas.");
    }
  }

  handleDragStart(event) {
    const checklistItem = event.target.closest("[data-checklist-task]");
    if (checklistItem) {
      this.dragItem = { kind: "checklist-task", taskId: checklistItem.dataset.checklistTask };
      checklistItem.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", checklistItem.dataset.checklistTask || "");
      return;
    }

    const organizeItem = event.target.closest("[data-organize-task]");
    if (organizeItem) {
      this.dragItem = { kind: "organize-task", taskId: organizeItem.dataset.organizeTask };
      organizeItem.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", organizeItem.dataset.organizeTask || "");
      return;
    }

    const agendaTask = event.target.closest("[data-agenda-task]");
    if (agendaTask) {
      this.dragItem = { kind: "agenda-task", taskId: agendaTask.dataset.agendaTask };
      agendaTask.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", agendaTask.dataset.agendaTask || "");
      return;
    }

    const item = event.target.closest("[data-layout-card]");
    if (!item || !this.state?.settings?.editMode || !this.state?.settings?.layoutCapabilities?.dragEnabled || this.state?.settings?.advancedEditMode) return;
    this.dragItem = { kind: "layout", page: item.dataset.layoutPage, cardId: item.dataset.layoutCard };
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.dataset.layoutCard || "");
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
      return;
    }

    if (this.dragItem.kind === "agenda-task") {
      const targetTask = event.target.closest("[data-agenda-drop-task]");
      const day = event.target.closest("[data-agenda-date]");
      if (!day && !targetTask) return;
      event.preventDefault();
      this.root.querySelectorAll(".agenda-day-drop-zone.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      this.root.querySelectorAll(".agenda-kanban-task.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      if (targetTask && targetTask.dataset.agendaDropTask !== this.dragItem.taskId) {
        targetTask.classList.add("drag-target");
      } else if (day) {
        day.classList.add("drag-target");
      }
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

    if (this.dragItem.kind === "agenda-task") {
      const targetTask = event.target.closest("[data-agenda-drop-task]");
      const day = event.target.closest("[data-agenda-date]");
      if (!day && !targetTask) return;
      if (targetTask && targetTask.dataset.agendaDropTask !== this.dragItem.taskId) {
        this.state = reorderAgendaTask(
          this.state,
          this.dragItem.taskId,
          targetTask.dataset.agendaDropTask,
          targetTask.dataset.agendaDropDate || day?.dataset.agendaDate || "",
        );
      } else if (day) {
        this.state = reorderAgendaTask(this.state, this.dragItem.taskId, "", day.dataset.agendaDate);
      }
      this.root.querySelectorAll(".agenda-day-drop-zone.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      this.root.querySelectorAll(".agenda-kanban-task.drag-target").forEach((entry) => entry.classList.remove("drag-target"));
      this.dragItem = null;
      await this.persist("Tarefa movida na agenda semanal.");
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
    this.root.querySelectorAll("[data-agenda-task].dragging").forEach((card) => card.classList.remove("dragging"));
    this.root.querySelectorAll(".agenda-day-drop-zone.drag-target").forEach((card) => card.classList.remove("drag-target"));
    this.root.querySelectorAll(".agenda-kanban-task.drag-target").forEach((card) => card.classList.remove("drag-target"));
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
    this.root.innerHTML = isMobile
      ? `<div class="app-shell mobile-shell density-${escapeHtml(model.settings.visualDensity)} tone-${escapeHtml(model.settings.accentTone)}">${this.toast ? `<div class="toast">${escapeHtml(this.toast)}</div>` : ""}${this.mobileNavOpen ? `<button class="workspace-nav-backdrop" data-action="close-sidebar" aria-label="Fechar menu"></button>` : ""}${renderSidebar(model, { isMobile: true, navOpen: this.mobileNavOpen })}<main class="workspace-main mobile-main">${renderMobileTopbar(model, { navOpen: this.mobileNavOpen })}${renderHeader(model, { isMobile: true })}<div class="page-shell">${renderActivePage(model, { isMobile: true })}</div>${renderFooter(model)}${renderMobileFab(model)}</main>${renderFloatingAlert(model.activeSection === "today" ? model.floatingAlert : null, { isMobile: true })}${renderVoiceCaptureModal(this.voiceCapture)}${renderEditorModal(model.editorView, model.options)}</div>`
      : `<div class="app-shell desktop-shell density-${escapeHtml(model.settings.visualDensity)} tone-${escapeHtml(model.settings.accentTone)}">${this.toast ? `<div class="toast">${escapeHtml(this.toast)}</div>` : ""}${this.mobileNavOpen ? `<button class="workspace-nav-backdrop" data-action="close-sidebar" aria-label="Fechar menu"></button>` : ""}${renderSidebar(model, { isMobile: false, navOpen: this.mobileNavOpen })}<main class="workspace-root">${renderHeader(model, { isMobile: false })}<section class="workspace-content-column"><div class="page-shell">${renderActivePage(model, { isMobile: false })}</div>${renderFooter(model)}</section></main>${renderFloatingAlert(model.activeSection === "today" ? model.floatingAlert : null, { isMobile: false })}${renderVoiceCaptureModal(this.voiceCapture)}${renderEditorModal(model.editorView, model.options)}</div>`;
  }
}




