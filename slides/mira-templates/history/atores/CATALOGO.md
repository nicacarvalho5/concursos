# Catálogo de atores do /mira-history

SVGs normalizados pelo `ator.mjs` (ids prefixados, metadados removidos, caixa visível medida em `data-bbox`).
Todos de fonte aberta, licença CC0 (Openclipart), origem no comentário do próprio arquivo.

| Arquivo | O que é | Olha para | Altura sugerida | Observação |
|---|---|---|---|---|
| `patinho.svg` | patinho amarelo, de perfil | direita | 70 | use vários (`patinho1`, `patinho2`...) |
| `patinho-cinza.svg` | o mesmo patinho recolorido em cinza | direita | 90 | variante cinza, por recoloração |
| `pata.svg` | pato adulto cartoon, de perfil | direita | 150 | serve de pata mãe |
| `cisne.svg` | cisne branco nadando | esquerda | 120 | fica bonito na linha `agua` (reflexo) |
| `galinha.svg` | galinha no ninho | direita | 130 | está sentada no ninho: não faça andar |
| `gato.svg` | gato preto sentado | esquerda | 110 | |
| `ganso.svg` | ganso branco de frente | direita | 150 | |
| `arvore.svg` | árvore frondosa cartoon | | 300 | decoração (`plano: 'fundo'`) |
| `pinheiro-neve.svg` | pinheiro com neve | | 330 | decoração de inverno |
| `taboa.svg` | taboas (juncos) em silhueta verde | | 120 | decoração de margem de lago |

Para acrescentar ao catálogo do pacote:

```
node agents/mira-history/scripts/ator.mjs --catalogo templates/history/atores add <nome> <arquivo.svg> --de <url> --autor "<autor>" --licenca CC0 [--cor #A=#B] [--fill #cor]
```

Depois anote a linha na tabela acima.
