// Arquivos de pagamentos: cada perfil só enxerga o que é seu.
import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { append() {} } }
const { agruparArquivos, buscarArquivos, diaDe } = await import('../src/arquivos.js')
const { doEscopo, pagadorValido, TIPOS_POR_SETOR, OPERADORES } = await import('../src/store.js')

const dia = (n) => new Date(2026, 9, 28 - n, 10, 0).getTime()
let id = 0
const mk = (setor, operador, pagador, valor, d = 0, status = 'confirmado') => ({
  id: `a${++id}`, setor, operador, tipo: TIPOS_POR_SETOR[setor][0], pagador, valor, status, criadoEm: dia(d), resolvidoEm: dia(d) + 60000,
  valorConferido: null,
})
const dados = [
  mk('caixa', 'Biga', 'Ana Souza', 100), mk('caixa', 'Biga', 'Bruno Lima', 50, 1),
  mk('caixa', 'Renata', 'Carla Dias', 300), mk('caixa', 'Renata', 'Davi Rocha', 70, 0, 'cancelado'),
  mk('cancelamento', 'Murilo', 'Elisa Pires', 289), mk('cancelamento', 'Luís', 'Fábio Reis', 289),
  mk('certidoes', 'Depósitos', 'Gina Alves', 112),
]

test('Caixa: cada atendente só vê os próprios pagamentos', () => {
  const biga = agruparArquivos(dados, { setor: 'caixa', operador: 'Biga' })
  assert.deepEqual(biga.map((g) => g.dia), [diaDe(dia(0)), diaDe(dia(1))])
  assert.deepEqual(biga.flatMap((g) => g.pagadores).sort(), ['Ana Souza', 'Bruno Lima'])
  const renata = agruparArquivos(dados, { setor: 'caixa', operador: 'Renata' })
  assert.equal(renata.length, 1)
  assert.equal(renata[0].total, 300) // o cancelado de 70 fica fora da soma
  assert.equal(renata[0].cancelados, 1)
  assert.match(renata[0].nome, /^Pagamentos_Caixa_Renata_2026-10-28\.csv$/)
})

test('Cancelamento e Certidões: vale o setor todo, nunca outro setor', () => {
  const canc = agruparArquivos(dados, { setor: 'cancelamento', operador: 'Murilo' })
  assert.deepEqual(canc.flatMap((g) => g.pagadores).sort(), ['Elisa Pires', 'Fábio Reis'])
  assert.equal(canc[0].total, 578)
  const cert = agruparArquivos(dados, { setor: 'certidoes', operador: 'Depósitos' })
  assert.deepEqual(cert.flatMap((g) => g.pagadores), ['Gina Alves'])
  assert.match(cert[0].nome, /^Pagamentos_Certidoes_2026-10-28\.csv$/) // sem acento no nome do arquivo
})

test('Financeiro vê todos os setores e filtra por setor', () => {
  const todos = agruparArquivos(dados, { setor: 'financeiro' })
  assert.equal(todos.flatMap((g) => g.itens).length, dados.length)
  assert.deepEqual([...new Set(agruparArquivos(dados, { setor: 'financeiro' }, 'caixa').map((g) => g.setor))], ['caixa'])
})

test('busca por pagador, valor e data', () => {
  const g = agruparArquivos(dados, { setor: 'financeiro' })
  assert.equal(buscarArquivos(g, 'carla').length, 1)
  assert.equal(buscarArquivos(g, '289,00').length, 1) // cancelamento no dia 28
  assert.equal(buscarArquivos(g, 'ninguém assim').length, 0)
  assert.ok(buscarArquivos(g, '27/10/2026').length >= 1)
})

test('regras de perfil: escopo, tipos por setor, atendentes e pagador obrigatório', () => {
  assert.equal(doEscopo(mk('caixa', 'Biga', 'x', 1), { setor: 'caixa', operador: 'Renata' }), false)
  assert.equal(doEscopo(mk('cancelamento', 'Luís', 'x', 1), { setor: 'cancelamento', operador: 'Murilo' }), true)
  assert.deepEqual(TIPOS_POR_SETOR.certidoes, ['Certidão'])
  assert.deepEqual(TIPOS_POR_SETOR.cancelamento, ['Taxa de cancelamento'])
  assert.equal(TIPOS_POR_SETOR.caixa.length, 4)
  assert.deepEqual(OPERADORES.cancelamento, ['Murilo', 'Luís'])
  assert.deepEqual(OPERADORES.certidoes, ['Depósitos'])
  for (const ruim of ['', ' ', 'A', '  B ']) assert.equal(pagadorValido(ruim), false)
  assert.equal(pagadorValido('Jo'), true)
})
