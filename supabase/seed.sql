-- Seed opcional: crie usuários pelo Supabase Auth e depois vincule-os a uma empresa em company_users.
-- Não execute este arquivo em produção sem revisar os dados.
insert into companies(name) values ('Empresa Demonstração') on conflict do nothing;
