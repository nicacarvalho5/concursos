/**
 * mira-slide-to-video :: monta UM video .mp4 a partir de um ou mais slides.
 *
 * Grava cada slide pedido (record-slide.cjs) e, se houver mais de um, encadeia
 * os clipes com transicao (crossfade). O video expressa exatamente os slides:
 * cada animacao dispara do zero e roda pela duracao pedida.
 *
 * Modelo de tempo (o "4s" do pedido do usuario):
 *  --seconds N      duracao PADRAO de cada slide no video (default 4).
 *  --durations ...  override por slide, ex.: "2:17,5:8" (slide 2 = 17s, slide 5 = 8s).
 *                   Slides com animacao finita (chart-race) devem receber a
 *                   duracao total da animacao aqui, para tocarem por inteiro.
 *  --transition D   duracao do crossfade entre slides (default 0.6).
 *
 * Uso:
 *  node build-video.cjs <deck.html> <saida.mp4> [--slides 2,3|all] [--seconds 4]
 *       [--durations 2:17] [--transition 0.6] [--width 1920] [--height 1080] [--fill 0.92]
 *
 * Env: MIRA_CHROME, MIRA_FFMPEG (ver record-slide.cjs).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { recordSlide, findChrome, FFMPEG } = require('./record-slide.cjs');

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) opt[a.slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : 'true';
    else pos.push(a);
  }
  return { pos, opt };
}

function ffprobeDuration(file) {
  const probe = FFMPEG.replace(/ffmpeg(\.exe)?$/i, (m, ext) => 'ffprobe' + (ext || ''));
  try {
    const out = execFileSync(probe, ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
    return parseFloat(out.trim()) || 0;
  } catch (_) { return 0; }
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const deck = path.resolve(pos[0] || '');
  const output = path.resolve(pos[1] || '');
  if (!deck || !output) {
    console.error('Uso: node build-video.cjs <deck.html> <saida.mp4> [--slides 2,3|all] [--seconds 4] [--durations 2:17] [--transition 0.6] [--width W] [--height H] [--fill 0.92]');
    process.exit(1);
  }
  if (!fs.existsSync(deck)) { console.error('Deck nao encontrado:', deck); process.exit(1); }

  const seconds = parseFloat(opt.seconds || '4');
  const transition = parseFloat(opt.transition || '0.6');
  const W = parseInt(opt.width || '1920', 10);
  const H = parseInt(opt.height || '1080', 10);
  const fill = opt.fill != null ? parseFloat(opt.fill) : (H > W ? 0 : 0.92);

  // overrides de duracao por slide: "2:17,5:8"
  const perSlide = {};
  (opt.durations || '').split(',').filter(Boolean).forEach(p => {
    const [s, d] = p.split(':'); perSlide[parseInt(s, 10)] = parseFloat(d);
  });

  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new', executablePath: findChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
           '--force-device-scale-factor=1', `--window-size=${W},${H}`],
  });

  let slides;
  try {
    const page = await browser.newPage();
    const total = await page.goto('file:///' + deck.replace(/\\/g, '/'), { waitUntil: 'domcontentloaded' })
      .then(() => page.evaluate(() => document.querySelectorAll('body > section').length));
    await page.close();

    const singleScene = total === 0;   // deck de cena unica (sem body>section): grava a pagina inteira
    if (singleScene) {
      slides = [1];
      console.log(`Deck de cena unica (sem body>section). Gravando a pagina inteira em ${W}x${H}.`);
    } else {
      const sel = (opt.slides || 'all');
      slides = sel === 'all'
        ? Array.from({ length: total }, (_, i) => i + 1)
        : sel.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= total);
      if (!slides.length) throw new Error('Nenhum slide valido em --slides (deck tem ' + total + ').');
      console.log(`Deck: ${total} slides. Gravando: [${slides.join(', ')}] em ${W}x${H}.`);
    }

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-s2v-'));
    const clips = [];
    for (let i = 0; i < slides.length; i++) {
      const idx = slides[i];
      const dur = perSlide[idx] != null ? perSlide[idx] : seconds;
      const clip = path.join(tmp, `clip-${String(i).padStart(2, '0')}.mp4`);
      console.log(`  slide ${idx}: ${dur}s ...`);
      await recordSlide({ browser, input: deck, output: clip, slideIndex: idx, seconds: dur, width: W, height: H, fill: singleScene ? 0 : fill, singleScene });
      clips.push(clip);
    }

    fs.mkdirSync(path.dirname(output), { recursive: true });

    if (clips.length === 1) {
      fs.copyFileSync(clips[0], output);
    } else {
      concatWithCrossfade(clips, output, transition);
    }

    // limpeza
    try { clips.forEach(c => fs.unlinkSync(c)); fs.rmdirSync(tmp); } catch (_) {}
    console.log('Video final:', output);
  } finally {
    await browser.close();
  }
}

/** Junta clipes com crossfade via filtro xfade do ffmpeg. */
function concatWithCrossfade(clips, output, d) {
  const durs = clips.map(ffprobeDuration);
  const minDur = Math.min(...durs);
  let X = Math.max(0, d);
  if (X >= minDur) { X = Math.max(0, minDur - 0.5); console.warn(`transicao reduzida para ${X}s (clipe mais curto tem ${minDur}s)`); }

  const inputs = [];
  clips.forEach(c => { inputs.push('-i', c); });

  if (X === 0) {
    // sem transicao: concat simples (re-encode para uniformizar)
    const n = clips.length;
    const parts = clips.map((_, i) => `[${i}:v]`).join('');
    const filter = `${parts}concat=n=${n}:v=1:a=0[v]`;
    execFileSync(FFMPEG, ['-y', ...inputs, '-filter_complex', filter, '-map', '[v]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', output], { stdio: 'inherit' });
    return;
  }

  // cadeia de xfade
  let filter = '';
  let prev = '[0:v]';
  let running = durs[0];
  for (let i = 1; i < clips.length; i++) {
    const offset = (running - X).toFixed(3);
    const out = (i === clips.length - 1) ? '[v]' : `[x${i}]`;
    filter += `${prev}[${i}:v]xfade=transition=fade:duration=${X}:offset=${offset}${out};`;
    prev = out;
    running = running + durs[i] - X;
  }
  filter = filter.replace(/;$/, '');

  execFileSync(FFMPEG, ['-y', ...inputs, '-filter_complex', filter, '-map', '[v]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', output], { stdio: 'inherit' });
}

main().catch(err => { console.error('Erro:', err.message || err); process.exit(1); });
