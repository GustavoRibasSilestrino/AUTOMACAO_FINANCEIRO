import { useState } from 'react'
import { brl } from '../store.js'

// Financeiro achou no banco um valor diferente do informado: registra o valor encontrado.
export default function ValorDiferente({ p, resolver, aoVoltar }) {
  const [centavos, setCentavos] = useState(0)
  const igual = centavos > 0 && centavos / 100 === p.valor
  const invalido = centavos <= 0 || igual

  const submit = (e) => {
    e.preventDefault()
    if (!invalido) resolver(p.id, 'divergente', { valorConferido: centavos / 100 })
  }

  return (
    <form className="diferente" onSubmit={submit}>
      <label className="rotulo" htmlFor={`dif-${p.id}`}>
        Valor encontrado no banco <small>(informado: {brl(p.valor)})</small>
      </label>
      <input id={`dif-${p.id}`} className="valor-input pequeno" inputMode="numeric" autoFocus placeholder="R$ 0,00"
        value={centavos ? brl(centavos / 100) : ''}
        onChange={(e) => setCentavos(Number(e.target.value.replace(/\D/g, '').slice(0, 11)))} />
      {igual && <p className="dica">É igual ao informado: use "Valor recebido".</p>}
      <div className="acoes">
        <button type="button" className="btn fantasma" onClick={aoVoltar}>Voltar</button>
        <button className="btn sucesso" disabled={invalido}>Registrar diferença</button>
      </div>
    </form>
  )
}
