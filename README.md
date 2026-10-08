# Acervo De Projeos

## Como executar

1. Instale o Node.js 22.12 ou superior e execute `npm install`.
2. Crie ou complete `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; não substitua valores existentes.
3. No SQL Editor do Supabase, execute `supabase-schema.sql` para criar tabelas, políticas e funções de reserva.
4. Configure `AI_API_URL`, `AI_API_KEY` e `AI_MODEL` em `.env.local` usando um provedor compatível com a API de Chat Completions. A chave fica somente no servidor.
5. Execute `npm run dev` e abra `http://localhost:8443/`. O comando inicia a interface e a API própria em conjunto.

Sem `AI_API_KEY`, o endpoint de IA retorna um aviso de configuração e não mostra sugestões simuladas.
Se o modelo principal exceder o tempo limite ou responder HTTP 429/503, a API tenta `AI_FALLBACK_MODEL` (por padrão, `gemini-3.1-flash-lite`).

