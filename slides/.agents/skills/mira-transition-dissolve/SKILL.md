---
name: mira-transition-dissolve
description: Aplica transição DISSOLVE (crossfade estilo Canva/Keynote) entre slides de um deck do Mira via View Transitions API same-document, que roda em file:// sem servidor. Cria index-dissolve.html ao lado, sem tocar no original. Use SEMPRE que o usuário disser "/mira-transition-dissolve", "transição dissolve", "dissolve nos slides", "crossfade entre slides", "fade entre slides", "transição de slides estilo Canva", "tira o scroll e põe fade", "transição suave entre cards", "aplica o dissolve", ou pedir qualquer transição de esmaecimento entre slides do deck.
---

# Skill: Transição Dissolve entre Slides

Transforma a navegação card-a-card (scroll suave entre `<section>`) em **dissolve**: o slide se desmancha no próximo via crossfade. Mecanismo: **View Transitions API same-document**, que roda com clique duplo no `file://`, sem servidor, em Chrome e Edge. Navegadores sem a API caem no pulo normal, nada quebra.

## REGRA DE IDIOMA

Siga `agents/_shared/idioma.md`. Todo texto visível em português brasileiro com acentuação correta. Proibido travessão (—): use vírgula ou dois-pontos.

## Regra de Ouro: nunca destrua o original

- O deck de origem **permanece intacto**.
- Crie um **arquivo novo** ao lado, com sufixo `-dissolve` antes da extensão:
  - `index.html` → `index-dissolve.html`
  - `index-1x1.html` → `index-1x1-dissolve.html`
  - `index-9x16.html` → `index-9x16-dissolve.html`
- Só edite o arquivo original em vez de criar cópia se o usuário pedir explicitamente ("aplica direto no index.html").

## Pré-checagem (idempotência)

Antes de aplicar, verifique se o arquivo-alvo já contém `startViewTransition` ou o marcador `=== DISSOLVE`. Se contiver, a transição já está aplicada: reporte isso ao usuário e não duplique nada. Se o usuário quiser apenas mudar a velocidade, ajuste o `animation-duration` do bloco existente.

## Como o deck do Mira navega (estado de partida)

O template do `mira-builder` gera um HTML único com:

- Slides como `<section>` filhas diretas de `<body>`, cada uma `min-h-screen`.
- `html { scroll-behavior: smooth; }` no CSS.
- Um IIFE de controles com `goTo(i)` que faz `scrollIntoView({ behavior: 'smooth' })`, mais `window.scrollTo({ top: 0, behavior: 'smooth' })` para voltar ao início (botão flutuante no fim, seta para cima no slide 1, tecla Home).
- UI fixa: `#mira-progress` (barra de progresso), `#mira-next` (botão flutuante), `.slide-counter` (contador).
- Animações D3 disparadas por IntersectionObserver. Continuam funcionando sem mudança: o scroll ainda acontece, só que instantâneo e escondido na transição.

Decks antigos podem variar nos nomes. Sem `goTo` ou os IDs exatos, localize a função de navegação que chama `scrollIntoView` e os elementos `position: fixed`, e aplique o mesmo princípio abaixo.

## Aplicação (3 edições)

### 1. Bloco CSS do dissolve

Inserir no `<style>` principal, após as regras dos controles de slide (ou ao final do style, se a âncora não existir):

```css
/* === DISSOLVE (View Transitions same-document) === */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 0.55s; }
/* UI fixa não participa do crossfade do palco */
#mira-progress { view-transition-name: mira-progress; }
#mira-next { view-transition-name: mira-next; }
.slide-counter { view-transition-name: mira-counter; }
```

Regras:

- `0.55s` é o padrão; ajuste se pedirem mais lento/rápido (faixa sensata: 0.3s a 1.2s).
- Todo elemento de UI com `position: fixed` precisa de um `view-transition-name` próprio e único, senão pisca junto com o crossfade do palco. Se houver outros fixos (logo, marca d'água), nomeie cada um no padrão `mira-<apelido>`.

### 2. Helper `dissolve` e novo `goTo`

Dentro do IIFE de controles, substituir a linha do `goTo`:

```js
function goTo(i) { const idx = Math.max(0, Math.min(cardSections.length - 1, i)); cardSections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' }); }
```

por:

```js
function dissolve(jump) { if (document.startViewTransition) document.startViewTransition(jump); else jump(); }
function goTo(i) { const idx = Math.max(0, Math.min(cardSections.length - 1, i)); dissolve(() => cardSections[idx].scrollIntoView({ behavior: 'instant', block: 'start' })); }
```

Pontos críticos:

- `behavior: 'instant'`, nunca `'auto'`: com `html { scroll-behavior: smooth; }` no CSS, `'auto'` herdaria o suave e estragaria o snapshot. `'instant'` força o pulo seco.
- O fallback `else jump()` é obrigatório: navegador sem a API navega normal.

### 3. Voltas ao topo também dissolvem

Toda chamada de `window.scrollTo({ top: 0, behavior: 'smooth' })` ligada à navegação (botão next no fim, seta para cima no slide 1, tecla Home) vira:

```js
dissolve(() => window.scrollTo({ top: 0, behavior: 'instant' }))
```

No template padrão são 3 ocorrências: no listener de clique do `#mira-next` e em dois ramos do listener de `keydown` (setas para cima com `idx <= 0`, e tecla `Home`).

## O que NÃO fazer

- Não remover o `html { scroll-behavior: smooth; }` nem o listener de `scroll` (progresso e contador dependem dele).
- Não mexer no IntersectionObserver nem nas animações D3.
- Não aplicar view transition em scroll de roda de mouse: o dissolve vale só para navegação programática (teclado e botões); a roda continua scroll normal.
- Não duplicar o helper `dissolve` ao rodar de novo (ver pré-checagem).

## Verificação antes de entregar

1. O arquivo original está intacto e o `-dissolve.html` existe ao lado.
2. Grep no arquivo novo: `startViewTransition` aparece 1 vez; `behavior: 'smooth'` não aparece mais em chamadas de navegação (pode sobrar no CSS).
3. Abrir no Chrome ou Edge via clique duplo: setas e espaço fazem crossfade, contador e barra não piscam, animações D3 disparam ao chegar no slide.
4. Reportar o caminho do arquivo gerado e lembrar que o efeito aparece em Chrome/Edge (os demais navegam normal, sem quebrar).
