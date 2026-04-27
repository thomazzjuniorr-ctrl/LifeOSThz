const DEFAULT_TABLE = "life_os_snapshots";

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getEnv(name, fallback = "") {
  return String(process.env[name] || fallback || "").trim();
}

function parseUrl(req) {
  return new URL(req.url, "http://localhost");
}

function getWorkspaceId(req, body = null) {
  const fixed = getEnv("LIFE_OS_SYNC_WORKSPACE_ID");
  if (fixed) {
    return fixed;
  }

  const url = parseUrl(req);
  return String(
    body?.workspaceId
      || url.searchParams.get("workspaceId")
      || req.headers["x-workspace-id"]
      || "",
  ).trim();
}

function getSupabaseConfig() {
  return {
    projectUrl: getEnv("LIFE_OS_SUPABASE_URL", getEnv("SUPABASE_URL")),
    serviceRoleKey: getEnv("LIFE_OS_SUPABASE_SERVICE_ROLE_KEY", getEnv("SUPABASE_SERVICE_ROLE_KEY")),
    tableName: getEnv("LIFE_OS_SYNC_TABLE", DEFAULT_TABLE) || DEFAULT_TABLE,
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function buildSupabaseHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function buildRemoteError(response, fallbackMessage) {
  let detail = "";
  try {
    const raw = await response.text();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        detail = parsed.message || parsed.error_description || parsed.error || parsed.hint || raw;
      } catch {
        detail = raw;
      }
    }
  } catch {
    detail = "";
  }

  return `${fallbackMessage}${detail ? ` ${detail}` : ""}`.trim();
}

async function fetchSnapshot(config, workspaceId) {
  const endpoint = new URL(`/rest/v1/${config.tableName}`, `${config.projectUrl}/`);
  endpoint.searchParams.set("select", "workspace_key,state,revision,updated_at,updated_by");
  endpoint.searchParams.set("workspace_key", `eq.${workspaceId}`);
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: buildSupabaseHeaders(config.serviceRoleKey),
  });

  if (!response.ok) {
    throw new Error(await buildRemoteError(response, "Nao foi possivel ler o snapshot no Supabase."));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function upsertSnapshot(config, workspaceId, payload) {
  const endpoint = new URL(`/rest/v1/${config.tableName}`, `${config.projectUrl}/`);
  endpoint.searchParams.set("on_conflict", "workspace_key");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(config.serviceRoleKey),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{
      workspace_key: workspaceId,
      state: payload.state,
      revision: Number(payload.revision || payload.state?.meta?.revision || 0),
      updated_at: payload.updatedAt || payload.state?.meta?.updatedAt || new Date().toISOString(),
      updated_by: payload.updatedBy || "vercel-proxy",
    }]),
  });

  if (!response.ok) {
    throw new Error(await buildRemoteError(response, "Nao foi possivel salvar o snapshot no Supabase."));
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const config = getSupabaseConfig();
  if (!config.projectUrl || !config.serviceRoleKey) {
    json(res, 500, {
      ok: false,
      message: "Sync backend ainda nao configurado na Vercel.",
    });
    return;
  }

  let body = {};
  try {
    if (req.method === "POST") {
      body = await readBody(req);
    }
  } catch {
    json(res, 400, {
      ok: false,
      message: "Body invalido para sincronizacao.",
    });
    return;
  }

  const workspaceId = getWorkspaceId(req, body);
  if (!workspaceId) {
    json(res, 500, {
      ok: false,
      message: "Workspace automatico nao configurado no deploy.",
    });
    return;
  }

  try {
    if (req.method === "GET") {
      const row = await fetchSnapshot(config, workspaceId);
      json(res, 200, { ok: true, row });
      return;
    }

    if (req.method === "POST") {
      if (!body?.state) {
        json(res, 400, {
          ok: false,
          message: "Snapshot ausente no envio.",
        });
        return;
      }

      const row = await upsertSnapshot(config, workspaceId, body);
      json(res, 200, { ok: true, row });
      return;
    }

    json(res, 405, {
      ok: false,
      message: "Metodo nao suportado.",
    });
  } catch (error) {
    json(res, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Falha interna na sincronizacao.",
    });
  }
}
