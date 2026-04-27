# Sincronizacao Mobile + Desktop

## Diagnostico da persistencia atual

Hoje o app funciona em modo `local-first`.

Persistencia atual:

- `storage.js` salva o estado principal no `IndexedDB`
- se o navegador nao suportar `IndexedDB`, ele usa `localStorage` como fallback
- tudo o que voce mexe em:
  - Inbox / Entrada
  - Checklist / Tarefas
  - Organizar
  - Agenda
  - Projetos
  - Sprints
  - Configuracoes principais

entra dentro de um `snapshot` unico do app

Por que hoje nao sincroniza entre dispositivos por padrao:

- `IndexedDB` e `localStorage` pertencem a cada navegador/dispositivo
- celular e desktop ficam com bancos locais separados
- a nuvem ja existia como base tecnica opcional, mas depende de configuracao real
- sem `Supabase + workspace key` iguais nos dois dispositivos, cada um continua isolado

Em resumo:

- localmente o app salva certo
- entre dispositivos ele nao conversa sozinho sem uma camada online
- nesta versao, quando um dispositivo ja tem atividades locais e encontra a nuvem pela primeira vez, o app faz merge nao destrutivo e espelha o resultado

## Solucao escolhida

Para esta fase, o app usa um modelo `local-first + nuvem opcional`.

- Local-first: continua rapido e funciona bem no navegador.
- Nuvem opcional: quando configurada, sincroniza o estado entre celular e desktop.
- Provider atual: `Supabase`
- Estrategia de conflito: `alteracao mais recente vence`
- Regra tecnica: cada item importante usa `updatedAt` e o estado geral usa `revision + meta.updatedAt`

Essa escolha funciona bem com o deploy estatico atual na Vercel e deixa a arquitetura pronta para, depois, trocar a protecao por `Google Auth` sem reescrever o restante do app.

## O que o app sincroniza

O app salva um `snapshot` unico do workspace.

Isso cobre:

- tarefas
- inbox
- organize
- agenda
- checklist
- projetos
- sprints
- configuracoes

Prioridade funcional nesta fase:

1. Entrada / Inbox
2. Checklist / Tarefas
3. Agenda
4. Organizar
5. Projetos

No uso real, isso significa:

- o que voce captura no celular deve aparecer no desktop
- o que voce reorganiza no desktop deve aparecer no celular
- mudancas de tarefas, agenda e projetos passam a viajar no mesmo workspace

Nesta etapa, os fluxos mais importantes ficaram cobertos:

1. criar tarefa no Inbox
2. editar tarefa
3. mover tarefa no Organizar
4. mover tarefa na Agenda
5. marcar checklist como concluido
6. alterar projeto
7. alterar sprint atual

## Timezone padrao

O calendario interno agora usa:

- `America/Sao_Paulo`

Isso vale para:

- Hoje
- semana atual
- agenda
- filtros por data
- data padrao da captura

## Estrutura esperada no Supabase

Crie a tabela abaixo no SQL Editor do Supabase:

```sql
create table if not exists public.life_os_snapshots (
  workspace_key text primary key,
  state jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.life_os_snapshots enable row level security;

create policy "life_os_select_by_workspace_header"
on public.life_os_snapshots
for select
to anon, authenticated
using (
  workspace_key = coalesce(
    current_setting('request.headers', true)::json->>'x-workspace-key',
    ''
  )
);

create policy "life_os_insert_by_workspace_header"
on public.life_os_snapshots
for insert
to anon, authenticated
with check (
  workspace_key = coalesce(
    current_setting('request.headers', true)::json->>'x-workspace-key',
    ''
  )
);

create policy "life_os_update_by_workspace_header"
on public.life_os_snapshots
for update
to anon, authenticated
using (
  workspace_key = coalesce(
    current_setting('request.headers', true)::json->>'x-workspace-key',
    ''
  )
)
with check (
  workspace_key = coalesce(
    current_setting('request.headers', true)::json->>'x-workspace-key',
    ''
  )
);
```

## Seguranca e chaves

O frontend pode usar:

- `Project URL` do Supabase
- `Anon / Publishable Key`

Esses dois valores sao publicos por natureza e podem ficar no navegador.

O que **nao** pode ir para o frontend nem para o GitHub:

- `service_role key`
- qualquer segredo privado do Supabase

Sobre a `Workspace Key`:

- ela funciona como chave do workspace compartilhado entre os seus dispositivos
- voce pode digitar essa chave dentro do app e deixar salva localmente
- o ideal e **nao** commitar uma workspace key real no GitHub

Recomendacao pratica:

- deixe `runtime-config.js` com valores vazios no repositório
- preencha a configuracao dentro da aba `Configuracoes` no celular e no desktop

Assim:

- nada sensivel vai para o GitHub
- a chave publica do Supabase continua segura para uso no frontend
- sua `workspace key` fica sob seu controle

## Como configurar no app

Abra `Configuracoes` e preencha:

- `Ativar sincronizacao`: `Ligada`
- `Provider`: `Supabase`
- `Project URL`: URL do seu projeto Supabase
- `Anon / Publishable Key`: chave publica do projeto
- `Tabela`: `life_os_snapshots`
- `Workspace Key`: uma chave privada sua
- `Intervalo (s)`: recomendado `20`

Depois:

1. Clique em `Gerar workspace key` se quiser criar uma chave forte.
2. Clique em `Salvar configuracoes`.
3. Clique em `Copiar perfil`.
4. No outro dispositivo, abra `Configuracoes` e clique em `Importar perfil`.
5. Clique em `Sincronizar agora`.

Assim voce evita erro de digitacao e garante que celular e desktop usem exatamente o mesmo `Project URL`, `Anon Key`, `Tabela` e `Workspace Key`.

## Vercel

Para esta versao estatica do app, voce **nao precisa** configurar variaveis obrigatorias na Vercel para a sincronizacao funcionar.

Opcoes:

1. `Mais simples e recomendada agora`
   - deixar `runtime-config.js` vazio
   - configurar o Supabase dentro do proprio app em `Configuracoes`

2. `Prefill publico`
   - colocar no `runtime-config.js` apenas:
     - `projectUrl`
     - `anonKey`
     - `tableName`
     - `pollIntervalSeconds`
   - continuar preenchendo a `workspace key` manualmente no app

Como o deploy atual e estatico, a Vercel nao injeta env no frontend automaticamente sem um fluxo extra de build/server.

Entao, para esta fase:

- Vercel publica o site
- Supabase guarda o snapshot compartilhado
- a configuracao do sync pode ser feita diretamente pela interface do app

## Como funciona no uso diario

- Voce captura algo no celular.
- O app salva localmente e empurra para o snapshot remoto.
- No desktop, o app busca atualizacoes ao abrir, ao voltar o foco e em intervalo automatico.
- O merge agora prioriza as entidades mais novas por `updatedAt`, reduzindo o risco de um dispositivo sobrescrever tarefas ou projetos mais recentes do outro.

Fluxo atual da sincronizacao:

1. `Salvar algo`
   - atualiza o estado local
   - gera novo `revision`
   - tenta enviar para o Supabase
2. `Abrir o app`
   - tenta puxar o snapshot remoto
   - faz merge com o estado local
3. `Voltar o foco para a aba`
   - tenta sincronizar de novo
4. `Intervalo automatico`
   - roda a cada `pollIntervalSeconds`
5. `Sincronizar agora`
   - forca uma atualizacao manual

Importante sobre atividades ja existentes:

- o app nao deve apagar suas atividades locais quando voce ligar a sincronizacao
- ele junta o que ja existe no dispositivo com o que ja existe na nuvem
- depois espelha o resultado para o outro dispositivo

Isso deixa a arquitetura pronta para realtime depois, sem depender disso agora.

## Testes obrigatorios

### Teste 1

1. Abra o app no desktop
2. Va em `Entrada`
3. Crie uma tarefa na Inbox
4. Abra o app no mobile com a mesma configuracao de sync
5. Confirme que a tarefa apareceu

### Teste 2

1. Abra o app no mobile
2. Crie uma tarefa na Inbox
3. Abra o app no desktop
4. Clique em `Sincronizar agora` ou aguarde o intervalo
5. Confirme que a tarefa apareceu

### Teste 3

1. No desktop, arraste uma tarefa na `Agenda` para outro dia
2. Aguarde o sync ou clique em `Sincronizar agora`
3. Abra o mobile
4. Confirme que o novo dia apareceu igual

### Teste 4

1. No mobile ou desktop, marque um item de `Checklist` como concluido
2. Aguarde o sync ou clique em `Sincronizar agora`
3. Abra o outro dispositivo
4. Confirme que o item apareceu concluido tambem

## Limitacao atual

Nesta versao, a seguranca entre dispositivos usa `workspace key` + politica por header.

Isso e bom para a fase atual, mas o proximo passo ideal e:

- login Google
- identificacao por usuario
- politicas por sessao autenticada

## Proximo passo natural

Quando quiser endurecer a seguranca e simplificar o setup por dispositivo:

- manter o Supabase
- ativar `Google Auth`
- substituir a `workspace key` por sessao autenticada
