# Concursos

**Acesse o site:** https://nicacarvalho5.github.io/concursos/

## Concursos Disponíveis

- [SEDUC-PA 2026 - Especialista em Educação](seduc/README.md)
  - [Edital nº 001/2026 (PDF)](https://github.com/nicacarvalho5/concursos/blob/main/seduc/edital/edital-no-001-de-28.08.2026-doe-no-36.749-de-31.08.2026-abertura-seduc.pdf)

## Scripts de Automação

### sync-slides.sh

Sincroniza os decks gerados pelo [Mira-Animator](https://github.com/nicacarvalho5/concursos/tree/main/slides) para a estrutura de slides do repositório e publica as alterações.

#### Uso

```bash
./scripts/sync-slides.sh <caminho_do_arquivo_html_gerado_pela_skill_markdown-to-mira-html>
```

#### Exemplo

```bash
./scripts/sync-slides.sh seduc/conteudo/1-conhecimentos-basicos/1-lingua-portuguesa/01-interpretacao-e-compreensao-de-texto.html
```

#### Funcionamento

1. Extrai o nome do tópico do caminho do arquivo HTML (ex: `01-interpretacao-e-compreensao-de-texto`)
2. Encontra o diretório mais recente em `slides/decks/` que corresponde ao padrão `YYYY-MM-DD {nome_do_tópico}`
3. Copia esse diretório para `seduc/slides/{grupo}/{disciplina}/{tópico}/`
4. Faz `git add`, `git commit` e `git push` das alterações

#### Pré-requisitos

- O mira-animator deve ter gerado o deck para o tópico em questão (via `/mira-new` ou similar)
- O arquivo HTML deve ter sido gerado pela skill `markdown-to-mira-html`
- O repositório git deve estar limpo (sem alterações não commitadas que possam entrar em conflito)

#### Fluxo de Trabalho Recomendado

1. Gere o conteúdo HTML usando a skill `markdown-to-mira-html`:
   ```bash
   ./markdown-to-mira-html.sh seduc/conteudo/1-conhecimentos-basicos/1-lingua-portuguesa/01-interpretacao-e-compreensao-de-texto.md \
       -t "Interpretação e compreensão de texto" \
       -d "Domine os conceitos que a banca cobra: literal, inferencial, explícito, implícito, pressuposto, tese, argumento e armadilhas frequentes." \
       -l "Concurso C-223 SEDUC-PA · Língua Portuguesa" \
       --slide-url "https://nicacarvalho5.github.io/concursos/seduc/slides/1-conhecimentos-basicos/1-lingua-portuguesa/01-interpretacao-e-compreensao-de-texto/" \
       --prev "00-intro.html" \
       --next "02-organizacao.html" \
       --pills "Compreensão Literal|Interpretação Inferencial|Tema e Assunto"
   ```

2. Gere o slide usando o mira-animator:
   ```bash
   /mira-new 01-interpretacao-e-compreensao-de-texto
   ```
   (Preencha o briefing conforme necessário e aguarde a geração)

3. Sincronize o slide gerado para o repositório:
   ```bash
   ./sync-slides.sh seduc/conteudo/1-conhecimentos-basicos/1-lingua-portuguesa/01-interpretacao-e-compreensao-de-texto.html
   ```

#### Notas

- O script assumes that there is only one deck directory matching the pattern for each topic (choosing the most recent if multiple exist)
- O caminho do slide no GitHub será: `https://nicacarvalho5.github.io/concursos/seduc/slides/{grupo}/{disciplina}/{tópico}/`
- Após o push, o slide estará disponível imediatamente no GitHub Pages