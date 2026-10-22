/*
  ENSAIOS — lista das fotografias da galeria.

  Para adicionar uma foto nova:
    1. Gere as versões otimizadas com scripts/prepare_images.py
       (cria images/NOME-640.webp e images/NOME-1200.webp).
    2. Acrescente um item abaixo com:
         id   → identificador único (sem espaços)
         src  → caminho SEM o sufixo "-640.webp" / "-1200.webp"
         alt  → descrição curta da foto (acessibilidade; não aparece na tela)
         w, h → proporção da foto (ex.: 1200 x 1800 para retrato 2:3)

  IMPORTANTE: as 3 fotos do HERO (-46, -109 e -72) são exclusivas do hero
  (js/hero.js → HERO_SLIDES) e NÃO podem entrar nesta lista.
  O componente também as bloqueia automaticamente.

  Cada foto deve aparecer uma única vez. O componente ignora automaticamente
  itens com "id" ou "src" repetidos e nunca clona imagens para fazer o loop.
*/
window.ENSAIO_IMAGES = [
  { id: "verde-agachado",  src: "images/ensaio-verde-agachado", w: 1200, h: 1800, alt: "GARCEZ agachado, de boné para trás e camisa amarela da seleção, em fundo verde" },
  { id: "balaclava",       src: "images/lookbook-balaclava",    w: 1200, h: 1800, alt: "GARCEZ de balaclava preta e moletom branco com capuz, em fundo ciano" },
  { id: "vermelho-corpo",  src: "images/ensaio-vermelho-corpo", w: 1200, h: 1800, alt: "GARCEZ de corpo inteiro, de jaqueta preta e luva com spikes, em fundo vermelho" },
  { id: "spot",            src: "images/lookbook-spot",         w: 1200, h: 1800, alt: "GARCEZ de corpo inteiro dentro de um círculo de luz, com moletom branco e jeans" },
  { id: "verde-sentado",   src: "images/ensaio-verde-sentado",  w: 1200, h: 1800, alt: "GARCEZ sentado no chão, sorrindo, de camisa amarela da seleção, em fundo verde" }
];
