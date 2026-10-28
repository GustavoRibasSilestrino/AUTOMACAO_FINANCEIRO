-- Rode UMA vez, DEPOIS de criar os 4 usuários em Authentication > Users:
--   caixa@painel.app · cancelamento@painel.app · certidoes@painel.app · financeiro@painel.app
-- (se usar outro domínio, troque aqui E em VITE_EMAIL_DOMAIN no arquivo .env)

insert into public.perfis (user_id, setor)
select id, split_part(email, '@', 1)
from auth.users
where email in (
  'caixa@painel.app',
  'cancelamento@painel.app',
  'certidoes@painel.app',
  'financeiro@painel.app'
)
on conflict (user_id) do nothing;

-- Conferência: deve listar 4 linhas
select u.email, p.setor
from public.perfis p join auth.users u on u.id = p.user_id
order by p.setor;
