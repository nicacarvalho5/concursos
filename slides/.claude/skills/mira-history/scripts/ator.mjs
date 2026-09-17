// Atores do /mira-history: normaliza um SVG e o embute como <symbol> no index.html.
//
//   node ator.mjs <deck> add <nome> <arquivo.svg> [--de <url>] [--autor <nome>] [--licenca CC0] [--cor #A=#B ...] [--fill #cor] [--sem-fundo]
//   node ator.mjs <deck> catalogo <nome>            (copia do catálogo references/assets/catalogo/<nome>.svg)
//   node ator.mjs <deck> sync                        (reembute todos os assets/atores/*.svg)
//   node ator.mjs <deck> ver                         (references/atores.png: cada ator grande, para conferir
//                                                     para que lado ele OLHA antes de declarar "olha")
//   node ator.mjs --catalogo <pasta> add <nome> <arquivo.svg> [...]   (grava no catálogo do pacote)
//
// Normalização: remove XML/DOCTYPE/comentários/metadata/sodipodi/inkscape/title/desc/script,
// tira width/height fixos, garante viewBox, prefixa ids e classes com o nome do ator (para
// vários símbolos conviverem no mesmo documento), recolore fills opcionais, e mede a caixa
// visível (bbox) por Chrome headless quando disponível, gravada em data-bbox.
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, appendFileSync } from 'fs';
import { join, basename, resolve } from 'path';
import { acharDeck, listar, acharChrome, carregarPuppeteer } from './_comum.mjs';

const args = process.argv.slice(2);
function opt(nome, padrao) { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao; }
function flag(nome) { return args.includes('--' + nome); }
const cores = [];
args.forEach((a, i) => { if (a === '--cor' && args[i + 1]) cores.push(args[i + 1]); });

const catalogoDir = opt('catalogo', null);
const COM_VALOR = new Set(['--de', '--autor', '--licenca', '--cor', '--catalogo', '--fill']);
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { if (COM_VALOR.has(args[i])) i++; continue; }
  pos.push(args[i]);
}
let deck = null, cmd, nome, arquivo;
if (catalogoDir) { [cmd, nome, arquivo] = pos; }
else { deck = acharDeck(pos[0]); [cmd, nome, arquivo] = pos.slice(1); }

export function normalizar(svgTexto, nomeAtor, opts = {}) {
  let s = svgTexto;
  s = s.replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<metadata[\s\S]*?<\/metadata\s*>/gi, '').replace(/<metadata[^>]*\/>/gi, '').replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/gi, '');
  s = s.replace(/<title[\s\S]*?<\/title\s*>/gi, '').replace(/<desc[\s\S]*?<\/desc\s*>/gi, '').replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  // elementos com prefixo de namespace (rdf:, cc:, dc:, sodipodi:, inkscape:) não desenham e
  // quebram o parse XML sem o xmlns; somem inteiros, de dentro para fora
  for (let i = 0; i < 12; i++) {
    const antes = s;
    s = s.replace(/<(\w+:[\w.-]+)\b[^<>]*\/>/g, '');
    s = s.replace(/<(\w+:[\w.-]+)\b[^<>]*>(?:(?!<\1\b)[\s\S])*?<\/\1\s*>/g, '');
    if (antes === s) break;
  }
  s = s.replace(/\s(inkscape|sodipodi|xmlns:inkscape|xmlns:sodipodi|xmlns:rdf|xmlns:cc|xmlns:dc|xmlns:svg|xmlns:ns\d*|data-paper-data|enable-background):?[\w-]*="[^"]*"/g, '');
  // SVG da web vai ser embutido no deck: nada de evento, foreignObject, imagem ou referência externa
  s = s.replace(/\son[a-z]+="[^"]*"/gi, '');
  s = s.replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '').replace(/<image\b[^>]*\/>/gi, '').replace(/<image\b[\s\S]*?<\/image\s*>/gi, '');
  s = s.replace(/\s(xlink:href|href)="(?!#)[^"]*"/gi, '');
  s = s.replace(/url\((['"]?)(?!#)[^)]*\1\)/gi, 'none');
  const m = s.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error('Não achei <svg> em ' + nomeAtor);
  const abre = m[0];
  let vb = (abre.match(/\bviewBox="([^"]+)"/i) || [])[1];
  if (!vb) {
    const w = parseFloat((abre.match(/\bwidth="([\d.]+)/) || [])[1]), h = parseFloat((abre.match(/\bheight="([\d.]+)/) || [])[1]);
    vb = (w && h) ? `0 0 ${w} ${h}` : '0 0 100 100';
  }
  let inner = s.slice(m.index + abre.length).replace(/<\/svg>\s*$/i, '');
  // prefixa ids e classes
  const pref = 'a-' + nomeAtor.replace(/[^a-z0-9]/gi, '') + '-';
  const ids = new Set();
  inner.replace(/\sid="([^"]+)"/g, (_, id) => { ids.add(id); return _; });
  ids.forEach(id => {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp(`\\sid="${esc}"`, 'g'), ` id="${pref}${id}"`);
    inner = inner.replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${pref}${id})`);
    inner = inner.replace(new RegExp(`url\\("#${esc}"\\)`, 'g'), `url(#${pref}${id})`);
    inner = inner.replace(new RegExp(`(xlink:href|href)="#${esc}"`, 'g'), `$1="#${pref}${id}"`);
  });
  const classes = new Set();
  inner.replace(/<style[\s\S]*?<\/style>/gi, blk => { blk.replace(/\.([A-Za-z_][\w-]*)/g, (_, c) => { classes.add(c); return _; }); return blk; });
  classes.forEach(c => {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp(`\\.${esc}(?![\\w-])`, 'g'), `.${pref}${c}`);
    inner = inner.replace(/\sclass="([^"]+)"/g, (_, lista) => ' class="' + lista.split(/\s+/).map(k => k === c ? pref + c : k).join(' ') + '"');
  });
  // recolore
  (opts.cores || []).forEach(par => {
    const [de, para] = par.split('=');
    if (!de || !para) return;
    const esc = de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp(esc, 'gi'), para);
  });
  if (opts.semFundo) {
    // remove o primeiro rect que cobre o viewBox inteiro (fundo opaco de exportador)
    inner = inner.replace(/<rect\b[^>]*\bwidth="100%"[^>]*\/>/i, '');
  }
  return { viewBox: vb.trim(), inner: inner.trim() };
}

async function medirBBox(viewBox, inner) {
  const pup = await carregarPuppeteer();
  if (!pup) return null;
  let browser = null;
  try {
    browser = await pup.launch({ headless: 'new', executablePath: acharChrome(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" width="800" height="800"><g id="m">${inner}</g></svg>`);
    // o navegador limpa o que não desenha (grupos escondidos) e mede só o visível
    const r = await page.evaluate(() => {
      const m = document.getElementById('m');
      m.querySelectorAll('[visibility="hidden"], [display="none"]').forEach(e => e.remove());
      const b = m.getBBox();
      return { bbox: [b.x, b.y, b.width, b.height], inner: m.innerHTML };
    });
    if (!r.bbox[2] || !r.bbox[3]) return null;
    return { bbox: r.bbox.map(v => +v.toFixed(2)), inner: r.inner };
  } catch (e) { return null; }
  finally { if (browser) await browser.close(); }
}

function gravarNormalizado(destDir, nomeAtor, texto, meta, bbox) {
  const cab = `<!-- mira-history ator="${nomeAtor}" origem="${meta.de || ''}" autor="${meta.autor || ''}" licenca="${meta.licenca || ''}" bbox="${bbox ? bbox.join(' ') : ''}" -->\n`;
  const svg = `${cab}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${texto.viewBox}"${bbox ? ` data-bbox="${bbox.join(' ')}"` : ''}>\n${texto.inner}\n</svg>\n`;
  mkdirSync(destDir, { recursive: true });
  writeFileSync(join(destDir, nomeAtor + '.svg'), svg, 'utf8');
}

function lerNormalizado(arq) {
  const s = readFileSync(arq, 'utf8');
  const cab = s.match(/<!-- mira-history ([^>]*)-->/);
  const meta = {};
  if (cab) cab[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { meta[k] = v; return _; });
  const abre = s.match(/<svg\b[^>]*>/i);
  const vb = (abre[0].match(/viewBox="([^"]+)"/) || [])[1];
  const bbox = (abre[0].match(/data-bbox="([^"]+)"/) || [])[1] || meta.bbox || '';
  const inner = s.slice(abre.index + abre[0].length).replace(/<\/svg>\s*$/i, '').trim();
  return { nome: basename(arq, '.svg'), viewBox: vb, bbox, inner, meta };
}

export function sincronizar(deckDir) {
  // Os símbolos vão para mira/atores.js (JSON) e o runtime os monta por DOMParser em XML.
  // Embutir SVG direto no HTML caía nas regras de "foreign content" do parser HTML:
  // um <metadata> de exportador bastava para os símbolos seguintes virarem XHTML e sumirem.
  const lista = listar(join(deckDir, 'assets', 'atores'), '.svg').map(lerNormalizado);
  const obj = {};
  lista.forEach(a => { obj[a.nome] = { viewBox: a.viewBox, bbox: a.bbox, svg: a.inner }; });
  const cab = '/* gerado por ator.mjs: simbolos dos atores (assets/atores/*.svg normalizados) */';
  writeFileSync(join(deckDir, 'mira', 'atores.js'), [cab, 'window.MiraAtores = ' + JSON.stringify(obj) + ';', ''].join(String.fromCharCode(10)), 'utf8');
  return lista.map(a => a.nome);
}

async function verAtores(deckDir) {
  const lista = listar(join(deckDir, 'assets', 'atores'), '.svg');
  if (!lista.length) throw new Error('assets/atores vazio');
  const pup = await carregarPuppeteer();
  if (!pup) throw new Error('puppeteer não encontrado: não dá para renderizar a folha');
  const tiles = lista.map(p => {
    const nome = basename(p, '.svg');
    return `<div class="t"><img src="file:///${p.replace(/\\/g, '/')}"><div class="n">${nome}</div><div class="s">olha para a esquerda &larr; ou para a direita &rarr; ?</div></div>`;
  }).join('');
  const html = `<html><body style="margin:0;background:#dfe7ee;font:14px sans-serif;display:flex;flex-wrap:wrap;padding:8px">
  <style>.t{width:300px;margin:8px;background:#fff;border-radius:8px;text-align:center;padding:10px}.t img{width:260px;height:220px;object-fit:contain;display:block;margin:0 auto}.n{font-weight:bold;font-size:18px;margin-top:6px}.s{color:#555;font-size:12px}</style>${tiles}</body></html>`;
  const arq = join(deckDir, 'references', 'atores.html');
  writeFileSync(arq, html, 'utf8');
  const browser = await pup.launch({ headless: 'new', executablePath: acharChrome(), args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1320, height: 900 });
    await page.goto('file:///' + arq.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await page.screenshot({ path: join(deckDir, 'references', 'atores.png'), fullPage: true });
  } finally { await browser.close(); }
  return join(deckDir, 'references', 'atores.png');
}

async function main() {
  if (cmd === 'ver') {
    const png = await verAtores(deck);
    console.log('Folha dos atores: ' + png + '\nOlhe cada um: a cabeça aponta para a esquerda ou para a direita? Esse é o "olha" do ator em historia.js. Errar isso faz o ator andar de costas.');
    return;
  }
  if (cmd === 'sync') {
    console.log('Atores embutidos: ' + sincronizar(deck).join(', '));
    return;
  }
  if (cmd === 'catalogo') {
    const src = join(deck, 'references', 'assets', 'catalogo', nome + '.svg');
    if (!existsSync(src)) throw new Error('Não achei no catálogo: ' + src);
    copyFileSync(src, join(deck, 'assets', 'atores', nome + '.svg'));
    const a = lerNormalizado(src);
    appendFileSync(join(deck, 'references', 'CREDITS.md'), `| ${nome} | ${a.meta.autor || ''} | ${a.meta.origem || ''} | ${a.meta.licenca || ''} |\n`);
    console.log('Copiado do catálogo: ' + nome + '. Embutidos: ' + sincronizar(deck).join(', '));
    return;
  }
  if (cmd !== 'add' || !nome || !arquivo) { console.error('Uso: node ator.mjs <deck> add <nome> <arquivo.svg> [--de url] [--autor nome] [--licenca CC0] [--cor #A=#B] | catalogo <nome> | sync'); process.exit(1); }
  const texto = normalizar(readFileSync(resolve(arquivo), 'utf8'), nome, { cores, semFundo: flag('sem-fundo'), fill: opt('fill', null) });
  const meta = { de: opt('de', ''), autor: opt('autor', ''), licenca: opt('licenca', '') };
  const medido = await medirBBox(texto.viewBox, texto.inner);
  const bbox = medido ? medido.bbox : null;
  if (medido) texto.inner = medido.inner;
  if (!bbox) console.warn('Sem Chrome/puppeteer ou SVG sem área visível: bbox = viewBox (âncora pode ficar deslocada).');
  if (catalogoDir) {
    gravarNormalizado(resolve(catalogoDir), nome, texto, meta, bbox);
    console.log('Catálogo: ' + join(resolve(catalogoDir), nome + '.svg') + (bbox ? ' bbox ' + bbox.join(' ') : ''));
    return;
  }
  // guarda o original em references/assets e o normalizado em assets/atores
  mkdirSync(join(deck, 'references', 'assets'), { recursive: true });
  copyFileSync(resolve(arquivo), join(deck, 'references', 'assets', nome + '.original.svg'));
  gravarNormalizado(join(deck, 'assets', 'atores'), nome, texto, meta, bbox);
  appendFileSync(join(deck, 'references', 'CREDITS.md'), `| ${nome} | ${meta.autor} | ${meta.de} | ${meta.licenca} |\n`);
  console.log('Ator ' + nome + (bbox ? ' bbox ' + bbox.join(' ') : '') + '. Embutidos: ' + sincronizar(deck).join(', '));
}
main().catch(e => { console.error(e.message); process.exit(1); });
