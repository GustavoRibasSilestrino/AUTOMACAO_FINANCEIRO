-- Painel de Pagamentos — quem do Financeiro conferiu (Carlos, Adriana ou Gilmara)
-- Rode no Supabase DEPOIS das migrações anteriores: SQL Editor > New query > colar tudo > Run.
--
-- ATENÇÃO: o app versão 0.4.2 (ou mais nova) envia o nome de quem conferiu; sem esta migração,
-- confirmar/não localizar/valor diferente dá erro. Rode a migração junto com a atualização do app.

alter table public.pagamentos add column conferido_por text;

-- Só aceita os 3 nomes, e só quando o Financeiro conferiu (nunca num pagamento pendente ou cancelado)
alter table public.pagamentos add constraint conferido_por_valido check (
  conferido_por is null
  or (conferido_por in ('Carlos', 'Adriana', 'Gilmara') and status in ('confirmado', 'nao_recebido', 'divergente'))
);

grant update (conferido_por) on public.pagamentos to authenticated;
