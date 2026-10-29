// Permite importar os arquivos de src/ no Node: troca `import.meta.env` (exclusivo do Vite) por um objeto vazio.
export async function load(url, context, nextLoad) {
  const r = await nextLoad(url, context)
  if (r.format === 'module' && url.includes('/src/') && r.source) {
    return { ...r, source: r.source.toString().replaceAll('import.meta.env', '({})') }
  }
  return r
}
