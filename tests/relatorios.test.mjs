// Relatórios CSV e funções de formatação (sem navegador: simula o download).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'

const gravados = []
globalThis.document = {
  createElement: () => ({ click() { gravados.at(-1).nome = this.download }, remove() {} }),
  body: { append() {} },
}
URL.createObjectURL = (blob) => { gravados.push({ blob }); return 'blob:teste' }
URL.revokeObjectURL = () => {}

const { baixarRelatorioDoDia, baixarMeusEnvios } = await import('../src/relatorios.js')
const { duracao, brl, STATUS } = await import('../src/store.js')

const agora = Date.now(), min = 60000
let n = 0
const mk = (setor, operador, tipo, valor, haMin, status, dur, extra = {}) => ({
  id: `p${++n}`, setor, operador, tipo, valor, criadoEm: agora - haMin * min, status,
  resolvidoEm: status === 'pendente' ? null : agora - (haMin - dur) * min, valorConferido: null, ...extra,
})
// "haMin" pequeno para ficar no mesmo dia do teste, mesmo perto da meia-noite
const dados = () => {
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0)
  const base = Math.max(1, Math.min(60, Math.floor((agora - hoje0.getTime()) / min) - 1))
  return [
    mk('caixa', 'Renata', 'Título em aberto', 1234.56, base, 'confirmado', 0),
    mk('caixa', 'Biga', 'Custas CPFL', 410, base, 'confirmado', 0),
    mk('cancelamento', null, 'Taxa de cancelamento', 289, base, 'nao_recebido', 0),
    mk('certidoes', null, 'Certidão', 100, base, 'divergente', 0, { valorConferido: 90 }),
    mk('caixa', 'Renata', 'Custas CPFL', 150.5, base, 'pendente', 0),
    mk('caixa', 'Particular', 'Certidão', 70, base, 'cancelado', 0),
    mk('caixa', 'Renata', 'Título em aberto', 99, 60 * 30, 'confirmado', 1), // ontem: fora do fechamento
  ]
}
const ler = async (g) => (await g.blob.text()).replace(/^﻿/, '')
const celulas = (linha) => linha.split(';').map((c) => c.replace(/^"|"$/g, ''))
const achar = (csv, inicio) => celulas(csv.split('\r\n').find((l) => l.startsWith(`"${inicio}"`)))

let csv, fechamento
before(async () => {
  baixarRelatorioDoDia(dados())
  fechamento = gravados.at(-1)
  csv = await ler(fechamento)
})

test('o arquivo do fechamento tem nome com a data e abre no Excel (BOM + ponto e vírgula)', async () => {
  assert.match(fechamento.nome, /^fechamento-\d{4}-\d{2}-\d{2}\.csv$/)
  const bytes = new Uint8Array(await fechamento.blob.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]) // BOM UTF-8
  assert.ok(csv.includes('";"'))
})

test('totais: cancelados e pagamentos de outro dia ficam fora', () => {
  // total = 1234,56 + 410 + 289 + 100 + 150,50 = 2184,06
  assert.deepEqual(achar(csv, 'TOTAL'), ['TOTAL', '5', '1644,56', '150,50', '289,00', '100,00', '2184,06'])
  assert.deepEqual(achar(csv, 'Cancelados (fora do total)'), ['Cancelados (fora do total)', '1', '', '', '', '', '70,00'])
})

test('resumos por setor, atendente do caixa e tipo', () => {
  assert.deepEqual(achar(csv, 'Caixa'), ['Caixa', '3', '1644,56', '150,50', '0,00', '0,00', '1795,06'])
  assert.deepEqual(achar(csv, 'Renata'), ['Renata', '2', '1234,56', '150,50', '0,00', '0,00', '1385,06'])
  assert.deepEqual(achar(csv, 'Particular'), ['Particular', '0', '0,00', '0,00', '0,00', '0,00', '0,00'])
  assert.deepEqual(achar(csv, 'Custas CPFL'), ['Custas CPFL', '2', '410,00', '150,50', '0,00', '0,00', '560,50'])
})

test('detalhe mostra o valor encontrado no banco nos pagamentos com valor diferente', () => {
  const linha = csv.split('\r\n').find((l) => l.includes('"Valor diferente";'))
  const c = celulas(linha)
  assert.equal(c[3], '100,00') // informado
  assert.equal(c[4], '90,00') // no banco
  assert.ok(csv.includes('"Cancelado"'))
})

test('relatório do atendente: total sem cancelados', async () => {
  baixarMeusEnvios(dados().filter((p) => p.setor === 'caixa' && p.criadoEm > agora - 24 * 60 * min), 'Renata')
  const out = await ler(gravados.at(-1))
  assert.match(gravados.at(-1).nome, /^meus-envios-/)
  // Renata (hoje): 1234,56 + 150,50 ; Biga, Particular (cancelado) também estão em "caixa"
  assert.ok(out.includes('Total (Renata, sem cancelados)'))
  assert.ok(out.includes('"1795,06"')) // 1234,56 + 410 + 150,50 (cancelado de 70 fora)
})

test('formatação: duração, moeda e status', () => {
  assert.equal(duracao(75000), '01:15')
  assert.equal(duracao(3900000), '1h05')
  assert.equal(duracao(-5), '00:00')
  assert.match(brl(1234.56).replace(/\s/g, ' '), /^R\$ 1\.234,56$/)
  for (const s of ['pendente', 'confirmado', 'nao_recebido', 'divergente', 'cancelado'])
    assert.ok(STATUS[s].rotulo && STATUS[s].tom, `status ${s}`)
})
