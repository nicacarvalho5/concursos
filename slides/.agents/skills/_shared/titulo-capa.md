# Diretiva de Título da Capa do Mira — Quebra Equilibrada

Regra compartilhada por TODOS os agentes do Mira que geram ou reenquadram um deck.
Aplica-se **exclusivamente ao título do primeiro slide (a capa, o "header" do deck)**,
não aos títulos dos slides de conteúdo.

O título da capa **nunca** pode quebrar com uma linha muito maior que a outra deixando
uma palavra, artigo (o, os, a, as, um, uma) ou preposição (em, de, do, da, para, com)
solta na outra linha.

**Errado:** "Responsividade em quatro" / "formatos"
**Certo:** "Responsividade em" / "quatro formatos"

## Por que é crítico

A capa é o primeiro impacto visual do deck e costuma virar thumbnail/abertura de vídeo.
Um título com preposição pendurada ou linhas desbalanceadas passa impressão de amadorismo,
exatamente onde a primeira impressão mais conta.

## Regra concreta (como aplicar)

- Use `text-wrap: balance` no título da capa, que equilibra o comprimento das linhas.
- Selecione **apenas** o título do primeiro slide, não todos os títulos:

  ```css
  /* título da capa (primeiro slide/header) */
  body > section:first-of-type h1,
  body > section:first-of-type h2 { text-wrap: balance; }
  ```

- Esta regra deve estar no CSS base de todo deck gerado (a capa nasce com ela).
- `text-wrap: balance` não conflita com o auto-ajuste de fonte (`fitTitles`) das versões
  responsivas: o balance decide a quebra, o auto-ajuste decide o tamanho.
- Requer Chromium moderno (Edge/Chrome atual), como o resto da composição do Mira.

## Checklist antes de entregar a capa

- [ ] O título da capa não tem artigo/preposição solto no fim de uma linha
- [ ] As linhas do título da capa estão equilibradas (nenhuma muito mais longa que a outra)
- [ ] A regra `text-wrap: balance` está escopada só ao primeiro slide, não aos slides de conteúdo
