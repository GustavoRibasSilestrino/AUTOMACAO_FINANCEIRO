// Regras de acesso do banco (RLS), rodando as migrações num Postgres em memória (PGlite).
// Simula o que o Supabase fornece (roles anon/authenticated e auth.uid()).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const pasta = new URL('../supabase/', import.meta.url)
const db = new PGlite()
const U = {}

const como = async (id, role = 'authenticated') => {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
  await db.exec(`set role ${role}`)
}
const inserir = (setor, operador, tipo = 'Certidão', valor = 10, pagador = 'Maria da Silva') =>
  db.query('insert into pagamentos(setor, operador, tipo, valor, pagador) values ($1,$2,$3,$4,$5) returning id',
    [setor, operador, tipo, valor, pagador]).then((r) => r.rows[0].id)
const contar = async (sql) => Number((await db.query(sql)).rows[0].n)
const atualizar = async (sql) => (await db.query(sql)).rows.length

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `)
  for (const f of readdirSync(new URL('migrations/', pasta)).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(`migrations/${f}`, pasta), 'utf8'))
  }
  for (const s of ['caixa', 'cancelamento', 'certidoes', 'financeiro', 'intruso'])
    await db.query('insert into auth.users(email) values ($1)', [`${s}@painel.app`])
  await db.exec(readFileSync(new URL('criar_perfis.sql', pasta), 'utf8'))
  for (const s of ['caixa', 'cancelamento', 'certidoes', 'financeiro', 'intruso'])
    U[s] = (await db.query('select id from auth.users where email=$1', [`${s}@painel.app`])).rows[0].id
})

test('cada usuário recebe o perfil do setor (o intruso fica sem perfil)', async () => {
  assert.equal(await contar('select count(*) n from perfis'), 4)
})

test('criar: só do próprio setor, sempre pendente, com regras de atendente/tipo/valor', async () => {
  await como(U.caixa)
  await inserir('caixa', 'Biga', 'Custas CPFL', 150.5)
  await assert.rejects(inserir('cancelamento', null), 'outro setor')
  await assert.rejects(inserir('caixa', 'Fulano'), 'atendente inválido')
  await assert.rejects(inserir('caixa', null), 'caixa exige atendente')
  await assert.rejects(inserir('caixa', 'Renata', 'Outro'), 'tipo inválido')
  await assert.rejects(inserir('caixa', 'Renata', 'Certidão', -1), 'valor negativo')
  await assert.rejects(db.query(
    "insert into pagamentos(setor,operador,tipo,valor,pagador,status) values ('caixa','Biga','Certidão',5,'Maria','confirmado')"),
  'status definido no insert')
  await como(U.cancelamento)
  await inserir('cancelamento', 'Murilo', 'Taxa de cancelamento', 80)
  await assert.rejects(inserir('cancelamento', 'Biga', 'Taxa de cancelamento', 80), 'atendente de outro setor')
  await assert.rejects(inserir('cancelamento', null, 'Taxa de cancelamento', 80), 'cancelamento exige atendente')
  await como(U.financeiro)
  await assert.rejects(inserir('caixa', 'Biga'), 'financeiro não cria')
})

test('ler: cada setor vê só os seus; financeiro vê todos; sem perfil e anônimo não veem nada', async () => {
  await como(U.caixa)
  assert.equal(await contar('select count(*) n from pagamentos'), 1)
  await como(U.cancelamento)
  assert.equal(await contar('select count(*) n from pagamentos'), 1)
  await como(U.financeiro)
  assert.equal(await contar('select count(*) n from pagamentos'), 2)
  await como(U.intruso)
  assert.equal(await contar('select count(*) n from pagamentos'), 0)
  await assert.rejects(inserir('caixa', 'Biga'))
  await como(null, 'anon')
  for (const t of ['pagamentos', 'arquivos', 'perfis'])
    await assert.rejects(contar(`select count(*) n from ${t}`), `anônimo lendo ${t}`)
})

test('tipos por setor: Caixa envia os 4; Cancelamento só taxa; Certidões só certidão', async () => {
  await como(U.caixa)
  for (const t of ['Título em aberto', 'Custas CPFL', 'Certidão', 'Taxa de cancelamento'])
    await inserir('caixa', 'Particular', t, 15)
  await como(U.cancelamento)
  await inserir('cancelamento', 'Luís', 'Taxa de cancelamento', 90)
  for (const t of ['Título em aberto', 'Custas CPFL', 'Certidão'])
    await assert.rejects(inserir('cancelamento', 'Murilo', t), `cancelamento enviando ${t}`)
  await como(U.certidoes)
  await inserir('certidoes', 'Depósitos', 'Certidão', 60)
  for (const t of ['Título em aberto', 'Custas CPFL', 'Taxa de cancelamento'])
    await assert.rejects(inserir('certidoes', 'Depósitos', t), `certidões enviando ${t}`)
  await assert.rejects(inserir('certidoes', 'Murilo', 'Certidão'), 'atendente de outro setor')
})

test('nome do pagador é obrigatório (2 a 120 letras, sem só espaços)', async () => {
  await como(U.caixa)
  await inserir('caixa', 'Biga', 'Certidão', 30, 'Jo')
  for (const ruim of ['', ' ', '   ', 'A', ' B ', 'x'.repeat(121)])
    await assert.rejects(inserir('caixa', 'Biga', 'Certidão', 30, ruim), `pagador ${JSON.stringify(ruim.slice(0, 5))}`)
  await assert.rejects(db.query(
    "insert into pagamentos(setor,operador,tipo,valor) values ('caixa','Biga','Certidão',30)"), 'sem pagador')
  await assert.rejects(db.query(`update pagamentos set pagador='Outro' where setor='caixa'`), 'pagador não se altera depois')
})

test('financeiro confirma, e o servidor grava quem/quando; não confirma duas vezes', async () => {
  await como(U.caixa)
  const id = await inserir('caixa', 'Renata', 'Título em aberto', 300)
  await como(U.financeiro)
  assert.equal(await atualizar(`update pagamentos set status='confirmado' where id='${id}' returning id`), 1)
  const r = (await db.query(`select resolvido_por, resolvido_em from pagamentos where id='${id}'`)).rows[0]
  assert.equal(r.resolvido_por, U.financeiro)
  assert.ok(r.resolvido_em)
  assert.equal(await atualizar(`update pagamentos set status='nao_recebido' where id='${id}' returning id`), 0)
})

test('ninguém altera valor/tipo/setor, apaga, nem volta o status para pendente', async () => {
  await como(U.caixa)
  const id = await inserir('caixa', 'Biga', 'Certidão', 20)
  await assert.rejects(db.query(`update pagamentos set valor=1 where id='${id}'`), 'caixa alterando valor')
  await assert.rejects(db.query('delete from pagamentos'), 'caixa apagando')
  await como(U.financeiro)
  await assert.rejects(db.query(`update pagamentos set valor=1 where id='${id}'`), 'financeiro alterando valor')
  await assert.rejects(db.query('delete from pagamentos'), 'financeiro apagando')
  await assert.rejects(db.query(`update pagamentos set status='pendente' where id='${id}'`), 'voltar a pendente')
  await db.query(`update pagamentos set status='confirmado' where id='${id}'`)
})

test('cancelar: o setor cancela o que enviou enquanto pendente; não depois de conferido; não o de outro setor', async () => {
  await como(U.caixa)
  const a = await inserir('caixa', 'Biga', 'Certidão', 40)
  assert.equal(await atualizar(`update pagamentos set status='cancelado' where id='${a}' returning id`), 1)
  const r = (await db.query(`select resolvido_por, resolvido_em from pagamentos where id='${a}'`)).rows[0]
  assert.equal(r.resolvido_por, U.caixa)
  assert.ok(r.resolvido_em)

  const b = await inserir('caixa', 'Biga', 'Certidão', 41)
  await como(U.financeiro)
  await db.query(`update pagamentos set status='confirmado' where id='${b}'`)
  await como(U.caixa)
  assert.equal(await atualizar(`update pagamentos set status='cancelado' where id='${b}' returning id`), 0,
    'já conferido não cancela')

  const c = await inserir('caixa', 'Biga', 'Certidão', 42)
  await como(U.cancelamento)
  assert.equal(await atualizar(`update pagamentos set status='cancelado' where id='${c}' returning id`), 0,
    'outro setor não enxerga nem cancela')
  await como(U.caixa)
  await assert.rejects(db.query(`update pagamentos set status='confirmado' where id='${c}'`),
    'setor não confirma o próprio pagamento')
  await assert.rejects(db.query(`update pagamentos set status='nao_recebido' where id='${c}'`))
})

test('financeiro não cancela', async () => {
  await como(U.caixa)
  const id = await inserir('caixa', 'Renata', 'Certidão', 55)
  await como(U.financeiro)
  await assert.rejects(db.query(`update pagamentos set status='cancelado' where id='${id}'`))
})

test('valor diferente: exige o valor achado, diferente do informado; só o financeiro registra', async () => {
  await como(U.caixa)
  const id = await inserir('caixa', 'Renata', 'Título em aberto', 500)
  await assert.rejects(db.query(`update pagamentos set status='divergente', valor_conferido=400 where id='${id}'`),
    'caixa não registra divergência')
  await como(U.financeiro)
  await assert.rejects(db.query(`update pagamentos set status='divergente' where id='${id}'`), 'sem valor achado')
  await assert.rejects(db.query(`update pagamentos set status='divergente', valor_conferido=500 where id='${id}'`),
    'valor igual ao informado')
  await assert.rejects(db.query(`update pagamentos set status='divergente', valor_conferido=0 where id='${id}'`))
  await assert.rejects(db.query(`update pagamentos set status='confirmado', valor_conferido=400 where id='${id}'`),
    'valor achado só em divergente')
  assert.equal(await atualizar(
    `update pagamentos set status='divergente', valor_conferido=450.5 where id='${id}' returning id`), 1)
  const r = (await db.query(`select valor, valor_conferido from pagamentos where id='${id}'`)).rows[0]
  assert.equal(Number(r.valor), 500)
  assert.equal(Number(r.valor_conferido), 450.5)
  await como(U.caixa)
  assert.equal(Number((await db.query(`select valor_conferido v from pagamentos where id='${id}'`)).rows[0].v), 450.5,
    'o setor que enviou vê o valor achado')
})

test('arquivos: logado lê e busca; ninguém escreve', async () => {
  await como(U.caixa)
  assert.equal(await contar('select count(*) n from arquivos'), 8)
  assert.equal(await contar("select count(*) n from arquivos where nome ilike '%cpfl%'"), 1)
  await assert.rejects(db.query("insert into arquivos(nome,setor) values ('x','caixa')"))
})

test('conferido_por: só Carlos/Adriana/Gilmara e só ao conferir; o setor não preenche', async () => {
  await como(U.caixa)
  const a = await inserir('caixa', 'Biga', 'Certidão', 21)
  const b = await inserir('caixa', 'Biga', 'Certidão', 22)
  await assert.rejects(db.query(`update pagamentos set status='cancelado', conferido_por='Carlos' where id='${a}'`),
    'setor não registra quem conferiu')
  await como(U.financeiro)
  await assert.rejects(db.query(`update pagamentos set status='confirmado', conferido_por='Fulano' where id='${a}'`), 'nome fora da lista')
  await assert.rejects(db.query(`update pagamentos set conferido_por='Carlos' where id='${a}'`), 'sem conferir (continua pendente)')
  assert.equal(await atualizar(`update pagamentos set status='confirmado', conferido_por='Adriana' where id='${a}' returning id`), 1)
  assert.equal(await atualizar(
    `update pagamentos set status='divergente', valor_conferido=10, conferido_por='Gilmara' where id='${b}' returning id`), 1)
  const r = (await db.query(`select conferido_por from pagamentos where id in ('${a}','${b}') order by valor`)).rows.map((x) => x.conferido_por)
  assert.deepEqual(r, ['Adriana', 'Gilmara'])
  await como(U.caixa)
  assert.equal((await db.query(`select conferido_por from pagamentos where id='${a}'`)).rows[0].conferido_por, 'Adriana',
    'o setor vê quem conferiu')
})
