-- Painel de Pagamentos — esquema inicial
-- Rode no Supabase: SQL Editor > New query > colar tudo > Run
-- (ou `supabase db push` se usar a CLI).

-- ---------------------------------------------------------------- perfis ----
-- Liga cada usuário do Supabase Auth a um setor. É criado por supabase/criar_perfis.sql
-- (depois de criar os 4 usuários), nunca pelo próprio usuário.
create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  setor   text not null check (setor in ('caixa', 'cancelamento', 'certidoes', 'financeiro'))
);
alter table public.perfis enable row level security;

create policy "ver o proprio perfil" on public.perfis
  for select to authenticated using (user_id = auth.uid());
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;

-- Setor de quem está logado (security definer para ler perfis sem depender da RLS dele)
create function public.meu_setor() returns text
  language sql stable security definer set search_path = public as
$$ select setor from public.perfis where user_id = auth.uid() $$;

revoke all on function public.meu_setor() from public, anon;
grant execute on function public.meu_setor() to authenticated;

-- ------------------------------------------------------------ pagamentos ----
create table public.pagamentos (
  id            uuid primary key default gen_random_uuid(),
  setor         text not null check (setor in ('caixa', 'cancelamento', 'certidoes')),
  operador      text,
  tipo          text not null check (tipo in
                  ('Título em aberto', 'Certidão', 'Taxa de cancelamento', 'Custas CPFL')),
  valor         numeric(12, 2) not null check (valor > 0),
  status        text not null default 'pendente'
                  check (status in ('pendente', 'confirmado', 'nao_recebido')),
  criado_em     timestamptz not null default now(),
  criado_por    uuid not null default auth.uid() references auth.users (id),
  resolvido_por uuid references auth.users (id),
  resolvido_em  timestamptz,
  -- Só o Caixa tem atendentes; os outros setores não informam operador
  constraint operador_so_no_caixa check (
    (setor = 'caixa' and operador is not null and operador in ('Biga', 'Particular', 'Renata'))
    or (setor <> 'caixa' and operador is null)
  )
);
create index pagamentos_status_criado_idx on public.pagamentos (status, criado_em);

alter table public.pagamentos enable row level security;

-- Financeiro vê tudo; cada setor vê só o que enviou
create policy "ler pagamentos" on public.pagamentos
  for select to authenticated
  using (public.meu_setor() = 'financeiro' or setor = public.meu_setor());

-- Setores só criam pagamentos do próprio setor, sempre pendentes
create policy "criar pagamento do proprio setor" on public.pagamentos
  for insert to authenticated
  with check (setor = public.meu_setor() and status = 'pendente'
              and resolvido_por is null and resolvido_em is null);

-- Só o financeiro confirma, e só o que ainda está pendente
create policy "financeiro confirma" on public.pagamentos
  for update to authenticated
  using (public.meu_setor() = 'financeiro' and status = 'pendente')
  with check (status in ('confirmado', 'nao_recebido'));

-- Permissões por coluna: ninguém altera valor/tipo/setor depois de criado, ninguém apaga
revoke all on public.pagamentos from anon, authenticated;
grant select on public.pagamentos to authenticated;
grant insert (setor, operador, tipo, valor) on public.pagamentos to authenticated;
grant update (status) on public.pagamentos to authenticated;

-- Quem confirmou e quando é preenchido pelo servidor (não confia no app)
create function public.registrar_resolucao() returns trigger
  language plpgsql as
$$
begin
  if new.status <> old.status then
    new.resolvido_por := auth.uid();
    new.resolvido_em  := now();
  end if;
  return new;
end
$$;
create trigger pagamentos_resolucao before update on public.pagamentos
  for each row execute function public.registrar_resolucao();

-- Tempo real: o app do financeiro recebe os novos pagamentos na hora
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.pagamentos;
  end if;
end
$$;

-- --------------------------------------------------------------- arquivos ----
create table public.arquivos (
  id      bigint generated always as identity primary key,
  nome    text not null,
  setor   text not null check (setor in ('caixa', 'cancelamento', 'certidoes')),
  data    date not null default current_date,
  caminho text  -- futuro: caminho no Supabase Storage ou na pasta de rede
);
alter table public.arquivos enable row level security;
create policy "ler arquivos" on public.arquivos for select to authenticated using (true);
revoke all on public.arquivos from anon, authenticated;
grant select on public.arquivos to authenticated;

-- Dados de exemplo (apague quando indexar os arquivos reais)
insert into public.arquivos (nome, setor, data) values
  ('Certidão de inteiro teor - Matrícula 1234.pdf',        'certidoes',    '2026-10-20'),
  ('Certidão negativa - João da Silva.pdf',                'certidoes',    '2026-10-22'),
  ('Requerimento de cancelamento - Protocolo 8891.pdf',    'cancelamento', '2026-10-25'),
  ('Comprovante taxa de cancelamento - Maria Souza.pdf',   'cancelamento', '2026-10-26'),
  ('Recibo caixa - Título 55231.pdf',                      'caixa',        '2026-10-27'),
  ('Guia custas CPFL - Outubro.pdf',                       'caixa',        '2026-10-27'),
  ('Relatório de caixa - 27-10.xlsx',                      'caixa',        '2026-10-27'),
  ('Título protestado - Empresa XYZ.pdf',                  'caixa',        '2026-10-15');
