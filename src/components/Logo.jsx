// Recriação em texto/CSS da logo "Protesto Sorocaba": nítida em qualquer tamanho.
// invertido = versão para fundo azul-marinho (caixa branca, texto azul).
export default function Logo({ invertido = false, tamanho = 'md' }) {
  return (
    <div className={`logo ${tamanho} ${invertido ? 'inv' : ''}`} role="img" aria-label="Protesto Sorocaba">
      <span className="logo-topo">PROTESTO</span>
      <span className="logo-base">SOROCABA</span>
    </div>
  )
}
