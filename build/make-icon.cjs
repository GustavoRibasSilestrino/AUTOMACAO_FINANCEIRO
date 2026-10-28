// Gera build/icon.png e build/icon.ico (monograma PS, azul-marinho + dourado).
// Uso:  npx electron build/make-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

app.setPath('userData', path.join(os.tmpdir(), 'painel-icone'))

const html = `<body style="margin:0;width:256px;height:256px;display:grid;place-items:center;
  background:linear-gradient(155deg,#2f46a0 0%,#1b2a5e 55%,#0f1838 100%);
  font-family:Georgia,'Times New Roman',serif">
  <div style="text-align:center;color:#fff">
    <div style="font-size:118px;letter-spacing:.03em;line-height:1;font-weight:500">PS</div>
    <div style="height:5px;width:128px;background:#b08d4f;margin:8px auto 0"></div>
  </div></body>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 256, height: 256, useContentSize: true, show: false, frame: false })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise((r) => setTimeout(r, 500))
  const img = (await win.webContents.capturePage()).resize({ width: 256, height: 256, quality: 'best' })
  const png = img.toPNG()
  fs.writeFileSync(path.join(__dirname, 'icon.png'), png)

  // ICO com um PNG de 256x256 embutido (formato aceito pelo Windows)
  const h = Buffer.alloc(22)
  h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4)
  h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12)
  h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18)
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), Buffer.concat([h, png]))
  console.log('icone gerado', png.length, 'bytes')
  app.quit()
})
