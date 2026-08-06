# Lendo as cartas no Kindle (OPDS)

Guia de configuração do lado do Kindle, e um resumo das decisões de
arquitetura por trás — pra não precisar redescobrir isso daqui a 3 meses.

## Pré-requisitos (uma vez só)

- Kindle Paperwhite jailbroken (SpringBreak/hdnext), com **KUAL** e
  **KOReader** instalados via KPM (`;kpm install koreader` na busca).
- **Bloqueie atualizações OTA** — um update de firmware mata o jailbreak.
- Se nunca usou o navegador OPDS do KOReader antes, vale testar 15 minutos
  com um catálogo público (ex.: Standard Ebooks) antes de configurar o
  daqui — separa "meu feed está quebrado" de "o KOReader não está
  configurado".

## Passo a passo

1. No FinanceNews, abra **Configurações → Kindle**, dê um nome pro
   dispositivo (ex. "Kindle Paperwhite") e clique em **Gerar token**. O
   token só aparece **uma vez** — copie antes de sair da tela.
2. No KOReader: abra o gerenciador de arquivos → ícone de catálogos OPDS →
   adicionar catálogo novo.
   - **URL**: `https://financenews-app.vercel.app/api/opds`
   - **Usuário**: qualquer coisa (ex. seu email — não é validado, é só o
     token que importa)
   - **Senha**: o token que você copiou no passo 1
3. Navegue até **Não lidas** ou **Fila de leitura**, baixe uma carta e
   confirme que abre.
4. Pra sincronizar automaticamente: dentro do catálogo, use a opção **Sync
   all** — escolha a pasta local, o limite de itens e (se quiser) o filtro
   de extensão. Toda vez que abrir o KOReader e tocar em sync, as cartas
   novas aparecem sozinhas.

## Estrutura do catálogo

- **Fila de leitura** — cartas que você marcou explicitamente com o botão
  "Adicionar ao Kindle" (no app, na lista ou na leitura).
- **Não lidas** — tudo que ainda não foi marcado como lido, mais recente
  primeiro.
- **Por gestora** — um subcatálogo por gestora.
- **Por período** — últimos 30 dias / trimestre atual / ano atual.

Cartas com PDF de verdade baixam como `.pdf`; cartas que foram coletadas
como post HTML (Kinea, Versa, Persevera, Verdad, memos do Oaktree,
Berkshire pré-2004 — não existe PDF original pra essas) baixam como
`.txt` com o texto já extraído.

## Gerenciando tokens

Em Configurações → Kindle, a lista de "Dispositivos autorizados" mostra
quando cada token foi criado e usado pela última vez. Revogar um token
(ícone de lixeira) derruba o acesso desse dispositivo imediatamente — útil
se perder o Kindle ou trocar de aparelho.

## Decisões de arquitetura (pra não se perder depois)

- **Por que HTTP Basic Auth em vez do login normal do app**: o cliente
  OPDS do KOReader só suporta usuário/senha — não tem suporte a cookie de
  sessão nem a magic link. Por isso existe um caminho de auth paralelo
  (tabela `device_tokens`), independente do Supabase Auth.
- **Por que a chave `service_role` do Supabase aparece no código do
  Next.js** (`web/lib/opds/auth.ts`): sem uma sessão Supabase de verdade
  (que o Basic Auth não tem), não tem como as políticas de RLS de
  `cartas`/`leituras` funcionarem — elas dependem de `auth.uid()`/
  `auth.email()`, que só resolvem dentro de uma sessão. A rota de OPDS
  usa `service_role` (que ignora RLS) só nesse contexto isolado, e
  reimplementa manualmente em código a checagem que o RLS faria (allowlist
  + filtro por usuário). Em todo o resto do app, `service_role` continua
  restrita ao script Python.
- **Por que o PDF passa pelo nosso proxy em vez de redirecionar direto pro
  site da gestora**: mais previsível de depurar — algumas gestoras já são
  conhecidas por bloquear ou ter TLS instável vindo de fora do nosso
  próprio `fetch` do servidor (ver notas de JGP/Garde/Kapitalo no
  `config/registry.yaml`). O PDF nunca é armazenado por nós, só
  repassado — mesma política de sempre.
- **Fila do Kindle não é uma tabela nova** — são 2 colunas
  (`fila_kindle`, `fila_kindle_em`) na tabela `leituras` que já existia,
  porque fila e "não lido" são conceitos diferentes (uma é ação explícita,
  a outra é estado automático) mas continuam sendo a mesma relação
  usuário↔carta.

## O que fica pra Fase 2 (não implementado ainda)

- Geração de **EPUB** de verdade (resumo, digest do período, carta
  completa com HTML semântico) — vai rodar no pipeline Python, salvo no
  Supabase Storage. É só aí que "URL assinada" passa a fazer sentido —
  Fase 1 não tem nada armazenado pra assinar.
- Catálogo **Resumos** no feed raiz (só aparece quando existir conteúdo).
- **Send to Kindle por e-mail** (Fase 3) — complemento pra envio pontual e
  pra amigos sem jailbreak.
