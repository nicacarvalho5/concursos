---
description: "Anima um SVG que o usuário FORNECE dentro de um slide do Mira, dando movimento próprio à forma (não vira outra forma, isso é morph). Usa GSAP vendorado offline (file://) e escolhe a técnica por transform, DrawSVGPlugin (o traço se desenha) ou MotionPathPlugin (curva). Para animar uma PARTE, ela precisa ser um elemento separado; se o SVG vier como path único fundido, a skill separa por clipPath ou editando o path. Remove fundo opaco, define a origem do movimento, herda a Regra Zero e respeita prefers-reduced-motion. Use SEMPRE que o usuário disser /mira-svg-animator, anima esse svg, faz a borboleta bater asas, gira essa roda, faz esse desenho se mexer, desliza esse svg, faz pulsar, o traço se desenha sozinho, ou passar um SVG pedindo movimento. Para uma forma virando OUTRA use mira-svg-morph ou mira-icon-morph."
agent: build
---
# Comando `mira-svg-animator` do Mira
Ative este comando para carregar o skill `mira-svg-animator` e siga as instruções do SKILL.md.
/mira-svg-animator
