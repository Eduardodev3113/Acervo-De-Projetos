# Acervo de Projetos

Aplicação web para consultar, registrar e dar continuidade a projetos acadêmicos. O front-end React consome a API própria em Node.js; o Supabase fornece autenticação, banco de dados e armazenamento de imagens; a API de IA gera sugestões reais para os projetos.

## Como executar

1. **Instale o Node.js 22.12 ou superior** e, na pasta clonada, instale as dependências com `npm ci`. O arquivo `.nvmrc` informa a versão mínima recomendada e `package-lock.json` fixa as dependências do projeto.
2. **Configure o Supabase:** copie `.env.example` para `.env.local` (no PowerShell: `Copy-Item .env.example .env.local`) e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto Supabase do acervo. Se `.env.local` já existir, edite-o sem substituir os valores existentes. Não compartilhe nem versione esse arquivo.
3. **Prepare o banco apenas se necessário:** no painel desse mesmo projeto Supabase, execute `supabase-schema.sql` pelo SQL Editor para criar ou atualizar tabelas, permissões, auditoria e o bucket público de anexos. Para acessar os projetos e imagens já publicados, use as credenciais do Supabase compartilhado do acervo; criar outro projeto Supabase e executar somente o schema não copia os registros nem os arquivos. O login da aplicação usa e-mail e senha de uma conta institucional do IFSC.
4. **Habilite a IA real:** preencha `AI_API_KEY` em `.env.local` com uma chave de provedor compatível com a API Chat Completions. `AI_API_URL`, `AI_MODEL` e `AI_FALLBACK_MODEL` já têm valores de exemplo em `.env.example` e podem ser ajustados conforme o provedor. A chave é lida apenas pelo servidor e não deve ser enviada ao GitHub. Sem chave, a aplicação informa que a IA não está configurada e não apresenta sugestões simuladas.
5. **Inicie a aplicação** com `npm run dev` e abra <http://localhost:8443/>. O comando inicia o front-end e a API própria; a API fica disponível em `http://localhost:3002`.

## Dados e imagens publicados

Os projetos e anexos ficam no Supabase, fora do repositório. A cópia clonada exibe os mesmos dados e imagens quando configurada com o projeto Supabase compartilhado do acervo. Não é necessário enviar as imagens novamente. Uma nova instância Supabase começa sem esses registros e arquivos; o schema cria a estrutura, mas não é uma cópia de segurança dos dados.

## Validação

`npm run build` valida a compilação de produção. `npx tsc --noEmit` verifica os tipos TypeScript. A funcionalidade de sugestões de IA exige credenciais válidas do provedor.
