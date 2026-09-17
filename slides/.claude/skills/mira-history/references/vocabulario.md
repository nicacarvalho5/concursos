# Vocabulário do `mira/historia.js`

Tudo que o runtime `mira-history.js` entende. **Só isto.** Campo fora desta lista é erro no `validar.mjs`.
O arquivo é um objeto literal em `window.MiraHistoria = { ... }`. Sem função, sem código.

## Mundo

- Quadro 16:9 de **960 x 540** unidades. A câmera enquadra dentro de um mundo maior (x de -200 a 1160).
- Linha do chão: **445** nos lugares secos. Nos lugares com lago a água ocupa o meio e a **margem fica na frente (505)**; um ator "na água" apoia os pés em **438**.
- Tempo sempre em **segundos**, contado do início da cena.
- Pontos nomeados, no formato `linha.coluna`:
  - linhas: `chao` (padrão), `agua`, `ar` (190), `alto` (90), `fundo` (linha de trás, para árvores)
  - colunas: `foraEsquerda` (-170) · `esquerda` (170) · `meioEsquerda` (330) · `centro` (480) · `meioDireita` (630) · `direita` (790) · `foraDireita` (1130)
  - o nome de um ator também é um ponto: `para: 'menina'` vai até onde a menina está.
  - ajuste fino com `dx` e `dy` (unidades), ou coordenadas cruas `{ x: 300, y: 445 }`.

## Raiz

| Campo | Tipo | O que é |
|---|---|---|
| `titulo` | texto | vai na capa, na aba e é narrado (mínimo 3 palavras, ou `capaSemVoz: true`) |
| `voz` | `{ nome, rate, pitch }` | padrão `pt-BR-ThalitaMultilingualNeural`, `-12%`, `-4Hz` |
| `musica` | caminho | `assets/musica/<arquivo>.mp3`, em loop, com fade e ducking na fala. Opcional |
| `volumeMusica` | 0..1 | padrão 0.35 |
| `capaSemVoz` | booleano | não narra o título |
| `textoComecar`, `textoAutomatico`, `textoVoltar` | texto | rótulos dos botões ("Começar a história", "Tocar tudo sozinho", "Voltar ao início") |
| `atores` | objeto | ver abaixo |
| `lugares` | objeto | ver abaixo |
| `cenas` | lista | ver abaixo, em ordem |

## Atores

```js
atores: {
  raposa: { arquivo: 'raposa.svg', altura: 120, olha: 'esquerda' },
  menina: { arquivo: 'menina.svg', altura: 170, olha: 'direita', variantes: { feliz: 'menina-feliz.svg' } },
  ovo1:   { tipo: 'ovo', tamanho: 46, cor: '#FFF8E7' }
}
```

- `arquivo`: SVG em `assets/atores/` (instalado por `ator.mjs`). Padrão: `<nome>.svg`.
- `altura`: altura do ator no mundo (o chão tem 445; referências: bicho pequeno 70, criança 150, adulto 200, árvore 300).
- `olha`: para onde o **desenho** aponta a cabeça (`direita` ou `esquerda`). O runtime espelha o sprite sozinho ao mover, a partir disso. **Obrigatório** para quem se move ou vira. Confira olhando `references/atores.png` (`ator.mjs ver`); declarado errado, o ator anda de costas. Objeto sem frente (casa, pedra, caldeirão) que se move: `olha: 'nenhum'` (nunca espelha).
- `variantes`: outros SVGs do mesmo personagem (`triste`, `feliz`, `adulto`). `trocar` faz crossfade entre eles.
- `tipo: 'ovo'`: ator procedural (não precisa de SVG) com estados `fechado`, `rachado`, `aberto`.
- Cada personagem em cena é um ator: três irmãos iguais são `irmao1`, `irmao2`, `irmao3` com o mesmo `arquivo`.
- Ator começa **invisível e fora de cena**. Só aparece com `mostrar`.

## Lugares

```js
lugares: {
  clareira: { cenario: 'bosque', decoracao: [ { ator: 'pedra', em: 'chao.meioDireita', escala: 1.1 } ] },
  praia:    { cenario: 'lago' }
}
```

- `cenario`: `campo` · `fazenda` (celeiro e cerca) · `lago` (água ao fundo, margem na frente, reflexo dos atores na água) · `bosque` (árvores procedurais escuras) · `inverno` (chão de neve).
- `decoracao`: sprites fixos do lugar. `plano`: `fundo` (atrás, com parallax menor), `cenario` (padrão, com os atores), `frente` (na frente da câmera, parallax maior). Aceita `em`, `x`, `y`, `dx`, `dy`, `escala`, `virado`, `opacidade`.
- **Trocar de lugar exige corte**: se a cena seguinte muda de `lugar`, o runtime faz `corte: 'dissolve'` sozinho e **esconde todos os atores**; mostre de novo quem entra.

## Cenas

```js
{ id: 'c3', lugar: 'clareira', corte: 'dissolve',
  camera: { plano: 'close', alvo: 'raposa', movimento: 'fixo' },
  ambiente: { ceu: 'tarde', chuva: 0.3, de: 0, ate: 4 },
  acoes: [ ... ],
  legendas: ['A raposa percebeu que estava sozinha.'] }
```

| Campo | O que é |
|---|---|
| `id` | curto, único (`capa`, `c1`, `c2`, `close1`) |
| `capa: true` | só na primeira: título centralizado, QR code, botão Começar. A cena seguinte começa do zero (a capa é um cartaz) |
| `fim: true` | só na última: "FIM" grande e botão Voltar ao início |
| `lugar` | nome em `lugares`. Sem ele, herda o da cena anterior |
| `corte` | `'dissolve'` para quebrar o plano-sequência (close, salto de tempo). Sem ele, a cena **continua** a anterior sem corte visível |
| `dur` | duração mínima em segundos (opcional; o runtime calcula pelo fim das ações e da narração) |
| `camera` | atalho para uma ação `camera` em `de: 0` |
| `ambiente` | atalho para uma ação `ambiente` em `de: 0` (transição de 3 s por padrão) |
| `acoes` | lista de ações (abaixo) |
| `legendas` | lista de textos, ou `{ texto, de, ate, classe, semVoz }`. Sequenciais por padrão: a segunda entra quando a fala da primeira termina. A última fica na tela até a cena trocar |

**Continuidade:** a cena N começa **exatamente** onde a cena N-1 terminou (posição de cada ator, câmera, clima). Não repita `mostrar` para quem já está em cena. Não reposicione ninguém no início de uma cena sem corte: o salto aparece.

## Ações

Todas aceitam `de` (início, s) e `ate` (fim, s) ou `dur` (duração). Sem `de`, começa em 0. Sem `ate`, usa a duração padrão da ação.

### Atores

| Ação | Campos | O que faz | Padrão |
|---|---|---|---|
| `mostrar` | `ator`, `em` ou `x`/`y`, `dx`, `dy`, `escala`, `virado` (`esquerda`/`direita`), `variante`, `modo`, `opacidade` | coloca o ator no ponto e faz fade-in | 0.6 s |
| `esconder` | `ator` | fade-out | 0.7 s |
| `mover` | `ator`, `para`, `dx`, `dy`, `modo` (`andar` · `correr` · `nadar` · `voar` · `deslizar`), `virar: false`, `parar: false`, `curva` | anda até o ponto com o balanço do modo; vira sozinho para a direção; ao chegar, para (ou boia/plana) | 3 s |
| `virar` | `ator`, `para` | espelha o sprite para `esquerda` ou `direita` | instantâneo |
| `pular` | `ator`, `vezes`, `altura` | pulinhos no lugar | 1.2 s |
| `tremer` | `ator`, `forca` (0..2) | treme de medo ou frio enquanto durar | 2 s |
| `balancar` | `ator`, `forca` | balança de um lado para o outro (rir, zombar, ninar) | 2 s |
| `escala` | `ator`, `valor` | cresce ou encolhe até o valor | 1.2 s |
| `trocar` | `ator`, `variante` (`base` volta ao original), `escala` | crossfade para a variante (a menina sorri, a lagarta vira borboleta) | 2 s |
| `estado` | `ator`, `valor` | só para `tipo: 'ovo'`: `fechado` · `rachado` · `aberto` | instantâneo |

Modos de repouso: um ator mostrado com `modo: 'boiar'` balança na água; `modo: 'planar'` fica no ar.

### Câmera

| Campo | Valores |
|---|---|
| `plano` | `aberto` (zoom 1) · `medio` (1.7) · `close` (2.8, mira a cabeça) · `detalhe` (3.6) |
| `alvo` | nome de ator, ponto nomeado, ou `centro` |
| `movimento` | `fixo` (vai e fica) · `aproximar` · `afastar` · `acompanhar` (segue o ator enquanto ele anda) |
| `dx`, `dy` | desloca o enquadramento (dy negativo sobe a câmera) |
| `zoom`, `x`, `y` | valores crus, se preferir |

A câmera anda no ritmo 6/10: chega ao destino em 65% da janela `de`..`ate`. Janela padrão 2.6 s.

### Ambiente (clima e paleta)

`{ acao: 'ambiente', ceu: 'tempestade', chuva: 0.9, vento: 0.8, nuvens: 1, frio: 0.5, de: 0, ate: 3 }`

| Canal | 0..1 | Efeito |
|---|---|---|
| `ceu` | nome | paleta: `dia` · `primavera` · `tarde` · `porDoSol` · `anoitecer` · `noite` · `tempestade` · `amanhecer` · `inverno` · `outono` |
| `chuva` | | gotas em dois planos, inclinadas pelo `vento` |
| `neve` | | flocos caindo |
| `neblina` | | névoa subindo do chão |
| `vento` | | inclina a chuva, move nuvens e árvores |
| `nuvens` | | nuvens no céu (escurecem com o `ceu`) |
| `estrelas`, `lua`, `sol` | | astros (aparecem se o céu permitir) |
| `frio`, `quente` | | tinta azul ou dourada por cima da cena |
| `escuro` | | escurece tudo (apagão) |
| `vinheta` | | cantos escuros (padrão 0.55; suba para tensão, baixe para alegria) |
| `particulas` | | poeira dourada flutuando (magia, calor) |
| `vagalumes` | | pontinhos verdes (noite de verão) |
| `gelo` | | congela a água do lago |
| `ondas` | | agitação da água (padrão 0.5) |

A transição é suave entre `de` e `ate` (3 s por padrão). Para mudar de uma vez: `dur: 0.01`.

**Herança parcial:** `ambiente` muda só os canais citados; os outros continuam como estavam. Ao sair da tempestade, zere o que ela ligou: `{ ceu: 'primavera', chuva: 0, nuvens: 0.2, vento: 0.1, frio: 0 }`. Ao sair do inverno: `neve: 0, gelo: 0, frio: 0`.

### Impacto

| Ação | Campos | O que faz |
|---|---|---|
| `tremor` | `forca`, `de` | tremor de câmera de impacto (trovão, queda, susto). 0.9 s |
| `tensao` | `forca`, `de`, `ate` | vibração sustentada baixa (medo, suspense) |
| `clarao` | `forca`, `de` | flash branco curto |
| `raio` | `forca`, `de` | relâmpago no céu + clarão + tremor, tudo junto |

## Legendas e narração

- 1 ou 2 frases por cena, no máximo ~110 caracteres cada (2 linhas na tela).
- **Nenhuma frase com menos de 3 palavras** (a voz multilíngue troca de idioma em fragmento curto). "Sorriu." vira "Ele sorriu para ela."
- Sem travessão. Acentuação correta.
- A narração é gerada 1 mp3 por frase (`narrar.mjs`); a legenda entra junto com a fala e a música baixa enquanto ela fala.
- `classe: 'titulo'` (só a capa), `'fim'` (automático em `fim: true`), `semVoz: true` (não narra).

## Ferramentas de linguagem (escolha pela história, não por cota)

Nada aqui é obrigatório nem tem número mínimo. São recursos: use o que a SUA história pede, onde ela pede. Duas histórias diferentes devem sair com cenas, câmeras, lugares e cores diferentes.

- **Corte e close.** O plano-sequência dá continuidade; o `corte: 'dissolve'` para um `close` dá peso a um instante (uma descoberta, um rosto, um objeto que importa). Uma história toda em plano aberto costuma ficar distante; uma cheia de closes perde o fôlego.
- **Câmera com intenção.** `aberto` apresenta o lugar, `acompanhar` segue quem anda, `aproximar` cria intimidade, `afastar` revela ou deixa sozinho.
- **Cor e clima contam a emoção.** A paleta e o clima podem acompanhar o que o personagem sente ou o tempo que passa. Escolha pelo texto: uma história que se passa numa noite só pode ficar inteira em `noite` e variar com `lua`, `vagalumes`, `neblina`.
- **Impacto.** Trovão, queda, susto, sopro forte: `raio`, `tremor`, `clarao`. Medo prolongado: `tensao` + `tremer` no ator.
- **Ator vivo.** Parado, respira; andando, balança. `tremer`, `balancar`, `pular` dão intenção.
- **A cena termina em repouso.** A última ação acaba antes da última frase; o botão de avançar só fica verde quando ação e narração acabaram.
- **Troca de lugar com corte.** Quando a história viaja, o lugar muda e o runtime corta.

## Duração

Cada cena dura o máximo entre: fim da última ação, fim da última narração + 0.9 s, e `dur`. O número de cenas sai da história: um conto curto pode ter 5, um longo 16. Acima de uns 4 minutos fica longo para criança.
