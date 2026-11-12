# Acervo de Projetos

Acervo acadêmico responsivo para consultar projetos, cadastrar propostas e dar continuidade a trabalhos do IFSC. A interface consome a API própria em Node.js; o Supabase fornece autenticação, banco de dados e armazenamento de anexos, e o Google Gemini gera sugestões reais para a continuidade dos projetos.

## Executar em até 5 passos

1. Instale Node.js 22.12 ou superior, baixe o ZIP do repositório e extraia-o (ou clone o repositório e abra sua pasta no terminal).
2. Instale as dependências: `npm ci`.
3. Crie o arquivo de configuração: `Copy-Item .env.example .env.local` (PowerShell) e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `AI_API_KEY`.
4. Execute a aplicação: `npm run dev`. O comando inicia a API Node.js e o Vite.
5. Abra <http://localhost:8443/>. O catálogo de projetos já vem incluído; login, colaboração e imagens usam o Supabase configurado.

O assistente envia os campos descritivos do projeto ao Google Gemini somente quando o usuário solicita sugestões. `AI_API_KEY` é usada exclusivamente no servidor; nunca a coloque em uma variável `VITE_*`. O arquivo `.env.local` não deve ser enviado ao GitHub.

## Problema e impacto esperado

Projetos desenvolvidos em disciplinas podem ficar difíceis de encontrar e retomar depois que a turma conclui o trabalho. O acervo organiza objetivos, resultados, recursos, anexos e versões em fichas pesquisáveis para facilitar o compartilhamento e a continuidade. O assistente usa esses dados para propor próximos passos específicos, que a equipe pode avaliar e incluir no plano de uma nova versão.

### Configurar um Supabase próprio

- Crie um projeto Supabase, execute `supabase-schema.sql` no **SQL Editor** e defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local`.
- Para importar o catálogo, execute `npm run seed:supabase` em um terminal interativo e autentique-se com uma conta IFSC. O comando importa os metadados; arquivos binários de imagens não são distribuídos no repositório. No banco já usado pelo projeto, os 36 projetos e as 32 imagens estão carregados.
- As políticas de acesso do Supabase mantêm leitura pública e restringem alterações às contas autorizadas. Não use chaves `secret` ou `service_role` no navegador.

## API e arquitetura

- `GET /api/health`: estado da API e indicação se a chave de IA está configurada.
- `GET /api/projects`: consulta os projetos atuais no Supabase; sem Supabase configurado, serve o catálogo JSON versionado como modo local.
- `POST /api/ai/suggestions`: recebe os dados do projeto, consulta o Google Gemini e devolve quatro sugestões validadas em JSON. Erros de configuração e do provedor são exibidos ao usuário; não há respostas simuladas.
- `POST /api/ai/chat`: recebe o contexto do projeto, as sugestões geradas e até oito mensagens recentes; devolve uma resposta em texto. O chat limita cada mensagem do usuário a 1.200 caracteres, o histórico a 6.000 caracteres, a resposta a 300 tokens e cada endereço IP a 10 solicitações por hora. A cota é mantida em memória e reinicia quando o processo da API reinicia.
- A conversa contextual fica na aba **Conversar sobre o projeto** do Assistente de projetos; o histórico não é salvo e a chave do Gemini permanece no servidor.
- `src/api.ts` contém as chamadas assíncronas feitas pelo front-end. A chave do Gemini permanece no servidor. As demais ações autenticadas usam Supabase com as políticas RLS definidas no esquema.
- As imagens são servidas pelo Supabase Storage; não são copiadas para o bundle ou para a API estática.
- O manifesto versionado contém 36 projetos. O endpoint do banco inclui também projetos cadastrados posteriormente.

## Publicação

- Para hospedar em um ambiente Node.js, defina `NODE_ENV=production`, `PORT`, as variáveis do Supabase, `AI_API_URL` e `AI_API_KEY`; configure `CORS_ORIGINS` se o front-end e a API usarem domínios diferentes. Ative `TRUST_PROXY=true` apenas se a hospedagem fornecer `X-Forwarded-For` corretamente. `npm start` cria o build e inicia o servidor que atende o site e as rotas `/api`.
- Na Hostinger, use o preset **Express** com Node.js 22 e o arquivo de entrada `server.js`. O ZIP de implantação deve incluir o `dist/` já gerado pelo build; `npm start` executa o build automaticamente, mas o ponto de entrada `server.js` inicia a aplicação sem recompilar.
- O servidor envia HSTS em produção, bloqueia incorporação em frames e limita referrer e permissões do navegador. A política CSP existente da hospedagem força HTTPS; o app acrescenta `frame-ancestors 'none'`.
- Se o front-end ficar em hospedagem estática, configure `VITE_API_URL` antes do build para apontar ao servidor Node.js e inclua o domínio do site em `CORS_ORIGINS` no servidor.
- O upload apenas de `dist/` para hospedagem estática **não** hospeda a API Node nem habilita a IA. A hospedagem deve oferecer Node.js ou apontar para uma API Node publicada separadamente.

## Validação

- `npm run build` gera os arquivos estáticos do site e o catálogo JSON de contingência.
- `npx tsc --noEmit` verifica os tipos TypeScript.
- `npm start` inicia o servidor de produção localmente depois do build.
