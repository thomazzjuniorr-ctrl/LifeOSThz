# Life OS Thz 2026

Workspace pessoal para integrar tarefas, agenda, checklist, familia, casa, mudanca, financeiro pessoal e projetos de trabalho em um unico sistema com clareza operacional.

Agora a aba `Projetos` funciona como workspace individual por projeto, com:

- visao geral
- central de informacoes
- OKRs
- backlog
- atividades base
- plano de acao
- geracao de tarefas para o fluxo `Organizar -> Agenda -> Hoje`

## Stack

- HTML
- CSS
- JavaScript ES Modules
- IndexedDB
- Supabase REST (sincronizacao opcional)
- Node.js
- Playwright
- ESLint

## Requisitos

- Node.js 22+
- npm 11+

## Comandos

Instalar:

```powershell
npm install
```

Rodar localmente:

```powershell
npm run dev
```

Abrir:

- `http://127.0.0.1:4173`

Testar:

```powershell
npm test
```

Build:

```powershell
npm run build
```

Preview do build:

```powershell
npm run preview
```

Deploy:

```powershell
npm run deploy:netlify:preview
npm run deploy:netlify:prod
npm run deploy:vercel:prod
```

## Deploy Online

A recomendacao atual para este app e `Vercel` usando `GitHub web + Vercel web`.

Arquivos preparados:

- [netlify.toml](./netlify.toml)
- [vercel.json](./vercel.json)
- [runtime-config.js](./runtime-config.js)
- [manifest.webmanifest](./manifest.webmanifest)

Guia completo:

- [docs/deploy-online.md](./docs/deploy-online.md)
- [docs/github-vercel-publish.md](./docs/github-vercel-publish.md)
- [docs/supabase-sync.md](./docs/supabase-sync.md)

## Timezone e calendario

O app agora usa `America/Sao_Paulo` como timezone padrao para:

- Hoje
- semana atual
- agenda
- filtros por data
- capturas do dia

Google Calendar continua opcional. O calendario interno ja funciona corretamente sozinho e a integracao pode ser ligada depois.

## Sincronizacao entre celular e desktop

O app agora suporta sincronizacao entre dispositivos com modo `local-first + nuvem opcional`.

Prioridade atual da sincronizacao:

- Entrada / Inbox
- Checklist / Tarefas
- Agenda
- Organizar
- Projetos

Experiencia por interface:

- desktop = visao, organizacao e replanejamento
- mobile = captura rapida, checklist e execucao

Fluxo recomendado agora:

1. publicar na Vercel
2. configurar Supabase em `Configuracoes`
3. repetir a mesma configuracao no celular e no desktop
4. usar `Sincronizar agora` na primeira conexao

Guia:

- [docs/supabase-sync.md](./docs/supabase-sync.md)

## Base para evolucao futura

- `runtime-config.js` para configuracao publica por ambiente
- `src/services/runtime-config.js` para leitura centralizada
- `src/services/auth-service.js` para futura autenticacao Google
- `src/services/google-calendar.js` preparado para usar runtime config
- `netlify/functions/` reservado para auth e integracoes privadas

## Arquivos principais

- [index.html](./index.html)
- [styles.css](./styles.css)
- [app.js](./app.js)
- [engine.js](./engine.js)
- [google-calendar.js](./google-calendar.js)
- [runtime-config-service.js](./runtime-config-service.js)
- [auth-service.js](./auth-service.js)
- [docs/deploy-online.md](./docs/deploy-online.md)
