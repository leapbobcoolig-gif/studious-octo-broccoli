// Inline style.css + src/*.js into one self-contained page: dist/pixel-dollhouse.html
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="style.css">/, () => '<style>\n' + fs.readFileSync(path.join(root, 'style.css'), 'utf8') + '</style>');
html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</script>');
// artifact host supplies the document skeleton
html = html.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>/g, '').replace(/<\/?head>/g, '').replace(/<\/?body>/g, '')
  .replace(/<meta charset="utf-8">\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
html = html.replace(/\s*<title>Pixel Dollhouse<\/title>/, '');
html = '<title>Pixel Dollhouse</title>\n' + html.trim() + '\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'pixel-dollhouse.html'), html);
console.log('wrote dist/pixel-dollhouse.html', html.length, 'bytes');
