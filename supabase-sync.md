# Sincronizacao Mobile + Desktop

## Diagnostico da persistencia atual

Hoje o app continua `local-first`.

Persistencia local:

- `storage.js` salva no `IndexedDB`
- se `IndexedDB` falhar, usa `localStorage`
- isso cobre Inbox, Checklist, Organizar, Agenda, Projetos, Sprints e configuracoes

Por que mobile e desktop ficavam separados:

- cada navegador mantinha seu proprio banco local
- sem uma camada online, um aparelho nao sabia o que o outro tinha salvo

## Solucao adotada

Agora o fluxo principal de sincronizacao ficou:

- app publicado na Vercel
- frontend chama `/api/sync`
- `api/sync.js` roda no servidor da Vercel
- a funcao usa o Supabase com chave privada do servidor
- mobile e desktop passam a usar o mesmo workspace automaticamente

Isso reduz drasticamente a configuracao manual por aparelho.

## Regras da sincronizacao

- sync automatico ao abrir o app
- sync automatico ao salvar, editar, mover ou concluir
- sync automatico ao voltar foco para a aba
- sync automatico em intervalo curto
- `Sincronizar agora` continua como opcao manual extra

Regra de conflito:

- alteracao mais recente vence
- cada item usa `updatedAt`
- o estado geral usa `revision + meta.updatedAt`

Regra de preservacao:

- o app nunca deve apagar cegamente o que ja existe localmente
- na primeira sincronizacao ele junta local + nuvem
- depois espelha o resultado

## O que sincroniza

Prioridade desta fase:

1. Entrada / Inbox
2. Checklist / Tarefas
3. Organizar
4. Agenda
5. Projetos
6. Sprints / Linha de Raciocinio
7. Configuracoes essenciais

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
```

Se quiser restringir o acesso somente pelo backend da Vercel, use a `service_role key` apenas na Vercel e nao no frontend.

## Variaveis da Vercel

No projeto da Vercel, abra `Settings -> Environment Variables` e crie:

- `LIFE_OS_SUPABASE_URL`
- `LIFE_OS_SUPABASE_SERVICE_ROLE_KEY`
- `LIFE_OS_SYNC_TABLE`
  - valor recomendado: `life_os_snapshots`
- `LIFE_OS_SYNC_WORKSPACE_ID`
  - valor recomendado: um identificador fixo, por exemplo `life-os-thz-main`

Depois:

1. salve as variaveis
2. faça `Redeploy`
3. abra o app no desktop
4. abra o app no mobile
5. os dois passam a apontar para o mesmo workspace automaticamente

## Configuracao no frontend

O arquivo `runtime-config.js` desta versao ja deixa o app apontando para o modo automatico:

- `provider`: `vercel-proxy`
- `apiBaseUrl`: `/api/sync`
- `managedByRuntime`: `true`

Ou seja:

- nao precisa repetir Project URL em cada aparelho
- nao precisa repetir workspace key em cada aparelho
- nao precisa copiar perfil para o fluxo principal

`Copiar perfil` e `Importar perfil` ficam apenas como fallback avancado.

## Seguranca

Nunca coloque no frontend:

- `service_role key`
- qualquer segredo privado do Supabase

Pode ficar publico no app apenas se voce optar por fallback manual:

- `anon key`
- `project url`

No fluxo automatico atual, o segredo fica do lado do servidor da Vercel.

## Como funciona no uso diario

1. voce abre o app no desktop
2. ele puxa o estado remoto automaticamente
3. voce cria ou move uma tarefa
4. ele salva localmente e envia para a nuvem
5. no mobile, ao abrir ou voltar para o app, o dado aparece

## Testes recomendados

### Teste 1

1. deixe uma tarefa antiga no desktop
2. deixe outra tarefa antiga no mobile
3. abra os dois
4. confirme que as duas aparecem nos dois

### Teste 2

1. crie uma nova tarefa no mobile
2. abra ou atualize o desktop
3. confirme que ela apareceu

### Teste 3

1. crie uma nova tarefa no desktop
2. abra ou atualize o mobile
3. confirme que ela apareceu

### Teste 4

1. mova uma tarefa na Agenda
2. confirme que o outro dispositivo refletiu o novo dia

### Teste 5

1. conclua uma tarefa no Checklist
2. confirme que o outro dispositivo refletiu a conclusao

## Evolucao futura

O proximo passo ideal depois disso e:

- autenticar com Google
- trocar workspace fixo por usuario autenticado
- manter a mesma estrutura de sync
