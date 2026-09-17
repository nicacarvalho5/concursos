// Cria a pasta de um deck do /mira-history com toda a árvore, runtime, vendor,
// launchers, catálogo de atores e a música escolhida.
//
//   node novo.mjs "<slug>" --titulo "Título da história" [--musica quiet-storybook-night] [--data 2026-09-12] [--decks decks]
//
// Saída: decks/YYYY-MM-DD <slug>/ pronta para receber mira/historia.js.
import { existsSync, mkdirSync, cpSync, copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { acharTemplates } from './_comum.mjs';

const args = process.argv.slice(2);
function opt(nome, padrao) { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao; }
const COM_VALOR = new Set(['--titulo', '--musica', '--data', '--decks']);
const pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { if (COM_VALOR.has(args[i])) i++; continue; } pos.push(args[i]); }
const slug = pos[0];
if (!slug) { console.error('Uso: node novo.mjs <slug> --titulo "Título" [--musica nome] [--data YYYY-MM-DD] [--decks decks]'); process.exit(1); }
const titulo = opt('titulo', slug);
const data = opt('data', new Date().toISOString().slice(0, 10));
const decksDir = resolve(opt('decks', 'decks'));
const musica = opt('musica', null);

const T = acharTemplates();
const H = join(T, 'history');
const A = join(T, 'authoring');
const deck = join(decksDir, `${data} ${slug}`);
if (existsSync(join(deck, 'index.html'))) { console.error('Já existe: ' + deck); process.exit(1); }

for (const d of ['references', 'references/assets', 'references/conferencia', 'assets', 'assets/vendor', 'assets/vendor/fonts', 'assets/atores', 'assets/narracao', 'assets/musica', 'mira']) mkdirSync(join(deck, d), { recursive: true });

let html = readFileSync(join(H, 'index.html'), 'utf8').replaceAll('__MIRA_SLUG__', slug).replaceAll('__MIRA_TITULO__', titulo);
writeFileSync(join(deck, 'index.html'), html, 'utf8');
// o título entra em linhas `echo` do .bat e do .command: sem metacaracteres de shell
const tituloShell = titulo.replace(/[&|<>^%!"'`$\\]/g, '').trim() || slug;
for (const l of ['abrir-no-celular.bat', 'abrir-no-celular.command']) {
  writeFileSync(join(deck, l), readFileSync(join(H, l), 'utf8').replaceAll('__MIRA_TITULO__', tituloShell), 'utf8');
}
cpSync(join(H, 'vendor'), join(deck, 'assets', 'vendor'), { recursive: true });
for (const m of ['mira-history.js', 'mira-edit.js', 'mira-edit-free.js', 'mira-draw.js']) copyFileSync(join(A, m), join(deck, 'mira', m));
writeFileSync(join(deck, 'mira', 'narracao.js'), '/* gerado por narrar.mjs: durações da narração por frase */\nwindow.MiraNarracao = {};\n', 'utf8');

// catálogo de atores do pacote: copiado inteiro para references/assets/catalogo (origem) e
// os que a história usar vão para assets/atores pelo ator.mjs
const cat = join(H, 'atores');
if (existsSync(cat)) cpSync(cat, join(deck, 'references', 'assets', 'catalogo'), { recursive: true });

// música: pelo nome do catálogo (templates/history/musicas) ou caminho de um mp3
let musicaRel = null;
if (musica) {
  const cands = [musica, join(H, 'musicas', musica), join(H, 'musicas', musica + '.mp3')];
  const src = cands.find(c => existsSync(c) && c.toLowerCase().endsWith('.mp3'));
  if (src) {
    const nome = src.split(/[\\/]/).pop();
    copyFileSync(src, join(deck, 'assets', 'musica', nome));
    musicaRel = 'assets/musica/' + nome;
  } else console.warn('Música não encontrada: ' + musica);
}

writeFileSync(join(deck, 'references', 'CREDITS.md'), `# Créditos\n\nDeck: ${titulo}\n\n| Asset | Autor | Origem | Licença |\n|---|---|---|---|\n`, 'utf8');
writeFileSync(join(deck, 'references', 'history-roteiro.md'), `# Roteiro: ${titulo}\n\n(escrito pela skill /mira-history antes de mira/historia.js)\n`, 'utf8');

const musicasDisponiveis = existsSync(join(H, 'musicas')) ? readdirSync(join(H, 'musicas')).filter(f => f.endsWith('.mp3')) : [];
console.log(JSON.stringify({ deck, titulo, musica: musicaRel, musicasDisponiveis, catalogo: existsSync(cat) ? readdirSync(cat).filter(f => f.endsWith('.svg')) : [] }, null, 2));
