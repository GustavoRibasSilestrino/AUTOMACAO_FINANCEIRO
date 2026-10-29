# Painel de Pagamentos — Protesto Sorocaba

Sistema para o **caixa/atendimento** informar valores recebidos e o **financeiro** conferir no banco, com aviso persistente (notificação no canto da tela e pop-up). App de desktop (Electron) + versão web, com dados no Supabase.

Este documento serve para retomar o trabalho em **qualquer computador**.

- **Código:** https://github.com/GustavoRibasSilestrino/AUTOMACAO_FINANCEIRO (público; nunca commitar o `.env`)
- **Versão web:** https://automacao-financeiro.vercel.app (publica sozinha a cada envio para a `main`)
- **Versão atual:** 0.4.1

---

## 0. Onde paramos (28/10/2026)

**Pronto e no ar**
- **v0.4.1:** o **login não é mais lembrado**: ao fechar o app (ou a aba, na versão web) é preciso entrar de novo. No app de desktop, o X da janela **encerra** o programa nos setores Caixa, Cancelamento e Certidões; só o **Financeiro** continua rodando escondido perto do relógio (para receber avisos) e perde o login ao usar "Sair" no ícone da bandeja.
- **v0.4.0 (29/10/2026):** nome do **pagador obrigatório** em todos os perfis; **tipos por setor** (Certidões só certidão, Cancelamento só taxa de cancelamento, Caixa os 4); **atendentes** Caixa = Biga, Particular, Renata / Cancelamento = Murilo, Luís / Certidões = Depósitos; aba **Arquivos** = um arquivo de pagamentos por dia, só do perfil (Caixa: do atendente; Cancelamento/Certidões: do setor; Financeiro: todos); soma por atendente; **visual novo** (menu recolhível, painel em blocos, gráficos, celular); assinatura **dev ribas**. Exige a migração 3 no Supabase.
- App completo (React + Electron) com a identidade visual do Protesto Sorocaba, tema claro/escuro e responsivo.
- Fluxo: setor informa o valor → financeiro é avisado (notificação no canto do Windows, repetida a cada minuto; pop-up dentro do app) → confirma, registra **valor diferente** ou marca **não localizado** → o setor vê o resultado na tela. O setor pode **cancelar** o envio enquanto aguarda.
- Painel do financeiro (indicadores, fila, gráficos), histórico com filtros, **relatórios CSV** (fechamento do dia, lista filtrada, envios do atendente), pesquisa de arquivos (Ctrl+K), troca de atendente no Caixa sem sair.
- Supabase com as **2 migrações aplicadas** (conferido pela API); cadastro aberto desligado; regras de acesso testadas (`npm test`: 15 testes).
- GitHub e Vercel atualizados na 0.3.0. Instalador e ZIP gerados (`npm run pacote`) e distribuídos pelo Google Drive.

**Falta (depende de quem usa)**
- [ ] **Teste de ponta a ponta com 2 computadores e o Supabase real** (checklist na seção 4). Marcado para 29/10/2026. Ainda não foram testados: login com as senhas reais, pop-up em tempo real entre PCs e o balão de notificação no app instalado.
- [ ] Conferir no Supabase: **Authentication → Users** com os 4 e-mails de setor e **Table Editor → perfis** com 4 linhas (não dá para verificar de fora).
- [ ] **Logo oficial** (SVG ou PNG grande) para trocar a logo recriada em CSS e o ícone provisório "PS".
- [ ] **Arquivos reais na pesquisa:** hoje são 8 exemplos; é preciso definir onde os arquivos ficam (pasta de rede, Drive…) para indexar.
- [ ] Decidir o plano do Supabase: o gratuito pausa o projeto após ~1 semana sem uso e não tem backup automático (plano Pro resolve).
- [ ] Opcionais: conta por pessoa do financeiro (saber quem confirmou), atualização automática do app, assinatura digital do instalador (remove o aviso do Windows).

**Como retomar em outro computador:** `git clone` (seção 6), `npm install`, copiar `.env.example` para `.env` com a URL e a chave `anon` do Supabase (seção 4), `npm run dev` para testar e `npm run pacote` para gerar o instalador + ZIP.

---

## 1. Requisitos do sistema (levantados na conversa)

- [x] **Pesquisa de arquivos** (busca por nome, filtro por setor) — com dados de exemplo; falta indexar os arquivos reais.
- [x] **"OK" do financeiro** para pagamentos.
- [x] O caixa **digita o valor recebido**; o financeiro recebe **pop-up no PC**, para conferir no banco se o valor entrou ou não.
- [x] Separação por **setores**: Caixa, Cancelamento, Certidões.
- [x] **Só o financeiro** recebe pop-ups: entra no app com a **senha do setor financeiro** e precisa estar **configurado para receber pop-up**.
- [x] No setor **Caixa** (atendimento físico) é possível **escolher o usuário** — 3 perfis: **Biga**, **Particular**, **Renata**.
- [x] O atendente informa o tipo: **título em aberto**, **certidão**, **taxa de cancelamento** ou **custas da CPFL**.
- [x] O pop-up **fica aparecendo até alguém clicar** na notificação.

---

## 2. O que o protótipo já faz

| Requisito | Situação no protótipo |
|---|---|
| Login por setor + senha | Feito (senhas fixas de teste) |
| Caixa escolhe Biga / Particular / Renata | Feito |
| Tipo de pagamento (4 opções) + valor | Feito |
| Pop-up para o financeiro, persistente até clicar | Feito (modal + som repetido + notificação do sistema com `requireInteraction`) |
| Financeiro escolhe se recebe pop-up e de quais setores | Feito (configuração salva por computador) |
| Botões "OK, recebido" / "Não recebido" | Feito |
| Histórico e status para quem enviou | Feito (com cronômetro e aviso na tela quando o financeiro responde) |
| Painel do financeiro | Feito: indicadores do dia, fila de conferência, gráficos por setor e por tipo |
| Histórico com filtros e exportação | Feito: busca, setor, status, período (hoje/7 dias/tudo) e **CSV para Excel** |
| Identidade visual Protesto Sorocaba | Feito: azul-marinho da logo, tema claro/escuro, responsivo |
| Corrigir valor digitado errado | Feito: **"Cancelar envio"** enquanto aguarda; e **"Valor diferente"** no financeiro (registra o valor achado no banco; o setor é avisado) |
| Trocar atendente no Caixa sem sair | Feito (caixa "Atendente" no menu lateral) |
| Testes automáticos | `npm test`: 15 testes (regras do banco e relatórios) |
| Pesquisa de arquivos | Feito com dados de exemplo (`src/arquivos.js`); atalho **Ctrl+K** em qualquer tela |
| Aplicativo com ícone na área de trabalho (instalador `.exe`) | Feito — ver seção 3.1 |
| Funcionar entre computadores diferentes | Código pronto (Supabase); falta criar o projeto e preencher o `.env` — ver seção 4 |

> **Importante:** sem o arquivo `.env` (seção 4) o app roda em *modo local*: os dados ficam no `localStorage` do navegador/app e **não** passam de um PC para outro. Serve para validar telas e fluxo.

Senhas de teste: Caixa `caixa123` · Cancelamento `cancel123` · Certidões `cert123` · Financeiro `fin123`

---

## 3. Rodar o protótipo (em qualquer PC)

Pré-requisito: [Node.js](https://nodejs.org) 18+ instalado.

```bash
cd AUTOMAÇÃO_FINANCEIRO
npm install
npm run dev
```

Abra `http://localhost:5173`.

### Testando o fluxo completo
1. **Aba 1:** entre como **Financeiro** (`fin123`). Deixe "Ativado" marcado e aceite a permissão de notificações.
2. **Aba 2** (mesmo navegador): entre como **Caixa → Renata** (`caixa123`), escolha o tipo, digite um valor e envie.
3. Volte à aba 1: o pop-up aparece, com som, e **não some** até clicar em "OK, recebido" ou "Não recebido".
4. Na aba 2, o status do envio muda sozinho.
5. Desmarque setores na configuração do financeiro para ver o filtro por setor.

### Levar para outro computador
- Copie a pasta **sem** `node_modules`, `dist` e `release` (ou use Git, seção 6) e rode `npm install` no novo PC.

---

## 3.1 Aplicativo de desktop (ícone na área de trabalho)

O projeto usa **Electron**: é o mesmo React, empacotado como programa do Windows.

**Para instalar em um PC (sem precisar de Node):**
1. Pegue o arquivo `release/Painel de Pagamentos Setup 0.1.0.exe` (gerado no passo abaixo).
2. Copie para o PC (pen drive / rede) e dê dois cliques. A instalação é de um clique, **sem precisar de administrador**, e cria o **atalho na Área de Trabalho** e no Menu Iniciar.
3. O Windows pode mostrar "Windows protegeu seu computador" (o instalador não é assinado digitalmente): clique em **Mais informações → Executar assim mesmo**.

**Para gerar o instalador** (no PC de desenvolvimento, com Node):
```bash
npm install
npm run dist
```
O resultado fica em `release/`.

**Testar sem instalar:** `npm run desktop` (compila e abre o app direto).

**Comportamento do app de desktop:**
- Fechar a janela (X) **só esconde** o app na bandeja do sistema (perto do relógio) — assim o financeiro continua recebendo pop-ups. Para fechar de verdade: clique direito no ícone da bandeja → **Sair**.
- Clique direito no ícone da bandeja → **Iniciar com o Windows** liga/desliga a abertura automática (recomendado no PC do financeiro).
- Quando chega um pagamento e o app está em segundo plano (ex.: janela do banco), aparece uma **notificação do Windows no canto inferior direito**, que se repete a cada 1 minuto até a conferência. Clicar nela traz o app para a frente, já com o pop-up de confirmação. Se o app já está na frente, só aparece o pop-up dele. No Painel dá para trocar por "Janela na frente" (a janela vem por cima de tudo).
- **Relatórios (CSV para Excel):** Financeiro > Painel > "Relatório do dia" (fechamento por setor, atendente e tipo, com detalhe); Financeiro > Pagamentos > "Exportar CSV" (lista filtrada); demais setores > "Baixar relatório" (envios do dia).
- Só abre uma cópia do app por computador.

**Problemas conhecidos / observações:**
- No Windows, o `electron-builder` falha ao extrair a ferramenta `winCodeSign` ("Cannot create symbolic link"). O projeto já contorna isso (`signAndEditExecutable: false` + `build/afterPack.cjs`, que coloca o ícone no `.exe`). Se o erro voltar, ative o **Modo de desenvolvedor** do Windows ou rode o terminal como administrador.
- Para o instalador sair **sem o aviso do Windows**, é preciso um certificado de assinatura de código (pago).
- O ícone atual é provisório (`build/icon.png` / `build/icon.ico`); troque por um ícone da empresa (PNG 256×256 + ICO).
- **Os dados só passam entre PCs depois que a seção 4 for feita** (Supabase). Um instalador gerado antes disso roda em modo local.

---

## 3.2 Distribuir o instalador por pasta compartilhada

Não é preciso Vercel nem site: o `.exe` é copiado para uma pasta da rede e cada PC instala a partir dela.

**Montar a pasta (uma vez, no PC que fica ligado — ex.: o do financeiro):**
1. Crie a pasta `C:\Instaladores`.
2. Botão direito na pasta → **Propriedades → Compartilhamento → Compartilhamento Avançado** → marque **Compartilhar esta pasta**.
3. Em **Permissões**, remova "Todos" e adicione só as contas que vão instalar, com **Leitura**. Deixe **Controle total** apenas para quem atualiza o instalador.
4. Anote o caminho de rede: `\\NOME-DO-PC\Instaladores` (o nome do PC está em *Configurações → Sistema → Sobre*).

**ZIP pronto para levar:** `release\Painel-de-Pagamentos-X.Y.Z.zip` contém o instalador e um `LEIA-ME.txt` com as instruções para os usuários. Para refazer instalador **e** ZIP de uma vez: `npm run pacote` (o texto do guia fica em `build/LEIA-ME.txt`).

**Colocar/atualizar o instalador:**
1. No PC de desenvolvimento, com o `.env` do Supabase já preenchido (seção 4): `npm run dist`.
2. Copie `release\Painel de Pagamentos Setup X.Y.Z.exe` para a pasta compartilhada. Ao atualizar, aumente `version` no `package.json` antes de gerar, para o nome do arquivo mostrar qual é a versão nova, e apague a versão antiga da pasta.

**Instalar em cada PC:**
1. No Explorador de Arquivos, digite `\\NOME-DO-PC\Instaladores` na barra de endereço (se pedir usuário e senha, use uma conta do PC que compartilha).
2. Dê dois cliques no `.exe`. A instalação é de um clique, sem administrador, e cria o atalho na Área de Trabalho.
3. Se aparecer "O Windows protegeu o computador": **Mais informações → Executar assim mesmo** (o instalador não é assinado).
4. Para atualizar, rode o `.exe` novo por cima: as configurações do app (como setores do pop-up) são mantidas.

**Cuidados:** o PC que compartilha precisa estar ligado e na mesma rede; se a pasta não abrir, confira se a **Descoberta de rede** está ativada. Não instale o primeiro `.exe` gerado antes do `.env`: ele roda em modo local, sem se conectar ao servidor.

---

## 4. Ligar os computadores (Supabase)

**O código já está pronto.** Sem o arquivo `.env` o app roda em *modo local* (como antes). Com o `.env` preenchido, ele passa a usar o Supabase: login de verdade, pagamentos num banco central e pop-up em tempo real entre PCs diferentes.

O que falta é só **você criar o projeto no Supabase** (conta sua) e preencher as chaves:

1. **Criar o projeto** em [supabase.com](https://supabase.com) (o plano gratuito basta para começar). Região sugerida: *South America (São Paulo)*. Guarde a senha do banco.
2. **Criar as tabelas e regras:** *SQL Editor → New query* → cole o conteúdo de cada arquivo de `supabase/migrations/`, **na ordem**, rodando um de cada vez (**Run**):
   1. `20261028120000_painel_pagamentos.sql` (tabelas, regras de acesso, tempo real)
   2. `20261028180000_cancelar_e_valor_diferente.sql` (cancelar envio e "valor diferente")
   3. `20261029100000_pagador_tipos_e_atendentes.sql` (nome do pagador, tipos e atendentes por setor). **A versão 0.4.0 do app precisa desta migração, e depois dela só a 0.4.0 (ou mais nova) consegue enviar pagamentos**: atualize o app em todos os PCs junto.
3. **Desligar o cadastro aberto:** *Authentication → Sign In / Providers* → desmarque **Allow new users to sign up**. (Importante: senão qualquer pessoa com a chave pública poderia criar conta.)
4. **Criar os 4 usuários de setor:** *Authentication → Users → Add user → Create new user*, marcando **Auto Confirm User**. Uma conta por setor, e a senha é a "senha do setor":

   | E-mail | Setor |
   |---|---|
   | `caixa@painel.app` | Caixa (Biga/Particular/Renata são escolhidos dentro do app) |
   | `cancelamento@painel.app` | Cancelamento |
   | `certidoes@painel.app` | Certidões |
   | `financeiro@painel.app` | Financeiro (recebe os pop-ups) |

   Use senhas fortes e diferentes entre si. O domínio `painel.app` é só um nome (não precisa existir); para mudar, altere também `supabase/criar_perfis.sql` e `VITE_EMAIL_DOMAIN`.
5. **Vincular usuário ↔ setor:** *SQL Editor* → cole `supabase/criar_perfis.sql` → **Run**. Deve listar **4 linhas**.
6. **Copiar as chaves:** *Project Settings → API* → copie a **Project URL** e a chave **anon / publishable**. **Nunca** use a `service_role`.
7. **Preencher o `.env`:** copie `.env.example` para `.env` e cole os valores. (O `.env` não vai para o Git. Em outro PC de desenvolvimento, refaça este passo.)
8. **Testar:** `npm run dev`. A tela de login **não** deve mostrar "modo local". Veja o checklist abaixo.
9. **Gerar o instalador:** `npm run dist` (as chaves são embutidas **na hora do build**, então o `.env` precisa estar preenchido antes). Instale o novo `.exe` em cada PC. As chaves `anon` são públicas por definição; quem protege os dados são as regras do passo 2 e as senhas.

> **Testando em um só computador:** o login fica salvo no navegador, então dois logins na **mesma janela/perfil** se atrapalham (o segundo derruba o primeiro). Use uma **janela anônima** (Ctrl+Shift+N) ou outro navegador para o segundo usuário. Com o app instalado e uma conta por PC isso não acontece.

### Checklist de teste com 2 computadores
- [ ] PC A entra como **Financeiro**, deixa "Ativado" e aceita as notificações.
- [ ] PC B entra como **Caixa → Renata** e envia R$ 10,00 (Custas CPFL).
- [ ] No PC A o pop-up aparece em poucos segundos, com som, e **não some** até clicar.
- [ ] Clicar "OK, recebido" no PC A: o PC B mostra "Confirmado" sozinho.
- [ ] Com **dois** PCs no Financeiro: clicar OK em um faz o pop-up sumir no outro.
- [ ] Fechar o app no PC A, enviar pelo PC B, reabrir o PC A: o pagamento pendente aparece (nada se perde).
- [ ] Desligar o Wi-Fi do PC A por 1 min e religar: volta a receber sem precisar reabrir.
- [ ] Entrar como Cancelamento: **não** enxerga pagamentos do Caixa.

### Regras de segurança (aplicadas no servidor, não só na tela)
- Cada setor só **cria** pagamentos do **próprio** setor e só **vê** os próprios.
- Só o **Financeiro** vê todos e só ele **confirma**; só o que está pendente; uma vez confirmado, não muda mais.
- Ninguém **apaga** nem **altera valor/tipo/setor** depois de criado.
- Quem confirmou e quando é gravado pelo **servidor** (`resolvido_por`, `resolvido_em`).
- No Caixa o atendente tem de ser Biga, Particular ou Renata; nos outros setores não há atendente.
- Usuário sem perfil não enxerga nada. O visitante sem login não lê nada.

### O que foi e o que NÃO foi testado
- ✅ O SQL (tabelas, regras, permissões) foi executado num Postgres em memória (PGlite) simulando o `auth.uid()` do Supabase: **9 testes de regras de acesso, todos passando** (rode com `npm test`). Esses testes já acharam e corrigiram 2 falhas antes de chegarem ao banco: pagamento do Caixa sem atendente passava, e uma política de "cancelar" que deixaria o caixa confirmar o próprio pagamento.
- ✅ O app em modo local foi testado no navegador (login, envio, valor `1.234,56`, pop-up persistente, confirmação).
- ⚠️ **Não testado contra um Supabase real:** login pelo Auth, tempo real (`postgres_changes`) e a configuração do projeto. O código segue a API oficial do `supabase-js`, mas rode o checklist acima antes de usar de verdade. Se algo falhar, a mensagem de erro aparece na tela.

### Problemas comuns
| Mensagem | Causa provável |
|---|---|
| "Senha incorreta." | Senha errada, ou e-mail do usuário diferente de `setor@VITE_EMAIL_DOMAIN` |
| "Usuário sem perfil de setor…" | Faltou rodar `supabase/criar_perfis.sql` (passo 5) |
| "Sem conexão com o servidor." | PC sem internet, ou `VITE_SUPABASE_URL` errada |
| Pop-up não chega em tempo real, mas aparece em até 30 s | Tabela fora da publicação `supabase_realtime` (*Database → Publications*); o app recarrega a cada 30 s como rede de segurança |
| App ainda mostra "modo local" | `.env` vazio/ausente na hora do `npm run dev` ou `npm run dist` |

### Limites atuais
- O Financeiro usa **uma conta compartilhada** (a confirmação grava essa conta, não a pessoa). Para saber *qual pessoa* confirmou, o próximo passo é uma conta por pessoa do financeiro (ver perguntas em aberto).
- A pesquisa de arquivos busca na tabela `arquivos` (hoje só com 8 exemplos). Falta **indexar os arquivos reais** (e, se quiser, guardá-los no Supabase Storage). Isso depende de onde estão hoje (pasta de rede, Drive…).
- Atualizar o app = instalar o novo `.exe` em cada PC (dá para automatizar depois com `electron-updater`).

### Antes de usar de verdade
- [ ] Senhas fortes nos 4 usuários e cadastro aberto **desligado** (passo 3).
- [ ] Rodar o checklist de 2 computadores acima.
- [ ] Backup: o plano gratuito do Supabase não tem backup automático; exporte periodicamente.
- [x] O setor que enviou é avisado na tela quando o financeiro confirma, não localiza ou acha valor diferente.
- [ ] Apagar os 8 arquivos de exemplo quando indexar os reais.

**Alternativa sem internet** (rede local apenas): um servidor Node + WebSocket em um PC da empresa, com o mesmo modelo de dados.

---

## 5. Estrutura do código

```
index.html            entrada
electron/main.cjs     app de desktop: janela, bandeja, janela por cima ao chegar pop-up
electron/preload.cjs  ponte segura entre o React e o Electron (window.desktop.alerta)
build/                ícone e script que embute o ícone no .exe
src/main.jsx          monta o React
src/dados.js          camada de dados: Supabase (login, pagamentos em tempo real, arquivos) ou modo local
src/supabase.js       cliente Supabase (lê o .env)
supabase/             SQL: migração (tabelas + regras) e criar_perfis.sql
.env.example          modelo das chaves (copiar para .env)
src/App.jsx           sessão, dados compartilhados, navegação e pop-up do financeiro
src/views/            telas: Login, Atendimento (caixa/cancelamento/certidões), Painel e Historico (financeiro), Arquivos
src/components/       Shell (menu lateral), PopUp, Logo, Icon, Toasts (avisos), ui (KPI, status, switch)
src/hooks.js          relógio dos cronômetros e tema claro/escuro
src/store.js          constantes (setores, operadores, tipos), formatação, exportação CSV
src/arquivos.js       dados de exemplo da pesquisa de arquivos (modo local)
src/styles.css        design system: cores da marca, tema escuro, animações, responsivo
build/make-icon.cjs   gera o ícone do app (npx electron build/make-icon.cjs)
```

Identidade visual (onde ajustar):
- **Cores da marca:** variáveis no topo de `src/styles.css` (`--marinho`, `--dourado`, tema escuro em `:root[data-tema='dark']`).
- **Logo:** `src/components/Logo.jsx` é uma recriação em texto/CSS da logo (nítida em qualquer tamanho). Para usar o arquivo de imagem oficial (idealmente SVG ou PNG em alta resolução), troque o conteúdo desse componente por um `<img>`.
- **Ícone do app (atalho/instalador):** hoje é um monograma "PS" provisório. Para usar o da empresa, substitua `build/icon.png` e `build/icon.ico` e rode `npm run dist`.
- **Fontes:** o app usa as fontes do Windows (Segoe UI) e Georgia/Palatino na logo, para funcionar sem internet.

Onde mexer para ajustar regras:
- Operadores do caixa / tipos de pagamento: `src/store.js` **e** o SQL (as regras também valem no servidor)
- Aparência e comportamento do pop-up: `PopUp` em `src/App.jsx`
- Intervalo do som (4 s): `setInterval(beep, 4000)` em `PopUp`

---

## 6. Trabalhando em mais de um computador

Recomendado usar **Git + GitHub** (repositório privado):

```bash
# no PC atual, dentro da pasta do projeto
git init
git add .
git commit -m "Protótipo painel de pagamentos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/painel-pagamentos.git
git push -u origin main
```

```bash
# em outro PC
git clone https://github.com/SEU_USUARIO/painel-pagamentos.git
cd painel-pagamentos
npm install
npm run dev
```

Antes de começar a mexer em qualquer PC: `git pull`. Ao terminar: `git add . && git commit -m "..." && git push`.

> O `.gitignore` já exclui `node_modules` e `dist`. Nunca suba arquivos `.env` com chaves.

---

## 7. Perguntas em aberto

1. O financeiro deve ter **mais de um usuário** (cada um com senha) ou uma senha única do setor?
2. Os setores Cancelamento e Certidões também terão **vários atendentes** como o Caixa?
3. Se dois do financeiro estiverem logados, o pop-up aparece para **ambos** e o primeiro clique resolve para todos? (protótipo: sim)
4. Os arquivos pesquisados já existem em algum lugar (pasta de rede, Drive)? Isso define como indexar.
5. Quer relatório/fechamento diário por setor e atendente?

---

Desenvolvido por **dev ribas**.
