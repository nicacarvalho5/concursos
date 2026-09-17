/* ==========================================================================
   Esqueleto do mira/historia.js: SÓ A SINTAXE.
   Não é uma história. Os nomes em MAIÚSCULAS são lugares vazios: troque todos
   pelo que o SEU roteiro decidiu. Quantas cenas, quais lugares, quais atores,
   qual câmera, qual clima: tudo sai da história que o autor mandou, nunca daqui.
   Vocabulário completo em references/vocabulario.md.
   ========================================================================== */
window.MiraHistoria = {
    titulo: 'TITULO DA HISTORIA',
    voz: { nome: 'pt-BR-ThalitaMultilingualNeural', rate: '-12%', pitch: '-4Hz' },
    musica: 'assets/musica/ARQUIVO.mp3',

    atores: {
        PROTAGONISTA: { arquivo: 'ARQUIVO.svg', altura: 100, olha: 'direita' },   // olha: confira em references/atores.png
        OUTRO_ATOR:   { arquivo: 'ARQUIVO.svg', altura: 100, olha: 'esquerda' },
        OBJETO:       { arquivo: 'ARQUIVO.svg', altura: 200 }                       // parado, não precisa de olha
    },

    lugares: {
        LUGAR_A: { cenario: 'CENARIO', decoracao: [ { ator: 'OBJETO', em: 'fundo.esquerda', plano: 'fundo' } ] },
        LUGAR_B: { cenario: 'CENARIO' }
    },

    cenas: [
        // capa: um cartaz; a cena seguinte começa do zero
        { id: 'capa', capa: true, lugar: 'LUGAR_A',
          ambiente: { ceu: 'PALETA', dur: 0.01 },
          acoes: [ { acao: 'mostrar', ator: 'PROTAGONISTA', em: 'chao.centro', dur: 0.01 } ] },   // o título vem de "titulo"

        // cena sem corte: continua exatamente de onde a anterior parou
        { id: 'CENA_1', lugar: 'LUGAR_A',
          acoes: [
            { acao: 'mostrar', ator: 'PROTAGONISTA', em: 'chao.esquerda', dur: 0.01 },
            { acao: 'mover', ator: 'PROTAGONISTA', para: 'chao.direita', modo: 'andar', de: 0.5, ate: 4 }
          ],
          legendas: ['FRASE DO TEXTO ORIGINAL, COM PELO MENOS TRES PALAVRAS.'] },

        // cena com corte: salto de tempo, close, ou troca de lugar
        { id: 'CENA_2', lugar: 'LUGAR_B', corte: 'dissolve',
          camera: { plano: 'medio', alvo: 'PROTAGONISTA', movimento: 'fixo' },
          acoes: [ { acao: 'mostrar', ator: 'PROTAGONISTA', em: 'chao.centro', dur: 0.01 } ],
          legendas: ['FRASE DO TEXTO ORIGINAL.'] },

        // última cena
        { id: 'CENA_FINAL', fim: true,
          legendas: ['FRASE FINAL DO TEXTO ORIGINAL.'] }
    ]
};
