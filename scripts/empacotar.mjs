// Monta release/Painel-de-Pagamentos-<versão>.zip com o instalador e o LEIA-ME.txt.
// Uso:  npm run pacote   (gera o instalador e depois o ZIP)
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../', import.meta.url)) // decodifica acentos do caminho
const caminho = (...p) => join(raiz, ...p)
const { version, build } = JSON.parse(readFileSync(caminho('package.json'), 'utf8'))

const nomeInstalador = `${build.productName} Setup ${version}.exe`
const instalador = caminho('release', nomeInstalador)
if (!existsSync(instalador)) throw new Error(`Instalador não encontrado: ${instalador}\nRode "npm run dist" antes.`)

const tmp = mkdtempSync(join(tmpdir(), 'pacote-'))
const pasta = join(tmp, `${build.productName} ${version}`)
mkdirSync(pasta)
copyFileSync(instalador, join(pasta, nomeInstalador))
writeFileSync(join(pasta, 'LEIA-ME.txt'),
  readFileSync(caminho('build', 'LEIA-ME.txt'), 'utf8').replaceAll('{{versao}}', version).replace(/\r?\n/g, '\r\n'))

const zip = caminho('release', `Painel-de-Pagamentos-${version}.zip`)
rmSync(zip, { force: true })
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${pasta}' -DestinationPath '${zip}' -Force`])
rmSync(tmp, { recursive: true, force: true })
console.log('ZIP pronto:', zip)
