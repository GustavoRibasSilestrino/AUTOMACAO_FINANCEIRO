import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { StatusPill, Vazio } from '../components/ui.jsx'
import { useAgora } from '../hooks.js'
import { SETORES, STATUS, brl, dataHora, duracao, baixarCsv } from '../store.js'

const DIA = 86400000
const PERIODOS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['tudo', 'Tudo']]

export default function Historico({ pagamentos, resolver }) {
  const agora = useAgora()
  const [q, setQ] = useState('')
  const [setor, setSetor] = useState('')
  const [status, setStatus] = useState('')
  const [periodo, setPeriodo] = useState('hoje')

  const lista = useMemo(() => {
    const ini = new Date(); ini.setHours(0, 0, 0, 0)
    const desde = periodo === 'hoje' ? ini.getTime() : periodo === '7d' ? ini.getTime() - 6 * DIA : 0
    const termo = q.trim().toLowerCase()
    return pagamentos
      .filter((p) => p.criadoEm >= desde && (!setor || p.setor === setor) && (!status || p.status === status))
      .filter((p) => !termo || `${p.operador ?? ''} ${p.tipo} ${SETORES[p.setor]} ${brl(p.valor)} ${p.valor}`.toLowerCase().includes(termo))
      .sort((a, b) => b.criadoEm - a.criadoEm)
  }, [pagamentos, q, setor, status, periodo])

  const total = lista.reduce((s, p) => s + p.valor, 0)

  const exportar = () =>
    baixarCsv(
      `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Data/hora', 'Setor', 'Atendente', 'Tipo', 'Valor', 'Status', 'Conferido em'],
      lista.map((p) => [
        new Date(p.criadoEm).toLocaleString('pt-BR'), SETORES[p.setor], p.operador ?? '', p.tipo,
        p.valor.toFixed(2).replace('.', ','), STATUS[p.status].rotulo,
        p.resolvidoEm ? new Date(p.resolvidoEm).toLocaleString('pt-BR') : '',
      ]),
    )

  return (
    <section className="card">
      <div className="filtros">
        <label className="busca">
          <Icon nome="search" tam={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por atendente, tipo ou valor…" />
        </label>
        <select className="input" value={setor} onChange={(e) => setSetor(e.target.value)} aria-label="Setor">
          <option value="">Todos os setores</option>
          {Object.entries(SETORES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
        <div className="segmentado" role="group" aria-label="Período">
          {PERIODOS.map(([k, v]) => (
            <button key={k} className={periodo === k ? 'ativo' : ''} onClick={() => setPeriodo(k)}>{v}</button>
          ))}
        </div>
        <button className="btn fantasma" onClick={exportar} disabled={!lista.length}>
          <Icon nome="download" tam={16} /> Exportar CSV
        </button>
      </div>

      <p className="resumo-filtro">
        <b>{lista.length}</b> pagamento{lista.length === 1 ? '' : 's'} · total <b>{brl(total)}</b>
      </p>

      {lista.length === 0 ? (
        <Vazio icone="history" titulo="Nenhum pagamento encontrado" texto="Ajuste os filtros ou o período." />
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr><th>Data/hora</th><th>Origem</th><th>Tipo</th><th className="num">Valor</th><th>Status</th><th>Tempo</th><th /></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td>{dataHora(p.criadoEm)}</td>
                  <td><span className="tag-setor">{SETORES[p.setor]}</span>{p.operador && <span className="operador"> {p.operador}</span>}</td>
                  <td>{p.tipo}</td>
                  <td className="num"><b>{brl(p.valor)}</b></td>
                  <td><StatusPill status={p.status} /></td>
                  <td className="mono">{duracao((p.resolvidoEm ?? agora) - p.criadoEm)}</td>
                  <td className="acoes-td">
                    {p.status === 'pendente' && (
                      <div className="acoes">
                        <button className="btn sucesso sm" onClick={() => resolver(p.id, 'confirmado')}>
                          <Icon nome="check" tam={15} /> Confirmar
                        </button>
                        <button className="btn perigo-suave sm" title="Não recebido" aria-label="Não recebido"
                          onClick={() => resolver(p.id, 'nao_recebido')}>
                          <Icon nome="x" tam={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
