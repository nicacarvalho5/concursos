// Validador do mira/historia.js do /mira-history. Rejeita o que o runtime não
// entende (campo desconhecido, ator inexistente, ação sem capacidade) e avisa
// sobre o que costuma sair ruim (sem close, paleta parada, legenda longa).
//
//   node validar.mjs <deck>
//
// Saída: ERROS (bloqueiam) e AVISOS (revisar). Código de saída 1 com erro.
import { existsSync } from 'fs';
import { join } from 'path';
import { acharDeck, carregarHistoria, palavras, frases, listar } from './_comum.mjs';

const deck = acharDeck(process.argv[2]);
const H = carregarHistoria(deck);
const erros = [], avisos = [];
const E = (m) => erros.push(m), A = (m) => avisos.push(m);

const RAIZ = new Set(['titulo', 'subtitulo', 'voz', 'musica', 'volumeMusica', 'capaSemVoz', 'textoComecar', 'textoVoltar', 'textoAutomatico', 'atores', 'lugares', 'cenas']);
const ATOR = new Set(['arquivo', 'altura', 'olha', 'variantes', 'tipo', 'cor', 'tamanho', 'descricao']);
const LUGAR = new Set(['cenario', 'decoracao', 'descricao']);
const DECOR = new Set(['ator', 'variante', 'em', 'x', 'y', 'dx', 'dy', 'escala', 'plano', 'virado', 'opacidade']);
const CENA = new Set(['id', 'capa', 'fim', 'lugar', 'corte', 'dur', 'camera', 'ambiente', 'acoes', 'legendas', 'nota']);
const CAMERA = new Set(['acao', 'plano', 'alvo', 'movimento', 'zoom', 'x', 'y', 'dx', 'dy', 'de', 'ate', 'dur', 'curva']);
const CANAIS = ['chuva', 'neve', 'neblina', 'vento', 'nuvens', 'estrelas', 'lua', 'sol', 'frio', 'quente', 'vinheta', 'particulas', 'vagalumes', 'gelo', 'escuro', 'ondas'];
const AMBIENTE = new Set(['acao', 'ceu', 'de', 'ate', 'dur', 'curva', ...CANAIS]);
const PALETAS = ['dia', 'primavera', 'tarde', 'porDoSol', 'anoitecer', 'noite', 'tempestade', 'amanhecer', 'inverno', 'outono'];
const CENARIOS = ['campo', 'fazenda', 'lago', 'bosque', 'inverno', 'lago-inverno', 'bosque-inverno'];
const ACOES = {
  mostrar: ['ator', 'em', 'x', 'y', 'dx', 'dy', 'escala', 'virado', 'variante', 'opacidade', 'modo', 'de', 'ate', 'dur'],
  esconder: ['ator', 'de', 'ate', 'dur'],
  mover: ['ator', 'para', 'dx', 'dy', 'modo', 'virar', 'parar', 'de', 'ate', 'dur', 'curva'],
  virar: ['ator', 'para', 'de'],
  olhar: ['ator', 'para', 'de'],
  pular: ['ator', 'vezes', 'altura', 'de', 'ate', 'dur'],
  tremer: ['ator', 'forca', 'de', 'ate', 'dur'],
  balancar: ['ator', 'forca', 'de', 'ate', 'dur'],
  escala: ['ator', 'valor', 'de', 'ate', 'dur', 'curva'],
  trocar: ['ator', 'variante', 'escala', 'de', 'ate', 'dur'],
  estado: ['ator', 'valor', 'de'],
  camera: [...CAMERA],
  ambiente: [...AMBIENTE],
  tensao: ['forca', 'de', 'ate', 'dur'],
  tremor: ['forca', 'de', 'ate', 'dur'],
  clarao: ['forca', 'de', 'ate', 'dur'],
  raio: ['forca', 'de', 'ate', 'dur']
};
const MODOS = ['parado', 'andar', 'correr', 'nadar', 'boiar', 'voar', 'planar', 'deslizar'];
const PONTOS_X = ['foraEsquerda', 'esquerda', 'meioEsquerda', 'centro', 'meioDireita', 'direita', 'foraDireita'];
const LINHAS = ['chao', 'agua', 'ar', 'alto', 'fundo'];

function chaves(obj, permitidas, onde) {
  Object.keys(obj || {}).forEach(k => { if (!permitidas.has(k)) E(`${onde}: campo desconhecido "${k}"`); });
}
function numero(v, onde, nome, min, max) {
  if (v == null) return;
  if (!Number.isFinite(+v)) { E(`${onde}: "${nome}" precisa ser número (segundos ou unidades), veio ${JSON.stringify(v)}`); return; }
  if (min != null && +v < min) E(`${onde}: "${nome}" abaixo de ${min}`);
  if (max != null && +v > max) E(`${onde}: "${nome}" acima de ${max}`);
}
function temVariante(ator, v, onde) {
  const at = H.atores[ator];
  if (at && v && v !== 'base' && !(at.variantes || {})[v]) E(`${onde}: ator ${ator} não tem variante "${v}"`);
}
chaves(H, RAIZ, 'raiz');
if (!H.titulo) E('raiz: falta "titulo"');
if (!H.atores || !Object.keys(H.atores).length) E('raiz: "atores" vazio');
if (!H.lugares || !Object.keys(H.lugares).length) E('raiz: "lugares" vazio');
if (!Array.isArray(H.cenas) || !H.cenas.length) E('raiz: "cenas" vazio');
if (H.musica && !existsSync(join(deck, H.musica))) A(`musica: arquivo não encontrado ${H.musica}`);
if (H.voz) chaves(H.voz, new Set(['nome', 'rate', 'pitch']), 'voz');
numero(H.volumeMusica, 'raiz', 'volumeMusica', 0, 1);

const atoresSvg = new Set(listar(join(deck, 'assets', 'atores'), '.svg').map(p => p.split(/[\\/]/).pop().replace(/\.svg$/i, '')));
Object.entries(H.atores || {}).forEach(([nome, a]) => {
  chaves(a, ATOR, `atores.${nome}`);
  if (a.tipo === 'ovo') return;
  const arq = (a.arquivo || nome + '.svg').replace(/\.svg$/i, '');
  if (!atoresSvg.has(arq)) E(`atores.${nome}: assets/atores/${arq}.svg não existe (use ator.mjs add ou catalogo)`);
  if (!a.altura) A(`atores.${nome}: sem "altura" (padrão 100)`);
  Object.entries(a.variantes || {}).forEach(([v, f]) => { if (!atoresSvg.has(String(f).replace(/\.svg$/i, ''))) E(`atores.${nome}.variantes.${v}: assets/atores/${f} não existe`); });
});
Object.entries(H.lugares || {}).forEach(([nome, l]) => {
  chaves(l, LUGAR, `lugares.${nome}`);
  if (!CENARIOS.includes(l.cenario)) E(`lugares.${nome}: cenario "${l.cenario}" não existe (${CENARIOS.join(', ')})`);
  (l.decoracao || []).forEach((d, i) => { const o = `lugares.${nome}.decoracao[${i}]`; chaves(d, DECOR, o); if (!H.atores[d.ator]) E(`${o}: ator "${d.ator}" não declarado`); temVariante(d.ator, d.variante, o); validarPonto(d.em, o); ['x', 'y', 'dx', 'dy', 'escala', 'opacidade'].forEach(k => numero(d[k], o, k)); });
});
function validarPonto(p, onde) {
  if (p == null) return;
  if (typeof p === 'string') {
    if (H.atores[p]) return;
    const [a, b] = p.split('.');
    const linha = b ? a : 'chao', col = b || a;
    if (!LINHAS.includes(linha) || !PONTOS_X.includes(col)) E(`${onde}: ponto "${p}" inválido (linhas ${LINHAS.join('/')}, colunas ${PONTOS_X.join('/')})`);
    return;
  }
  if (typeof p === 'object') { chaves(p, new Set(['x', 'y', 'dx', 'dy', 'em', 'ator']), onde + ' (ponto)'); if (p.ator && !H.atores[p.ator]) E(`${onde}: ator "${p.ator}" não declarado`); if (p.em) validarPonto(p.em, onde); ['x', 'y', 'dx', 'dy'].forEach(k => numero(p[k], onde, k)); return; }
  E(`${onde}: ponto inválido`);
}
const ids = new Set();
let closes = 0, paletas = new Set(), tremores = 0, cortes = 0, totalEstimado = 0;
const seMovem = new Set();
(H.cenas || []).forEach((c, i) => {
  const onde = `cenas[${i}]${c.id ? ' (' + c.id + ')' : ''}`;
  chaves(c, CENA, onde);
  if (!c.id) E(`${onde}: falta "id"`); else if (ids.has(c.id)) E(`${onde}: id repetido`); else ids.add(c.id);
  if (i === 0 && !c.capa) A(`${onde}: a primeira cena não é capa (capa: true)`);
  if (c.lugar && !H.lugares[c.lugar]) E(`${onde}: lugar "${c.lugar}" não declarado`);
  if (!c.lugar && i === 0) A(`${onde}: sem "lugar", usa o primeiro declarado`);
  if (c.corte) cortes++;
  const acoes = [];
  if (c.camera) acoes.push({ acao: 'camera', ...c.camera });
  if (c.ambiente) acoes.push({ acao: 'ambiente', ...c.ambiente });
  (c.acoes || []).forEach(a => acoes.push(a));
  acoes.forEach((a, j) => {
    const o = `${onde}.acoes[${j}]`;
    if (!ACOES[a.acao]) { E(`${o}: ação "${a.acao}" não existe (${Object.keys(ACOES).join(', ')})`); return; }
    chaves(a, new Set(['acao', ...ACOES[a.acao]]), o + ' ' + a.acao);
    if (ACOES[a.acao].includes('ator') && !['camera', 'ambiente'].includes(a.acao)) { if (!a.ator) E(`${o}: ação ${a.acao} sem "ator"`); else if (!H.atores[a.ator]) E(`${o}: ator "${a.ator}" não declarado`); }
    ['de', 'ate', 'dur', 'dx', 'dy', 'x', 'y', 'escala', 'zoom', 'forca', 'vezes', 'altura', 'opacidade'].forEach(k => numero(a[k], o, k));
    if (a.acao !== 'estado') numero(a.valor, o, 'valor');
    if (a.dur != null && +a.dur <= 0) E(`${o}: "dur" precisa ser maior que zero`);
    if (a.acao === 'mostrar') { validarPonto(a.em, o); temVariante(a.ator, a.variante, o); if (a.modo && !MODOS.includes(a.modo)) E(`${o}: modo "${a.modo}" (${MODOS.join(', ')})`); if (a.virado && !['esquerda', 'direita'].includes(a.virado)) E(`${o}: virado "${a.virado}"`); }
    if (['mover', 'virar', 'olhar'].includes(a.acao) && a.ator && H.atores[a.ator] && H.atores[a.ator].olha === 'nenhum' && a.acao !== 'mover') E(`${o}: ${a.ator} tem olha: 'nenhum' e não pode virar`);
    if ((a.acao === 'virar' || a.acao === 'olhar') && !['esquerda', 'direita'].includes(a.para)) E(`${o}: "para" precisa ser esquerda ou direita`);
    if (a.acao === 'escala' && a.valor == null) E(`${o}: escala sem "valor"`);
    if (a.acao === 'mover' || a.acao === 'virar' || a.acao === 'olhar' || (a.acao === 'mostrar' && a.virado)) { if (a.ator) seMovem.add(a.ator); }
    if (a.acao === 'mover') { if (a.para == null) E(`${o}: mover sem "para"`); validarPonto(a.para, o); if (a.modo && !MODOS.includes(a.modo)) E(`${o}: modo "${a.modo}" (${MODOS.join(', ')})`); }
    if (a.acao === 'trocar') { if (!a.variante) E(`${o}: trocar sem "variante"`); temVariante(a.ator, a.variante, o); }
    if (a.acao === 'estado') { const at = H.atores[a.ator]; if (at && at.tipo !== 'ovo') E(`${o}: "estado" só vale para ator tipo ovo`); if (!['fechado', 'rachado', 'aberto'].includes(a.valor)) E(`${o}: estado "${a.valor}" (fechado, rachado, aberto)`); }
    if (a.acao === 'camera') { if (a.plano && !['aberto', 'medio', 'close', 'detalhe'].includes(a.plano)) E(`${o}: plano "${a.plano}"`); if (a.movimento && !['fixo', 'aproximar', 'afastar', 'acompanhar'].includes(a.movimento)) E(`${o}: movimento "${a.movimento}"`); if (a.alvo && a.alvo !== 'centro' && !H.atores[a.alvo]) validarPonto(a.alvo, o); if (a.plano === 'close' || a.plano === 'detalhe') { closes++; if (!a.alvo && a.x == null) E(`${o}: close sem "alvo" (mire um ator)`); } }
    if (a.acao === 'ambiente') { if (a.ceu && !PALETAS.includes(a.ceu)) E(`${o}: ceu "${a.ceu}" (${PALETAS.join(', ')})`); if (a.ceu) paletas.add(a.ceu); CANAIS.forEach(k => { if (a[k] != null && (isNaN(+a[k]) || +a[k] < 0 || +a[k] > 1)) E(`${o}: ${k} fora de 0..1`); }); }
    if (['tremor', 'raio', 'tensao'].includes(a.acao)) tremores++;
    if (a.de != null && isNaN(+a.de)) E(`${o}: "de" não numérico (segundos)`);
    if (a.ate != null && a.de != null && +a.ate < +a.de) E(`${o}: ate < de`);
  });
  const legs = (c.legendas || []).map(l => typeof l === 'string' ? { texto: l } : l);
  legs.forEach((lg, n) => {
    if (typeof lg === 'object') { chaves(lg, new Set(['texto', 'de', 'ate', 'classe', 'semVoz']), `${onde}.legendas[${n}]`); numero(lg.de, `${onde}.legendas[${n}]`, 'de', 0); numero(lg.ate, `${onde}.legendas[${n}]`, 'ate', 0); }
    const t = String(lg.texto || '');
    if (!t.trim()) E(`${onde}.legendas[${n}]: vazia`);
    if (!lg.semVoz) frases(t).forEach(f => { if (palavras(f) < 3) E(`${onde}.legendas[${n}]: frase "${f}" com menos de 3 palavras (a voz troca de idioma)`); });
    if (t.length > 110) A(`${onde}.legendas[${n}]: ${t.length} caracteres, passa de 2 linhas na tela; divida em duas legendas`);
    if (/—/.test(t)) E(`${onde}.legendas[${n}]: travessão proibido`);
    totalEstimado += 0.9 + palavras(t) * 0.42 + 0.55;
  });
  if (!c.capa && legs.length > 3) A(`${onde}: ${legs.length} legendas; o ideal é 1 ou 2 por cena`);
  if (!c.capa && !legs.length && !c.fim) A(`${onde}: cena sem legenda nem narração`);
  if (i === (H.cenas.length - 1) && !c.fim) A(`${onde}: a última cena não tem fim: true (FIM e botão de recomeçar)`);
});
seMovem.forEach(nome => {
  const at = H.atores[nome];
  if (at && at.tipo !== 'ovo' && !['esquerda', 'direita', 'nenhum'].includes(at.olha)) E(`atores.${nome}: se move ou vira, então precisa de "olha" (esquerda ou direita): para que lado o DESENHO aponta a cabeça. Confira em references/atores.png (node ator.mjs <deck> ver). Errado, o ator anda de costas. Objeto sem frente (casa, pedra): olha: 'nenhum'.`);
});
const n = (H.cenas || []).length;
if (n > 18) A(`${n} cenas; acima de 16 fica longo para criança`);
// sem cota: só informa a linguagem usada, para o modelo conferir se cada escolha veio da história
console.log(`Linguagem usada: ${cortes} corte(s), ${closes} close(s), paletas [${[...paletas].join(', ') || 'nenhuma'}], ${tremores} impacto(s). Nada disso tem mínimo: confira se cada escolha vem da história.`);
console.log(`Duração estimada da fala: ${Math.round(totalEstimado)} s (${n} cenas). Rode narrar.mjs para medir de verdade.`);
if (erros.length) { console.log('ERROS:'); erros.forEach(e => console.log('  x ' + e)); }
if (avisos.length) { console.log('AVISOS:'); avisos.forEach(a => console.log('  - ' + a)); }
if (!erros.length) console.log('OK: historia.js válida.');
process.exitCode = erros.length ? 1 : 0;
