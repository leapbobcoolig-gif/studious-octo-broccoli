// node tools/build_artifact.js [out.html]
// One self-contained page for claude.ai artifacts: game.html's body with ui.js inlined and the
// sprite strips embedded as data URIs (no doctype/html/head/body: the artifact host adds those).
const fs = require('fs'), path = require('path')
const root = path.join(__dirname, '..')
const out = process.argv[2] || path.join(root, 'artifact', 'bedroom.html')
const html = fs.readFileSync(path.join(root, 'game.html'), 'utf8')
const a = html.indexOf('<!--ARTIFACT-START-->'), b = html.indexOf('<!--ARTIFACT-END-->')
let page = html.slice(a + '<!--ARTIFACT-START-->'.length, b)
page = page.replace('<!--ARTIFACT-HEAD-END-->\n</head>\n<body>', '')
const uri = (f, t) => `data:${t};base64,` + fs.readFileSync(path.join(root, f)).toString('base64')
const assets = {
  mat: uri('game/sprites/press_close.mat.png', 'image/png'),
  nrm: uri('game/sprites/press_close.nrm.png', 'image/png'),
  room: uri('game/sprites/room_color.png', 'image/png'),
  meta: JSON.parse(fs.readFileSync(path.join(root, 'game/sprites/press_close.json'), 'utf8')),
}
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8')
page = page.replace('<script src="ui.js"></script>', () => `<script>window.__ASSETS=${JSON.stringify(assets)};</script>\n<script>\n${ui}\n</script>`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, page.trim() + '\n')
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB')
