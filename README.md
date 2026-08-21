# Controller — Gestão de Condutores e Frota

Aplicativo web (mobile first) para o condutor registrar jornada, abastecimento, manutenção, EPI e comprovantes, com relatórios e indicadores para o administrador.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (banco, autenticação e storage) · pronto para PWA.

---

## Rodando sem configurar nada (modo demonstração)

Sem as variáveis do Supabase o app sobe com dados de exemplo salvos no navegador — serve para navegar por todas as telas antes de criar o banco.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` e entre com:

| Login | Perfil |
|---|---|
| `antonio.campos` | Condutor |
| `marina.souza` | Administrador |
| `jose.andrade` | Supervisão (ocorrências) |

Qualquer senha funciona no modo demonstração.

---

## Configurando o Supabase (dados reais)

### 1. Criar o projeto

Em supabase.com, crie um projeto (região São Paulo). Guarde a senha do banco.

### 2. Criar as tabelas

**SQL Editor › New query** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.

Isso cria: `users`, `drivers`, `vehicles`, `journeys`, `fuel_records`, `maintenance_records`, `epi_records`, `attachments`, as regras de acesso (RLS) e o bucket `attachments` do storage.

Em seguida, rode também `supabase/schema_ocorrencias.sql` — ele acrescenta o módulo de ocorrências (perfil Supervisão): tabelas `occurrences` e `operation_catalog`, o papel `supervisor` e as permissões desse módulo. É aditivo e pode ser rodado depois, sem mexer no que já existe.

### 3. Fechar o autocadastro e desligar a confirmação de e-mail

Em **Authentication › Providers › Email**:

- desligue **Confirm email** — o e-mail é montado a partir do login (`antonio.campos` → `antonio.campos@empresa.com.br`) e não é uma caixa real;
- desligue **Allow new users to sign up** — quem cria acesso é o gestor, dentro do app.

### 4. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores de **Project Settings › API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_LOGIN_DOMAIN=empresa.com.br
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # secreta, só no servidor
```

A `anon key` pode ficar no cliente — quem protege os dados é o RLS. Já a **`SUPABASE_SERVICE_ROLE_KEY` é secreta**: fica só no servidor (sem prefixo `NEXT_PUBLIC`), e é o que permite ao gestor criar usuários e redefinir senhas pelas rotas `/api/acessos`. Nunca a coloque no cliente nem no repositório.

### 5. Primeiro gestor

Como não há autocadastro, o primeiro usuário nasce no painel: **Authentication › Users › Add user**, com e-mail `seu.login@empresa.com.br`, uma senha e a opção *Auto Confirm* marcada. Depois, no SQL Editor:

```sql
update public.users set role = 'admin' where email = 'seu.login@empresa.com.br';
```

Daí em diante, todos os outros acessos são criados por ele em **Mais › Acessos**.

---

## Publicando no Replit

1. No Replit: **Create Repl › Import from GitHub** (ou faça upload da pasta).
2. Em **Tools › Secrets**, adicione `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LOGIN_DOMAIN` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Clique em **Run** — o `.replit` do repositório já aponta para `npm run dev` na porta 3000.
4. Para publicar de verdade, use **Deploy** (o `.replit` já traz `build`/`start` configurados como autoscale).

> Variáveis `NEXT_PUBLIC_*` são lidas na hora do build. Se mudar um Secret depois de publicar, refaça o deploy.

## Publicando no GitHub

```bash
git init
git add .
git commit -m "Controller: app de gestão de frota"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/controller.git
git push -u origin main
```

O `.gitignore` já exclui `node_modules`, `.next` e `.env.local`.

## Publicando na Vercel (opcional)

Importar o repositório, adicionar as três variáveis de ambiente e fazer deploy. Nenhum ajuste extra é necessário.

---

## Estrutura

```
src/
  app/
    login/                 tela de acesso
    (app)/                 área autenticada (com a barra inferior)
      home/                dashboard: jornada, último abastecimento, resumo, alertas
      jornada/             iniciar / finalizar jornada + histórico
      abastecimento/       registro com cálculo automático de consumo
      manutencao/          registro de serviços
      relatorios/          filtros, indicadores, gráficos e exportação
      ocorrencias/         registro disciplinar (perfil Supervisão)
      mais/                perfil, EPI, veículos, condutores, operação, acessos
    api/acessos/         rotas de servidor: criar usuário e redefinir senha
  components/              UI, navegação, gráficos, anexos
  lib/
    api.ts                 camada de dados (Supabase ou modo demonstração)
    alertas.ts             regras de consumo anormal e pendências
    ocorrencia.ts          texto do WhatsApp e utilidades do módulo
    demo.ts                dados de exemplo
    format.ts              formatação pt-BR e períodos
    modulos.tsx            cor, ícone e frase de cada tela
    servidor.ts            cliente admin do Supabase (somente servidor)
    types.ts               tipos do domínio
supabase/schema.sql              banco + RLS + storage
supabase/schema_ocorrencias.sql  módulo de ocorrências (rodar depois)
```

## Módulo de Ocorrências (perfil Supervisão)

Voltado ao supervisor de operação, que hoje registra ocorrências disciplinares por mensagem no WhatsApp. O app estrutura os mesmos campos, guarda no banco e devolve o texto pronto para encaminhar.

O supervisor preenche data, horário, terminal, consorciada, linha, veículo, matrícula do motorista, posição, motivo e descrição. Os códigos aceitam digitação livre com sugestões do cadastro — um valor novo é memorizado e vira sugestão na próxima vez.

A prévia da mensagem é montada enquanto se digita, no mesmo formato usado no grupo. Depois de salvar, há botão para copiar o texto e para abrir o WhatsApp já preenchido — o destino é escolhido na hora, porque o WhatsApp não permite postar direto em um grupo por link. Em **Mais › Envio no WhatsApp** dá para fixar um número de destino.

Cadastros de linhas, terminais, consorciadas, veículos, motoristas e motivos ficam em **Mais › Operação**, com importação em lote (colar da planilha ou carregar `.csv`/`.txt`, um por linha, no formato `codigo` ou `codigo;nome`).

## Regras de cálculo

**Km rodado da jornada** = km final − km inicial (a coluna `km_total` é gerada pelo próprio banco).

**Abastecimento** — o condutor informa apenas o km atual. O app busca o último abastecimento do mesmo veículo e calcula:

```
distância  = km atual − km do abastecimento anterior
consumo    = distância / litros
preço/L    = valor total / litros
```

O modelo pressupõe tanque completo a cada abastecimento.

**Consumo fora do padrão** — a referência é a **mediana** dos consumos anteriores do veículo (mais estável que a média contra um lançamento errado). Diferença acima de 20% gera alerta mostrando consumo atual, média histórica e o percentual. O registro nunca é bloqueado.

**Custo por km** = (combustível + manutenção) ÷ km do período.

## Acessos e senhas

Não existe autocadastro. O gestor abre **Mais › Acessos** e cria cada usuário informando login, nome, perfil (condutor, supervisão ou gestor) e uma senha inicial — que ele entrega à pessoa. Criar um acesso de condutor já gera a ficha dele em Condutores, com matrícula e telefone.

Se alguém esquecer a senha, o gestor redefine na mesma tela (botão **senha** ao lado do usuário). O usuário não troca a própria senha e não há recuperação por e-mail, já que o endereço é montado a partir do login.

Por baixo, as rotas `/api/acessos` e `/api/acessos/senha` rodam no servidor, conferem pelo token que quem chamou é mesmo um gestor e só então usam a service role key do Supabase.

O primeiro gestor precisa ser criado à mão, já que ainda não há ninguém para criá-lo: em **Authentication › Users › Add user** no painel do Supabase (marque *Auto Confirm*), e depois `update public.users set role = 'admin' where email = '...';`.

## Permissões

| | Condutor | Supervisão | Administrador |
|---|---|---|---|
| Jornada, abastecimento, manutenção, EPI | próprios | não vê | todos |
| Anexar comprovantes | sim | — | sim |
| Ocorrências | não vê | as próprias | todas |
| Cadastros da operação | não | sim | sim |
| Cadastrar veículos e condutores | não | não | sim |
| Relatórios de toda a frota | não | só ocorrências | sim |
| Criar acesso e redefinir senha | não | não | sim |

As regras valem no banco, via RLS — não dependem da interface.

## PWA

`public/manifest.webmanifest` e os ícones já estão prontos: no celular, "Adicionar à tela de início" instala o app sem barra do navegador. Para funcionamento offline, adicione um service worker (ex.: `next-pwa`) — o restante da estrutura já suporta.

## Próximos passos sugeridos

- Service worker com fila de envio offline
- Exportação em PDF pelo servidor (hoje é a impressão do navegador)
- Alerta de manutenção preventiva por intervalo de km configurável
- Checklist de saída com foto do veículo
