-- Painel de Pagamentos — cancelar envio e "valor diferente"
-- Rode no Supabase DEPOIS da migração 20261028120000: SQL Editor > New query > colar tudo > Run.
--
-- Novos status:
--   cancelado : o próprio setor desiste enquanto o pagamento ainda aguarda conferência
--   divergente: o financeiro achou no banco um valor diferente do informado (guarda o valor achado)

alter table public.pagamentos add column valor_conferido numeric(12, 2);

-- Troca a regra de status (procura pelo conteúdo, para não depender do nome automático)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.pagamentos'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%''pendente''%'
  loop
    execute format('alter table public.pagamentos drop constraint %I', c);
  end loop;
end
$$;

alter table public.pagamentos add constraint pagamentos_status_check
  check (status in ('pendente', 'confirmado', 'nao_recebido', 'cancelado', 'divergente'));

-- O valor achado no banco só existe (e é obrigatório) quando o status é "divergente"
alter table public.pagamentos add constraint valor_conferido_coerente check (
  (status = 'divergente' and valor_conferido is not null and valor_conferido > 0 and valor_conferido <> valor)
  or (status <> 'divergente' and valor_conferido is null)
);

-- ATENÇÃO: em políticas permissivas, o WITH CHECK de TODAS as políticas de UPDATE é somado com "OU",
-- mesmo para quem só passou pelo USING de outra. Por isso cada WITH CHECK repete a regra de quem pode.

-- Financeiro: confirma, não localiza ou registra valor diferente — só o que ainda está pendente
drop policy "financeiro confirma" on public.pagamentos;
create policy "financeiro confere" on public.pagamentos
  for update to authenticated
  using (public.meu_setor() = 'financeiro' and status = 'pendente')
  with check (public.meu_setor() = 'financeiro' and status in ('confirmado', 'nao_recebido', 'divergente'));

-- Cada setor pode cancelar o que enviou, enquanto ainda estiver pendente (nunca depois de conferido)
create policy "setor cancela o proprio" on public.pagamentos
  for update to authenticated
  using (setor = public.meu_setor() and status = 'pendente')
  with check (setor = public.meu_setor() and status = 'cancelado');

grant update (status, valor_conferido) on public.pagamentos to authenticated;
-- (quem cancelou/conferiu e quando continua sendo gravado pelo gatilho registrar_resolucao)
