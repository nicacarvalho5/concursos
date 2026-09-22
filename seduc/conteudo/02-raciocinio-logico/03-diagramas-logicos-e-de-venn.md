# Tópico 03 — Diagramas Lógicos e de Venn

Este tópico apresenta **técnicas de resolução de diagramas lógicos para concurso**, tema muito **estratégico** em **provas** de nível superior, cobrado com frequência por bancas como **FGV**, **FCC** e **Cespe**. Os **diagramas de Venn** transformam enunciados complexos em imagens simples de interpretar, sendo uma das melhores **dicas** de **estudo** para ganhar **questões** rápidas no **edital** — desde que o candidato domine a **técnica** de leitura das regiões do diagrama, o **gabarito** correto se torna quase automático.

## 1. Definição

**Diagramas lógicos** são representações visuais utilizadas para organizar relações entre proposições, conjuntos ou categorias, facilitando a interpretação de enunciados de raciocínio lógico. O tipo mais cobrado em concurso é o **diagrama de Venn**, que usa círculos (ou outras figuras fechadas) sobrepostos dentro de um **conjunto universo**, cada um representando um conjunto de elementos, para evidenciar suas relações de **interseção**, **união**, **complemento** e **inclusão**.

## 2. Explicação Teórica

### 2.1 Elementos básicos de teoria dos conjuntos

- **Conjunto:** agrupamento de elementos com uma característica em comum.
- **Conjunto universo:** representado pelo retângulo que envolve todo o diagrama, contendo todos os elementos possíveis da situação.
- **Elemento:** cada item pertencente a um ou mais conjuntos.
- **Conjunto vazio:** conjunto sem nenhum elemento.

### 2.2 Operações entre conjuntos

- **União (A ∪ B):** todos os elementos que pertencem a A, a B, ou a ambos.
- **Interseção (A ∩ B):** apenas os elementos que pertencem simultaneamente a A e a B.
- **Complemento:** elementos do conjunto universo que **não** pertencem ao conjunto considerado.
- **Diferença (A − B):** elementos que pertencem a A, mas não pertencem a B.

### 2.3 Diagramas categóricos: "todo", "algum" e "nenhum"

Um grupo de questões muito recorrente envolve proposições categóricas com os quantificadores **todo**, **algum** e **nenhum**, que devem ser traduzidos em diagramas para se chegar a conclusões válidas:

- **"Todo A é B":** o círculo de A fica totalmente **dentro** do círculo de B.
- **"Algum A é B":** os círculos de A e B se **sobrepõem parcialmente** (há uma interseção, mas nenhum dos dois está contido no outro).
- **"Nenhum A é B":** os círculos de A e B **não se tocam**.

Essas três representações são a base para resolver silogismos categóricos por meio de diagramas, sem depender da simbologia formal da lógica proposicional.

> **Regra de Ouro:** "Ao usar 'todo' ou 'algum' em uma questão de diagrama, desenhe **todas as configurações possíveis** compatíveis com o enunciado antes de julgar uma conclusão como verdadeira — muitas alternativas erradas são apenas *possíveis*, não *necessárias*."

### 2.4 Diagramas de três conjuntos e o princípio da inclusão-exclusão

Quando o problema envolve três conjuntos (A, B e C), a região central representa os elementos comuns aos três, e a contagem total de elementos usa o **princípio da inclusão-exclusão**:

n(A ∪ B ∪ C) = n(A) + n(B) + n(C) − n(A∩B) − n(A∩C) − n(B∩C) + n(A∩B∩C)

Essa fórmula evita contar duas vezes os elementos que estão em mais de um conjunto.

## 3. Exemplos Práticos

### Exemplo Comparativo: "Todo A é B" vs "Algum A é B"

### "Todo A é B"
- Definição: todos os elementos de A também pertencem a B
- Representação: círculo de A completamente dentro do círculo de B
- Exemplo: "Todo professor é servidor público" → círculo "professor" dentro do círculo "servidor público"

### "Algum A é B"
- Definição: existe pelo menos um elemento que pertence a A e a B ao mesmo tempo
- Representação: círculos de A e B se sobrepõem parcialmente
- Exemplo: "Algum professor é coordenador" → interseção parcial entre os círculos "professor" e "coordenador"

### Exemplo Comparativo: Diagrama de Dois Conjuntos vs Três Conjuntos

### Diagrama de Dois Conjuntos
- Definição: representa a relação entre apenas dois grupos de elementos
- Característica 1: possui no máximo 4 regiões (só A, só B, interseção A∩B, fora dos dois)
- Característica 2: uso do princípio n(A∪B) = n(A) + n(B) − n(A∩B)

### Diagrama de Três Conjuntos
- Definição: representa a relação entre três grupos de elementos simultaneamente
- Característica 1: possui até 8 regiões, incluindo a interseção tripla no centro
- Característica 2: exige o princípio da inclusão-exclusão completo, com o termo +n(A∩B∩C)

**Tabela-resumo das regiões de um diagrama de três conjuntos:**

| Região do diagrama | O que representa |
|---|---|
| Só A | Elementos exclusivos de A |
| Só B | Elementos exclusivos de B |
| Só C | Elementos exclusivos de C |
| A ∩ B (sem C) | Pertencem a A e B, mas não a C |
| A ∩ C (sem B) | Pertencem a A e C, mas não a B |
| B ∩ C (sem A) | Pertencem a B e C, mas não a A |
| A ∩ B ∩ C | Pertencem aos três conjuntos ao mesmo tempo |
| Fora de A, B e C | Não pertencem a nenhum dos três conjuntos |

**Exemplo resolvido (nível concurso):** Em uma pesquisa com 200 turistas sobre a intenção de conhecer as cidades X, Y e Z, 30 não pretendiam conhecer nenhuma delas, e todos os demais (170) pretendiam conhecer pelo menos duas cidades. Nesse tipo de questão, o candidato deve montar o diagrama de três conjuntos e usar o total de cada cidade combinado com o número de pessoas "de fora" para isolar, por eliminação, a região central (as três cidades ao mesmo tempo).

## 4. Dicas para Resolução de Questões de Concurso

- **Sempre desenhe o diagrama**, mesmo em questões que pareçam simples de calcular de cabeça — o desenho evita contagens duplicadas e erros de interpretação.
- **Preencha o diagrama de dentro para fora:** comece pela interseção mais interna (a região comum a todos os conjuntos) e só depois calcule as regiões exclusivas.
- **Em questões com "todo", "algum" e "nenhum", teste múltiplas configurações** do diagrama antes de marcar uma alternativa como certa — o erro mais comum é considerar apenas uma possibilidade.
- **Cuidado com os elementos "de fora":** muitas questões escondem a resposta subtraindo do total geral quem não pertence a nenhum conjunto.
- **Para três conjuntos, aplique o princípio da inclusão-exclusão passo a passo**, anotando cada valor no diagrama à medida que for calculado, em vez de tentar resolver tudo em uma única conta.

## Referências

- **Tipo:** Artigo
  **Título:** "Diagrama de Venn – Problemas de raciocínio lógico"
  **URL:** https://clubes.obmep.org.br/blog/diagrama-de-venn-problemas-de-raciocinio-logico/
  **Descrição:** Material da OBMEP com problemas resolvidos utilizando diagramas de Venn para organizar dados e visualizar a solução.
- **Tipo:** Artigo
  **Título:** "Exercícios sobre lógica matemática e diagrama de Venn (questões com gabarito)"
  **URL:** https://www.todamateria.com.br/exercicios-sobre-logica-matematica-e-diagrama-de-venn-questoes-com-gabarito/
  **Descrição:** Banco de exercícios com gabarito comentado sobre proposições, conectivos e diagramas de Venn, usado para exemplificar questões de concurso.
- **Tipo:** Artigo
  **Título:** "Diagramas Lógicos: Guia Para Concursos"
  **URL:** https://www.estrategiaconcursos.com.br/blog/diagramas-logicos-concursos-2/
  **Descrição:** Artigo que explica interseção, união, complemento e inclusão de conjuntos usando diagramas de Venn, destacando a cobrança do tema por FGV, FCC e Cebraspe.
- **Tipo:** Site oficial
  **Título:** "Questões de Raciocínio Lógico - Diagramas de Venn (Conjuntos) para Concurso"
  **URL:** https://www.qconcursos.com/questoes-de-concursos/disciplinas/matematica-raciocinio-logico/diagramas-de-venn-conjuntos/questoes
  **Descrição:** Banco de questões reais de concursos recentes (inclusive FGV) sobre diagramas de Venn com regiões destacadas e proposições categóricas.
- **Tipo:** Artigo
  **Título:** "Entenda os diagramas lógicos para concursos"
  **URL:** https://somaconcursos.com.br/entenda-os-diagramas-logicos-para-concursos/
  **Descrição:** Artigo consultado para confirmar os principais tipos de diagramas lógicos usados em concursos, incluindo diagramas de Venn e de árvore.
- **Tipo:** Artigo
  **Título:** "Diagramas Lógicos - Raciocínio Lógico - Apostila Grátis"
  **URL:** https://www.okconcursos.com.br/apostilas/apostila-gratis/136-raciocinio-logico/2155-diagramas-logicos
  **Descrição:** Apostila utilizada para embasar as definições de conjunto, conjunto universo e a representação de elementos em diagramas de Venn, com foco nos quantificadores "todo", "algum" e "nenhum".
- **Tipo:** Site oficial
  **Título:** "154 Questões de Diagrama de Venn (Conjuntos) - Raciocínio Lógico para Concursos"
  **URL:** https://www.spsconcursos.com/questoes-de-raciocinio-logico/diagrama-de-venn.php
  **Descrição:** Fonte utilizada para o exemplo resolvido de diagrama de três conjuntos (pesquisa com turistas sobre cidades X, Y e Z) e para confirmar o padrão de cobrança do tema em provas de nível superior.
