# Roteiro: <título da história>

> Escrito pela skill `/mira-history` em `references/history-roteiro.md`, ANTES do `mira/historia.js`.
> Deck: `<pasta>` · data: `<AAAA-MM-DD>` · cenas: `<n>` · duração estimada: `<s>`

Este arquivo é só o FORMATO. Todo conteúdo (elenco, lugares, quantas cenas, câmera, clima) sai da leitura da história que o autor mandou.

## A história em uma frase

<quem quer o quê, o que impede, como termina>

## Leitura de diretor

- O que esta história tem de só dela: <o lugar, o objeto, o gesto, a imagem que ninguém esquece>
- Onde está o coração emocional: <a cena que pede close ou silêncio>
- Como o mundo muda do começo ao fim: <cor, estação, clima, luz>
- O que o autor vai querer VER acontecer: <cada ação concreta do texto que precisa aparecer na tela>

## Elenco (atores)

| Ator | O que é na história | Asset (catálogo ou origem web) | Altura | olha | Variantes |
|---|---|---|---|---|---|
| `<nome>` | <papel> | <arquivo ou URL> | <n> | <esquerda/direita/nenhum> | <se houver> |

Regra: animal, pessoa, veículo e objeto detalhado vêm de SVG (catálogo ou web com licença aberta). Nunca desenhados à mão.

## Lugares

| Lugar | Cenário | Decoração | Paleta dominante | Cenas |
|---|---|---|---|---|
| `<nome>` | <cenario> | <o que dá cara a este lugar> | <paleta> | <ids> |

## Cenas

| # | id | lugar | corte | emoção | paleta / clima | câmera | ação observável | estado final esperado | legenda(s) |
|---|---|---|---|---|---|---|---|---|---|
| 0 | `capa` | <lugar> | | | <paleta> | <plano> | <o cartaz> | | (título) |
| 1 | `<id>` | <lugar> | <sim/não e por quê> | <emoção> | <paleta, clima> | <plano, alvo, movimento> | <o que se vê acontecer, com sujeito e verbo> | <onde cada ator termina e se está visível> | "<frase do texto>" |

**Ação observável** é o que a criança vê na tela, não o que o narrador diz. "Os porquinhos entram na casa" pede ator indo até a porta e sumindo; "fica com medo" pede `tremer`. Se o texto diz que algo acontece e a tela não mostra, a cena está errada.

**Estado final esperado** é a foto do último quadro: quem está visível, onde, virado para onde. A cena seguinte nasce dele.

## Checagens antes de escrever o `historia.js`

- [ ] Primeira cena é `capa`, última tem `fim: true`.
- [ ] Toda ação importante do texto aparece como ação observável em alguma cena.
- [ ] Cada escolha de câmera, corte e clima tem um motivo na história (não por cota).
- [ ] Toda troca de lugar coincide com um corte, e quem aparece no lugar novo tem `mostrar`.
- [ ] Nenhuma legenda com frase de menos de 3 palavras; no máximo 2 frases por cena.
- [ ] Cada ator citado existe em `assets/atores/` e tem `olha` conferido.
