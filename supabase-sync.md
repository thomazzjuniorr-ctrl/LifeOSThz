# Sincronizacao Mobile + Desktop

## Solucao escolhida

Para esta fase, o app usa um modelo `local-first + nuvem opcional`.

- Local-first: continua rapido e funciona bem no navegador.
- Nuvem opcional: quando configurada, sincroniza o estado entre celular e desktop.
- Provider atual: `Supabase`

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
3. Clique em `Sincronizar agora`.

Repita a mesma configuracao no celular e no desktop.

## Como funciona no uso diario

- Voce captura algo no celular.
- O app salva localmente e empurra para o snapshot remoto.
- No desktop, o app busca atualizacoes ao abrir, ao voltar o foco e em intervalo automatico.
- O merge agora prioriza as entidades mais novas por `updatedAt`, reduzindo o risco de um dispositivo sobrescrever tarefas ou projetos mais recentes do outro.

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
