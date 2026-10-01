/* Keep the single HACS entry point identical to the production source. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'hacs.json'), 'utf8'));
if (typeof manifest.filename !== 'string' || !/^[A-Za-z0-9_-]+\.js$/.test(manifest.filename)) {
  throw new Error('hacs.json deve indicar um nome de arquivo JavaScript válido.');
}
const source = fs.readFileSync(path.join(root, 'aspirador-vivo-card.js'));
const destination = path.join(root, 'dist', manifest.filename);
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(source)) {
    console.error('O arquivo do HACS está desatualizado. Execute npm run build antes de publicar.');
    process.exitCode = 1;
  } else {
    console.log('Arquivo do HACS confere com o código do card.');
  }
} else {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source);
  console.log(`Gerado dist/${manifest.filename}.`);
}
