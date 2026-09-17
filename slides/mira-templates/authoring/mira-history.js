/* ==========================================================================
   mira-history.js : runtime do /mira-history.

   Transforma `window.MiraHistoria` (dados: atores, lugares, cenas, legendas)
   numa história animada completa: plano-sequência contínuo com câmera,
   cortes por dissolve, cenários por preset, efeitos de clima, atores SVG,
   legendas de conto com narração, música, navegação com trava, tela cheia,
   QR na capa, modo leve para celular, pausa e modo automático.

   O modelo que escreve a história NÃO escreve código: só o objeto de dados.
   Este arquivo é CÓDIGO-FONTE VERSIONADO (templates/authoring/), copiado
   para mira/ do deck. Nunca é gerado por LLM a cada deck.

   Princípios:
   - Pose pura: poseAt(base, t) devolve o estado do mundo no instante t da
     cena a partir da pose herdada. Em t = 0 devolve base (portão duro de
     continuidade). Isso dá continuidade, rewind e captura determinística.
   - DOM persistente: os nós SVG nascem uma vez por cena; cada quadro só
     atualiza atributos. Reconstruir o SVG por quadro engasga em celular.
   - Encadeamento linear: a cena N nasce sempre do fim da cena N-1, mesmo
     depois de um close por dissolve. O mundo nunca reinicia.
   ========================================================================== */
(function () {
    'use strict';

    var H = window.MiraHistoria;
    if (!H || !H.cenas || !H.cenas.length) {
        console.error('[mira-history] window.MiraHistoria não encontrado ou sem cenas. Carregue mira/historia.js ANTES deste arquivo.');
        return;
    }
    var NARR = window.MiraNarracao || {};

    /* ---------------------------------------------------------------------
       Constantes do mundo (viewBox 960x540)
       --------------------------------------------------------------------- */
    var W = 960, HH = 540, CX = 480, CY = 270;
    var CHAO_Y = 445;          /* linha do chão nos lugares secos */
    var AGUA_Y = 425;          /* topo da água nos lugares com lago (a água vai até a margem) */
    var MARGEM_Y = 505;        /* margem da frente nos lugares com lago: o chão fica aqui */
    var NA_AGUA_Y = 438;       /* onde um ator "na água" apoia os pés */
    var CAM_RITMO = 0.65;      /* câmera 6/10: chega ao destino em 65% da janela */
    var LEVE = (window.matchMedia && (matchMedia('(hover: none)').matches || matchMedia('(max-width: 900px)').matches));
    var MOV_REDUZIDO = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var XLINK = 'http://www.w3.org/1999/xlink';

    /* ---------------------------------------------------------------------
       Utilidades matemáticas
       --------------------------------------------------------------------- */
    function cl(v, a, b) { return Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, v)); }
    function L(a, b, k) { return a + (b - a) * k; }
    function suave(k) { k = cl(k); return k * k * (3 - 2 * k); }
    function w(u, a, b) { return b <= a ? (u >= b ? 1 : 0) : suave((u - a) / (b - a)); }
    function pico(u, a, m, b) { return u < m ? w(u, a, m) : 1 - w(u, m, b); }
    function hsh(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hex(c) {
        /* aceita #rgb, #rrggbb e rgb(r,g,b), porque mix() é encadeado */
        var m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
        if (m) return [+m[1], +m[2], +m[3]];
        c = c.replace('#', '');
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        var n = parseInt(c, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var CORCACHE = {};
    function mix(a, b, k) {
        k = cl(k);
        if (k <= 0) return a;
        if (k >= 1) return b;
        var A = CORCACHE[a] || (CORCACHE[a] = hex(a)), B = CORCACHE[b] || (CORCACHE[b] = hex(b));
        return 'rgb(' + Math.round(L(A[0], B[0], k)) + ',' + Math.round(L(A[1], B[1], k)) + ',' + Math.round(L(A[2], B[2], k)) + ')';
    }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function envTremor(t) {
        /* envelope de impacto: cabeça de 15% e queda ^1,6 */
        if (t < 0 || t > 1) return 0;
        return t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 1.6);
    }

    /* ---------------------------------------------------------------------
       Paletas de céu. topo, meio, base, luz (0 noite .. 1 dia)
       --------------------------------------------------------------------- */
    var PALETAS = {
        dia:        ['#5FB9F5', '#B9E3FF', '#EAF7FF', 1.00],
        primavera:  ['#79CBFF', '#CBEBFF', '#FFF6E5', 1.00],
        tarde:      ['#6FA9E0', '#F3CFA0', '#FFE6C0', 0.88],
        porDoSol:   ['#3B3A8A', '#F0836A', '#FFD07A', 0.58],
        anoitecer:  ['#161F52', '#3F4696', '#7E63A0', 0.32],
        noite:      ['#05081D', '#0F1638', '#1B2650', 0.10],
        tempestade: ['#141826', '#262C3C', '#363D4E', 0.28],
        amanhecer:  ['#5A5BA0', '#F5A5B6', '#FFDDB2', 0.70],
        inverno:    ['#8FA6BE', '#CFDCE7', '#EEF3F7', 0.78],
        outono:     ['#7FB1DC', '#E8C79C', '#F7E4C6', 0.90]
    };
    var CANAIS_AMBIENTE = ['chuva', 'neve', 'neblina', 'vento', 'nuvens', 'estrelas', 'lua', 'sol', 'frio', 'quente',
        'vinheta', 'particulas', 'vagalumes', 'gelo', 'escuro', 'flash', 'raio', 'abalo', 'tensao', 'ondas'];

    /* ---------------------------------------------------------------------
       Pontos nomeados do lugar. 'chao.esquerda', 'agua.centro', 'ar.foraDireita'
       --------------------------------------------------------------------- */
    var PONTOS_X = { foraEsquerda: -170, esquerda: 170, meioEsquerda: 330, centro: 480, meioDireita: 630, direita: 790, foraDireita: 1130 };
    function chaoDe(lugar) { return lugar && lugar.temAgua ? MARGEM_Y : CHAO_Y; }
    function pontoY(linha, lugar) {
        var agua = lugar && lugar.temAgua;
        if (linha === 'agua') return agua ? NA_AGUA_Y : CHAO_Y;
        if (linha === 'ar') return 190;
        if (linha === 'alto') return 90;
        if (linha === 'fundo') return agua ? AGUA_Y + 2 : CHAO_Y - 40;
        return chaoDe(lugar);
    }

    /* ---------------------------------------------------------------------
       Atores: símbolos inline (<symbol id="ator-nome" data-bbox="x y w h">)
       --------------------------------------------------------------------- */
    var SIMB = {};
    function lerSimbolos() {
        /* mira/atores.js traz os SVGs normalizados; montamos os <symbol> por XML (DOMParser),
           porque o parser HTML trata SVG inline como "foreign content" e qualquer deslize
           (um <metadata> de exportador) faz os símbolos seguintes sumirem em silêncio */
        var host = document.getElementById('mira-atores');
        var dados = window.MiraAtores || {};
        if (host) Object.keys(dados).forEach(function (nome) {
            var d = dados[nome];
            if (document.getElementById('ator-' + nome)) return;
            var xml = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><symbol id="ator-' + nome + '" viewBox="' + d.viewBox + '"' + (d.bbox ? ' data-bbox="' + d.bbox + '"' : '') + '>' + d.svg + '</symbol></svg>';
            var doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
            var erro = doc.querySelector('parsererror');
            if (erro) {
                console.warn('[mira-history] ator ' + nome + ': SVG inválido como XML, usando o parser HTML (' + erro.textContent.slice(0, 100) + ')');
                var tmp = document.createElementNS(SVG_NS, 'svg');
                tmp.innerHTML = xml.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
                while (tmp.firstChild) host.appendChild(tmp.firstChild);
                return;
            }
            host.appendChild(document.importNode(doc.documentElement.firstChild, true));
        });
        var lista = document.querySelectorAll('symbol[id^="ator-"]');
        for (var i = 0; i < lista.length; i++) {
            var s = lista[i];
            var bb = (s.getAttribute('data-bbox') || '').trim().split(/[\s,]+/).map(Number);
            var vb = (s.getAttribute('viewBox') || '0 0 100 100').trim().split(/[\s,]+/).map(Number);
            if (bb.length !== 4 || bb.some(isNaN) || !bb[2] || !bb[3]) bb = vb;
            SIMB[s.id.replace('ator-', '')] = { id: s.id, bbox: bb, vb: vb };
        }
    }

    var ATORES = H.atores || {};
    function defAtor(nome) {
        var a = ATORES[nome];
        if (!a) { console.warn('[mira-history] ator desconhecido: ' + nome); return null; }
        return a;
    }
    function simboloDe(nome, variante) {
        var a = defAtor(nome);
        if (!a) return null;
        var arq = (variante && variante !== 'base' && a.variantes && a.variantes[variante]) ? a.variantes[variante] : (a.arquivo || (nome + '.svg'));
        var chave = String(arq).replace(/\.svg$/i, '');
        return SIMB[chave] || null;
    }
    /* estado inicial de um ator (invisível, fora de cena) */
    function ator0(nome) {
        var a = ATORES[nome] || {};
        return {
            x: -300, y: CHAO_Y, s: 1, op: 0, flip: (a.olha === 'esquerda') ? -1 : 1, rot: 0,
            var1: 'base', var2: 'base', varK: 0,      /* crossfade de variante */
            modo: 'parado', pulo: 0, treme: 0, balanca: 0, estado: (a.tipo === 'ovo') ? 'fechado' : '',
            olhaBase: (a.olha === 'esquerda') ? -1 : 1,
            semCara: a.olha === 'nenhum'      /* objeto sem frente (casa, pedra): nunca espelha */
        };
    }

    /* ---------------------------------------------------------------------
       Estado inicial do mundo
       --------------------------------------------------------------------- */
    function estado0() {
        var E = {
            rel: 0, nuvemX: 0,
            fx: CX, fy: CY, zoom: 1,
            abalo: 0, tensao: 0,
            ceuA: 'dia', ceuB: 'dia', ceuK: 0,
            chuva: 0, neve: 0, neblina: 0, vento: 0, nuvens: 0, estrelas: 0, lua: 0, sol: 0,
            frio: 0, quente: 0, vinheta: 0.55, particulas: 0, vagalumes: 0, gelo: 0, escuro: 0, flash: 0, raio: 0, ondas: 0.5,
            a: {}
        };
        Object.keys(ATORES).forEach(function (n) { E.a[n] = ator0(n); });
        var amb = (H.cenas[0] && H.cenas[0].ambiente) || {};
        if (amb.ceu && PALETAS[amb.ceu]) { E.ceuA = amb.ceu; E.ceuB = amb.ceu; }
        return E;
    }
    function paletaDe(E) {
        var A = PALETAS[E.ceuA] || PALETAS.dia, B = PALETAS[E.ceuB] || A, k = cl(E.ceuK);
        return { topo: mix(A[0], B[0], k), meio: mix(A[1], B[1], k), base: mix(A[2], B[2], k), luz: L(A[3], B[3], k) };
    }

    /* ---------------------------------------------------------------------
       Resolução de posições
       --------------------------------------------------------------------- */
    function resolverPonto(p, E, lugar, atorRef) {
        if (p == null) return null;
        if (typeof p === 'string') {
            var partes = p.split('.');
            var linha = partes.length > 1 ? partes[0] : 'chao';
            var col = partes.length > 1 ? partes[1] : partes[0];
            if (E.a[p]) return { x: E.a[p].x, y: E.a[p].y };
            return { x: PONTOS_X[col] != null ? PONTOS_X[col] : CX, y: pontoY(linha, lugar) };
        }
        if (typeof p === 'object') {
            var base = { x: CX, y: pontoY('chao', lugar) };
            if (p.ator && E.a[p.ator]) base = { x: E.a[p.ator].x, y: E.a[p.ator].y };
            else if (p.em) base = resolverPonto(p.em, E, lugar);
            return { x: (p.x != null ? p.x : base.x) + (p.dx || 0), y: (p.y != null ? p.y : base.y) + (p.dy || 0) };
        }
        return null;
    }

    /* ---------------------------------------------------------------------
       Compilação das cenas: durações, legendas, ações ordenadas
       --------------------------------------------------------------------- */
    var LUGARES = H.lugares || {};
    var CENAS = [];
    var DUR_PADRAO = { mostrar: 0.6, esconder: 0.7, mover: 3, virar: 0.35, pular: 1.2, tremer: 2, balancar: 2, escala: 1.2, trocar: 2, estado: 0.5, camera: 2.6, ambiente: 3, tensao: 3, tremor: 0.9, clarao: 0.6, raio: 0.7, olhar: 0.4 };

    function palavras(t) { return String(t).trim().split(/\s+/).filter(Boolean).length; }
    function estimarFala(texto) { return 0.9 + palavras(texto) * 0.42; }

    function compilar() {
        H.cenas.forEach(function (c, i) {
            var cena = clone(c);
            cena.idx = i;
            cena.id = cena.id || ('cena' + (i + 1));
            cena.lugar = cena.lugar || (i > 0 ? CENAS[i - 1].lugar : Object.keys(LUGARES)[0]);
            var lugar = LUGARES[cena.lugar] || { cenario: 'campo' };
            cena.lugarDef = lugar;
            lugar.temAgua = /lago|rio|mar/.test(lugar.cenario || '');
            if (cena.corte === true) cena.corte = 'dissolve';
            if (!cena.corte && i > 0 && (CENAS[i - 1].capa || cena.lugar !== CENAS[i - 1].lugar)) cena.corte = 'dissolve';
            if (i === 0) cena.corte = null;

            /* ações: as abreviações camera/ambiente da cena viram ações no instante 0 */
            var acoes = [];
            /* mudou de lugar: quem não for mostrado de novo sai de cena */
            if (i > 0 && cena.lugar !== CENAS[i - 1].lugar) {
                Object.keys(ATORES).forEach(function (n) { acoes.push({ acao: 'esconder', ator: n, de: 0, ate: 0.01, automatica: true }); });
            }
            if (cena.ambiente) acoes.push(Object.assign({ acao: 'ambiente', de: 0 }, cena.ambiente));
            if (cena.camera) acoes.push(Object.assign({ acao: 'camera', de: 0 }, cena.camera));
            (cena.acoes || []).forEach(function (a) { acoes.push(Object.assign({}, a)); });
            acoes.forEach(function (a, j) {
                a.de = isFinite(+a.de) ? Math.max(0, +a.de) : 0;
                var dur = (a.dur != null && isFinite(+a.dur) && +a.dur > 0) ? +a.dur : (DUR_PADRAO[a.acao] != null ? DUR_PADRAO[a.acao] : 1);
                if (a.ate == null || !isFinite(+a.ate)) a.ate = a.de + dur;
                a.ate = Math.max(a.de + 0.01, +a.ate);   /* nunca zero: evita 0/0 nos envelopes */
                a.ordem = j;
            });
            acoes.sort(function (p, q) { return (p.de - q.de) || (p.ordem - q.ordem); });
            cena.acoesC = acoes;

            /* legendas: sequenciais por padrão, com a duração da narração medida */
            var legs = (cena.legendas || []).map(function (lg) { return typeof lg === 'string' ? { texto: lg } : Object.assign({}, lg); });
            if (cena.capa && H.titulo && !legs.some(function (l) { return l.classe === 'titulo'; })) {
                legs.unshift({ texto: H.titulo, classe: 'titulo', de: 0.6, semVoz: !!H.capaSemVoz });
            }
            var cursor = cena.capa ? 0.6 : 0.8;
            legs.forEach(function (lg, n) {
                var chave = cena.id + '-' + n;
                var narr = NARR[chave];
                lg.arquivo = lg.semVoz ? null : (narr ? narr.arquivo : 'assets/narracao/' + chave + '.mp3');
                lg.fala = lg.semVoz ? 0 : (narr && narr.dur ? +narr.dur : estimarFala(lg.texto));
                if (lg.de == null) lg.de = cursor;
                lg.de = +lg.de;
                if (lg.ate != null) lg.ate = +lg.ate;
                if (!lg.semVoz && !narr) lg.estimado = true;
                cursor = lg.de + Math.max(lg.fala, 1.6) + 0.55;
            });
            /* a última frase fica; as anteriores somem quando a seguinte entra */
            legs.forEach(function (lg, n) {
                if (lg.ate == null && n < legs.length - 1) lg.ate = legs[n + 1].de - 0.7;   /* some antes da próxima entrar */
            });
            var fimFala = legs.length ? Math.max.apply(null, legs.map(function (l) { return l.de + Math.max(l.fala, 1.4); })) : 0;
            var fimAcoes = acoes.length ? Math.max.apply(null, acoes.map(function (a) { return a.ate; })) : 0;
            var dur = Math.max(fimFala + 0.9, fimAcoes + 0.4, (cena.dur && isFinite(+cena.dur)) ? +cena.dur : 0, cena.capa ? 5 : 3.5);
            if (cena.fim) {
                var tFim = dur + 0.3;
                legs.push({ texto: 'FIM', classe: 'fim', semVoz: true, de: tFim, fala: 0, arquivo: null });
                cena.tBotaoInicio = tFim + 1.3;
                dur = tFim + 1.6;
            }
            cena.legs = legs;
            cena.durS = dur;
            cena.dur = Math.round(dur * 1000);
            CENAS.push(cena);
        });
    }

    /* ---------------------------------------------------------------------
       Avaliação pura da pose: poseAt(base, t, cena)
       Cada ação interpola do valor no seu instante de início (origem
       capturada com as ações anteriores aplicadas) até o alvo.
       --------------------------------------------------------------------- */
    function easeAcao(a, k) {
        if (a.curva === 'linear') return cl(k);
        if (a.curva === 'entrada') { k = cl(k); return k * k; }
        if (a.curva === 'saida') { k = cl(k); return 1 - (1 - k) * (1 - k); }
        return suave(k);
    }
    function pontoCamera(E, a, cena) {
        /* devolve {fx, fy, zoom} alvo de uma ação de câmera */
        var zoom = a.zoom;
        var planos = { aberto: 1.0, medio: 1.7, close: 2.8, detalhe: 3.6 };
        if (zoom == null) zoom = planos[a.plano || 'aberto'] || 1.0;
        var fx = CX, fy = CY;
        if (a.x != null) fx = +a.x;
        if (a.y != null) fy = +a.y;
        var alvo = a.alvo;
        if (alvo && alvo !== 'centro') {
            var at = E.a[alvo];
            if (at) {
                var def = ATORES[alvo] || {};
                var alt = (def.altura || 100) * at.s;
                fx = at.x + (a.dx || 0);
                /* plano aberto olha o corpo inteiro; close olha a cabeça */
                var frac = (a.plano === 'close' || a.plano === 'detalhe') ? 0.72 : 0.5;
                fy = at.y - alt * frac + (a.dy || 0);
            } else {
                var p = resolverPonto(alvo, E, cena.lugarDef);
                if (p) { fx = p.x + (a.dx || 0); fy = p.y - 60 + (a.dy || 0); }
            }
        } else if (a.plano === 'aberto' && a.x == null) {
            fx = CX; fy = CY;
        }
        /* enquadramento fica dentro do mundo */
        var meiaW = (W / 2) / zoom, meiaH = (HH / 2) / zoom;
        fx = cl(fx, -200 + meiaW, 1160 - meiaW);
        fy = cl(fy, -120 + meiaH, 540 - meiaH + 40);
        return { fx: fx, fy: fy, zoom: zoom };
    }

    function aplicarAcao(E, a, t, cena, orig) {
        /* orig: valores no início da ação; k: progresso 0..1 */
        var k = a.ate > a.de ? easeAcao(a, (t - a.de) / (a.ate - a.de)) : 1;
        var kl = a.ate > a.de ? cl((t - a.de) / (a.ate - a.de)) : 1;   /* linear, para janelas */
        var at = a.ator ? E.a[a.ator] : null;
        switch (a.acao) {
            case 'mostrar': {
                if (!at) return;
                if (orig.pos) { at.x = orig.pos.x; at.y = orig.pos.y; }
                if (a.escala != null) at.s = +a.escala;
                if (a.virado) at.flip = (a.virado === 'esquerda' ? -1 : 1) * at.olhaBase;
                if (a.variante) { at.var1 = a.variante; at.var2 = a.variante; at.varK = 0; }
                at.op = L(orig.op, a.opacidade != null ? +a.opacidade : 1, k);
                if (a.modo) at.modo = a.modo;
                return;
            }
            case 'esconder': if (at) at.op = L(orig.op, 0, k); return;
            case 'mover': {
                if (!at || !orig.pos) return;
                var alvo = orig.alvo;
                at.x = L(orig.pos.x, alvo.x, k);
                at.y = L(orig.pos.y, alvo.y, k);
                if (a.virar !== false && at.semCara !== true && Math.abs(alvo.x - orig.pos.x) > 4) at.flip = (alvo.x < orig.pos.x ? -1 : 1) * at.olhaBase;
                at.modo = (kl > 0 && kl < 1) ? (a.modo || 'andar') : (a.parar === false ? (a.modo || 'andar') : (a.modo === 'nadar' ? 'boiar' : (a.modo === 'voar' ? 'voar' : 'parado')));
                if (a.modo === 'voar' && kl >= 1) at.modo = 'planar';
                at.andaK = kl;
                return;
            }
            case 'virar': if (at) at.flip = (a.para === 'esquerda' ? -1 : 1) * at.olhaBase; return;
            case 'pular': if (at) at.pulo = kl > 0 && kl < 1 ? Math.abs(Math.sin(kl * Math.PI * (a.vezes || 1))) * (a.altura || 28) : 0; return;
            case 'tremer': if (at) at.treme = (kl > 0 && kl < 1 ? 1 : 0) * (a.forca != null ? +a.forca : 1); return;
            case 'balancar': if (at) at.balanca = (kl > 0 && kl < 1 ? Math.sin(kl * Math.PI) : 0) * (a.forca != null ? +a.forca : 1); return;
            case 'escala': if (at && isFinite(+a.valor)) at.s = L(orig.s, +a.valor, k); return;
            case 'trocar': {
                if (!at) return;
                at.var1 = orig.var1; at.var2 = a.variante || 'base'; at.varK = k;
                if (k >= 1) { at.var1 = at.var2; at.varK = 0; }
                if (a.escala != null) at.s = L(orig.s, +a.escala, k);
                return;
            }
            case 'estado': if (at && kl > 0) at.estado = a.valor; return;
            case 'olhar': if (at) at.flip = (a.para === 'esquerda' ? -1 : 1) * at.olhaBase; return;
            case 'camera': {
                var kc = a.ate > a.de ? suave(cl((t - a.de) / ((a.ate - a.de) * (a.movimento === 'acompanhar' ? 1 : CAM_RITMO)))) : 1;
                var alvoC = (a.movimento === 'acompanhar' && a.alvo && E.a[a.alvo]) ? pontoCamera(E, a, cena) : orig.cam;
                E.fx = L(orig.fx, alvoC.fx, kc);
                E.fy = L(orig.fy, alvoC.fy, kc);
                E.zoom = L(orig.zoom, alvoC.zoom, kc);
                if (a.movimento === 'acompanhar' && kc >= 1) { E.fx = alvoC.fx; E.fy = alvoC.fy; }
                return;
            }
            case 'ambiente': {
                if (a.ceu && PALETAS[a.ceu]) {
                    /* parte da paleta corrente (se uma mistura estava no meio, da de maior peso) */
                    if (k >= 1) { E.ceuA = a.ceu; E.ceuB = a.ceu; E.ceuK = 0; }
                    else { E.ceuA = orig.ceuMixA; E.ceuB = a.ceu; E.ceuK = k; }
                }
                CANAIS_AMBIENTE.forEach(function (c) {
                    if (a[c] != null && c !== 'flash' && c !== 'raio' && c !== 'abalo') E[c] = L(orig[c], +a[c], k);
                });
                return;
            }
            case 'tensao': E.tensao = Math.max(E.tensao, (kl > 0 && kl < 1 ? Math.sin(kl * Math.PI) : 0) * 0.0032 * (a.forca != null ? +a.forca : 1)); return;
            case 'tremor': E.abalo = Math.max(E.abalo, envTremor((t - a.de) / (a.ate - a.de)) * 0.024 * (a.forca != null ? +a.forca : 1)); return;
            case 'clarao': E.flash = Math.max(E.flash, pico(kl, 0, 0.12, 1) * (a.forca != null ? +a.forca : 1)); return;
            case 'raio': {
                var kr = kl;
                E.raio = Math.max(E.raio, cl(pico(kr, 0, 0.08, 0.45) + 0.8 * pico(kr, 0.5, 0.58, 0.9)));
                E.flash = Math.max(E.flash, cl(pico(kr, 0, 0.1, 0.5) + 0.7 * pico(kr, 0.5, 0.6, 0.95)));
                E.abalo = Math.max(E.abalo, envTremor(kr / 0.8) * 0.02 * (a.forca != null ? +a.forca : 1));
                return;
            }
        }
    }

    function capturarOrigem(E, a, cena) {
        var at = a.ator ? E.a[a.ator] : null;
        var o = {};
        if (at) {
            o.op = at.op; o.s = at.s; o.var1 = at.var1;
            o.pos = { x: at.x, y: at.y };
            if (a.acao === 'mostrar') {
                var p = resolverPonto(a.em != null ? a.em : (a.x != null ? { x: a.x, y: a.y } : null), E, cena.lugarDef);
                o.pos = p || { x: at.x, y: at.y };
                if (a.x != null && a.em == null) o.pos.x = +a.x;
                if (a.y != null && a.em == null) o.pos.y = +a.y;
                o.pos.x += a.dx || 0; o.pos.y += a.dy || 0;
            }
            if (a.acao === 'mover') {
                var d = resolverPonto(a.para, E, cena.lugarDef) || { x: at.x, y: at.y };
                if (a.dx != null) d.x += +a.dx;
                if (a.dy != null) d.y += +a.dy;
                o.alvo = d;
            }
        }
        if (a.acao === 'camera') { o.fx = E.fx; o.fy = E.fy; o.zoom = E.zoom; o.cam = pontoCamera(E, a, cena); }
        if (a.acao === 'ambiente') {
            CANAIS_AMBIENTE.forEach(function (c) { o[c] = E[c]; });
            o.ceuA = E.ceuA; o.ceuB = E.ceuB; o.ceuK = E.ceuK;
            /* se uma mistura estava no meio, a nova parte da cor corrente (aproximação: a de maior peso) */
            o.ceuMixA = E.ceuK < 0.5 ? E.ceuA : E.ceuB;
        }
        return o;
    }

    /* origens por cena, recalculadas quando a base muda (ms === 0) */
    function prepararOrigens(cena, base) {
        /* duas fases: primeiro as ações de atores e ambiente (cada uma lê as anteriores),
           depois as de câmera, que leem TODOS os atores já posicionados no instante dela.
           Sem isso, "camera: close no feio" no mesmo instante do "mostrar feio" mirava
           o ponto onde o ator estava antes de entrar (fora da tela). */
        var origens = new Array(cena.acoesC.length);
        cena.acoesC.forEach(function (a, i) {
            if (a.acao === 'camera') return;
            origens[i] = capturarOrigem(poseAt(base, a.de, cena, origens, i, 'semCamera'), a, cena);
        });
        cena.acoesC.forEach(function (a, i) {
            if (a.acao !== 'camera') return;
            origens[i] = capturarOrigem(poseAt(base, a.de, cena, origens, i), a, cena);
        });
        return origens;
    }

    function poseAt(base, t, cena, origens, ate, filtro) {
        /* ate: índice-limite (só na preparação de origens); filtro 'semCamera' ignora a câmera */
        var E = clone(base);
        E.rel = base.rel + t * 1000;
        E.nuvemX = base.nuvemX + t * 1000 * (0.004 + 0.03 * base.vento);
        E.abalo = 0; E.tensao = 0; E.flash = 0; E.raio = 0;
        var n = ate != null ? ate : cena.acoesC.length;
        /* duas passadas: a câmera por último, para "acompanhar" ler a posição
           final do ator neste quadro e não a de antes do movimento */
        for (var passo = 0; passo < 2; passo++) {
            for (var i = 0; i < cena.acoesC.length; i++) {
                var a = cena.acoesC[i];
                if (t < a.de) break;
                var ehCam = a.acao === 'camera';
                if (ehCam !== (passo === 1)) continue;
                if (filtro === 'semCamera' && ehCam) continue;
                if (ehCam || filtro === 'semCamera') { if (i >= n) continue; }
                if (!origens[i]) continue;
                aplicarAcao(E, a, t, cena, origens[i]);
            }
        }
        return E;
    }

    /* ---------------------------------------------------------------------
       Tabela de repousos determinística (plano B: link direto, captura)
       --------------------------------------------------------------------- */
    var REPOUSO = {};
    function calcularRepousos() {
        var base = estado0();
        CENAS.forEach(function (c, i) {
            /* a capa é um cartaz: a história começa do zero na cena seguinte */
            if (i > 0 && CENAS[i - 1].capa) base = estado0();
            var origens = prepararOrigens(c, base);
            var fim = poseAt(base, c.durS, c, origens);
            fim.abalo = 0; fim.tensao = 0; fim.flash = 0; fim.raio = 0;
            REPOUSO[c.id] = fim;
            base = fim;
        });
    }

    /* ---------------------------------------------------------------------
       Barramento de pose (continuidade entre cenas)
       --------------------------------------------------------------------- */
    var POSES = {}, INSTANTES = {}, RELOGIOS = {}, RETORNOS = {}, RETROCEDER = {}, REWIND = {};
    var Bus = {
        gravar: function (id, pose, ms) { POSES[id] = pose; INSTANTES[id] = ms; },
        ler: function (id) { return POSES[id] || null; },
        instante: function (id) { return INSTANTES[id] == null ? null : INSTANTES[id]; }
    };

    /* ---------------------------------------------------------------------
       CENÁRIOS: cada lugar monta suas camadas uma vez por cena
       --------------------------------------------------------------------- */
    function el(tag, attrs, pai) {
        var e = document.createElementNS(SVG_NS, tag);
        if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
        if (pai) pai.appendChild(e);
        return e;
    }
    function useDe(simb, pai) {
        /* width/height iguais ao viewBox do símbolo: sem isso o <use> ocupa a viewport inteira */
        var u = el('use', { width: simb.vb[2], height: simb.vb[3], x: simb.vb[0], y: simb.vb[1] }, pai);
        u.setAttribute('href', '#' + simb.id);
        u.setAttributeNS(XLINK, 'xlink:href', '#' + simb.id);
        return u;
    }

    /* geometria procedural com semente fixa (igual em todos os aparelhos) */
    function gerarGeo(seed) {
        var r = mulberry32(seed);
        var g = { estrelas: [], nuvens: [], part: [], gotas: [], gotasFg: [], flocos: [], colinasA: '', colinasB: '', arvores: [], tufos: [], juncos: [] };
        for (var i = 0; i < 70; i++) g.estrelas.push({ x: -300 + r() * 1560, y: -120 + r() * 330, r: 0.7 + r() * 1.3, gr: i % 3 });
        for (var n = 0; n < 8; n++) {
            var blobs = [], q = 4 + Math.floor(r() * 3);
            for (var b = 0; b < q; b++) blobs.push({ dx: (b - q / 2) * 44 + r() * 20, dy: r() * 22 - 11, rr: 30 + r() * 30 });
            g.nuvens.push({ x: -100 + n * 190 + r() * 60, y: 30 + r() * 110, v: 0.5 + r() * 0.8, blobs: blobs, s: 0.8 + r() * 0.6 });
        }
        for (var p = 0; p < 60; p++) g.part.push({ x: -100 + r() * 1160, y0: 120 + r() * 320, r: 0.8 + r() * 2, amp: 8 + r() * 22, vel: 0.005 + r() * 0.012, fase: r() * 6.28, bokeh: r() > 0.85 });
        for (var gt = 0; gt < 130; gt++) g.gotas.push({ x: -240 + r() * 1500, y: -120 + r() * 760, len: 13 + r() * 16, v: 0.55 + r() * 0.5 });
        for (var g2 = 0; g2 < 26; g2++) g.gotasFg.push({ x: -200 + r() * 1400, y: -200 + r() * 900, len: 34 + r() * 30, v: 0.9 + r() * 0.6 });
        for (var f = 0; f < 110; f++) g.flocos.push({ x: -240 + r() * 1500, y: -120 + r() * 760, r: 1.2 + r() * 2.6, v: 0.05 + r() * 0.06, fase: r() * 6.28, amp: 10 + r() * 20 });
        /* colinas: duas linhas onduladas */
        function colinas(y, amp, passos, sem) {
            var d = 'M-400,' + (y + 300) + ' L-400,' + y;
            for (var x = -400; x <= 1360; x += passos) {
                var yy = y - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + sem) * Math.cos(x * 0.0017 + sem * 2));
                d += ' L' + x + ',' + yy.toFixed(1);
            }
            return d + ' L1360,' + (y + 300) + ' Z';
        }
        g.colinasA = colinas(400, 70, 40, 1.3);
        g.colinasB = colinas(425, 45, 36, 3.1);
        for (var a = 0; a < 9; a++) g.arvores.push({ x: -300 + a * 200 + r() * 90, h: 60 + r() * 60, w: 34 + r() * 28 });
        for (var t = 0; t < 40; t++) g.tufos.push({ x: -300 + r() * 1560, y: CHAO_Y + 4 + r() * 90, s: 0.6 + r() * 0.8 });
        for (var j = 0; j < 14; j++) g.juncos.push({ x: -200 + r() * 1360, h: 40 + r() * 50, inc: (r() - 0.5) * 10 });
        return g;
    }
    var GEO = gerarGeo(42);

    /* ---------------------------------------------------------------------
       PALCO: monta o SVG de uma cena (uma vez) e devolve o pintor de quadros
       --------------------------------------------------------------------- */
    function montarPalco(svg, cena) {
        var id = svg.id;
        var lugar = cena.lugarDef;
        var tipo = lugar.cenario || 'campo';
        var temAgua = !!lugar.temAgua;
        var ehInverno = /inverno|neve/.test(tipo);
        var ehBosque = /bosque|floresta/.test(tipo);
        var ehFazenda = /fazenda|quintal/.test(tipo);

        var defs = el('defs', null, svg);
        function grad(idg, radial, stops, extra) {
            var g = el(radial ? 'radialGradient' : 'linearGradient', Object.assign({ id: idg + '-' + id }, extra || (radial ? {} : { x1: 0, y1: 0, x2: 0, y2: 1 })), defs);
            var arr = stops.map(function (s) { return el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }, g); });
            return arr;
        }
        var stCeu = grad('ceu', false, [['0%', '#000'], ['62%', '#000'], ['100%', '#000']]);
        var stAgua = grad('agua', false, [['0%', '#6FC3F0', 0.95], ['100%', '#2C7BB8', 1]]);
        grad('nev', true, [['0%', '#FFF3E6', 1], ['100%', '#FFF3E6', 0]]);
        grad('vin', true, [['55%', '#000', 0], ['100%', '#000', 1]], { cx: '50%', cy: '50%', r: '70%' });
        grad('sol', true, [['0%', '#FFF6D0', 0.95], ['35%', '#FFCB7A', 0.5], ['100%', '#FF9A6A', 0]]);
        grad('lua', true, [['0%', '#FFF5D6', 0.9], ['100%', '#FFF5D6', 0]]);
        grad('halo', true, [['0%', '#FFE39A', 0.9], ['60%', '#FFD35A', 0.3], ['100%', '#FFD35A', 0]]);
        grad('refl', false, [['0%', '#FFFFFF', 0.28], ['100%', '#FFFFFF', 0.02]]);
        var fSoft = null;
        if (!LEVE) {
            var f = el('filter', { id: 'soft-' + id, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
            el('feGaussianBlur', { stdDeviation: 2.2 }, f);
            fSoft = 'url(#soft-' + id + ')';
        }
        var clipAgua = el('clipPath', { id: 'clipagua-' + id }, defs);
        el('rect', { x: -600, y: AGUA_Y, width: 2200, height: 400 }, clipAgua);

        /* planos */
        var gSky = el('g', null, svg), gFar = el('g', null, svg), gMid = el('g', null, svg), gSet = el('g', null, svg), gFg = el('g', null, svg), gLente = el('g', null, svg);

        /* --- céu --- */
        var rCeu = el('rect', { x: -400, y: -400, width: 1760, height: 1340, fill: 'url(#ceu-' + id + ')' }, gSky);
        var gSol = el('g', null, gSky);
        var cSol = el('circle', { cx: 720, cy: 200, r: 260, fill: 'url(#sol-' + id + ')' }, gSol);
        var cSol2 = el('circle', { cx: 720, cy: 200, r: 34, fill: '#FFF6D0' }, gSol);
        var gLua = el('g', null, gSky);
        el('circle', { cx: 760, cy: 100, r: 70, fill: 'url(#lua-' + id + ')', opacity: 0.35 }, gLua);
        el('circle', { cx: 760, cy: 100, r: 24, fill: '#FFF3C9' }, gLua);
        var cLuaSombra = el('circle', { cx: 771, cy: 93, r: 20, fill: '#000' }, gLua);
        var pEstrelas = [0, 1, 2].map(function (gi) {
            var d = '';
            GEO.estrelas.forEach(function (e) { if (e.gr === gi) d += 'M' + e.x + ',' + e.y + 'm-' + e.r + ',0a' + e.r + ',' + e.r + ' 0 1,0 ' + (e.r * 2) + ',0a' + e.r + ',' + e.r + ' 0 1,0 -' + (e.r * 2) + ',0'; });
            return el('path', { d: d, fill: '#FFFFFF' }, gSky);
        });
        var gNuv = el('g', null, gSky);
        var nuvens = GEO.nuvens.map(function (nv) {
            var g = el('g', null, gNuv);
            nv.blobs.forEach(function (bl) { el('circle', { cx: bl.dx, cy: bl.dy, r: bl.rr }, g); });
            return { g: g, circ: g.childNodes, nv: nv };
        });
        var pRaio = el('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, gSky);
        var pRaioGlow = el('path', { fill: 'none', stroke: '#BFDBFE', 'stroke-width': 9, 'stroke-linejoin': 'round', filter: fSoft }, gSky);

        /* --- fundo: colinas ou árvores distantes --- */
        var pColA = el('path', { d: GEO.colinasA }, gFar);
        var pColB = el('path', { d: GEO.colinasB }, gMid);
        var arvFundo = ehBosque ? GEO.arvores.map(function (a) {
            var g = el('g', null, gMid);
            el('rect', { x: a.x - 5, y: CHAO_Y - a.h, width: 10, height: a.h + 20 }, g);
            el('ellipse', { cx: a.x, cy: CHAO_Y - a.h, rx: a.w, ry: a.w * 1.15 }, g);
            return g;
        }) : [];
        /* celeiro e cerca da fazenda */
        var gCeleiro = null;
        if (ehFazenda) {
            gCeleiro = el('g', null, gMid);
            el('rect', { x: 690, y: CHAO_Y - 150, width: 230, height: 150, fill: '#B5432E' }, gCeleiro);
            el('path', { d: 'M675,' + (CHAO_Y - 150) + ' L805,' + (CHAO_Y - 235) + ' L935,' + (CHAO_Y - 150) + ' Z', fill: '#7A2A1C' }, gCeleiro);
            el('rect', { x: 770, y: CHAO_Y - 95, width: 70, height: 95, fill: '#5A2416' }, gCeleiro);
            el('path', { d: 'M770,' + (CHAO_Y - 95) + ' L840,' + CHAO_Y + ' M840,' + (CHAO_Y - 95) + ' L770,' + CHAO_Y, stroke: '#E8D9B0', 'stroke-width': 4, fill: 'none' }, gCeleiro);
            el('rect', { x: 715, y: CHAO_Y - 120, width: 34, height: 30, fill: '#F6E7B3' }, gCeleiro);
            var cerca = el('g', { fill: '#E9DEC1' }, gCeleiro);
            for (var cx = -120; cx < 620; cx += 70) el('rect', { x: cx, y: CHAO_Y - 46, width: 8, height: 46 }, cerca);
            el('rect', { x: -120, y: CHAO_Y - 40, width: 740, height: 6 }, cerca);
            el('rect', { x: -120, y: CHAO_Y - 22, width: 740, height: 6 }, cerca);
        }

        /* --- chão (nos lugares com lago, a margem fica na frente, depois da água) --- */
        var chaoY = chaoDe(lugar);
        var gAgua = null, pOndas = null, rGelo = null, gReflexos = null, gJuncos = null;
        if (temAgua) {
            gAgua = el('g', null, gSet);
            el('rect', { x: -600, y: AGUA_Y, width: 2200, height: 400, fill: 'url(#agua-' + id + ')' }, gAgua);
            rGelo = el('rect', { x: -600, y: AGUA_Y, width: 2200, height: 400, fill: '#E3EEF6', opacity: 0 }, gAgua);
            gReflexos = el('g', { 'clip-path': 'url(#clipagua-' + id + ')', opacity: 0.32 }, gAgua);
            pOndas = el('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.35 }, gAgua);
        }
        var rChao = el('rect', { x: -600, y: chaoY, width: 2200, height: 400 }, gSet);
        var pTufos = el('path', null, gSet);
        var dTufos = '';
        GEO.tufos.forEach(function (t) {
            var ty = chaoY + (t.y - CHAO_Y) * (temAgua ? 0.35 : 1);
            dTufos += 'M' + t.x + ',' + ty.toFixed(1) + ' q' + (3 * t.s) + ',' + (-9 * t.s) + ' ' + (7 * t.s) + ',0 M' + (t.x + 5) + ',' + ty.toFixed(1) + ' q' + (2 * t.s) + ',' + (-6 * t.s) + ' ' + (5 * t.s) + ',0';
        });
        pTufos.setAttribute('d', dTufos);
        pTufos.setAttribute('fill', 'none'); pTufos.setAttribute('stroke-width', 2); pTufos.setAttribute('stroke-linecap', 'round');
        var rNeveChao = el('rect', { x: -600, y: chaoY - 4, width: 2200, height: 400, fill: '#F4F8FC', opacity: 0 }, gSet);
        if (temAgua) {
            /* juncos na margem da frente */
            var gJ = el('g', null, gSet);
            var dJ = '', dJc = '';
            GEO.juncos.forEach(function (j) {
                var topo = chaoY + 4 - j.h;
                dJ += 'M' + j.x + ',' + (chaoY + 6) + ' l' + j.inc + ',' + (-j.h) + ' ';
                dJc += 'M' + (j.x + j.inc * 0.85) + ',' + (topo + 14) + ' l0,-16 ';
            });
            el('path', { d: dJ, stroke: '#4E8A3A', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, gJ);
            el('path', { d: dJc, stroke: '#7A4A22', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, gJ);
            gJuncos = { g: gJ, paths: gJ.childNodes };
        }

        /* --- decoração do lugar (sprites estáticos) --- */
        var decor = (lugar.decoracao || []).map(function (d) {
            var plano = d.plano === 'fundo' ? gMid : (d.plano === 'frente' ? gFg : gSet);
            var simb = simboloDe(d.ator, d.variante);
            if (!simb) return null;
            var def = ATORES[d.ator] || {};
            var g = el('g', null, plano);
            var u = useDe(simb, g);
            var pt = resolverPonto(d.em != null ? d.em : { x: d.x, y: d.y }, { a: {} }, lugar) || { x: CX, y: CHAO_Y };
            if (d.x != null && d.em == null) pt.x = +d.x;
            if (d.y != null && d.em == null) pt.y = +d.y;
            pt.x += d.dx || 0; pt.y += d.dy || 0;
            var s = ((def.altura || 100) * (d.escala || 1)) / simb.bbox[3];
            var flip = d.virado === 'esquerda' ? -1 : 1;
            g.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ') scale(' + (s * flip).toFixed(4) + ',' + s.toFixed(4) + ') translate(' + (-(simb.bbox[0] + simb.bbox[2] / 2)).toFixed(2) + ',' + (-(simb.bbox[1] + simb.bbox[3])).toFixed(2) + ')');
            if (d.opacidade != null) g.setAttribute('opacity', d.opacidade);
            return g;
        });

        /* --- atores dinâmicos --- */
        var atores = {};
        Object.keys(ATORES).forEach(function (nome) {
            var def = ATORES[nome];
            var g = el('g', { class: 'ator', 'data-ator': nome, opacity: 0 }, gSet);
            var gi = el('g', null, g);        /* movimento interno (bob, pulo) */
            var reg = { g: g, gi: gi, def: def, nome: nome, usos: {}, procedural: null, reflexos: {} };
            if (def.tipo === 'ovo') {
                var cor = def.cor || '#FFF8E7', tam = def.tamanho || 46;
                var go = el('g', null, gi);
                var rx = tam * 0.5, ry = tam * 0.62, cy = -ry;
                var casca = el('ellipse', { cx: 0, cy: cy, rx: rx, ry: ry, fill: cor, stroke: '#D9C9A4', 'stroke-width': 2 }, go);
                var rach = el('path', { d: 'M' + (-rx * 0.55) + ',' + (cy - ry * 0.1) + ' l' + (rx * 0.25) + ',' + (ry * 0.18) + ' l' + (rx * 0.25) + ',' + (-ry * 0.25) + ' l' + (rx * 0.25) + ',' + (ry * 0.2) + ' l' + (rx * 0.3) + ',' + (-ry * 0.15), fill: 'none', stroke: '#8C7A55', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0 }, go);
                /* metade de baixo com borda serrilhada (fica no lugar) e tampa que cai ao lado */
                var dente = '', nd = 6, passo = (rx * 2) / nd;
                for (var di = 0; di < nd; di++) dente += ' l' + (-passo / 2).toFixed(1) + ',' + (ry * 0.16).toFixed(1) + ' l' + (-passo / 2).toFixed(1) + ',' + (-ry * 0.16).toFixed(1);
                var metA = el('path', { d: 'M' + (-rx) + ',' + cy + ' a' + rx + ',' + ry + ' 0 0 0 ' + (rx * 2) + ',0' + dente + ' Z', fill: cor, stroke: '#D9C9A4', 'stroke-width': 2, opacity: 0 }, go);
                var metB = el('path', { d: 'M' + (-rx) + ',' + cy + ' a' + rx + ',' + ry + ' 0 0 1 ' + (rx * 2) + ',0' + dente + ' Z', fill: cor, stroke: '#D9C9A4', 'stroke-width': 2, opacity: 0, transform: 'translate(' + (rx * 1.9) + ',' + (ry * 0.9) + ') rotate(38) scale(0.7)' }, go);
                reg.procedural = { casca: casca, rach: rach, metA: metA, metB: metB, tam: tam };
            } else {
                var vars = ['base'].concat(Object.keys(def.variantes || {}));
                vars.forEach(function (v) {
                    var simb = simboloDe(nome, v);
                    if (!simb) return;
                    var gu = el('g', { opacity: v === 'base' ? 1 : 0 }, gi);
                    useDe(simb, gu);
                    reg.usos[v] = { g: gu, simb: simb };
                    if (gReflexos) {
                        var gr = el('g', { opacity: 0 }, gReflexos);
                        useDe(simb, gr);
                        reg.reflexos[v] = gr;
                    }
                });
            }
            atores[nome] = reg;
        });
        /* atores em ordem de camada: quem está mais embaixo (y maior) fica na frente */
        var listaAtores = Object.keys(atores);

        /* --- primeiro plano: chuva, neve, névoa, partículas --- */
        var pChuva = el('path', { stroke: '#9CC3FF', 'stroke-width': 1.1, opacity: 0, fill: 'none' }, gSet);
        var pChuvaFg = el('path', { stroke: '#C7DCFF', 'stroke-width': 2.2, opacity: 0, fill: 'none', filter: fSoft }, gFg);
        var pNeve = el('path', { fill: '#FFFFFF', opacity: 0 }, gSet);
        var pNeveFg = el('path', { fill: '#FFFFFF', opacity: 0, filter: fSoft }, gFg);
        var pPart = el('path', { fill: '#FFE9A8', opacity: 0 }, gSet);
        var bokeh = GEO.part.filter(function (p) { return p.bokeh; }).map(function () { return el('circle', { r: 6, fill: '#FFE9A8', opacity: 0, filter: fSoft }, gSet); });
        var neblina = [0, 1, 2, 3, 4, 5].map(function () { return el('ellipse', { rx: 200, ry: 36, fill: 'url(#nev-' + id + ')', opacity: 0 }, gFg); });

        /* --- lente --- */
        var rFrio = el('rect', { width: W, height: HH, fill: '#1D3A8A', opacity: 0 }, gLente);
        var rQuente = el('rect', { width: W, height: HH, fill: '#F59E0B', opacity: 0 }, gLente);
        var rEscuro = el('rect', { width: W, height: HH, fill: '#000', opacity: 0 }, gLente);
        var rFlash = el('rect', { width: W, height: HH, fill: '#EAF2FF', opacity: 0 }, gLente);
        var rVin = el('rect', { width: W, height: HH, fill: 'url(#vin-' + id + ')', opacity: 0 }, gLente);
        if (!LEVE) { rFrio.style.mixBlendMode = 'multiply'; rQuente.style.mixBlendMode = 'soft-light'; }

        /* cache de valores para não reescrever atributos iguais */
        var cache = {};
        function set(node, attr, val) {
            var k = attr + '@' + (node.__k || (node.__k = Math.random()));
            if (cache[k] === val) return;
            cache[k] = val;
            node.setAttribute(attr, val);
        }
        function T(f, s, E, shX, shY) {
            var z = 1 + (E.zoom - 1) * s;
            var dx = (E.fx - CX) * f + shX, dy = (E.fy - CY) * f + shY;
            return 'translate(' + CX + ',' + CY + ') scale(' + z.toFixed(4) + ') translate(' + (-(CX + dx)).toFixed(2) + ',' + (-(CY + dy)).toFixed(2) + ')';
        }

        /* ----- pintor de quadro ----- */
        function pintar(E) {
            var rel = E.rel;
            var pal = paletaDe(E);
            var dia = pal.luz;
            var n = Math.floor(rel / 16.7), sg = (n % 2 === 0) ? 1 : -1;
            var trem = MOV_REDUZIDO ? 0 : 1;
            var frX = sg * (E.abalo * (0.55 + 0.45 * hsh(n)) + E.tensao * (0.55 + 0.45 * hsh(n + 77))) * trem;
            var frY = -sg * (E.abalo * (0.55 + 0.45 * hsh(n + 31)) + E.tensao * (0.55 + 0.45 * hsh(n + 13))) * 0.75 * trem;
            var shX = frX * (W / E.zoom), shY = frY * (W / E.zoom);
            set(gSky, 'transform', T(0.05, 0.85, E, shX, shY));
            set(gFar, 'transform', T(0.3, 0.9, E, shX, shY));
            set(gMid, 'transform', T(0.55, 0.95, E, shX, shY));
            set(gSet, 'transform', T(1.0, 1.0, E, shX, shY));
            set(gFg, 'transform', T(1.6, 1.15, E, shX, shY));

            /* céu */
            var fl = E.flash;
            set(stCeu[0], 'stop-color', mix(pal.topo, '#EAF2FF', fl * 0.7));
            set(stCeu[1], 'stop-color', mix(pal.meio, '#EAF2FF', fl * 0.7));
            set(stCeu[2], 'stop-color', mix(pal.base, '#EAF2FF', fl * 0.7));
            set(gSol, 'opacity', (E.sol * (1 - E.nuvens * 0.8)).toFixed(3));
            if (E.sol > 0.01) { var sy = 300 - 180 * E.sol; set(cSol, 'cy', sy.toFixed(1)); set(cSol2, 'cy', sy.toFixed(1)); }
            set(gLua, 'opacity', (E.lua * (1 - E.nuvens * 0.9) * (1 - fl)).toFixed(3));
            set(cLuaSombra, 'fill', pal.topo);
            var opE = cl(E.estrelas * (1 - E.nuvens * 1.2) * (1 - dia * 0.85) * (1 - fl));
            pEstrelas.forEach(function (p, gi) { set(p, 'opacity', (opE * (0.45 + 0.4 * Math.sin(rel * 0.0021 + gi * 2.1))).toFixed(3)); });
            var corNuv = mix(mix('#F6FAFF', '#0F1424', 1 - dia), '#AEB6C9', E.nuvens * 0.6);
            corNuv = mix(corNuv, '#EEF4FF', fl);
            set(gNuv, 'opacity', cl(E.nuvens * 1.3).toFixed(3));
            if (E.nuvens > 0.01) nuvens.forEach(function (o) {
                var x = o.nv.x - 520 * Math.pow(1 - E.nuvens, 2) + ((E.nuvemX * o.nv.v) % 1700) - 300;
                set(o.g, 'transform', 'translate(' + x.toFixed(1) + ',' + o.nv.y + ') scale(' + o.nv.s + ')');
                set(o.g, 'fill', corNuv);
            });
            /* raio */
            if (E.raio > 0.02) {
                var rx = 260 + 400 * hsh(Math.floor(rel / 900)), ry = -60, d = 'M' + rx + ',' + ry;
                for (var k2 = 1; k2 <= 9; k2++) { rx += (hsh(5 + k2) - 0.5) * 70; ry += 40 + hsh(5 + k2 * 3) * 12; d += 'L' + rx.toFixed(1) + ',' + ry.toFixed(1); }
                set(pRaio, 'd', d); set(pRaioGlow, 'd', d);
                set(pRaio, 'opacity', E.raio.toFixed(3)); set(pRaioGlow, 'opacity', (E.raio * (LEVE ? 0.25 : 0.5)).toFixed(3));
            } else { set(pRaio, 'opacity', 0); set(pRaioGlow, 'opacity', 0); }

            /* fundo */
            var neveChao = Math.max(E.neve * 0.9, E.gelo, ehInverno ? 1 : 0);
            var corColA = mix(mix('#2E5F3A', '#7FBF6A', dia), '#DCE7F0', neveChao);
            var corColB = mix(mix('#3E7A45', '#94CF7B', dia), '#EBF2F8', neveChao);
            if (ehBosque) { corColA = mix(mix('#1E3A2E', '#5B9A6B', dia), '#D7E2EA', neveChao); corColB = mix(mix('#264A36', '#6FAF78', dia), '#E4ECF2', neveChao); }
            set(pColA, 'fill', mix(corColA, '#EEF4FF', fl * 0.5));
            set(pColB, 'fill', mix(corColB, '#EEF4FF', fl * 0.5));
            if (arvFundo.length) arvFundo.forEach(function (g, i) {
                set(g, 'fill', mix(mix('#173225', '#3E7F4B', dia), '#C9D8E2', neveChao));
                set(g, 'transform', 'translate(' + (E.vento * 2.5 * Math.sin(rel * 0.0025 + i)).toFixed(2) + ',0)');
            });
            if (gCeleiro) set(gCeleiro, 'opacity', (0.55 + 0.45 * dia).toFixed(3));
            var corChao = mix(mix('#2B5A33', '#7CC26E', dia), '#F4F8FC', neveChao);
            set(rChao, 'fill', mix(corChao, '#EEF4FF', fl * 0.4));
            set(pTufos, 'stroke', mix(mix('#3F7A3F', '#4E9E4A', dia), '#F4F8FC', neveChao));
            set(pTufos, 'opacity', (1 - neveChao).toFixed(3));
            set(rNeveChao, 'opacity', neveChao.toFixed(3));

            /* água */
            if (gAgua) {
                var corA1 = mix(mix('#1B2F58', '#7ACBF5', dia), '#F5FAFF', fl * 0.5);
                var corA2 = mix(mix('#0E1A38', '#2F7FBF', dia), '#EAF2FF', fl * 0.5);
                set(stAgua[0], 'stop-color', corA1); set(stAgua[1], 'stop-color', corA2);
                set(rGelo, 'opacity', (E.gelo * 0.92).toFixed(3));
                var dO = '';
                for (var o = 0; o < 9; o++) {
                    var ox = -150 + o * 160 + Math.sin(rel * 0.0004 + o) * 40, oy = AGUA_Y + 18 + o * 11 + (o % 3) * 20;
                    dO += 'M' + ox.toFixed(1) + ',' + oy + ' q' + 25 + ',' + (-3 - 3 * E.ondas) + ' 50,0 q25,' + (3 + 3 * E.ondas) + ' 50,0 ';
                }
                set(pOndas, 'd', dO);
                set(pOndas, 'opacity', ((0.18 + 0.25 * dia) * (1 - E.gelo)).toFixed(3));
                set(gJuncos.paths[0], 'stroke', mix(mix('#274A22', '#4E8A3A', dia), '#D8E2EA', neveChao));
            }

            /* atores */
            var ordem = listaAtores.slice().sort(function (p, q) { return E.a[p].y - E.a[q].y; });
            var chaveOrdem = ordem.join('|');
            if (chaveOrdem !== cache.__ordem) { cache.__ordem = chaveOrdem; ordem.forEach(function (nome) { gSet.appendChild(atores[nome].g); }); }
            listaAtores.forEach(function (nome) {
                var reg = atores[nome], st = E.a[nome], def = reg.def;
                var vis = st.op > 0.005;
                set(reg.g, 'opacity', vis ? st.op.toFixed(3) : 0);
                if (!vis) { Object.keys(reg.reflexos).forEach(function (v) { set(reg.reflexos[v], 'opacity', 0); }); return; }
                var x = st.x, y = st.y - st.pulo;
                var bob = 0, rot = 0, sx = 1, sy = 1;
                var fase = rel * 0.001;
                var forcaMov = MOV_REDUZIDO ? 0.3 : 1;
                if (st.modo === 'andar') { bob = Math.abs(Math.sin(fase * 9)) * 5; rot = Math.sin(fase * 9) * 4; }
                else if (st.modo === 'correr') { bob = Math.abs(Math.sin(fase * 14)) * 9; rot = Math.sin(fase * 14) * 6; }
                else if (st.modo === 'nadar') { bob = Math.sin(fase * 2.2) * 2.5; rot = Math.sin(fase * 2.2) * 2; }
                else if (st.modo === 'boiar') { bob = Math.sin(fase * 1.6) * 2.2; rot = Math.sin(fase * 1.6 + 1) * 1.5; }
                else if (st.modo === 'voar' || st.modo === 'planar') { bob = Math.sin(fase * (st.modo === 'voar' ? 7 : 2)) * 6; sy = 1 + Math.sin(fase * (st.modo === 'voar' ? 14 : 3)) * 0.06; }
                else { sy = 1 + Math.sin(fase * 1.4 + x * 0.01) * 0.012; sx = 1 - Math.sin(fase * 1.4 + x * 0.01) * 0.008; }
                bob *= forcaMov; rot *= forcaMov;
                if (st.treme) { x += Math.sin(rel * 0.09) * 2.2 * st.treme; rot += Math.sin(rel * 0.11) * 2.5 * st.treme; }
                if (st.balanca) rot += Math.sin(rel * 0.006) * 9 * st.balanca;
                var simb = reg.usos.base && reg.usos.base.simb;
                if (reg.procedural) {
                    var pr = reg.procedural;
                    set(reg.g, 'transform', 'translate(' + x.toFixed(2) + ',' + (y - bob).toFixed(2) + ') scale(' + st.s.toFixed(3) + ')');
                    set(reg.gi, 'transform', 'rotate(' + rot.toFixed(2) + ')');
                    var aberto = st.estado === 'aberto', rach = st.estado === 'rachado' || aberto;
                    set(pr.rach, 'opacity', (rach && !aberto) ? 1 : 0);
                    set(pr.casca, 'opacity', aberto ? 0 : 1);
                    set(pr.metA, 'opacity', aberto ? 1 : 0);
                    set(pr.metB, 'opacity', aberto ? 1 : 0);
                    return;
                }
                if (!simb) return;
                var s = (def.altura || 100) * st.s / simb.bbox[3];
                var ax = simb.bbox[0] + simb.bbox[2] / 2, ay = simb.bbox[1] + simb.bbox[3];
                set(reg.g, 'transform', 'translate(' + x.toFixed(2) + ',' + (y - bob).toFixed(2) + ') rotate(' + rot.toFixed(2) + ') scale(' + (st.flip * sx).toFixed(4) + ',' + sy.toFixed(4) + ')');
                Object.keys(reg.usos).forEach(function (v) {
                    var u = reg.usos[v];
                    var op = v === st.var1 ? 1 - st.varK : (v === st.var2 ? st.varK : 0);
                    set(u.g, 'opacity', op.toFixed(3));
                    var sv = (def.altura || 100) * st.s / u.simb.bbox[3];
                    var axv = u.simb.bbox[0] + u.simb.bbox[2] / 2, ayv = u.simb.bbox[1] + u.simb.bbox[3];
                    set(u.g, 'transform', 'scale(' + sv.toFixed(4) + ') translate(' + (-axv).toFixed(2) + ',' + (-ayv).toFixed(2) + ')');
                    var gr = reg.reflexos[v];
                    if (gr) {
                        var naAgua = temAgua && st.y >= AGUA_Y - 3 && st.y < MARGEM_Y - 10;
                        set(gr, 'opacity', naAgua ? (op * st.op * (1 - E.gelo)).toFixed(3) : 0);
                        if (naAgua) set(gr, 'transform', 'translate(' + x.toFixed(2) + ',' + (y + 2).toFixed(2) + ') scale(' + (st.flip * sv).toFixed(4) + ',' + (-sv * 0.85).toFixed(4) + ') translate(' + (-axv).toFixed(2) + ',' + (-ayv).toFixed(2) + ')');
                    }
                });
            });

            /* chuva */
            if (E.chuva > 0.03) {
                var ang = 4 + 24 * E.vento, dEsc = '', dFg = '';
                GEO.gotas.forEach(function (gt, gi) {
                    if (LEVE && gi % 2) return;
                    var gy = -120 + ((gt.y + 120 + rel * gt.v * 0.9) % 760);
                    var gx = -240 + ((gt.x + 240 + rel * 0.25 * gt.v) % 1500);
                    dEsc += 'M' + gx.toFixed(0) + ',' + gy.toFixed(0) + 'l' + (-ang * gt.len / 20).toFixed(1) + ',' + gt.len.toFixed(0);
                });
                GEO.gotasFg.forEach(function (gt, gi) {
                    if (LEVE && gi % 2) return;
                    var gy = -200 + ((gt.y + 200 + rel * gt.v * 1.3) % 900);
                    var gx = -200 + ((gt.x + 200 + rel * 0.4 * gt.v) % 1400);
                    dFg += 'M' + gx.toFixed(0) + ',' + gy.toFixed(0) + 'l' + (-(6 + 30 * E.vento) * gt.len / 40).toFixed(1) + ',' + gt.len.toFixed(0);
                });
                set(pChuva, 'd', dEsc); set(pChuvaFg, 'd', dFg);
                set(pChuva, 'stroke-width', (1.1 / Math.sqrt(E.zoom)).toFixed(2));
                set(pChuva, 'opacity', (E.chuva * 0.42).toFixed(3)); set(pChuvaFg, 'opacity', (E.chuva * 0.3).toFixed(3));
            } else { set(pChuva, 'opacity', 0); set(pChuvaFg, 'opacity', 0); }
            /* neve */
            if (E.neve > 0.03) {
                var dN = '', dNf = '';
                GEO.flocos.forEach(function (f, fi) {
                    if (LEVE && fi % 2) return;
                    var fy = -120 + ((f.y + 120 + rel * f.v) % 760);
                    var fx = -240 + ((f.x + 240 + Math.sin(rel * 0.0008 + f.fase) * f.amp + rel * 0.02 * E.vento) % 1500);
                    var r = f.r;
                    var seg = 'M' + fx.toFixed(0) + ',' + fy.toFixed(0) + 'm-' + r + ',0a' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0a' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
                    if (fi % 5 === 0) dNf += seg; else dN += seg;
                });
                set(pNeve, 'd', dN); set(pNeveFg, 'd', dNf);
                set(pNeve, 'opacity', (E.neve * 0.85).toFixed(3)); set(pNeveFg, 'opacity', (E.neve * 0.5).toFixed(3));
            } else { set(pNeve, 'opacity', 0); set(pNeveFg, 'opacity', 0); }
            /* partículas e vagalumes */
            var opP = Math.max(E.particulas, E.vagalumes);
            if (opP > 0.02) {
                var dP = '', bi = 0;
                var cor = E.vagalumes > E.particulas ? '#D9FF6A' : (dia > 0.5 ? '#FFF1C2' : '#FDE68A');
                GEO.part.forEach(function (p, i) {
                    if (LEVE && i % 2) return;
                    var sobe = (rel * p.vel * 2 + i * 37) % 160;
                    var px = p.x + Math.sin(rel * p.vel + p.fase) * p.amp;
                    var py = p.y0 - sobe + 80;
                    var tw = 0.35 + 0.65 * Math.abs(Math.sin(rel * 0.0023 + i * 1.7));
                    if (p.bokeh) {
                        var c = bokeh[bi++];
                        if (c) { set(c, 'cx', px.toFixed(0)); set(c, 'cy', py.toFixed(0)); set(c, 'opacity', (tw * opP * 0.2).toFixed(3)); set(c, 'fill', cor); }
                    } else {
                        var r = p.r * (0.6 + 0.6 * tw);
                        dP += 'M' + px.toFixed(0) + ',' + py.toFixed(0) + 'm-' + r.toFixed(1) + ',0a' + r.toFixed(1) + ',' + r.toFixed(1) + ' 0 1,0 ' + (r * 2).toFixed(1) + ',0a' + r.toFixed(1) + ',' + r.toFixed(1) + ' 0 1,0 -' + (r * 2).toFixed(1) + ',0';
                    }
                });
                set(pPart, 'd', dP); set(pPart, 'fill', cor); set(pPart, 'opacity', (opP * 0.85).toFixed(3));
            } else { set(pPart, 'opacity', 0); bokeh.forEach(function (c) { set(c, 'opacity', 0); }); }
            /* névoa */
            if (E.neblina > 0.02) neblina.forEach(function (e, nb) {
                var fnb = ((rel * 0.00012 + nb * 0.17) % 1);
                set(e, 'cx', (120 + nb * 170 + Math.sin(rel * 0.0006 + nb) * 30).toFixed(0));
                set(e, 'cy', (CHAO_Y + 40 - fnb * 140).toFixed(0));
                set(e, 'opacity', (E.neblina * 0.3 * Math.sin(fnb * Math.PI)).toFixed(3));
            }); else neblina.forEach(function (e) { set(e, 'opacity', 0); });

            /* lente */
            set(rFrio, 'opacity', (E.frio * (LEVE ? 0.18 : 0.3)).toFixed(3));
            set(rQuente, 'opacity', (E.quente * (LEVE ? 0.12 : 0.35)).toFixed(3));
            set(rEscuro, 'opacity', (E.escuro * 0.8).toFixed(3));
            set(rFlash, 'opacity', (E.flash * 0.4).toFixed(3));
            set(rVin, 'opacity', E.vinheta.toFixed(3));
        }

        return pintar;
    }

    /* ---------------------------------------------------------------------
       LEGENDAS + NARRAÇÃO
       --------------------------------------------------------------------- */
    var TODAS_LEGENDAS = [];
    var narrando = 0;
    var ENTRA_MS = 800, SOME_MS = 650;
    var PAUSADO = false;

    function duckMusica(on) { if (window.__miraMusica) window.__miraMusica.duck(on); }
    function tocarNarracao(lg) {
        if (!lg.audio || window.__miraMudo || PAUSADO) return;
        try { lg.audio.currentTime = 0; } catch (e) {}
        var p = lg.audio.play();
        if (p && p.then) p.then(function () { lg.pendente = false; }).catch(function () { lg.pendente = true; });
    }
    function pararNarracao(lg) {
        if (!lg.audio) return;
        lg.pendente = false; lg.retomar = false;
        if (!lg.audio.paused) lg.audio.pause();
    }
    function montarLegendas(secao, cena) {
        var caixa = document.createElement('div');
        caixa.className = 'conto' + (cena.capa ? ' capa' : '');
        secao.appendChild(caixa);
        return cena.legs.map(function (lg) {
            var e = document.createElement('div');
            e.className = 'frase' + (lg.classe ? ' ' + lg.classe : '');
            e.textContent = lg.texto;
            caixa.appendChild(e);
            var audio = null;
            if (lg.arquivo) {
                audio = new Audio(lg.arquivo);
                audio.preload = 'auto';
                audio.addEventListener('play', function () { narrando++; duckMusica(true); });
                var soltar = function () { narrando = Math.max(0, narrando - 1); if (!narrando) duckMusica(false); };
                audio.addEventListener('pause', soltar);
                audio.addEventListener('ended', soltar);
                audio.addEventListener('error', function () { lg.audio = null; });
            }
            var reg = { de: lg.de * 1000, ate: lg.ate == null ? Infinity : lg.ate * 1000, el: e, op: -1, audio: audio, tocou: false, pendente: false };
            TODAS_LEGENDAS.push(reg);
            return reg;
        });
    }
    function pintarLegendas(legendas, ms) {
        legendas.forEach(function (lg) {
            var op = 0;
            if (ms >= lg.de) {
                var entra = Math.min(1, (ms - lg.de) / ENTRA_MS);
                var sai = ms < lg.ate ? 1 : Math.max(0, 1 - (ms - lg.ate) / SOME_MS);
                op = suave(Math.min(entra, sai));
                if (!lg.tocou) {
                    lg.tocou = true;
                    if (ms - lg.de < 1500) tocarNarracao(lg);
                }
            } else if (lg.tocou) { lg.tocou = false; pararNarracao(lg); }
            if (op !== lg.op) { lg.el.style.opacity = op.toFixed(3); lg.op = op; }
        });
    }
    ['keydown', 'pointerdown'].forEach(function (ev) {
        document.addEventListener(ev, function () {
            TODAS_LEGENDAS.forEach(function (lg) { if (lg.pendente && lg.op > 0) tocarNarracao(lg); });
        }, { passive: true });
    });
    function algumaVozTocando() {
        return TODAS_LEGENDAS.some(function (lg) { return lg.audio && !lg.audio.paused && !lg.audio.ended; });
    }
    window.__miraNarracao = {
        pararTudo: function () { TODAS_LEGENDAS.forEach(function (lg) { pararNarracao(lg); }); },
        pausar: function () { TODAS_LEGENDAS.forEach(function (lg) { if (lg.audio && !lg.audio.paused) { lg.audio.pause(); lg.retomar = true; } }); },
        retomar: function () { TODAS_LEGENDAS.forEach(function (lg) { if (lg.retomar && lg.audio) { lg.retomar = false; if (window.__miraMudo) return; var p = lg.audio.play(); if (p && p.catch) p.catch(function () {}); } }); }
    };

    /* ---------------------------------------------------------------------
       TRAVA DE AVANÇO E MODO AUTOMÁTICO
       --------------------------------------------------------------------- */
    var prontoAtual = null;
    window.__miraPronto = false;
    var AUTO = false;
    try { AUTO = localStorage.getItem('mira-history-auto') === '1'; } catch (e) {}
    function rearmarPronto() { prontoAtual = null; }   /* força reavaliar (e disparar o automático) no próximo quadro */
    function sinalizarPronto(v, capa) {
        if (v === prontoAtual) return;
        prontoAtual = v;
        window.__miraPronto = v;
        var btn = document.getElementById('mira-next'), nav = document.getElementById('mira-nav');
        if (btn) btn.classList.toggle('pronto', v);
        if (nav) nav.classList.toggle('pronto', v);
        /* a capa espera o gesto (autoplay de áudio); o modo automático não sai dela sozinho */
        if (v && AUTO && !capa && window.__miraIr) {
            clearTimeout(window.__miraAutoTimer);
            window.__miraAutoTimer = setTimeout(function () { if (window.__miraPronto && AUTO && !PAUSADO) window.__miraIr(1); }, 900);
        }
    }

    /* ---------------------------------------------------------------------
       REGENTE: relógio por cena, visível ou congelado
       --------------------------------------------------------------------- */
    var TESTE = (function () {
        var q = {};
        (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
        if (q.video != null) window.__miraModoVideo = true;
        return q.cena != null ? { cena: q.cena, t: +(q.t || 0) } : null;
    })();

    function reger(svgId, quadro, aoEntrar) {
        var svg = document.getElementById(svgId);
        var slide = svg && svg.closest('section');
        var origem = null, visivel = false, deslocamento = 0, dirigido = null, ultimo = 0, pintouZero = false, ultimoTick = -1000, pausaEm = null, ultimoCongelado = null;
        var controle = {
            agora: function () { return ultimo; },
            dirigir: function (ms) { dirigido = Math.max(0, ms); ultimo = dirigido; ultimoCongelado = dirigido; quadro(dirigido, true); },
            liberar: function () { dirigido = null; origem = null; deslocamento = ultimo; },
            retomar: function (ms) { dirigido = null; origem = null; deslocamento = Math.max(0, ms || 0); ultimo = deslocamento; },
            zerar: function () { dirigido = null; origem = null; deslocamento = 0; ultimo = 0; },
            pausar: function () { if (pausaEm == null) pausaEm = ultimo; },
            continuar: function () { if (pausaEm != null) { deslocamento = pausaEm; origem = null; pausaEm = null; } },
            visivel: function () { return visivel; }
        };
        RELOGIOS[svgId] = controle;

        function tick(ts) {
            requestAnimationFrame(tick);
            if (!visivel) {
                if (!pintouZero) { quadro(0, false); pintouZero = true; }
                return;
            }
            pintouZero = false;
            /* congelado (dirigido ou pausado): pinta uma vez por instante, não a cada quadro */
            if (dirigido !== null) { if (ultimoCongelado !== dirigido) { ultimoCongelado = dirigido; ultimo = dirigido; quadro(dirigido, true); } return; }
            if (pausaEm != null) { if (ultimoCongelado !== pausaEm) { ultimoCongelado = pausaEm; quadro(pausaEm, true); } return; }
            ultimoCongelado = null;
            if (origem === null) origem = ts;
            if (LEVE && ts - ultimoTick < 30) return;
            ultimoTick = ts;
            ultimo = deslocamento + ts - origem;
            quadro(ultimo, true);
        }
        requestAnimationFrame(tick);

        if (typeof IntersectionObserver === 'function' && slide) {
            new IntersectionObserver(function (entradas) {
                entradas.forEach(function (e) {
                    if (e.isIntersecting === visivel) return;
                    visivel = e.isIntersecting;
                    if (visivel) controle.retomar(typeof aoEntrar === 'function' ? aoEntrar() : 0);
                    else { controle.zerar(); pausaEm = null; }
                });
            }, { threshold: 0.5 }).observe(slide);
        } else { visivel = true; }
        return controle;
    }

    function montarCena(cena, secao) {
        var svgId = 'stage-' + cena.id;
        var svg = document.getElementById(svgId);
        var idAnterior = (cena.idx > 0 && !CENAS[cena.idx - 1].capa) ? CENAS[cena.idx - 1].id : null;
        var repousoAnterior = idAnterior ? REPOUSO[idAnterior] : estado0();
        var base = clone(repousoAnterior);
        var origens = prepararOrigens(cena, base);
        var pintar = montarPalco(svg, cena);
        var legendas = montarLegendas(secao, cena);
        var temProximo = cena.idx < CENAS.length - 1;
        var btnInicio = secao.querySelector('.btn-inicio');
        var btnComecar = secao.querySelector('.capa-botoes');

        var controle = reger(svgId, function (ms, vivo) {
            if (vivo) sinalizarPronto(cena.capa ? true : (temProximo && ms >= cena.dur && !algumaVozTocando()), !!cena.capa);
            if (btnInicio) btnInicio.classList.toggle('on', ms >= cena.tBotaoInicio * 1000);
            if (btnComecar) btnComecar.classList.toggle('on', ms >= 1200);
            if (ms === 0) {
                var viva = idAnterior ? Bus.ler(idAnterior) : null;
                var novaBase = viva || clone(repousoAnterior);
                if (novaBase !== base) { base = novaBase; origens = prepararOrigens(cena, base); }
            }
            var E = poseAt(base, ms / 1000, cena, origens);
            pintar(E);
            pintarLegendas(legendas, ms);
            if (ms > 0) Bus.gravar(cena.id, E, ms);
        }, function () {
            if (!RETORNOS[cena.id]) return 0;
            RETORNOS[cena.id] = false;
            var g = Bus.instante(cena.id);
            return g === null ? cena.dur : g;
        });

        /* rewind ao voltar num elo de plano-sequência */
        if (idAnterior && !cena.corte) {
            RETROCEDER[idAnterior] = function (concluir) {
                /* a espera depois do fim não entra no rewind: só a ação da cena */
                var agora = Math.min(controle.agora(), cena.dur);
                var durVolta = 900, t0 = null, parado = false;
                function passo(ts) {
                    if (parado) return;
                    if (t0 === null) t0 = ts;
                    var k = Math.min(1, (ts - t0) / durVolta);
                    controle.dirigir(agora * (1 - suave(k)));
                    if (k >= 1) { controle.dirigir(0); concluir(); return; }
                    requestAnimationFrame(passo);
                }
                requestAnimationFrame(passo);
                return function () { parado = true; controle.liberar(); };
            };
        }
        return controle;
    }

    /* ---------------------------------------------------------------------
       CONSTRUÇÃO DO DOM: uma <section> por cena
       --------------------------------------------------------------------- */
    function construirSecoes() {
        var frag = document.createDocumentFragment();
        var ancora = document.getElementById('mira-cenas') || document.body;
        CENAS.forEach(function (c) {
            var s = document.createElement('section');
            s.setAttribute('data-cena', c.id);
            if (c.corte) s.setAttribute('data-mira-corte', c.corte);
            else if (c.idx > 0) { s.setAttribute('data-mira-seq-de', CENAS[c.idx - 1].id); }
            s.setAttribute('data-mira-seq', c.id);
            var st = document.createElement('div');
            st.className = 'anim-stage';
            var svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('id', 'stage-' + c.id);
            svg.setAttribute('viewBox', '0 0 960 540');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            st.appendChild(svg);
            s.appendChild(st);
            if (c.capa) {
                var qr = document.createElement('div');
                qr.id = 'qr-capa'; qr.className = 'qr-capa'; qr.hidden = true;
                qr.innerHTML = '<div class="qr-cartao"><svg id="qr-svg" shape-rendering="crispEdges"></svg></div><div class="qr-dica">leia para abrir no celular</div>';
                s.appendChild(qr);
                var caixa = document.createElement('div');
                caixa.className = 'capa-botoes';
                var bc = document.createElement('button');
                bc.className = 'btn-comecar'; bc.type = 'button'; bc.textContent = H.textoComecar || 'Começar a história';
                var ba = document.createElement('button');
                ba.className = 'btn-comecar btn-auto-capa'; ba.type = 'button'; ba.textContent = H.textoAutomatico || 'Tocar tudo sozinho';
                caixa.appendChild(bc); caixa.appendChild(ba);
                s.appendChild(caixa);
            }
            if (c.fim) {
                var bi = document.createElement('button');
                bi.className = 'btn-inicio'; bi.id = 'mira-inicio'; bi.type = 'button'; bi.textContent = H.textoVoltar || 'Voltar ao início';
                s.appendChild(bi);
            }
            frag.appendChild(s);
        });
        if (ancora === document.body) document.body.insertBefore(frag, document.body.firstChild);
        else ancora.parentNode.replaceChild(frag, ancora);
    }

    /* ---------------------------------------------------------------------
       NAVEGAÇÃO: corte seco no par, dissolve nos cortes, trava, rewind
       --------------------------------------------------------------------- */
    function montarNavegacao() {
        var secs = Array.prototype.slice.call(document.querySelectorAll('body > section'));
        if (!secs.length) return;
        var progress = document.getElementById('mira-progress');
        var prevBtn = document.getElementById('mira-prev'), nextBtn = document.getElementById('mira-next'), replayBtn = document.getElementById('mira-replay');
        var pauseBtn = document.getElementById('mira-pausa'), autoBtn = document.getElementById('mira-auto');

        function atual() {
            var meio = window.innerHeight / 2, achado = 0;
            secs.forEach(function (s, i) { var r = s.getBoundingClientRect(); if (r.top <= meio && r.bottom > meio) achado = i; });
            return achado;
        }
        function idDe(i) { return secs[i].getAttribute('data-cena'); }
        function ehCorte(i) { return secs[i].hasAttribute('data-mira-corte'); }
        function saltar(i, seco) { secs[i].scrollIntoView({ behavior: seco ? 'instant' : 'smooth', block: 'start' }); }
        function dissolver(i) {
            var pulo = function () { secs[i].scrollIntoView({ behavior: 'instant', block: 'start' }); };
            if (document.startViewTransition && !MOV_REDUZIDO) { document.startViewTransition(pulo); return; }
            /* fallback: véu preto rápido */
            var veu = document.getElementById('mira-veu');
            if (!veu) { veu = document.createElement('div'); veu.id = 'mira-veu'; document.body.appendChild(veu); }
            veu.classList.add('on');
            setTimeout(function () { pulo(); setTimeout(function () { veu.classList.remove('on'); }, 60); }, 420);
        }
        function voltarNoPar(de, i) {
            var id = idDe(i);
            if (REWIND[id]) { REWIND[id](); delete REWIND[id]; RETORNOS[id] = true; saltar(i, true); return; }
            var retro = RETROCEDER[id];
            if (!retro || Bus.instante(id) === null) { RETORNOS[id] = true; saltar(i, true); return; }
            REWIND[id] = retro(function () { delete REWIND[id]; RETORNOS[id] = true; saltar(i, true); });
        }
        function despausar() { if (PAUSADO) alternarPausa(); }
        function ir(d) {
            var de = atual(), i = Math.max(0, Math.min(secs.length - 1, de + d));
            if (i === de) return;
            if (d > 0 && !window.__miraPronto) return;
            despausar();
            if (window.__miraNarracao) window.__miraNarracao.pararTudo();
            var deSeq = !ehCorte(i) && i === de + 1, voltaSeq = !ehCorte(de) && i === de - 1;
            if (d < 0 && voltaSeq) { voltarNoPar(de, i); return; }
            if (!deSeq && !voltaSeq) {
                if (d < 0 && Bus.instante(idDe(i)) !== null) RETORNOS[idDe(i)] = true;
                dissolver(i);
                return;
            }
            saltar(i, true);
        }
        window.__miraIr = ir;
        function reiniciar() {
            var svg = secs[atual()].querySelector('svg');
            var rel = svg && RELOGIOS[svg.id];
            if (window.__miraNarracao) window.__miraNarracao.pararTudo();
            despausar();
            if (rel) { rel.zerar(); rel.retomar(0); }
        }
        function alternarPausa() {
            PAUSADO = !PAUSADO;
            var svg = secs[atual()].querySelector('svg');
            var rel = svg && RELOGIOS[svg.id];
            if (PAUSADO) { if (rel) rel.pausar(); window.__miraNarracao.pausar(); if (window.__miraMusica) window.__miraMusica.pausar(); }
            else { if (rel) rel.continuar(); window.__miraNarracao.retomar(); if (window.__miraMusica) window.__miraMusica.retomar(); rearmarPronto(); }
            document.body.classList.toggle('pausado', PAUSADO);
            if (pauseBtn) pauseBtn.classList.toggle('on', PAUSADO);
        }
        function alternarAuto() {
            AUTO = !AUTO;
            try { localStorage.setItem('mira-history-auto', AUTO ? '1' : '0'); } catch (e) {}
            if (autoBtn) autoBtn.classList.toggle('on', AUTO);
            if (AUTO && window.__miraPronto) sinalizarPronto(false), sinalizarPronto(true);
        }
        if (autoBtn) autoBtn.classList.toggle('on', AUTO);
        document.addEventListener('visibilitychange', function () { if (document.hidden && !PAUSADO) alternarPausa(); });

        window.addEventListener('scroll', function () {
            var docH = document.documentElement.scrollHeight - window.innerHeight;
            if (progress) progress.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + '%';
        });
        if (prevBtn) prevBtn.addEventListener('click', function () { ir(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { ir(1); });
        if (replayBtn) replayBtn.addEventListener('click', reiniciar);
        if (pauseBtn) pauseBtn.addEventListener('click', function (e) { e.stopPropagation(); alternarPausa(); });
        if (autoBtn) autoBtn.addEventListener('click', function (e) { e.stopPropagation(); alternarAuto(); });
        var inicioBtn = document.getElementById('mira-inicio');
        if (inicioBtn) inicioBtn.addEventListener('click', function (e) { e.stopPropagation(); if (window.__miraNarracao) window.__miraNarracao.pararTudo(); Object.keys(POSES).forEach(function (k) { delete POSES[k]; delete INSTANTES[k]; }); dissolver(0); });
        /* capa: "Começar" avança no modo manual; "Tocar tudo sozinho" liga o automático e avança */
        var comecarBtn = document.querySelector('.btn-comecar:not(.btn-auto-capa)');
        if (comecarBtn) comecarBtn.addEventListener('click', function (e) { e.stopPropagation(); if (AUTO) alternarAuto(); ir(1); });
        var autoCapaBtn = document.querySelector('.btn-auto-capa');
        if (autoCapaBtn) autoCapaBtn.addEventListener('click', function (e) { e.stopPropagation(); if (!AUTO) alternarAuto(); ir(1); });

        /* tela cheia */
        var telaBtn = document.getElementById('mira-tela');
        var raiz = document.documentElement;
        function emTelaCheia() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
        function alternarTelaCheia() {
            if (emTelaCheia()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
            var pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
            if (!pedir) return;
            var r = pedir.call(raiz);
            var travar = function () { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} };
            if (r && r.then) r.then(travar).catch(function () {}); else travar();
        }
        if (telaBtn) {
            if (!(raiz.requestFullscreen || raiz.webkitRequestFullscreen)) telaBtn.style.display = 'none';
            telaBtn.addEventListener('click', function (e) { e.stopPropagation(); alternarTelaCheia(); });
        }
        /* deslizar */
        var toqueX = null, toqueY = null;
        document.addEventListener('touchstart', function (e) {
            if (e.target.closest && e.target.closest('#mira-nav, button')) return;
            toqueX = e.touches[0].clientX; toqueY = e.touches[0].clientY;
        }, { passive: true });
        document.addEventListener('touchend', function (e) {
            if (toqueX === null) return;
            var dx = e.changedTouches[0].clientX - toqueX, dy = e.changedTouches[0].clientY - toqueY;
            toqueX = null;
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
            ir(dx < 0 ? 1 : -1);
        }, { passive: true });
        /* roda do mouse e rolagem por toque: neutralizadas, a navegação é só pelos comandos.
           No celular a rolagem parcial fazia a cena sair da tela e reiniciar (piscando). */
        window.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('touchmove', function (e) { if (!(e.target.closest && e.target.closest('#mira-nav'))) e.preventDefault(); }, { passive: false });
        /* se algo ainda deslocar a página (barra do navegador, teclado), recoloca a cena atual no lugar */
        var ajustando = false;
        window.addEventListener('resize', function () {
            if (ajustando) return;
            ajustando = true;
            setTimeout(function () { ajustando = false; var i = atual(); secs[i].scrollIntoView({ behavior: 'instant', block: 'start' }); }, 120);
        });

        /* QR da capa: só por http num endereço de rede */
        (function () {
            var caixa = document.getElementById('qr-capa'), svg = document.getElementById('qr-svg');
            if (!caixa || !svg || typeof qrcode !== 'function') return;
            var porHttp = location.protocol === 'http:' || location.protocol === 'https:';
            var host = location.hostname;
            if (!porHttp || host === 'localhost' || host === '127.0.0.1') return;
            var url = location.origin + location.pathname;
            var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
            var nMod = qr.getModuleCount(), d = '';
            for (var r = 0; r < nMod; r++) for (var c = 0; c < nMod; c++) if (qr.isDark(r, c)) d += 'M' + c + ',' + r + 'h1v1h-1z';
            svg.setAttribute('viewBox', '0 0 ' + nMod + ' ' + nMod);
            svg.innerHTML = '<path d="' + d + '" fill="#0a0a0a"/>';
            caixa.hidden = false;
        })();

        /* música */
        var musica = document.getElementById('mira-musica');
        if (musica && H.musica) musica.setAttribute('src', H.musica);
        else if (musica) musica = null;
        var somBtn = document.getElementById('mira-som');
        var VOLUME = H.volumeMusica != null ? +H.volumeMusica : 0.35;
        var mudo = false;
        try { mudo = localStorage.getItem('mira-history-mudo') === '1'; } catch (e) {}
        window.__miraMudo = mudo;
        function pintarSom() {
            var on = document.getElementById('mira-som-on'), off = document.getElementById('mira-som-off');
            if (on) on.style.display = mudo ? 'none' : '';
            if (off) off.style.display = mudo ? '' : 'none';
        }
        var fatorDuck = 1, lacoVivo = false;
        function alvoVolume() { return mudo ? 0 : VOLUME * fatorDuck; }
        function seguirVolume() {
            if (lacoVivo || !musica) return;
            lacoVivo = true;
            var passos = 0;
            (function passo() {
                var alvo = alvoVolume();
                var v = musica.volume + (alvo - musica.volume) * 0.03;
                passos++;
                if (Math.abs(alvo - v) < 0.003 || passos > 400) { try { musica.volume = alvo; } catch (e) {} lacoVivo = false; return; }
                try { musica.volume = v; } catch (e) { lacoVivo = false; return; }
                requestAnimationFrame(passo);
            })();
        }
        window.__miraMusica = {
            duck: function (on) { fatorDuck = on ? 0.28 : 1; if (musica && !musica.paused) seguirVolume(); },
            pausar: function () { if (musica && !musica.paused) { musica.pause(); musica.__retomar = true; } },
            retomar: function () { if (musica && musica.__retomar && !mudo) { musica.__retomar = false; tocar(); } }
        };
        function tocar() {
            if (!musica || mudo || !musica.paused) return;
            try { musica.volume = 0; } catch (e) {}
            var p = musica.play();
            if (p && p.then) p.then(seguirVolume).catch(function () {});
        }
        function alternarSom() {
            mudo = !mudo;
            window.__miraMudo = mudo;
            try { localStorage.setItem('mira-history-mudo', mudo ? '1' : '0'); } catch (e) {}
            if (mudo) { if (musica) musica.pause(); window.__miraNarracao.pararTudo(); } else tocar();
            pintarSom();
        }
        pintarSom();
        if (musica) {
            tocar();
            ['keydown', 'pointerdown'].forEach(function (ev) { document.addEventListener(ev, function () { if (!PAUSADO) tocar(); }, { passive: true }); });
        }
        if (somBtn) somBtn.addEventListener('click', function (e) { e.stopPropagation(); alternarSom(); });

        document.addEventListener('keydown', function (e) {
            var t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (document.body.classList.contains('me-on') || document.body.classList.contains('md-on')) return;   /* modos E e P têm as teclas deles */
            var k = e.key;
            if (k === 'm' || k === 'M') { e.preventDefault(); alternarSom(); return; }
            if (k === 'f' || k === 'F') { e.preventDefault(); alternarTelaCheia(); return; }
            if (k === 'a' || k === 'A') { e.preventDefault(); alternarAuto(); return; }
            if (k === ' ' || k === 'Spacebar') { e.preventDefault(); alternarPausa(); return; }
            if (k === 'r' || k === 'R') { e.preventDefault(); reiniciar(); return; }
            if (['ArrowDown', 'ArrowRight', 'PageDown', 'Enter'].indexOf(k) !== -1) { e.preventDefault(); ir(1); }
            else if (['ArrowUp', 'ArrowLeft', 'PageUp'].indexOf(k) !== -1) { e.preventDefault(); ir(-1); }
        });

        /* modo de teste: ?cena=id&t=segundos congela a cena no instante */
        if (TESTE) {
            var idx = -1;
            secs.forEach(function (s, i) { if (s.getAttribute('data-cena') === TESTE.cena) idx = i; });
            if (idx < 0) idx = Math.max(0, Math.min(secs.length - 1, parseInt(TESTE.cena, 10) || 0));
            document.body.classList.add('mira-teste');
            setTimeout(function () {
                secs[idx].scrollIntoView({ behavior: 'instant', block: 'start' });
                setTimeout(function () {
                    var svg = secs[idx].querySelector('svg');
                    var rel = svg && RELOGIOS[svg.id];
                    if (rel) rel.dirigir(TESTE.t * 1000);
                    window.__miraTestePronto = true;
                }, 120);
            }, 50);
        }
    }

    /* ---------------------------------------------------------------------
       ARRANQUE
       --------------------------------------------------------------------- */
    function iniciar() {
        if (H.titulo) document.title = H.titulo;
        if (window.__miraModoVideo) { document.body.classList.add('mira-video'); window.__miraMudo = true; }
        lerSimbolos();
        compilar();
        calcularRepousos();
        construirSecoes();
        var secs = document.querySelectorAll('body > section');
        CENAS.forEach(function (c, i) { montarCena(c, secs[i]); });
        montarNavegacao();
        window.__miraHistory = { cenas: CENAS, repouso: REPOUSO, poseAt: poseAt, estado0: estado0, relogios: RELOGIOS, leve: LEVE };
        /* modo vídeo (?video=1): o gravador dirige o relógio de cada cena quadro a quadro.
           preparar(i) leva a cena para a tela; quadro(i, ms) pinta o instante exato. */
        window.__miraVideo = {
            preparar: function (i) {
                var s = secs[i];
                if (!s) return false;
                s.scrollIntoView({ behavior: 'instant', block: 'start' });
                return true;
            },
            quadro: function (i, ms) {
                var svg = secs[i] && secs[i].querySelector('svg');
                var rel = svg && RELOGIOS[svg.id];
                if (!rel) return false;
                rel.dirigir(ms);
                return true;
            },
            plano: function () {
                return CENAS.map(function (c) {
                    return { id: c.id, durS: c.durS, corte: c.corte || null, capa: !!c.capa, fim: !!c.fim,
                        falas: c.legs.filter(function (l) { return l.arquivo; }).map(function (l) { return { de: l.de, dur: l.fala, arquivo: l.arquivo }; }) };
                });
            },
            musica: H.musica || null, volumeMusica: H.volumeMusica != null ? +H.volumeMusica : 0.35
        };
        window.__miraSeqAPI = Bus;
        var durTotal = CENAS.reduce(function (s, c) { return s + c.durS; }, 0);
        console.info('[mira-history] ' + CENAS.length + ' cenas, ' + Math.round(durTotal) + ' s' + (LEVE ? ' (modo leve)' : ''));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
