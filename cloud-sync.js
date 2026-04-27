import { getRuntimeConfig } from "./runtime-config-service.js";

const DEFAULT_SYNC_CONFIG = {
  enabled: false,
  managedByRuntime: false,
  provider: "vercel-proxy",
  apiBaseUrl: "/api/sync",
  projectUrl: "",
  anonKey: "",
  tableName: "life_os_snapshots",
  workspaceKey: "",
  workspaceId: "",
  pollIntervalSeconds: 20,
  lastSyncedAt: "",
  lastPulledAt: "",
  lastError: "",
  deviceId: "",
};

const DEVICE_ID_KEY = "life-os-thz-2026-device-id";

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "sim", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "nao", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getLocalStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function generateRandomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `lifeos-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createWorkspaceKey() {
  const base = generateRandomToken().replace(/[^a-zA-Z0-9-]/g, "");
  return `workspace-${base}`;
}

export function getDeviceId() {
  const storage = getLocalStorage();
  if (!storage) {
    return generateRandomToken();
  }

  const existing = storage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = generateRandomToken();
  storage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function getCloudSyncDefaults() {
  const runtime = getRuntimeConfig();
  const runtimeSync = runtime.sync && typeof runtime.sync === "object" ? runtime.sync : {};

  return {
    ...DEFAULT_SYNC_CONFIG,
    ...runtimeSync,
    enabled: toBoolean(runtimeSync.enabled, DEFAULT_SYNC_CONFIG.enabled),
    managedByRuntime: toBoolean(runtimeSync.managedByRuntime, DEFAULT_SYNC_CONFIG.managedByRuntime),
    provider: String(runtimeSync.provider || DEFAULT_SYNC_CONFIG.provider).trim() || DEFAULT_SYNC_CONFIG.provider,
    apiBaseUrl: cleanUrl(runtimeSync.apiBaseUrl || runtimeSync.endpoint || DEFAULT_SYNC_CONFIG.apiBaseUrl),
    projectUrl: cleanUrl(runtimeSync.projectUrl || runtimeSync.url || ""),
    anonKey: String(runtimeSync.anonKey || runtimeSync.publishableKey || runtimeSync.apiKey || "").trim(),
    tableName: String(runtimeSync.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName,
    workspaceKey: String(runtimeSync.workspaceKey || "").trim(),
    workspaceId: String(runtimeSync.workspaceId || runtimeSync.workspaceKey || "").trim(),
    pollIntervalSeconds: toNumber(runtimeSync.pollIntervalSeconds, DEFAULT_SYNC_CONFIG.pollIntervalSeconds),
    deviceId: String(runtimeSync.deviceId || "").trim() || getDeviceId(),
  };
}

export function getCloudSyncConfig(state) {
  const defaults = getCloudSyncDefaults();
  const source = state?.settings?.cloudSync && typeof state.settings.cloudSync === "object"
    ? state.settings.cloudSync
    : {};

  const managedByRuntime = defaults.managedByRuntime || toBoolean(source.managedByRuntime, false);
  const runtimeManaged = managedByRuntime;

  const provider = runtimeManaged
    ? (defaults.provider || source.provider || DEFAULT_SYNC_CONFIG.provider)
    : (source.provider || defaults.provider || DEFAULT_SYNC_CONFIG.provider);

  const enabled = runtimeManaged
    ? toBoolean(defaults.enabled, DEFAULT_SYNC_CONFIG.enabled)
    : toBoolean(source.enabled, defaults.enabled);

  const apiBaseUrl = runtimeManaged
    ? cleanUrl(defaults.apiBaseUrl || source.apiBaseUrl || DEFAULT_SYNC_CONFIG.apiBaseUrl)
    : cleanUrl(source.apiBaseUrl || defaults.apiBaseUrl || DEFAULT_SYNC_CONFIG.apiBaseUrl);

  const projectUrl = runtimeManaged
    ? cleanUrl(defaults.projectUrl || source.projectUrl || "")
    : cleanUrl(source.projectUrl || defaults.projectUrl);

  const anonKey = runtimeManaged
    ? String(defaults.anonKey || source.anonKey || "").trim()
    : String(source.anonKey || defaults.anonKey || "").trim();

  const tableName = runtimeManaged
    ? String(defaults.tableName || source.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName
    : String(source.tableName || defaults.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName;

  const workspaceKey = runtimeManaged
    ? String(defaults.workspaceKey || source.workspaceKey || "").trim()
    : String(source.workspaceKey || defaults.workspaceKey || "").trim();

  const workspaceId = runtimeManaged
    ? String(defaults.workspaceId || source.workspaceId || defaults.workspaceKey || source.workspaceKey || "").trim()
    : String(source.workspaceId || defaults.workspaceId || source.workspaceKey || defaults.workspaceKey || "").trim();

  return {
    ...defaults,
    ...source,
    enabled,
    managedByRuntime,
    provider,
    apiBaseUrl,
    projectUrl,
    anonKey,
    tableName,
    workspaceKey,
    workspaceId,
    pollIntervalSeconds: toNumber(source.pollIntervalSeconds, defaults.pollIntervalSeconds),
    lastSyncedAt: String(source.lastSyncedAt || ""),
    lastPulledAt: String(source.lastPulledAt || ""),
    lastError: String(source.lastError || ""),
    deviceId: String(source.deviceId || defaults.deviceId || getDeviceId()).trim() || getDeviceId(),
  };
}

export function withCloudSyncSettings(state) {
  return {
    ...state,
    settings: {
      ...(state.settings || {}),
      cloudSync: getCloudSyncConfig(state),
    },
  };
}

export function hasCloudSyncConfigured(state) {
  const config = getCloudSyncConfig(state);
  if (!config.enabled) {
    return false;
  }

  if (config.provider === "vercel-proxy") {
    return Boolean(config.apiBaseUrl);
  }

  if (config.provider === "supabase") {
    return Boolean(config.projectUrl && config.anonKey && config.workspaceKey);
  }

  return false;
}

function toBase64Url(value = "") {
  if (typeof btoa === "function") {
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value = "") {
  if (typeof atob === "function") {
    const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  }

  return Buffer.from(String(value), "base64url").toString("utf8");
}

export function exportSyncProfile(state) {
  const config = getCloudSyncConfig(state);
  const payload = {
    enabled: config.enabled,
    managedByRuntime: config.managedByRuntime,
    provider: config.provider,
    apiBaseUrl: config.apiBaseUrl,
    projectUrl: config.projectUrl,
    anonKey: config.anonKey,
    tableName: config.tableName,
    workspaceKey: config.workspaceKey,
    workspaceId: config.workspaceId,
    pollIntervalSeconds: config.pollIntervalSeconds,
  };
  return `lifeos-sync:${toBase64Url(JSON.stringify(payload))}`;
}

export function importSyncProfile(rawProfile = "") {
  const raw = String(rawProfile || "").trim();
  if (!raw) {
    throw new Error("Cole um perfil de sincronizacao valido.");
  }

  const encoded = raw.startsWith("lifeos-sync:") ? raw.slice("lifeos-sync:".length) : raw;
  const parsed = JSON.parse(fromBase64Url(encoded));

  return {
    enabled: toBoolean(parsed.enabled, true),
    managedByRuntime: toBoolean(parsed.managedByRuntime, false),
    provider: parsed.provider || "supabase",
    apiBaseUrl: cleanUrl(parsed.apiBaseUrl || parsed.endpoint || DEFAULT_SYNC_CONFIG.apiBaseUrl),
    projectUrl: cleanUrl(parsed.projectUrl || parsed.url || ""),
    anonKey: String(parsed.anonKey || parsed.publishableKey || parsed.apiKey || "").trim(),
    tableName: String(parsed.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName,
    workspaceKey: String(parsed.workspaceKey || "").trim(),
    workspaceId: String(parsed.workspaceId || parsed.workspaceKey || "").trim(),
    pollIntervalSeconds: toNumber(parsed.pollIntervalSeconds, DEFAULT_SYNC_CONFIG.pollIntervalSeconds),
  };
}

function buildRequestHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
    "x-workspace-key": config.workspaceKey,
  };
}

function buildProxyEndpoint(config) {
  const base = config.apiBaseUrl || DEFAULT_SYNC_CONFIG.apiBaseUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(base, window.location.origin);
  }
  return new URL(base, "https://life-os-sync.local");
}

async function buildRemoteError(response, fallbackMessage) {
  let detail = "";

  try {
    const rawBody = await response.text();
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        detail = parsed.message || parsed.error_description || parsed.error || parsed.hint || rawBody;
      } catch {
        detail = rawBody;
      }
    }
  } catch {
    detail = "";
  }

  const suffix = detail ? ` ${detail}` : "";
  return `${fallbackMessage} [${response.status}]${suffix}`.trim();
}

function compareStateFreshness(leftState, rightState) {
  const leftRevision = Number(leftState?.meta?.revision || 0);
  const rightRevision = Number(rightState?.meta?.revision || 0);

  if (leftRevision !== rightRevision) {
    return leftRevision - rightRevision;
  }

  return String(leftState?.meta?.updatedAt || "").localeCompare(String(rightState?.meta?.updatedAt || ""));
}

function touchState(state) {
  const nextState = withCloudSyncSettings(state);
  nextState.meta = {
    ...(nextState.meta || {}),
    revision: Number(nextState.meta?.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
    lastDeviceId: nextState.settings.cloudSync.deviceId,
  };
  return nextState;
}

function applySyncMetadata(state, config, partial = {}) {
  return {
    ...state,
    settings: {
      ...(state.settings || {}),
      cloudSync: {
        ...getCloudSyncConfig(state),
        ...config,
        ...partial,
      },
    },
  };
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function buildComparableState(state) {
  const clone = deepClone(state || {});

  if (clone.settings) {
    clone.settings = {
      ...clone.settings,
      cloudSync: {
        ...(clone.settings.cloudSync || {}),
        lastSyncedAt: "",
        lastPulledAt: "",
        lastError: "",
        deviceId: "",
      },
    };
  }

  if (clone.ui) {
    clone.ui = {
      filters: clone.ui.filters || {},
      priorityMethod: clone.ui.priorityMethod || "",
      checklistView: clone.ui.checklistView || "",
      selectedProjectId: clone.ui.selectedProjectId || "",
    };
  }

  return clone;
}

function statesDifferForSync(leftState, rightState) {
  return JSON.stringify(buildComparableState(leftState)) !== JSON.stringify(buildComparableState(rightState));
}

function getEntityTimestamp(entry) {
  return String(entry?.updatedAt || entry?.createdAt || "");
}

function compareEntityFreshness(leftEntry, rightEntry) {
  const leftTimestamp = getEntityTimestamp(leftEntry);
  const rightTimestamp = getEntityTimestamp(rightEntry);

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp.localeCompare(rightTimestamp);
  }

  return String(leftEntry?.id || "").localeCompare(String(rightEntry?.id || ""));
}

function getEntityKey(entry, index) {
  if (entry?.id) {
    return String(entry.id);
  }

  return `row-${index}-${String(entry?.createdAt || "")}-${String(entry?.title || entry?.name || "")}`;
}

function mergeEntityCollections(localEntries = [], remoteEntries = [], sortFn = null) {
  const merged = new Map();

  const absorb = (entry, index) => {
    const key = getEntityKey(entry, index);
    const previous = merged.get(key);
    const candidate = deepClone(entry);

    if (!previous || compareEntityFreshness(candidate, previous) >= 0) {
      merged.set(key, candidate);
    }
  };

  (remoteEntries || []).forEach(absorb);
  (localEntries || []).forEach(absorb);

  const values = Array.from(merged.values());
  if (typeof sortFn === "function") {
    values.sort(sortFn);
  }
  return values;
}

function mergeHistory(localEntries = [], remoteEntries = []) {
  return mergeEntityCollections(localEntries, remoteEntries, (left, right) =>
    String(right?.createdAt || "").localeCompare(String(left?.createdAt || "")));
}

function mergeSettings(localState, remoteState) {
  const localSettingsUpdatedAt = String(localState?.settings?.updatedAt || "");
  const remoteSettingsUpdatedAt = String(remoteState?.settings?.updatedAt || "");
  const dominantSettings = deepClone((
    localSettingsUpdatedAt.localeCompare(remoteSettingsUpdatedAt) >= 0
      ? localState?.settings
      : remoteState?.settings
  ) || {});
  const dominantSync = getCloudSyncConfig({ settings: { cloudSync: dominantSettings.cloudSync || {} } });
  const localSync = getCloudSyncConfig(localState);

  return {
    ...dominantSettings,
    updatedAt: dominantSettings.updatedAt || new Date().toISOString(),
    cloudSync: {
      ...dominantSync,
      enabled: dominantSync.enabled || localSync.enabled,
      managedByRuntime: dominantSync.managedByRuntime || localSync.managedByRuntime,
      provider: dominantSync.provider || localSync.provider,
      apiBaseUrl: dominantSync.apiBaseUrl || localSync.apiBaseUrl,
      projectUrl: dominantSync.projectUrl || localSync.projectUrl,
      anonKey: dominantSync.anonKey || localSync.anonKey,
      tableName: dominantSync.tableName || localSync.tableName,
      workspaceKey: dominantSync.workspaceKey || localSync.workspaceKey,
      workspaceId: dominantSync.workspaceId || localSync.workspaceId,
      pollIntervalSeconds: dominantSync.pollIntervalSeconds || localSync.pollIntervalSeconds,
      deviceId: localSync.deviceId || dominantSync.deviceId || getDeviceId(),
      lastSyncedAt: localSync.lastSyncedAt || "",
      lastPulledAt: localSync.lastPulledAt || "",
      lastError: localSync.lastError || "",
    },
  };
}

function mergeWorkspaceStates(localState, remoteState) {
  const localFreshness = compareStateFreshness(localState, remoteState);
  const dominantState = deepClone(localFreshness >= 0 ? localState : remoteState);

  return {
    ...dominantState,
    profile: deepClone((localFreshness >= 0 ? localState?.profile : remoteState?.profile) || {}),
    weeklyPlan: deepClone((localFreshness >= 0 ? localState?.weeklyPlan : remoteState?.weeklyPlan) || {}),
    areas: mergeEntityCollections(localState?.areas, remoteState?.areas, (left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""))),
    projects: mergeEntityCollections(localState?.projects, remoteState?.projects, (left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""))),
    objectives: mergeEntityCollections(localState?.objectives, remoteState?.objectives, (left, right) =>
      String(left?.title || "").localeCompare(String(right?.title || ""))),
    sprints: mergeEntityCollections(localState?.sprints, remoteState?.sprints, (left, right) =>
      Number(left?.slot || 0) - Number(right?.slot || 0)),
    tasks: mergeEntityCollections(localState?.tasks, remoteState?.tasks, (left, right) =>
      String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""))),
    blocks: mergeEntityCollections(localState?.blocks, remoteState?.blocks, (left, right) =>
      String(left?.date || "").localeCompare(String(right?.date || ""))
        || String(left?.startTime || "").localeCompare(String(right?.startTime || ""))),
    dayOverrides: mergeEntityCollections(localState?.dayOverrides, remoteState?.dayOverrides, (left, right) =>
      String(left?.date || "").localeCompare(String(right?.date || ""))),
    history: mergeHistory(localState?.history, remoteState?.history).slice(0, 250),
    calendar: deepClone((localFreshness >= 0 ? localState?.calendar : remoteState?.calendar) || {}),
    dayTypes: deepClone((localFreshness >= 0 ? localState?.dayTypes : remoteState?.dayTypes) || []),
    settings: mergeSettings(localState, remoteState),
    ui: deepClone(localState?.ui || {}),
    meta: {
      ...(deepClone(dominantState.meta || {})),
      revision: Math.max(Number(localState?.meta?.revision || 0), Number(remoteState?.meta?.revision || 0)),
      updatedAt: localFreshness >= 0
        ? String(localState?.meta?.updatedAt || dominantState.meta?.updatedAt || new Date().toISOString())
        : String(remoteState?.meta?.updatedAt || dominantState.meta?.updatedAt || new Date().toISOString()),
    },
  };
}

async function readRemoteSnapshot(state, config = getCloudSyncConfig(state)) {
  if (!hasCloudSyncConfigured({ settings: { cloudSync: config } })) {
    return null;
  }

  if (config.provider === "vercel-proxy") {
    const endpoint = buildProxyEndpoint(config);
    if (config.workspaceId) {
      endpoint.searchParams.set("workspaceId", config.workspaceId);
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await buildRemoteError(response, "Nao foi possivel buscar o snapshot remoto."));
    }

    const payload = await response.json();
    return payload?.row || null;
  }

  const endpoint = new URL(`/rest/v1/${config.tableName}`, `${config.projectUrl}/`);
  endpoint.searchParams.set("select", "workspace_key,state,revision,updated_at,updated_by");
  endpoint.searchParams.set("workspace_key", `eq.${config.workspaceKey}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: buildRequestHeaders(config),
  });

  if (!response.ok) {
    throw new Error(await buildRemoteError(response, "Nao foi possivel buscar o snapshot remoto."));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function writeRemoteSnapshot(state, config = getCloudSyncConfig(state)) {
  if (!hasCloudSyncConfigured({ settings: { cloudSync: config } })) {
    return state;
  }

  if (config.provider === "vercel-proxy") {
    const endpoint = buildProxyEndpoint(config);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: config.workspaceId || config.workspaceKey || "",
        state,
        revision: Number(state.meta?.revision || 0),
        updatedAt: state.meta?.updatedAt || new Date().toISOString(),
        updatedBy: config.deviceId,
      }),
    });

    if (!response.ok) {
      throw new Error(await buildRemoteError(response, "Nao foi possivel salvar o snapshot remoto."));
    }

    return state;
  }

  const endpoint = new URL(`/rest/v1/${config.tableName}`, `${config.projectUrl}/`);
  endpoint.searchParams.set("on_conflict", "workspace_key");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildRequestHeaders(config),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{
      workspace_key: config.workspaceKey,
      state,
      revision: Number(state.meta?.revision || 0),
      updated_at: state.meta?.updatedAt || new Date().toISOString(),
      updated_by: config.deviceId,
    }]),
  });

  if (!response.ok) {
    throw new Error(await buildRemoteError(response, "Nao foi possivel salvar o snapshot remoto."));
  }

  return state;
}

export async function diagnoseCloudSync(state) {
  const nextState = withCloudSyncSettings(state);
  const config = getCloudSyncConfig(nextState);

  if (!hasCloudSyncConfigured(nextState)) {
    return {
      ok: false,
      code: "missing-config",
      message: "A sincronizacao automatica ainda nao foi configurada no deploy.",
    };
  }

  try {
    const remote = await readRemoteSnapshot(nextState, config);
    return {
      ok: true,
      code: remote?.state ? "remote-found" : "remote-empty",
      message: remote?.state
        ? "Conexao ok. Workspace remoto encontrado."
        : "Conexao ok. Workspace remoto ainda vazio.",
      remoteRevision: Number(remote?.revision || 0),
      remoteUpdatedAt: String(remote?.updated_at || ""),
    };
  } catch (error) {
    return {
      ok: false,
      code: "remote-error",
      message: error instanceof Error ? error.message : "Falha ao testar a sincronizacao.",
    };
  }
}

export async function loadCloudState(localState) {
  let nextState = withCloudSyncSettings(localState);
  const config = getCloudSyncConfig(nextState);

  if (!hasCloudSyncConfigured(nextState)) {
    return nextState;
  }

  try {
    const remote = await readRemoteSnapshot(nextState, config);
    if (remote?.state) {
      const remoteState = withCloudSyncSettings(remote.state);
      const mergedState = mergeWorkspaceStates(nextState, remoteState);
      if (statesDifferForSync(mergedState, remoteState)) {
        const pushedState = touchState(mergedState);
        await writeRemoteSnapshot(pushedState, config);
        return applySyncMetadata(pushedState, config, {
          lastSyncedAt: new Date().toISOString(),
          lastPulledAt: new Date().toISOString(),
          lastError: "",
        });
      }

      return applySyncMetadata(mergedState, config, {
        lastPulledAt: new Date().toISOString(),
        lastError: "",
      });
    }

    await writeRemoteSnapshot(nextState, config);
    return applySyncMetadata(nextState, config, {
      lastSyncedAt: new Date().toISOString(),
      lastError: "",
    });
  } catch (error) {
    return applySyncMetadata(nextState, config, {
      lastError: error instanceof Error ? error.message : "Falha ao conectar na sincronizacao.",
    });
  }
}

export async function saveCloudState(state) {
  let nextState = withCloudSyncSettings(state);
  const config = getCloudSyncConfig(nextState);
  let touchedState = null;

  if (!hasCloudSyncConfigured(nextState)) {
    return touchState(nextState);
  }

  try {
    const remote = await readRemoteSnapshot(nextState, config);
    if (remote?.state) {
      nextState = mergeWorkspaceStates(nextState, withCloudSyncSettings(remote.state));
    }

    touchedState = touchState(nextState);
    await writeRemoteSnapshot(touchedState, config);
    return applySyncMetadata(touchedState, config, {
      lastSyncedAt: new Date().toISOString(),
      lastError: "",
    });
  } catch (error) {
    const fallbackState = touchedState || touchState(nextState);
    return applySyncMetadata(fallbackState, config, {
      lastError: error instanceof Error ? error.message : "Falha ao sincronizar com a nuvem.",
    });
  }
}

export async function pullCloudState(state) {
  const nextState = withCloudSyncSettings(state);
  const config = getCloudSyncConfig(nextState);

  if (!hasCloudSyncConfigured(nextState)) {
    return nextState;
  }

  try {
    const remote = await readRemoteSnapshot(nextState, config);
    if (!remote?.state) {
      return applySyncMetadata(nextState, config, {
        lastPulledAt: new Date().toISOString(),
        lastError: "",
      });
    }

    const remoteState = withCloudSyncSettings(remote.state);
    const mergedState = mergeWorkspaceStates(nextState, remoteState);
    if (statesDifferForSync(mergedState, remoteState)) {
      const pushedState = touchState(mergedState);
      await writeRemoteSnapshot(pushedState, config);
      return applySyncMetadata(pushedState, config, {
        lastSyncedAt: new Date().toISOString(),
        lastPulledAt: new Date().toISOString(),
        lastError: "",
      });
    }

    return applySyncMetadata(mergedState, config, {
      lastPulledAt: new Date().toISOString(),
      lastError: "",
    });
  } catch (error) {
    return applySyncMetadata(nextState, config, {
      lastError: error instanceof Error ? error.message : "Falha ao atualizar da nuvem.",
    });
  }
}
