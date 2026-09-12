# LoanControl

Sistema modular de gestão de empréstimos com Next.js, TypeScript, Tailwind e Supabase.

## Instalação
1. Instale Node.js LTS.
2. Execute `npm install`.
3. Copie `.env.local.example` para `.env.local`.
4. Preencha as variáveis do Supabase.
5. Execute as migrations em `supabase/migrations` no SQL Editor do Supabase, na ordem.
6. Execute `npm run dev`.
7. Abra `http://localhost:3000`.

## Produção
Configure as variáveis na Vercel e execute `npm run build`.

## Segurança
Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador. Revise as políticas RLS antes de produção.

## Estado desta entrega
A versão inicial inclui arquitetura modular, autenticação, dashboard, clientes, simulador, empréstimos e base financeira/RLS. Algumas páginas de módulos avançados estão estruturadas como base para a próxima implementação.
