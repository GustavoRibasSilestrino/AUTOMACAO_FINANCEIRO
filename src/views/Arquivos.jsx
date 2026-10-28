import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Vazio } from '../components/ui.jsx'
import { useArquivos } from '../dados.js'
import { SETORES } from '../store.js'

function Destaque({ texto, termo }) {
  const i = termo ? texto.toLowerCase().indexOf(termo.toLowerCase()) : -1
  if (i < 0) return texto
  return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + termo.length)}</mark>{texto.slice(i + termo.length)}</>
}

export default function Arquivos() {
  const [q, setQ] = useState('')
  const [setor, setSetor] = useState('')
  const termo = q.trim()
  const achados = useArquivos(q, setor)

  return (
    <section className="card">
      <label className="busca grande">
        <Icon nome="search" tam={20} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar arquivos por nome…" aria-label="Pesquisar arquivos" />
      </label>
      <div className="chips" style={{ margin: '.9rem 0' }}>
        <button className={`chip ${setor === '' ? 'ativo' : ''}`} onClick={() => setSetor('')}>Todos</button>
        {Object.entries(SETORES).map(([k, v]) => (
          <button key={k} className={`chip ${setor === k ? 'ativo' : ''}`} onClick={() => setSetor(k)}>{v}</button>
        ))}
      </div>

      <p className="resumo-filtro"><b>{achados.length}</b> arquivo{achados.length === 1 ? '' : 's'}</p>

      {achados.length === 0 ? (
        <Vazio icone="file" titulo="Nenhum arquivo encontrado" texto="Tente outra palavra ou outro setor." />
      ) : (
        <ul className="arquivos">
          {achados.map((a) => {
            const ext = a.nome.split('.').pop().toUpperCase()
            return (
              <li key={a.id}>
                <span className={`ext ext-${ext.toLowerCase()}`}>{ext}</span>
                <div className="grow">
                  <strong><Destaque texto={a.nome} termo={termo} /></strong>
                  <small>{SETORES[a.setor]} · {new Date(`${a.data}T00:00:00`).toLocaleDateString('pt-BR')}</small>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
