// /mira-history (vídeo, só quando o autor pede): grava a história de um deck do /mira-history num .mp4 com
// narração e música, sem controle nenhum na tela, na cadência da própria história.
//
//   node video.mjs <deck> [--saida arquivo.mp4] [--fps 30] [--largura 1920] [--respiro 0.6]
//                         [--dissolve 0.9] [--sem-musica] [--cenas c1,c2] [--qualidade 18] [--reusar <pasta-temp>] [--whatsapp]
//
// --whatsapp gera, além do mp4 principal, uma cópia -whatsapp.mp4 em 720p e leve (uns 10 MB por
// 2,5 min), que o WhatsApp aceita sem recomprimir demais.
//
// Se a emenda ou o áudio falharem, os clipes por cena ficam na pasta temporária impressa;
// --reusar <pasta> pula a captura (a parte lenta) e refaz só a emenda e o áudio.
//
// Como funciona (determinístico, quadro a quadro, sem gravar em tempo real):
//   1. abre index.html?video=1 em Chrome headless (some tudo que é controle)
//   2. para cada cena, dirige o relógio do runtime em cada quadro e tira um screenshot
//   3. codifica cada cena com ffmpeg; emenda em corte seco (plano-sequência) ou xfade (corte)
//   4. monta o áudio: cada frase no instante em que a legenda entra + música em loop com
//      ducking enquanto a voz fala; mistura e grava o mp4 final
// Precisa de: Chrome, puppeteer (do projeto ou do pacote do Mira) e ffmpeg no PATH.
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

const args = process.argv.slice(2);
function opt(nome, padrao) { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao; }
const deck = resolve(args.find(a => !a.startsWith('--')) || '.');
if (!existsSync(join(deck, 'index.html'))) { console.error('Pasta do deck sem index.html: ' + deck); process.exit(1); }
const FPS = parseInt(opt('fps', '30'), 10);
const W = parseInt(opt('largura', '1920'), 10), Hh = Math.round(W * 9 / 16);
const RESPIRO = parseFloat(opt('respiro', '0.6'));        // pausa depois de cada cena (o "botão verde" do vídeo)
const DISSOLVE = parseFloat(opt('dissolve', '0.9'));      // igual ao dissolve do deck
const SEM_MUSICA = args.includes('--sem-musica');
const SO_CENAS = opt('cenas', null) ? opt('cenas', null).split(',').map(s => s.trim()) : null;
const CRF = opt('qualidade', '18');
const REUSAR = opt('reusar', null);
const WHATSAPP = args.includes('--whatsapp');
const FFMPEG = process.env.MIRA_FFMPEG || 'ffmpeg';
const saida = resolve(opt('saida', join(deck, basename(deck).replace(/^\d{4}-\d{2}-\d{2}\s+/, '') + '.mp4')));

function acharChrome() {
  if (process.env.MIRA_CHROME) return process.env.MIRA_CHROME;
  const la = process.env.LOCALAPPDATA || '';
  const c = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    la ? la.replace(/\\/g, '/') + '/Google/Chrome/Application/chrome.exe' : null, 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  return c.find(p => existsSync(p));
}
async function carregarPuppeteer() {
  const { createRequire } = await import('module');
  const { dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const aqui = dirname(fileURLToPath(import.meta.url));
  for (const b of [process.cwd(), aqui, resolve(aqui, '..', '..', '..')]) {
    for (const m of ['puppeteer', 'puppeteer-core']) { try { return createRequire(join(b, 'x.js'))(m); } catch {} }
  }
  return null;
}
let tmp = null;
function ff(argsFf, desc) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...argsFf], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error('ffmpeg falhou em ' + desc + ':\n' + (r.stderr || r.error) + '\nOs clipes ficaram em ' + tmp + '. Refaça só a emenda com --reusar "' + tmp + '".'); process.exit(1); }
}
if (spawnSync(FFMPEG, ['-version'], { encoding: 'utf8' }).status !== 0) { console.error('ffmpeg não encontrado no PATH (ou MIRA_FFMPEG).'); process.exit(1); }

const pup = await carregarPuppeteer();
if (!pup) { console.error('puppeteer não encontrado.'); process.exit(1); }
tmp = REUSAR ? resolve(REUSAR) : join(tmpdir(), 'mira-history-video-' + Date.now());
mkdirSync(tmp, { recursive: true });
console.log('Pasta temporária: ' + tmp);

const browser = await pup.launch({ headless: 'new', executablePath: acharChrome(), args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${Hh}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: Hh, deviceScaleFactor: 1 });
const erros = [];
page.on('pageerror', e => erros.push(e.message));
const url = 'file:///' + join(deck, 'index.html').replace(/\\/g, '/') + '?video=1';
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => document.fonts && document.fonts.ready);
const plano = await page.evaluate(() => window.__miraVideo && window.__miraVideo.plano());
if (!plano) { console.error('O runtime não expôs __miraVideo: o deck é de /mira-history? mira-history.js atualizado?'); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => ({ musica: window.__miraVideo.musica, volume: window.__miraVideo.volumeMusica }));

/* ---- linha do tempo: início absoluto de cada cena ---- */
const cenas = [];
let T = 0;
plano.forEach((c, i) => {
  if (SO_CENAS && !SO_CENAS.includes(c.id)) return;
  const anterior = cenas[cenas.length - 1];
  const dissolve = anterior && c.corte ? DISSOLVE : 0;
  const clipe = c.durS + RESPIRO;                       // duração gravada da cena
  const inicio = anterior ? anterior.inicio + anterior.clipe - dissolve : 0;
  cenas.push({ idx: i, id: c.id, durS: c.durS, clipe, inicio, dissolve, falas: c.falas });
  T = inicio + clipe;
});
const TOTAL = T;
console.log(`Cenas: ${cenas.length}, vídeo de ${TOTAL.toFixed(1)} s a ${FPS} fps em ${W}x${Hh}. Quadros: ${Math.round(TOTAL * FPS)}.`);

/* ---- quadros e clipes por cena ---- */
const clipes = [];
let t0 = Date.now();
for (const c of cenas) {
  const dir = join(tmp, c.id);
  if (REUSAR && existsSync(join(tmp, c.id + '.mp4'))) { clipes.push(join(tmp, c.id + '.mp4')); process.stdout.write(`  ${c.id.padEnd(12)} reaproveitado\n`); continue; }
  mkdirSync(dir, { recursive: true });
  const ok = await page.evaluate(i => window.__miraVideo.preparar(i), c.idx);
  if (!ok) { console.error('cena não encontrada: ' + c.id); continue; }
  await new Promise(r => setTimeout(r, 260));   /* o observador de visibilidade assenta antes de dirigir */
  const n = Math.round(c.clipe * FPS);
  for (let f = 0; f < n; f++) {
    const ms = Math.min(f * 1000 / FPS, (c.durS + RESPIRO) * 1000);
    await page.evaluate((i, ms) => window.__miraVideo.quadro(i, ms), c.idx, ms);
    await page.screenshot({ path: join(dir, 'q' + String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
  }
  const clipe = join(tmp, c.id + '.mp4');
  ff(['-framerate', String(FPS), '-i', join(dir, 'q%05d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), clipe], 'clipe ' + c.id);
  rmSync(dir, { recursive: true, force: true });
  clipes.push(clipe);
  process.stdout.write(`  ${c.id.padEnd(12)} ${c.clipe.toFixed(1).padStart(5)} s  ${n} quadros  (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
}
await browser.close();

/* ---- emenda: corte seco ou xfade ---- */
/* todas as entradas na mesma base de tempo e fps, senão o xfade recusa emendar com o concat */
let filtro = cenas.map((c, k) => `[${k}:v]fps=${FPS},format=yuv420p,settb=AVTB[i${k}]`).join(';') + ';';
let ultimo = '[i0]', offset = 0;
cenas.forEach((c, k) => {
  if (k === 0) return;
  const prox = `[i${k}]`;
  const saidaK = `[v${k}]`;
  if (c.dissolve > 0) {
    offset = cenas[k - 1].inicio + cenas[k - 1].clipe - c.dissolve;
    filtro += `${ultimo}${prox}xfade=transition=fade:duration=${c.dissolve}:offset=${offset.toFixed(3)},settb=AVTB${saidaK};`;
  } else {
    filtro += `${ultimo}${prox}concat=n=2:v=1:a=0,settb=AVTB${saidaK};`;
  }
  ultimo = saidaK;
});
const videoSemAudio = join(tmp, 'video.mp4');
if (cenas.length === 1) ff(['-i', clipes[0], '-c', 'copy', videoSemAudio], 'vídeo');
else ff([...clipes.flatMap(p => ['-i', p]), '-filter_complex', filtro.replace(/;$/, ''), '-map', ultimo, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-r', String(FPS), videoSemAudio], 'emenda');

/* ---- áudio: narração nos instantes certos + música com ducking ---- */
const entradas = [], partes = [], intervalos = [];
cenas.forEach(c => {
  c.falas.forEach(f => {
    const arq = join(deck, f.arquivo);
    if (!existsSync(arq)) return;
    const t = c.inicio + f.de;
    const k = partes.length;          /* índice da entrada no ffmpeg (uma por frase) */
    entradas.push('-i', arq);
    partes.push(`[${k}:a]aresample=48000,adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)}[n${k}]`);
    intervalos.push([t, t + f.dur]);
  });
});
const musica = (!SEM_MUSICA && info.musica && existsSync(join(deck, info.musica))) ? join(deck, info.musica) : null;
let audio = null;
if (entradas.length || musica) {
  const fc = [];
  let mixIns = '';
  partes.forEach((p, k) => { fc.push(p); mixIns += `[n${k}]`; });
  let nMix = partes.length;
  if (musica) {
    const k = partes.length;
    entradas.push('-stream_loop', '-1', '-i', musica);
    const vol = info.volume || 0.35;
    const cond = intervalos.map(([a, b]) => `between(t,${a.toFixed(2)},${(b + 0.3).toFixed(2)})`).join('+') || '0';
    fc.push(`[${k}:a]aresample=48000,atrim=0:${TOTAL.toFixed(2)},volume='if(gt(${cond},0),${(vol * 0.28).toFixed(3)},${vol.toFixed(3)})':eval=frame,afade=t=in:d=2.5,afade=t=out:st=${Math.max(0, TOTAL - 2.5).toFixed(2)}:d=2.5[m]`);
    mixIns += '[m]'; nMix++;
  }
  fc.push(`${mixIns}amix=inputs=${nMix}:duration=longest:normalize=0,atrim=0:${TOTAL.toFixed(2)}[a]`);
  audio = join(tmp, 'audio.m4a');
  ff([...entradas, '-filter_complex', fc.join(';'), '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', audio], 'áudio');
}

/* ---- final ---- */
mkdirSync(resolve(saida, '..'), { recursive: true });
if (audio) ff(['-i', videoSemAudio, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', saida], 'final');
else ff(['-i', videoSemAudio, '-c', 'copy', '-movflags', '+faststart', saida], 'final');
if (WHATSAPP) {
  const wa = saida.replace(/\.mp4$/i, '') + '-whatsapp.mp4';
  ff(['-i', saida, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', wa], 'versão WhatsApp');
  console.log('Versão WhatsApp: ' + wa);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Vídeo: ${saida} (${TOTAL.toFixed(1)} s, ${W}x${Hh}, ${FPS} fps, ${partes.length ? partes.length + ' frases narradas' : 'sem narração'}${musica ? ' + música' : ''})`);
if (erros.length) { console.log('Erros no navegador: ' + [...new Set(erros)].join(' | ')); process.exitCode = 2; }
