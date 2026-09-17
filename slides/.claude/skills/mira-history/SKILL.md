---
name: mira-history
description: >-
  Transforma o texto de uma história (normalmente infantil) numa animação narrada no Mira:
  cenas com câmera e clima, atores em SVG, narração, música e QR para o celular. Use em
  /mira-history, "anima essa história", "história animada", "conto animado" ou conto colado
  pedindo animação. Num deck dela (tem mira/historia.js), também gera o vídeo mp4 da história
  (inclusive para WhatsApp) e prompt de música para o Suno. Vídeo de deck comum é do
  /mira-slide-to-video. Não é para explicar conceito nem slide comum.
---

# Skill: /mira-history, do texto da história à animação completa

O autor cola uma história. Você entrega uma pasta em `decks/` que abre com duplo clique no `index.html` e conta a história sozinha: cenas animadas, narração, música, botão verde para avançar, tela cheia, QR na capa para o celular.

Você **não escreve código de animação**. Você escreve um roteiro e um arquivo de dados (`mira/historia.js`) num vocabulário fechado. Tudo que é difícil (continuidade, câmera, parallax, chuva, neve, névoa, partículas, raio, tremor, reflexo na água, legendas sincronizadas com a voz, música com ducking, trava de avanço, dissolve, rewind, tela cheia, deslizar, QR, modo leve para celular, pausa, modo automático) já está no runtime `mira/mira-history.js`, que é copiado pronto.

## REGRA DE IDIOMA

Siga `agents/_shared/idioma.md`. Todo texto visível em português brasileiro com acentuação correta. Proibido travessão: use vírgula ou dois-pontos.

## Leia antes de qualquer coisa

1. `references/vocabulario.md` inteiro. É a lista fechada do que o runtime entende. Campo fora dela é erro.
2. `references/esqueleto-historia.js`: só a sintaxe do arquivo, com lugares vazios em MAIÚSCULAS. Não é uma história.
3. `references/roteiro-gabarito.md`: o formato do roteiro que você escreve antes do `historia.js`.

## Liberdade de criação

O vocabulário é fechado; a direção é sua. O que é fixo: os campos e ações que o runtime entende. O que é livre, e tem que sair da leitura DESTA história: quantas cenas, quais lugares e cenários, quem está em cena, onde corta, onde fecha em close, que câmera, que cor e clima em cada momento, que gestos cada ator faz. Não existe história modelo para imitar. Se a história já foi feita antes, por você ou em outro deck, faça de novo a partir do texto, não do deck antigo.

## Onde estão os scripts

Nesta pasta, em `scripts/`. Chame por `node <pasta-desta-skill>/scripts/<script>.mjs`. Instalado num projeto, a pasta é `.claude/skills/mira-history/` (ou `.agents/skills/mira-history/`). No repositório do Mira, `agents/mira-history/`. Todos são Node puro; `conferir.mjs` e a medição de caixa do `ator.mjs` usam o Chrome da máquina com o puppeteer do projeto (opcional, mas sem eles você entrega às cegas).

## Entradas

- **A história**, em texto. Obrigatória.
- **Título**: o da história, ou pergunte. Mínimo 3 palavras para ser narrado (senão `capaSemVoz: true`).
- **Música**: liste o catálogo `templates/history/musicas/` (ou `mira-templates/history/musicas/`) e pergunte qual; o autor também pode apontar um mp3. Sem resposta, use a primeira do catálogo. A skill não gera música.
- **Voz**: padrão `pt-BR-ThalitaMultilingualNeural`, 12% mais lenta e tom -4Hz (suave, de conto). Outras vozes pt-BR do edge-tts: `pt-BR-AntonioNeural` (masculina), `pt-BR-FranciscaNeural`.

## Passo 1, criar o deck

```
node <skill>/scripts/novo.mjs <slug> --titulo "<Título>" --musica <nome-do-mp3-do-catálogo>
```

Cria `decks/AAAA-MM-DD <slug>/` com toda a árvore (`references/`, `assets/atores`, `assets/narracao`, `assets/vendor`, `mira/`), o runtime, os módulos E e P, fonte, QR, launchers `abrir-no-celular.bat` e `.command`, a música e uma cópia do catálogo de atores em `references/assets/catalogo/`. Imprime a lista de músicas e de atores do catálogo. **Nada é criado à mão.**

## Passo 2, o roteiro

Escreva `references/history-roteiro.md` no formato do gabarito. Comece pela **leitura de diretor** (o que esta história tem de só dela, onde está o coração, como o mundo muda, o que o autor vai querer ver acontecer). Depois quebre em cenas; o número sai do tamanho e do ritmo do texto (teto 16). Cada cena tem: id, lugar, corte ou não, emoção, paleta e clima, câmera, **ação observável**, **estado final esperado**, 1 ou 2 frases de legenda.

O que é regra:

- Primeira cena `capa` (um cartaz da história, título, e os botões "Começar a história" e "Tocar tudo sozinho"). Última com `fim: true`.
- **Toda ação que o texto conta e que dá para ver acontece na tela.** Se o texto diz que alguém entra, foge, cai, encontra, a cena mostra isso com atores se movendo, não só com a legenda.
- Troca de lugar coincide com corte.

O que é escolha sua, pela história (veja "Ferramentas de linguagem" no `vocabulario.md`): closes, cortes, paletas, clima, tremor. Nenhum tem cota. Plano aberto o tempo todo costuma ficar distante, e a mesma paleta do começo ao fim costuma ficar parada; mas decida olhando o texto, não um número.
- **Legendas:** frases curtas, fiéis ao texto original (é a fala do narrador), nenhuma com menos de 3 palavras, no máximo 2 por cena. O texto da história é a narração; não invente diálogo.

## Passo 3, os atores

Regra herdada do `/mira-asset-scout`: **animal, pessoa, veículo e objeto detalhado nunca são desenhados à mão.** Vêm de SVG.

1. **O elenco sai da história, não do catálogo.** Decida primeiro quem a história pede. O catálogo que `novo.mjs` listou é atalho só quando o personagem é aquele mesmo bicho ou objeto; não troque um personagem da história por outro só porque já está no catálogo. Para cada um que existe lá:
   ```
   node <skill>/scripts/ator.mjs "<deck>" catalogo <nome>
   ```
2. **Não está no catálogo: busque na web, licença aberta.** Fontes, nesta ordem: Openclipart (tudo CC0; a busca é `https://openclipart.org/search/?query=<termo>` e o download é `https://openclipart.org/download/<id>/x.svg`), unDraw, Open Peeps, Wikimedia Commons (confira a licença item a item). Prefira desenho de lado (perfil), estilo cartoon limpo, poucos caminhos (arquivo até ~60 KB). Baixe para uma pasta temporária e instale:
   ```
   node <skill>/scripts/ator.mjs "<deck>" add <nome> <arquivo.svg> --de <url> --autor "<autor>" --licenca CC0
   ```
   O script normaliza (remove metadados, prefixa ids, mede a caixa visível), guarda o original em `references/assets/`, o normalizado em `assets/atores/`, anota `references/CREDITS.md` e regrava `mira/atores.js`.
3. **Variantes por recoloração.** O mesmo desenho em outra cor (um irmão diferente, a roupa de festa) é recoloração: `--cor "#ddc177=#9aa2ab"` (repita `--cor` por cor). Liste as cores do SVG com `grep -o 'fill:#[0-9a-f]*' arquivo.svg | sort | uniq -c`. Silhueta sem cor declarada ganha cor com `--fill "#4E7A3A"`.
4. **Sem web nesta sessão ou não achou:** diga isso em uma linha e ofereça: (a) o autor manda o SVG; (b) troca por um ator do catálogo parecido (um ganso no lugar de um pato); (c) a cena passa a ser contada sem esse personagem em tela. Sem resposta, siga pela (b). Nunca desenhe o animal.
5. Ovos são procedurais: `{ tipo: 'ovo' }`. Sol, lua, nuvens, chuva, neve, névoa, colinas e água: o runtime desenha. O que dá cara a um lugar (casa, ponte, poço, pedra, castelo, móvel) é decoração em SVG, buscada como qualquer ator.
6. **Confira o sentido de cada ator (obrigatório).** O runtime espelha o sprite pela direção em que ele anda, a partir do campo `olha`. Se você declarar `olha: 'direita'` para um desenho que olha para a esquerda, o ator **anda de costas** a história inteira. Não adivinhe pelo nome do arquivo:
   ```
   node <skill>/scripts/ator.mjs "<deck>" ver
   ```
   gera `references/atores.png` com cada ator grande. **Abra a imagem** e anote, para cada um, para que lado a cabeça aponta. Esse é o `olha`. Quem se move ou vira sem `olha` declarado é erro no validador.

## Passo 4, escrever `mira/historia.js`

Escreva a partir do SEU roteiro, com a sintaxe do `references/esqueleto-historia.js`. Só o vocabulário do `vocabulario.md`. Tempos em segundos. O que mais dá errado, e como evitar:

- **Reposicionar um ator no começo de uma cena sem corte.** O mundo é contínuo: quem já está em cena continua onde parou. Use `mover`, não `mostrar` de novo.
- **Esquecer de mostrar quem entra num lugar novo.** Mudar de `lugar` esconde todo mundo; quem aparece precisa de `mostrar` (com `dur: 0.01` se já deve estar lá no primeiro quadro).
- **Legenda de 1 ou 2 palavras.** A voz troca de idioma. Mínimo 3.
- **Duas ações disputando o mesmo ator ao mesmo tempo** (dois `mover` sobrepostos). Encadeie: `ate` de uma é o `de` da próxima.
- **Câmera `close` sem alvo.** Close mira um ator: `alvo: '<nome do ator>'`.
- **Ator que aparece de pé na água.** Na água use a linha `agua.*` e `modo: 'nadar'` ou `'boiar'`; o runtime desenha o reflexo.
- **Cena muito longa sem nada acontecendo.** Se a fala dura 8 s, dê 8 s de ação (andar, olhar, tremer, câmera aproximando).
- **Clima que não vai embora.** `ambiente` só mexe nos canais citados: ao sair da tempestade escreva `chuva: 0, nuvens: 0.2, frio: 0`; ao sair do inverno, `neve: 0, gelo: 0`.

## Passo 5, validar, narrar, conferir (obrigatório, nesta ordem)

```
node <skill>/scripts/validar.mjs "<deck>"      # erros bloqueiam; avisos são revisão
node <skill>/scripts/narrar.mjs "<deck>"       # gera 1 mp3 por frase e mede a duração
node <skill>/scripts/conferir.mjs "<deck>"     # screenshots de cada cena em 3 instantes + folha.png
node <skill>/scripts/conferir.mjs "<deck>" --movimentos   # um quadro por movimento, com seta: ninguém anda de costas
```

- `validar.mjs` rejeita campo desconhecido, ator inexistente, variante inexistente, ponto inválido, frase curta. Corrija até `OK`. A linha "Linguagem usada" não é cota: serve para você conferir se cada corte, close e paleta veio da história.
- `narrar.mjs` só regera o que mudou (cache por texto e voz). Sem ele, o runtime estima a duração pela contagem de palavras.
- `conferir.mjs --movimentos` grava `folha-movimentos.png`: um quadro no meio de cada `mover`, com uma seta vermelha em cima do ator dizendo para onde ele anda. **Abra e confira: a cabeça do ator tem que apontar para a seta.** Ator de costas para a seta = `olha` invertido em `historia.js`; corrija e rode de novo. Esta conferência é obrigatória antes de entregar.
- `conferir.mjs` grava em `references/conferencia/` e monta `folha.png`. **Abra a folha e olhe** cada quadro: ator faltando, ator flutuando, texto em cima de rosto, câmera cortando o personagem, paleta parada. Corrija o `historia.js` e rode de novo. Com `--leve` simula celular. Com `--cena c3 --instantes 1s,4s` mira um problema.
- Toda mudança em legenda pede `narrar.mjs` de novo (os tempos dependem da voz).

Não entregue sem ter olhado a folha da versão final. Na folha, compare com o roteiro: cada ação observável aparece? cada estado final bate?

## Passo 6, entrega

Diga ao autor, em poucas linhas:

- O caminho do deck e que o `index.html` abre com duplo clique.
- Que `abrir-no-celular.bat` (ou `.command`) sobe o servidor na rede, abre o navegador e mostra o QR na capa; celular e tablet na mesma rede Wi-Fi leem o QR; tela cheia pelo botão (no iPhone o Safari não permite tela cheia).
- Na capa, "Começar a história" avança cena a cena (botão verde) e "Tocar tudo sozinho" conta a história inteira sem toque. As teclas: seta ou clique avança quando o botão fica verde; espaço pausa; A liga ou desliga o modo automático; M som; F tela cheia; R reinicia a cena; E edita; P pinta.
- Número de cenas, duração total (o `conferir.mjs` imprime), voz e música usadas.
- O que ficou de fora e por quê (ator não encontrado, cena simplificada).

## Música de fundo para o Suno (quando o autor pedir)

Se o autor pedir uma música de fundo própria para a história, a skill não gera áudio: entrega um prompt para ele gerar no Suno (suno.com). Grave em `references/musica-suno.md` e mostre no chat.

Monte a partir do roteiro (emoção, lugares, época, ritmo), nunca de um modelo fixo:

- **Title:** nome curto ligado à história.
- **Style of Music** (até 200 caracteres, em inglês, que o Suno entende melhor): `instrumental`, gênero e clima (ex.: lullaby, folk, orchestral, celtic), 2 a 4 instrumentos que combinam com o mundo da história, andamento lento o bastante para não brigar com a narração (60 a 90 BPM) e a curva emocional em poucas palavras.
- **Exclude Styles:** `vocals, singing, choir, lyrics, spoken word, heavy drums, distortion`.
- **Lyrics:** vazio, com a opção **Instrumental** ligada.
- Uma linha dizendo por que esse som tem a cara da história.

A música fica por baixo da voz o tempo todo: peça textura suave, sem melodia que chame atenção, sem batida forte, e com loop natural (sem final abrupto). Quando o autor trouxer o mp3, copie para `assets/musica/`, aponte `musica` no `historia.js` e rode `conferir.mjs` de novo.

## Vídeo da história (quando o autor pedir)

Se o autor pedir a história em vídeo (.mp4, YouTube, WhatsApp), grave a partir do deck pronto. Vale só para deck com `mira/historia.js`; deck comum de slides é do `/mira-slide-to-video`, que grava slides em tempo real e não conhece a cadência, a narração e a música da história. Sem controle nenhum na tela, na cadência da história: o script dirige o relógio do runtime quadro a quadro em Chrome headless, emenda as cenas com corte seco ou dissolve e monta o áudio com cada frase no instante da legenda e a música baixando na fala.

Pré-requisitos: narração gerada (`narrar.mjs`), Chrome, puppeteer, `ffmpeg` no PATH (ou `MIRA_FFMPEG`). Deck antigo sem `window.__miraVideo`: copie o `mira-history.js` novo de `templates/authoring/`.

```
node <skill>/scripts/video.mjs "<deck>" [--whatsapp] [--saida arquivo.mp4] [--fps 30] [--largura 1920] [--respiro 0.6] [--sem-musica] [--cenas c1,c2] [--qualidade 18]
```

- Padrão: 1920x1080, 30 fps, `<deck>/<slug>.mp4`. Uns 8 a 12 minutos de render para 2,5 minutos de história. Teste rápido: `--cenas capa,c1 --fps 12 --largura 960`.
- `--whatsapp`: gera também `<nome>-whatsapp.mp4` em 720p leve (uns 10 a 12 MB por 2,5 minutos).
- Se a emenda falhar, `--reusar <pasta-temp>` (impressa pelo script) refaz só emenda e áudio sem recapturar.
- Confira com `ffprobe` (vídeo e áudio) e 2 ou 3 quadros (`ffmpeg -ss <s> -i video.mp4 -frames:v 1 q.png`): nenhum controle na tela, legenda legível. Reporte caminho, duração e resolução. O deck não é alterado.

## Portões de entrega

- [ ] Pasta criada por `novo.mjs`, com `references/`, `assets/atores`, `assets/narracao`, `mira/` e os launchers.
- [ ] `references/history-roteiro.md` escrito antes do `historia.js`.
- [ ] Todo ator concreto vem de SVG do catálogo ou da web com licença anotada em `references/CREDITS.md`; nenhum desenhado à mão.
- [ ] `historia.js` só com o vocabulário; `validar.mjs` em `OK`.
- [ ] Capa com título e QR; última cena com `fim: true`.
- [ ] Toda ação observável do roteiro aparece na folha; câmera, cortes e clima escolhidos pela história.
- [ ] Narração gerada por `narrar.mjs`, nenhuma frase com menos de 3 palavras.
- [ ] `conferir.mjs` rodado na versão final, folha olhada, sem erro no console.
- [ ] `ator.mjs ver` olhado e `olha` declarado para todo ator que se move; `conferir.mjs --movimentos` olhado: nenhum ator anda de costas.
- [ ] Módulos E e P presentes em `mira/` e referenciados no `index.html` (o template já traz).
- [ ] Entrega com caminho, launcher do celular, teclas e duração.

## Limites conhecidos, diga na entrega

- **Sprites rígidos.** Os atores não têm braço, asa ou boca articulados: a expressão vem de variantes (outro SVG) e do movimento de corpo inteiro (tremer, balançar, pular). Um close mostra o desenho maior, não um rosto que muda.
- **Sem web, sem ator novo.** O catálogo é pequeno; fora dele depende de busca ou do autor.
- **Áudio no celular** começa no botão Começar (política de autoplay). O iPhone ignora controle de volume da música, então o ducking na fala não acontece lá.
- **View Transitions** (dissolve) existe no Chrome, Edge e Safari 18+; nos outros o corte é um véu preto rápido.
- **A roda do mouse é ignorada**: a navegação é pelos botões, setas e deslizar.
