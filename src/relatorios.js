// Relatórios em CSV (ponto-e-vírgula, abre direto no Excel).
import { SETORES, OPERADORES, TIPOS, STATUS, inicioDoDia, duracao, baixarCsv } from './store.js'

const DIA = 86400000
const num = (v) => v.toFixed(2).replace('.', ',')
const soma = (l) => l.reduce((s, p) => s + p.valor, 0)
const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dataBr = (t) => new Date(t).toLocaleDateString('pt-BR')
const iso = (t) => new Date(t).toISOString().slice(0, 10)

const COLUNAS = ['Qtd', 'Confirmado (R$)', 'Aguardando (R$)', 'Não localizado (R$)', 'Valor diferente (R$)', 'Total (R$)']
const resumo = (rotulo, l) => [
  rotulo,
  l.length,
  ...['confirmado', 'pendente', 'nao_recebido', 'divergente'].map((s) => num(soma(l.filter((p) => p.status === s)))),
  num(soma(l)),
]
const origem = (p) => (p.operador ? `${SETORES[p.setor]} · ${p.operador}` : SETORES[p.setor])
const tempo = (p) => duracao((p.resolvidoEm ?? Date.now()) - p.criadoEm)
const noBanco = (p) => (p.valorConferido == null ? '' : num(p.valorConferido))

// Fechamento do dia: resumos por setor, atendente do caixa e tipo + detalhe de cada pagamento.
// Pagamentos cancelados não entram nos totais (aparecem numa linha à parte e no detalhe).
export function baixarRelatorioDoDia(pagamentos, inicio = inicioDoDia()) {
  const dia = pagamentos.filter((p) => p.criadoEm >= inicio && p.criadoEm < inicio + DIA)
  const ativos = dia.filter((p) => p.status !== 'cancelado')
  const cancelados = dia.filter((p) => p.status === 'cancelado')
  const linhas = [
    [],
    ['Resumo por setor', ...COLUNAS],
    ...Object.entries(SETORES).map(([k, v]) => resumo(v, ativos.filter((p) => p.setor === k))),
    resumo('TOTAL', ativos),
    ['Cancelados (fora do total)', cancelados.length, '', '', '', '', num(soma(cancelados))],
    [],
    ...Object.entries(OPERADORES).flatMap(([setor, ops]) => [
      [`${SETORES[setor]} por atendente`, ...COLUNAS],
      ...ops.map((o) => resumo(o, ativos.filter((p) => p.setor === setor && p.operador === o))),
      [],
    ]),
    ['Resumo por tipo', ...COLUNAS],
    ...TIPOS.map((t) => resumo(t, ativos.filter((p) => p.tipo === t))),
    [],
    ['Detalhe dos pagamentos'],
    ['Hora', 'Pagador', 'Origem', 'Tipo', 'Valor informado (R$)', 'Valor no banco (R$)', 'Status', 'Conferido às', 'Tempo de conferência'],
    ...dia.sort((a, b) => a.criadoEm - b.criadoEm).map((p) => [
      hora(p.criadoEm), p.pagador, origem(p), p.tipo, num(p.valor), noBanco(p), STATUS[p.status].rotulo,
      p.resolvidoEm ? hora(p.resolvidoEm) : '', tempo(p),
    ]),
  ]
  baixarCsv(`fechamento-${iso(inicio)}.csv`, ['Protesto Sorocaba — Fechamento do dia', dataBr(inicio)], linhas)
}

// Envios do atendente (já filtrados pela tela) com total (sem os cancelados)
export function baixarMeusEnvios(meus, quem) {
  baixarCsv(
    `meus-envios-${iso(Date.now())}.csv`,
    ['Hora', 'Pagador', 'Tipo', 'Valor informado (R$)', 'Valor no banco (R$)', 'Status', 'Conferido às', 'Tempo de conferência'],
    [
      ...[...meus].sort((a, b) => a.criadoEm - b.criadoEm).map((p) => [
        hora(p.criadoEm), p.pagador, p.tipo, num(p.valor), noBanco(p), STATUS[p.status].rotulo,
        p.resolvidoEm ? hora(p.resolvidoEm) : '', tempo(p),
      ]),
      [],
      ['', '', `Total (${quem}, sem cancelados)`, num(soma(meus.filter((p) => p.status !== 'cancelado')))],
    ],
  )
}
