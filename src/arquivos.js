// "Arquivos" = um arquivo de pagamentos (CSV) por dia, só do que é do setor (e, no Caixa, do atendente) de quem entrou.
// O Financeiro vê todos os setores. O servidor já entrega a cada setor só os pagamentos dele (regras de acesso).
import { SETORES, ESCOPO_POR_ATENDENTE, STATUS, doEscopo, duracao, baixarCsv } from './store.js'

const num = (v) => v.toFixed(2).replace('.', ',')
const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const diaDe = (t) => new Date(t).toLocaleDateString('en-CA') // 2026-10-28, no fuso local
export const diaBr = (dia) => dia.split('-').reverse().join('/')
const limpo = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

const CABECALHO = ['Hora', 'Pagador', 'Atendente', 'Tipo', 'Valor informado (R$)', 'Valor no banco (R$)', 'Status', 'Conferido às', 'Tempo de conferência', 'Conferido por']
const linha = (p) => [
  hora(p.criadoEm), p.pagador, p.operador ?? '', p.tipo, num(p.valor),
  p.valorConferido == null ? '' : num(p.valorConferido), STATUS[p.status].rotulo,
  p.resolvidoEm ? hora(p.resolvidoEm) : '', duracao((p.resolvidoEm ?? Date.now()) - p.criadoEm), p.conferidoPor ?? '',
]
const somaAtivos = (itens) => itens.filter((p) => p.status !== 'cancelado').reduce((s, p) => s + p.valor, 0)

// Agrupa em arquivos por dia (e por setor, para o Financeiro). `setorFiltro` só vale para o Financeiro.
export function agruparArquivos(pagamentos, sessao, setorFiltro = '') {
  const financeiro = sessao.setor === 'financeiro'
  const grupos = new Map()
  for (const p of pagamentos) {
    if (financeiro ? setorFiltro && p.setor !== setorFiltro : !doEscopo(p, sessao)) continue
    const dia = diaDe(p.criadoEm)
    const chave = financeiro ? `${dia}|${p.setor}` : dia
    if (!grupos.has(chave)) grupos.set(chave, { chave, dia, setor: p.setor, itens: [] })
    grupos.get(chave).itens.push(p)
  }
  return [...grupos.values()]
    .map((g) => {
      const itens = g.itens.sort((a, b) => a.criadoEm - b.criadoEm)
      const quem = !financeiro && ESCOPO_POR_ATENDENTE[sessao.setor] ? `${SETORES[g.setor]}_${sessao.operador}` : SETORES[g.setor]
      return {
        ...g,
        itens,
        qtd: itens.filter((p) => p.status !== 'cancelado').length,
        cancelados: itens.filter((p) => p.status === 'cancelado').length,
        total: somaAtivos(itens),
        pagadores: [...new Set(itens.map((p) => p.pagador))],
        nome: `Pagamentos_${limpo(quem)}_${g.dia}.csv`,
      }
    })
    .sort((a, b) => b.dia.localeCompare(a.dia) || a.setor.localeCompare(b.setor))
}

// Busca por pagador, atendente, tipo, valor ou data (dd/mm/aaaa). Devolve os arquivos que têm algum acerto.
export function buscarArquivos(grupos, termo) {
  const t = (termo ?? '').trim().toLowerCase()
  if (!t) return grupos.map((g) => ({ ...g, acertos: null }))
  const casa = (p) => [p.pagador, p.operador ?? '', p.tipo, num(p.valor), p.valor.toFixed(2)]
    .some((c) => c.toLowerCase().includes(t))
  return grupos
    .map((g) => ({ ...g, acertos: diaBr(g.dia).includes(t) ? g.itens.length : g.itens.filter(casa).length }))
    .filter((g) => g.acertos > 0)
}

export function baixarArquivo(g) {
  baixarCsv(g.nome, CABECALHO, [
    ...g.itens.map(linha),
    [],
    ['Total (sem cancelados)', '', '', '', num(g.total)],
  ])
}

// Vários dias num arquivo só (com a coluna Data)
export function baixarVarios(grupos, nome = 'Pagamentos') {
  const itens = grupos.flatMap((g) => g.itens.map((p) => [diaBr(g.dia), SETORES[g.setor], ...linha(p)]))
  baixarCsv(`${limpo(nome)}_${diaDe(Date.now())}.csv`, ['Data', 'Setor', ...CABECALHO], [
    ...itens,
    [],
    ['Total (sem cancelados)', '', '', '', '', '', num(grupos.reduce((s, g) => s + g.total, 0))],
  ])
}
