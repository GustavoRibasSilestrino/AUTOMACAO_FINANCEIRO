// Assinatura do desenvolvedor (aparece no login e no rodapé do app).
/* global __VERSAO__ */
const VERSAO = typeof __VERSAO__ !== 'undefined' ? __VERSAO__ : ''

export default function Assinatura({ versao = true, className = '' }) {
  return (
    <p className={`assinatura ${className}`}>
      Desenvolvido por <b>dev ribas</b>
      {versao && VERSAO && <span> · v{VERSAO}</span>}
    </p>
  )
}
