// Utilidades partilhadas pelos scripts do /mira-history (Node puro, sem dependências).
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const AQUI = dirname(fileURLToPath(import.meta.url));

// Raiz dos templates do Mira: no projeto instalado é mira-templates/, no repositório é templates/.
export function acharTemplates(inicio = process.cwd()) {
  let dir = resolve(inicio);
  for (let i = 0; i < 8; i++) {
    for (const cand of ['mira-templates', 'templates']) {
      const p = join(dir, cand);
      if (existsSync(join(p, 'history', 'index.html')) && existsSync(join(p, 'authoring', 'mira-history.js'))) return p;
    }
    const pai = dirname(dir);
    if (pai === dir) break;
    dir = pai;
  }
  // último recurso: relativo a este script (agents/mira-history/scripts -> repo)
  const repo = resolve(AQUI, '..', '..', '..');
  if (existsSync(join(repo, 'templates', 'history', 'index.html'))) return join(repo, 'templates');
  throw new Error('Não achei os templates do Mira (mira-templates/history). Rode "npx mira-animator install" ou "update" antes.');
}

export function acharDeck(arg) {
  const d = resolve(arg || '.');
  if (!existsSync(join(d, 'index.html'))) throw new Error('Pasta do deck sem index.html: ' + d);
  return d;
}

// Carrega mira/historia.js num sandbox e devolve window.MiraHistoria.
export function carregarHistoria(deck) {
  const arq = join(deck, 'mira', 'historia.js');
  if (!existsSync(arq)) throw new Error('Não achei ' + arq);
  const src = readFileSync(arq, 'utf8');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: arq });
  const H = ctx.window.MiraHistoria;
  if (!H) throw new Error('mira/historia.js não define window.MiraHistoria');
  return H;
}

export function palavras(t) { return String(t).trim().split(/\s+/).filter(Boolean).length; }
export function frases(t) { return String(t).split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean); }

export function listar(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.toLowerCase().endsWith(ext)).map(f => join(dir, f));
}

export function hashTexto(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function acharChrome() {
  if (process.env.MIRA_CHROME) return process.env.MIRA_CHROME;
  const la = process.env.LOCALAPPDATA || '';
  const cands = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    la ? la.replace(/\\/g, '/') + '/Google/Chrome/Application/chrome.exe' : null,
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const c of cands) { try { if (existsSync(c)) return c; } catch {} }
  return undefined;
}

// puppeteer pode estar no projeto, no pacote do Mira ou global. Devolve o módulo ou null.
export async function carregarPuppeteer() {
  const { createRequire } = await import('module');
  const bases = [process.cwd(), AQUI, resolve(AQUI, '..', '..', '..')];
  for (const b of bases) {
    try {
      const req = createRequire(join(b, 'x.js'));
      return req('puppeteer');
    } catch {}
    try {
      const req = createRequire(join(b, 'x.js'));
      return req('puppeteer-core');
    } catch {}
  }
  return null;
}

export function tamanho(p) { try { return statSync(p).size; } catch { return 0; } }
