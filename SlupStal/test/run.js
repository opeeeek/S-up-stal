const path = require('path');
const E = path.join(__dirname, '..', 'src', 'engine');
['core', 'normy', 'materialy', 'przekroje', 'nosnosc', 'mes', 'model', 'kombinacje', 'statecznosc', 'podstawa', 'dodatkowe', 'projekt'].forEach(f => require(path.join(E, f + '.js')));
module.exports = globalThis.BS;
