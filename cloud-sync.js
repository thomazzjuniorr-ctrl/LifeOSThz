import { getRuntimeConfig } from "./runtime-config-service.js";

const DEFAULT_SYNC_CONFIG = {
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
    projectUrl: cleanUrl(runtimeSync.projectUrl || runtimeSync.url || ""),
    anonKey: String(runtimeSync.anonKey || runtimeSync.publishableKey || runtimeSync.apiKey || "").trim(),
    tableName: String(runtimeSync.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName,
    workspaceKey: String(runtimeSync.workspaceKey || "").trim(),
    pollIntervalSeconds: toNumber(runtimeSync.pollIntervalSeconds, DEFAULT_SYNC_CONFIG.pollIntervalSeconds),
    deviceId: String(runtimeSync.deviceId || "").trim() || getDeviceId(),
  };
}

export function getCloudSyncConfig(state) {
  const defaults = getCloudSyncDefaults();
  const source = state?.settings?.cloudSync && typeof state.settings.cloudSync === "object"
    ? state.settings.cloudSync
    : {};

  return {
    ...defaults,
    ...source,
    enabled: toBoolean(source.enabled, defaults.enabled),
    projectUrl: cleanUrl(source.projectUrl || defaults.projectUrl),
    anonKey: String(source.anonKey || defaults.anonKey || "").trim(),
    tableName: String(source.tableName || defaults.tableName || DEFAULT_SYNC_CONFIG.tableName).trim() || DEFAULT_SYNC_CONFIG.tableName,
    workspaceKey: String(source.workspaceKey || defaults.workspaceKey || "").trim(),
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
  return Boolean(
    config.enabled
      && config.provider === "supabase"
      && config.projectUrl
      && config.anonKey
      && config.workspaceKey,
  );
}

function buildRequestHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
    "x-workspace-key": config.workspaceKey,
  };
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

async function readRemoteSnapshot(state, config = getCloudSyncConfig(state)) {
  if (!hasCloudSyncConfigured({ settings: { cloudSync: config } })) {
    return null;
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
    throw new Error("Nao foi possivel buscar o snapshot remoto.");
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function writeRemoteSnapshot(state, config = getCloudSyncConfig(state)) {
  if (!hasCloudSyncConfigured({ settings: { cloudSync: config } })) {
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
    throw new Error("Nao foi possivel salvar o snapshot remoto.");
  }

  return state;
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
      if (compareStateFreshness(remoteState, nextState) > 0) {
        return applySyncMetadata(remoteState, config, {
          lastPulledAt: new Date().toISOString(),
          lastError: "",
        });
      }

      return applySyncMetadata(nextState, config, {
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
  const touchedState = touchState(state);
  const config = getCloudSyncConfig(touchedState);

  if (!hasCloudSyncConfigured(touchedState)) {
    return touchedState;
  }

  try {
    await writeRemoteSnapshot(touchedState, config);
    return applySyncMetadata(touchedState, config, {
      lastSyncedAt: new Date().toISOString(),
      lastError: "",
    });
  } catch (error) {
    return applySyncMetadata(touchedState, config, {
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
    if (compareStateFreshness(remoteState, nextState) > 0) {
      return applySyncMetadata(remoteState, config, {
        lastPulledAt: new Date().toISOString(),
        lastError: "",
      });
    }

    return applySyncMetadata(nextState, config, {
      lastPulledAt: new Date().toISOString(),
      lastError: "",
    });
  } catch (error) {
    return applySyncMetadata(nextState, config, {
      lastError: error instanceof Error ? error.message : "Falha ao atualizar da nuvem.",
    });
  }
}
