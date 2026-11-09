# Acervo de Projetos

Acervo acadêmico responsivo para consultar projetos, cadastrar novas propostas e dar continuidade a trabalhos do IFSC. A API Node local foi removida: o catálogo público é gerado como JSON estático e as operações autenticadas usam o Supabase diretamente.

## Instalação em até 5 passos

1. Instale o Node.js 22.12 ou superior e baixe o repositório pelo botão **Code → Download ZIP** no GitHub (ou use `git clone https://github.com/Eduardodev3113/Acervo-De-Projetos.git`).
2. Extraia o ZIP, abra a pasta do projeto no terminal e instale os módulos com `npm ci`.
3. Para habilitar login, cadastro e colaboração, crie um projeto Supabase, abra **SQL Editor** e execute `supabase-schema.sql`. O catálogo de leitura funciona sem essa configuração.
4. Copie `.env.example` para `.env.local` (`Copy-Item .env.example .env.local` no PowerShell) e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Se o banco já contém os projetos e imagens, não é necessário executar o seed; para preencher um banco vazio, `npm run seed:supabase` requer os arquivos de imagem locais, que não são distribuídos no GitHub.
5. Execute `npm run dev` e abra <http://localhost:8443/>.

O arquivo `.env.local` é local e não deve ser enviado ao GitHub nem publicado. A chave publishable pode estar no front-end; nunca use uma chave `secret` ou `service_role`.

## Catálogo de projetos

- O acervo inclui 36 projetos: os 27 registros existentes e 9 projetos identificados nos arquivos Jackson. Os documentos repetidos foram consolidados; nomes de integrantes não foram copiados para o catálogo.
- As imagens dos projetos são carregadas do Supabase Storage; os arquivos de imagem não são incluídos no repositório nem no build do site.
- `supabase/seed/projects.json` fornece os metadados do catálogo. `npm run dev` e `npm run build` geram `public/api/projects.json` sem copiar imagens.
- Depois do build, o catálogo público somente de leitura fica em `dist/api/projects.json` (GET); as imagens exibidas no site vêm dos registros do Supabase e não desse JSON.
- O JSON é um snapshot dos 36 projetos versionados no repositório. Projetos cadastrados depois no Supabase aparecem no site quando online, mas não são exportados automaticamente para esse snapshot.
- As sugestões do assistente são montadas localmente no navegador; nenhum conteúdo do projeto é enviado a um provedor de IA.

Sem `.env.local`, o site permite consultar os metadados do catálogo incluído no código, mas não exibe as imagens armazenadas no Supabase. Login, cadastro, anexos, continuidade e histórico requerem um projeto Supabase configurado.

## Publicação estática na Hostinger

1. Configure as variáveis Supabase em `.env.local` se for habilitar as funções colaborativas.
2. Execute `npm ci` e depois `npm run build`.
3. No hPanel, abra o Gerenciador de Arquivos do domínio e envie **o conteúdo de `dist/`** para `public_html/` (não envie `.env.local`).
4. Acesse o domínio e confirme que o catálogo e `/api/projects.json` estão disponíveis.

## Validação

- `npm run build` gera o site e o catálogo de leitura.
- `npx tsc --noEmit` verifica os tipos TypeScript.
