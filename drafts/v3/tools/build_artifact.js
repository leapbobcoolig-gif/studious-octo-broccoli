// node tools/build_artifact.js [out.html]
// One self-contained page for claude.ai artifacts: game.html with ui.js inlined, sprite files
// embedded as data URIs, and the doctype/html/head/body wrapper removed (the host adds it).
const fs = require('fs'), path = require('path')
const root = path.join(__dirname, '..')
const out = process.argv[2] || path.join(root, 'artifact', 'bedroom.html')
let page = fs.readFileSync(path.join(root, 'game.html'), 'utf8')
page = page.replace(/<!doctype html>|<\/?html>|<head>|<\/head>|<body>|<\/body>|<meta charset="utf-8">|<meta name="viewport"[^>]*>/gi, '')
page = page.replace(/<title>[^<]*<\/title>/, '<title>Straight Up Bedroom</title>\n<style>:root{color-scheme:dark}</style>')
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8')
page = page.replace('<script src="ui.js"></script>', () => `<script>\n${ui}\n</script>`)
const gamejs = fs.readFileSync(path.join(root, 'game.js'), 'utf8')
page = page.replace('<script src="game.js"></script>', () => `<script>\n${gamejs}\n</script>`)
page = page.replace(/'(game\/sprites\/[^']+\.png)'/g, (m, f) => `'data:image/png;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}'`)
page = page.replace(/fetch\('game\/sprites\/press_close\.json'\)\.then\(r=>r\.json\(\)\)/, () => `Promise.resolve(${fs.readFileSync(path.join(root, 'game/sprites/press_close.json'), 'utf8').trim()})`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, page.trim() + '\n')
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB')
