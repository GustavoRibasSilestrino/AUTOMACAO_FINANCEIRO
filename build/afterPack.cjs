// Embute o ícone no .exe sem depender do winCodeSign (que exige privilégio de symlink no Windows).
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

function achaRcedit() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign')
  for (const d of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, d.name, 'rcedit-x64.exe')
    if (d.isDirectory() && fs.existsSync(p)) return p
  }
  throw new Error('rcedit-x64.exe não encontrado em ' + base)
}

exports.default = async (ctx) => {
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`)
  execFileSync(achaRcedit(), [exe, '--set-icon', path.join(__dirname, 'icon.ico')])
}
