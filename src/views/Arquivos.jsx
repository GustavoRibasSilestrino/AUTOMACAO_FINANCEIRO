import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Vazio } from '../components/ui.jsx'
import { agruparArquivos, baixarArquivo, baixarVarios, buscarArquivos, diaBr } from '../arquivos.js'
import { SETORES, brl, escopoRotulo } from '../store.js'

function Destaque({ texto, termo }) {
  const i = termo ? texto.toLowerCase().indexOf(termo.toLowerCase()) : -1
  if (i < 0) return texto
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + termo.length)}</mark>{texto.slice(i + termo.length)}</>
}

export default function Arquivos({ sessao, pagamentos }) {
  const financeiro = sessao.setor === 'financeiro'
  const [q, setQ] = useState('')
  const [setor, setSetor] = useState('')
  const termo = q.trim()

  const grupos = useMemo(() => agruparArquivos(pagamentos, sessao, setor), [pagamentos, sessao, setor])
  const achados = useMemo(() => buscarArquivos(grupos, q), [grupos, q])
  const dataLonga = (dia) => new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{financeiro ? 'Pagamentos de todos os setores' : `Pagamentos · ${escopoRotulo(sessao)}`}</h2>
          <p className="sub">
            Um arquivo (CSV, abre no Excel) por dia.{' '}
            {financeiro ? 'Você vê todos os setores.' : 'Você vê e baixa só os pagamentos do seu perfil.'}
          </p>
        </div>
        <button className="btn fantasma" disabled={!achados.length}
          onClick={() => baixarVarios(achados, financeiro ? 'Pagamentos' : `Pagamentos_${escopoRotulo(sessao)}`)}>
          <Icon nome="layers" tam={16} /> Baixar tudo ({achados.length})
        </button>
      </div>

      <label className="busca grande">
        <Icon nome="search" tam={20} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pesquisar nos arquivos"
          placeholder="Pesquisar por nome do pagador, atendente, valor ou data (dd/mm/aaaa)…" />
      </label>

      {financeiro && (
        <div className="chips" style={{ marginTop: '.9rem' }}>
          <button className={`chip ${setor === '' ? 'ativo' : ''}`} onClick={() => setSetor('')}>Todos</button>
          {Object.entries(SETORES).map(([k, v]) => (
            <button key={k} className={`chip ${setor === k ? 'ativo' : ''}`} onClick={() => setSetor(k)}>{v}</button>
          ))}
        </div>
      )}

      <p className="resumo-filtro">
        <b>{achados.length}</b> arquivo{achados.length === 1 ? '' : 's'}
        {termo && <> com “{termo}”</>} · últimos 45 dias
      </p>

      {achados.length === 0 ? (
        <Vazio icone="file" titulo="Nenhum arquivo encontrado"
          texto={termo ? 'Tente outro nome, valor ou data.' : 'Os pagamentos do seu perfil aparecem aqui, um arquivo por dia.'} />
      ) : (
        <ul className="arq-grid">
          {achados.map((g) => (
            <li key={g.chave} className="arq-card">
              <div className="arq-topo">
                <span className="ext ext-csv">CSV</span>
                <div className="grow">
                  <strong title={g.nome}><Destaque texto={diaBr(g.dia)} termo={termo} /> · {dataLonga(g.dia).split(',')[0]}</strong>
                  <small>{financeiro ? `${SETORES[g.setor]} · ` : ''}{g.qtd} pagamento{g.qtd === 1 ? '' : 's'}
                    {g.cancelados ? ` · ${g.cancelados} cancelado${g.cancelados === 1 ? '' : 's'}` : ''}</small>
                </div>
                <b className="arq-total">{brl(g.total)}</b>
              </div>
              <p className="arq-pagadores">
                {g.pagadores.slice(0, 4).map((nome, i) => (
                  <span key={nome}>{i > 0 && ', '}<Destaque texto={nome} termo={termo} /></span>
                ))}
                {g.pagadores.length > 4 && ` +${g.pagadores.length - 4}`}
              </p>
              <div className="arq-rodape">
                <small>{g.nome}{g.acertos != null && g.acertos !== g.itens.length ? ` · ${g.acertos} acerto${g.acertos === 1 ? '' : 's'}` : ''}</small>
                <button className="btn primario sm" onClick={() => baixarArquivo(g)}>
                  <Icon nome="download" tam={15} /> Baixar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
