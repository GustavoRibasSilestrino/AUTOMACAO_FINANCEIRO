-- Painel de Pagamentos — nome do pagador, tipos por setor e atendentes por setor
-- Rode no Supabase DEPOIS das migrações anteriores: SQL Editor > New query > colar tudo > Run.
--
-- ATENÇÃO: depois desta migração o nome do pagador passa a ser obrigatório, então só o app
-- versão 0.4.0 (ou mais nova) consegue enviar pagamentos. Atualize o app nos PCs junto com esta migração.
--
-- Pagamentos antigos (de teste) não são alterados nem apagados: as regras novas de tipo e de
-- atendente valem só para os novos (NOT VALID); os antigos ficam com pagador "(não informado)".

-- Nome do pagador (obrigatório, de 2 a 120 caracteres)
alter table public.pagamentos add column pagador text;
update public.pagamentos set pagador = '(não informado)' where pagador is null;
alter table public.pagamentos alter column pagador set not null;
alter table public.pagamentos add constraint pagador_valido check (length(btrim(pagador)) between 2 and 120);
grant insert (pagador) on public.pagamentos to authenticated;

-- Atendentes: Caixa (Biga, Particular, Renata), Cancelamento (Murilo, Luís), Certidões (Depósitos).
-- Todo pagamento precisa do atendente do próprio setor.
alter table public.pagamentos drop constraint operador_so_no_caixa;
alter table public.pagamentos add constraint operador_do_setor check (
  (setor = 'caixa' and operador is not null and operador in ('Biga', 'Particular', 'Renata'))
  or (setor = 'cancelamento' and operador is not null and operador in ('Murilo', 'Luís'))
  or (setor = 'certidoes' and operador is not null and operador = 'Depósitos')
) not valid;

-- Tipos por setor: Certidões só envia "Certidão"; Cancelamento só "Taxa de cancelamento"; Caixa os 4.
alter table public.pagamentos add constraint tipo_do_setor check (
  setor = 'caixa'
  or (setor = 'cancelamento' and tipo = 'Taxa de cancelamento')
  or (setor = 'certidoes' and tipo = 'Certidão')
) not valid;
