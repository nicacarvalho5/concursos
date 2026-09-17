// Narração do /mira-history: gera 1 mp3 por frase de legenda com edge-tts,
// mede a duração de cada um e grava mira/narracao.js (durações) para o runtime
// compilar o tempo das cenas. Cache por texto+voz: só regera o que mudou.
//
//   node narrar.mjs <deck> [--voz pt-BR-ThalitaMultilingualNeural] [--rate -12%] [--pitch -4Hz] [--forcar] [--so-medir]
//
// Regras: nenhuma frase falada com menos de 3 palavras (a voz multilíngue troca de
// idioma em fragmento curto). Legenda com semVoz: true não é narrada.
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { acharDeck, carregarHistoria, palavras, frases, hashTexto } from './_comum.mjs';

const args = process.argv.slice(2);
function opt(nome, padrao) { const i = args.indexOf('--' + nome); return i >= 0 ? args[i + 1] : padrao; }
const deck = acharDeck(args.find(a => !a.startsWith('--')));
const H = carregarHistoria(deck);
const voz = { nome: opt('voz', (H.voz && H.voz.nome) || 'pt-BR-ThalitaMultilingualNeural'), rate: opt('rate', (H.voz && H.voz.rate) || '-12%'), pitch: opt('pitch', (H.voz && H.voz.pitch) || '-4Hz') };
const forcar = args.includes('--forcar');
const soMedir = args.includes('--so-medir');
const dirN = join(deck, 'assets', 'narracao');
mkdirSync(dirN, { recursive: true });
const manifestoArq = join(dirN, 'manifest.json');
const manifesto = existsSync(manifestoArq) ? JSON.parse(readFileSync(manifestoArq, 'utf8')) : {};

// duração de um mp3 somando os quadros MPEG (sem dependência)
const BITRATES = {
  1: { 1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], 2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  2: { 1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] }
};
const SAMPLES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };
export function duracaoMp3(buf) {
  let i = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) i = 10 + ((buf[6] & 127) << 21 | (buf[7] & 127) << 14 | (buf[8] & 127) << 7 | (buf[9] & 127));
  let seg = 0, quadros = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xFF || (buf[i + 1] & 0xE0) !== 0xE0) { i++; continue; }
    const verBits = (buf[i + 1] >> 3) & 3, layer = 4 - ((buf[i + 1] >> 1) & 3), brIdx = buf[i + 2] >> 4, srIdx = (buf[i + 2] >> 2) & 3, pad = (buf[i + 2] >> 1) & 1;
    const ver = verBits === 3 ? 1 : (verBits === 2 ? 2 : (verBits === 0 ? 25 : 0));
    if (!ver || layer === 4 || brIdx === 0 || brIdx === 15 || srIdx === 3) { i++; continue; }
    const br = BITRATES[ver === 1 ? 1 : 2][layer][brIdx] * 1000, sr = SAMPLES[ver][srIdx];
    const spf = layer === 1 ? 384 : (layer === 2 ? 1152 : (ver === 1 ? 1152 : 576));
    const len = layer === 1 ? ((12 * br / sr + pad) * 4 | 0) : ((spf / 8 * br / sr + pad) | 0);
    if (len <= 0) { i++; continue; }
    seg += spf / sr; quadros++; i += len;
  }
  return quadros > 0 ? seg : 0;
}

const NARR = {};
const avisos = [];
let gerados = 0, reusados = 0;
H.cenas.forEach((c, i) => {
  const id = c.id || ('cena' + (i + 1));
  const legs = (c.legendas || []).map(l => typeof l === 'string' ? { texto: l } : l);
  if (c.capa && H.titulo && !legs.some(l => l.classe === 'titulo')) legs.unshift({ texto: H.titulo, classe: 'titulo', semVoz: !!H.capaSemVoz });
  legs.forEach((lg, n) => {
    if (lg.semVoz) return;
    const chave = `${id}-${n}`;
    const texto = String(lg.texto).replace(/\s+/g, ' ').trim();
    frases(texto).forEach(f => { if (palavras(f) < 3) avisos.push(`${chave}: frase curta "${f}" (mínimo 3 palavras)`); });
    if (lg.classe === 'titulo' && palavras(texto) < 3) avisos.push(`${chave}: título com menos de 3 palavras; use capaSemVoz: true ou alongue`);
    const arquivo = join(dirN, chave + '.mp3');
    const assinatura = hashTexto(texto + '|' + voz.nome + '|' + voz.rate + '|' + voz.pitch);
    const reg = manifesto[chave];
    const precisa = forcar || !existsSync(arquivo) || !reg || reg.hash !== assinatura;
    if (precisa && !soMedir) {
      const r = spawnSync('edge-tts', ['--voice', voz.nome, '--rate=' + voz.rate, '--pitch=' + voz.pitch, '--text', texto, '--write-media', arquivo], { encoding: 'utf8' });
      if (r.status !== 0 || !existsSync(arquivo)) {
        avisos.push(`${chave}: edge-tts falhou (${(r.stderr || r.error || '').toString().trim().slice(0, 160)})`);
        try { unlinkSync(arquivo); } catch {}
        return;
      }
      gerados++;
    } else if (existsSync(arquivo)) reusados++;
    if (!existsSync(arquivo)) { avisos.push(`${chave}: sem áudio (rode sem --so-medir)`); return; }
    const dur = +duracaoMp3(readFileSync(arquivo)).toFixed(2);
    if (precisa && soMedir) avisos.push(`${chave}: texto mudou e o áudio é antigo (rode sem --so-medir)`);
    manifesto[chave] = { hash: (precisa && soMedir && reg) ? reg.hash : assinatura, texto, dur, voz: voz.nome, rate: voz.rate, pitch: voz.pitch };
    NARR[chave] = { arquivo: 'assets/narracao/' + chave + '.mp3', dur };
  });
});
// remove do manifesto o que não existe mais na história
Object.keys(manifesto).forEach(k => { if (!NARR[k]) delete manifesto[k]; });
writeFileSync(manifestoArq, JSON.stringify(manifesto, null, 2), 'utf8');
writeFileSync(join(deck, 'mira', 'narracao.js'), '/* gerado por narrar.mjs (' + voz.nome + ' ' + voz.rate + ' ' + voz.pitch + '): duração medida de cada frase */\nwindow.MiraNarracao = ' + JSON.stringify(NARR, null, 1) + ';\n', 'utf8');
const total = Object.values(NARR).reduce((s, v) => s + v.dur, 0);
console.log(`Narração: ${gerados} gerados, ${reusados} reaproveitados, ${Object.keys(NARR).length} frases, ${total.toFixed(1)} s de fala. Voz ${voz.nome} ${voz.rate} ${voz.pitch}.`);
if (avisos.length) { console.log('AVISOS:'); avisos.forEach(a => console.log('  - ' + a)); process.exitCode = 2; }
