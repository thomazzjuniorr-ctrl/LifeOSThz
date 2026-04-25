// Arquivo publico carregado no navegador.
// Use aqui apenas dados publicos, como URL do Supabase e anon key.
// Nunca coloque service role keys ou segredos privados neste arquivo.
window.__LIFE_OS_RUNTIME__ = window.__LIFE_OS_RUNTIME__ || {
  deployment: {
    platform: "vercel",
    stage: "production",
    publicBaseUrl: "",
  },
  access: {
    protectionMode: "pending-auth",
    sessionMode: "none",
  },
  auth: {
    enabled: false,
    provider: "google",
    googleClientId: "",
    googleHostedDomain: "",
    allowedEmails: [],
  },
  calendar: {
    clientId: "",
    apiKey: "",
    calendarId: "primary",
  },
  sync: {
    enabled: false,
    provider: "supabase",
    projectUrl: "",
    anonKey: "",
    tableName: "life_os_snapshots",
    workspaceKey: "",
    pollIntervalSeconds: 20,
  },
  pwa: {
    enabled: false,
    serviceWorkerPath: "/sw.js",
  },
};
