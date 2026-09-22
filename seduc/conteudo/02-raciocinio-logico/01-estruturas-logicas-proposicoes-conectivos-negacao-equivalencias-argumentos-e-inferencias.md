# Tópico 01 — Estruturas Lógicas: Proposições, Conectivos, Negação, Equivalências, Argumentos e Inferências

Este tópico aborda as **estruturas lógicas fundamentais** exigidas em **concursos públicos**, sendo a base de toda **prova de raciocínio lógico**. Dominar **proposições, conectivos e negações** é a principal **técnica** e **estratégia** para resolver com segurança as **questões** cobradas por bancas como **FGV**, **Cespe** e outras, garantindo **gabarito** correto mesmo sob pressão de tempo. Este é o primeiro passo de **preparação** para o edital, servindo de fundamento para os demais **estudos** de Raciocínio Lógico.

## 1. Definição

Uma **proposição lógica** é toda sentença declarativa (afirmativa) que pode ser classificada como **verdadeira (V)** ou **falsa (F)**, nunca as duas ao mesmo tempo e nunca nenhuma delas. Perguntas, ordens, exclamações e frases ambíguas ou sem sentido definido **não são proposições**.

As proposições são representadas por letras minúsculas (p, q, r...) e podem ser:
- **Simples (atômicas):** expressam uma única ideia, sem conectivos. Ex.: p: "Marina é professora."
- **Compostas (moleculares):** formadas por duas ou mais proposições simples unidas por **conectivos lógicos**. Ex.: p ∧ q: "Marina é professora e Carlos é diretor."

## 2. Explicação Teórica

### 2.1 Os conectivos lógicos

Os conectivos (ou operadores lógicos) unem proposições simples para formar proposições compostas, e cada um possui uma tabela-verdade própria:

- **Conjunção (e) — símbolo ∧:** verdadeira somente quando as duas proposições são verdadeiras.
- **Disjunção inclusiva (ou) — símbolo ∨:** falsa somente quando as duas proposições são falsas.
- **Disjunção exclusiva (ou... ou...) — símbolo ∨:** verdadeira quando exatamente uma das proposições é verdadeira (não ambas).
- **Condicional (se... então...) — símbolo →:** falsa apenas quando o antecedente é verdadeiro e o consequente é falso.
- **Bicondicional (se e somente se) — símbolo ↔:** verdadeira quando as duas proposições têm o **mesmo** valor lógico (ambas V ou ambas F).

### 2.2 Negação

A **negação** (símbolo ¬ ou ~) inverte o valor lógico de uma proposição: se p é V, ¬p é F, e vice-versa. Em provas de concurso, a cobrança mais comum não é negar uma proposição simples (bastando um "não"), mas sim negar **proposições compostas**, o que exige aplicar regras específicas — e é justamente aí que a maioria dos candidatos erra.

**Regras práticas de negação (Leis de De Morgan e equivalentes):**

| Proposição original | Negação correta |
|---|---|
| p ∧ q (e) | ¬p ∨ ¬q (nega as duas e troca "e" por "ou") |
| p ∨ q (ou) | ¬p ∧ ¬q (nega as duas e troca "ou" por "e") |
| p → q (se... então...) | p ∧ ¬q (afirma o antecedente e nega o consequente) |
| p ↔ q (se e somente se) | (p ∧ ¬q) ∨ (¬p ∧ q) |
| Todo/Todos... são | Algum/Alguns... não são |
| Algum/Existe... que é | Nenhum... é |

> **Regra de Ouro:** "Negar uma proposição composta nunca é apenas colocar um 'não' na frase — é preciso identificar o conectivo principal, negar cada parte e trocar o conectivo pela sua forma equivalente."

### 2.3 Equivalências lógicas

Duas proposições são **logicamente equivalentes** quando possuem a mesma tabela-verdade, ou seja, dizem "a mesma coisa" com palavras diferentes. As equivalências mais cobradas em prova:

- **Condicional (p → q)** equivale a **¬p ∨ q** (útil para transformar "se... então" em "ou").
- **Contrapositiva:** p → q equivale a ¬q → ¬p.
- **Dupla negação:** ¬(¬p) equivale a p.
- **Comutatividade:** p ∧ q equivale a q ∧ p; p ∨ q equivale a q ∨ p.

### 2.4 Argumentos e inferências

Um **argumento** é um conjunto de proposições em que algumas (as **premissas**) servem de sustentação para outra (a **conclusão**). Um argumento é **válido** quando, sendo as premissas verdadeiras, a conclusão é necessariamente verdadeira — e não quando o conteúdo "parece certo" no mundo real: em lógica formal, avalia-se apenas a **estrutura**, não o conteúdo.

**Principais formas válidas de argumento (regras de inferência):**

- **Modus Ponens:** Se P, então Q. P. Logo, Q.
- **Modus Tollens:** Se P, então Q. Não Q. Logo, não P.
- **Silogismo Hipotético:** Se P, então Q. Se Q, então R. Logo, se P, então R.
- **Silogismo Disjuntivo:** P ou Q. Não P. Logo, Q.

**Falácias comuns (formas inválidas), muito exploradas pelas bancas:**

- **Afirmação do consequente:** Se P, então Q. Q. Logo, P. *(inválido)*
- **Negação do antecedente:** Se P, então Q. Não P. Logo, não Q. *(inválido)*

## 3. Exemplos Práticos

### Exemplo Comparativo: Argumento Válido vs Argumento Inválido

### Argumento Válido
- Definição: a conclusão decorre necessariamente das premissas
- Característica 1: segue uma estrutura reconhecida (Modus Ponens, Modus Tollens, silogismo hipotético ou disjuntivo)
- Característica 2: não depende do conteúdo ser "verdadeiro no mundo real", apenas da forma lógica

### Argumento Inválido
- Definição: existe ao menos uma situação em que as premissas são verdadeiras e a conclusão é falsa
- Característica 1: costuma repetir os erros clássicos de afirmação do consequente ou negação do antecedente
- Característica 2: pode "parecer" convincente à primeira leitura, por isso é a principal armadilha das bancas

### Exemplo Comparativo: Negação da Conjunção vs Negação da Disjunção

### Negação da Conjunção (e)
- Definição: nega-se uma proposição do tipo "p e q"
- Regra: nega-se cada parte e troca-se "e" por "ou"
- Exemplo: "João estuda e Maria trabalha" → "João não estuda ou Maria não trabalha"

### Negação da Disjunção (ou)
- Definição: nega-se uma proposição do tipo "p ou q"
- Regra: nega-se cada parte e troca-se "ou" por "e"
- Exemplo: "João estuda ou Maria trabalha" → "João não estuda e Maria não trabalha"

**Exemplo resolvido (nível concurso):**

Proposição: "Se Ana foi aprovada, então ela estudou muito."
Negação correta: "Ana foi aprovada e ela não estudou muito." (afirma-se o antecedente e nega-se o consequente, conforme a regra da condicional).

## 4. Dicas para Resolução de Questões de Concurso

- **Reescreva sempre em símbolos:** transformar a frase em p, q, r e os conectivos ∧, ∨, →, ↔ reduz erros de interpretação e ganha tempo de prova.
- **Identifique o conectivo principal antes de negar:** ele é quem determina a regra de negação a ser aplicada.
- **Condicional vira "ou":** lembrar que p → q equivale a ¬p ∨ q resolve rapidamente muitas questões de equivalência.
- **Desconfie de argumentos "que soam certos":** valide sempre pela estrutura (Modus Ponens/Tollens), não pela plausibilidade do conteúdo.
- **Treine tabelas-verdade de cabeça:** decorar quando cada conectivo é falso (em vez de quando é verdadeiro) costuma agilizar a resolução.

## Referências

- **Tipo:** Artigo
  **Título:** "Negação de Proposições Lógicas"
  **URL:** https://www.estrategiaconcursos.com.br/blog/negacao-proposicoes/
  **Descrição:** Artigo que detalha as regras práticas de negação de proposições compostas e reforça a cobrança do tema por bancas como FGV, FCC e Cebraspe.
- **Tipo:** Artigo
  **Título:** "Saiba tudo sobre conectivos lógicos"
  **URL:** https://www.estrategiaconcursos.com.br/blog/tudo-conectivos-logicos/
  **Descrição:** Artigo com definições básicas de proposições e explicação de como a negação inverte o valor lógico de uma sentença.
- **Tipo:** Artigo
  **Título:** "Raciocínio Lógico para Concursos"
  **URL:** https://www.novaconcursos.com.br/portal/artigos/raciocinio-logico-para-concursos/
  **Descrição:** Material que aborda as negações dos conectivos "e", "ou" e "se...então" e introduz o conceito de argumento válido e inválido.
- **Tipo:** Site oficial
  **Título:** "Questões de Raciocínio Lógico - Equivalência Lógica e Negação de Proposições para Concurso"
  **URL:** https://www.qconcursos.com/questoes-de-concursos/disciplinas/matematica-raciocinio-logico/equivalencia-logica-e-negacao-de-proposicoes/questoes
  **Descrição:** Banco de questões reais de concurso sobre negação de proposições compostas e aplicação das Leis de De Morgan.
- **Tipo:** Artigo
  **Título:** "Raciocínio Lógico – Proposições, Conectivos e Tabela Verdade"
  **URL:** https://sigmacursospreparatorios.com.br/raciocinio-logico-proposicoes-conectivos-e-tabela-verdade/
  **Descrição:** Material de curso preparatório que define proposição, apresenta os conectivos e a construção da tabela-verdade.
- **Tipo:** Artigo
  **Título:** "argumentos logicos"
  **URL:** https://www.estrategiaconcursos.com.br/blog/argumentos-logicos/
  **Descrição:** Artigo que apresenta as estruturas de Modus Ponens, Modus Tollens, silogismo hipotético e disjuntivo, além das falácias de afirmação do consequente e negação do antecedente.
- **Tipo:** PDF
  **Título:** "Aula03 Regras de Inferência"
  **URL:** https://homepages.dcc.ufmg.br/~msalvim/courses/mat-disc/Aula03_Regras_de_Inferencia%5b2x2%5d.pdf
  **Descrição:** Material acadêmico da UFMG usado para confirmar a definição formal de argumento válido em lógica proposicional.
- **Tipo:** Artigo
  **Título:** "Silogismo: o que é, tipos e como usar na argumentação"
  **URL:** https://www.fm2s.com.br/blog/silogismo
  **Descrição:** Artigo consultado para embasar a definição de silogismo e as condições de validade do raciocínio dedutivo.
