// Budowa jednoplikowej aplikacji: dist/SlupStal.html (CSS i skrypty wbudowane)
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const ENGINE = ['core', 'normy', 'materialy', 'przekroje', 'nosnosc', 'mes', 'model', 'kombinacje', 'statecznosc', 'podstawa', 'dodatkowe', 'projekt'];
const UI = ['baza', 'rysunki', 'objasnienia', 'raport', 'odt', 'app', 'okna', 'widoki'];
const scripts = ENGINE.map(f => `<script>/* src/engine/${f}.js */\n${R('src/engine/' + f + '.js')}\n</script>`).concat(UI.map(f => `<script>/* src/ui/${f}.js */\n${R('src/ui/' + f + '.js')}\n</script>`)).join('\n');
let html = R('src/shell.html').replace('/*@@CSS@@*/', () => R('src/ui/style.css')).replace('<!--@@SCRIPTS@@-->', () => scripts);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'SlupStal.html'), html);
fs.writeFileSync(path.join(__dirname, 'host', 'SlupStal.html'), html);
console.log('dist/SlupStal.html', (html.length / 1024).toFixed(0), 'kB');
