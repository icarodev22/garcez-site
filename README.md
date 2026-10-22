# GARCEZ — site oficial

Site de página única em HTML, CSS e JavaScript puro (sem build). Publica direto na Vercel.

## Estrutura
- `index.html` — todas as seções (Início, Quem Sou, Carreira, Lançamentos, Contato)
- `css/style.css` — estilos (mobile-first, paleta vermelho/preto)
- `js/ensaios.js` — **lista de fotos da aba Ensaios** (edite aqui para adicionar fotos)
- `js/main.js` — menu, seção ativa, entradas no scroll, linha do tempo, galeria Ensaios (loop infinito), efeito Specular
- `js/stage3d.js` — fundo 3D de palco (Canvas 2D, sem bibliotecas)
- `images/` — fotos otimizadas em WebP (640 e 1200 px), logos, favicon e imagem de compartilhamento
- `scripts/prepare_images.py` — gera as imagens a partir dos originais
- `vercel.json` — cache das imagens

## Rodar localmente
    python3 -m http.server 5173
e abra http://localhost:5173

## Publicar na Vercel
Importe a pasta como projeto. Framework: "Other". Sem comando de build. Diretório de saída: raiz (`.`).

## Hero (3 fotos exclusivas)
Configuração em `js/hero.js` → `HERO_SLIDES` (foto + paleta de cada slide). As fotos ficam em `images/hero/` e são
EXCLUSIVAS do hero: -46 (vermelho), -109 (azul) e -72 (ciano). A galeria de Ensaios (`js/ensaios.js` → `ENSAIO_IMAGES`)
bloqueia automaticamente qualquer foto que esteja em `HERO_SLIDES`.
A logo atrás das fotos é o arquivo oficial `GARCEZ PRETO.png`, copiado sem alteração para
`images/hero/logo-garcez-oficial.png` e usado como máscara (o desenho vem do original; a cor vem de uma camada de luz
separada, porque o original é preto). Se houver uma versão oficial clara/negativa, basta trocar o arquivo.

## Tema de cor dinâmico
Fonte única de cor de destaque em `css/style.css` (`--accent`, `--accent-hot`, `--accent-deep`, registradas com
`@property`, transição de 650 ms). O hero (`js/hero.js` → `theme` de cada slide) troca esses tokens; realces, divisores,
bordas, hovers, partículas, luz ambiente e o fundo 3D (`js/stage3d.js`) leem deles. O preto segue como base e
`--brand` (vermelho oficial) é fixo — usado no botão principal. A logo oficial não muda de cor.

## Navegação do hero
Sem setas. Desktop: roda do mouse/trackpad com a página no topo (1 gesto = 1 foto; no último slide, ou se o mesmo
gesto continuar, a página desce normalmente). Touch: deslizar na horizontal (circular). Também: teclado (← →) e autoplay.

## Desempenho no celular
- Cantos arredondados aplicados também na própria imagem (o WebKit/Safari não recorta filhos durante animações).
- Contorno Specular estático no touch (sem animação contínua); animado só no desktop, e só nas fotos visíveis.
- Revelação no scroll: só esconde quando o JS está ativo (`.reveal-on`); fotos são baixadas/decodificadas antes de
  chegar à tela e o card só aparece com a foto pronta (limite de 600 ms).
- Hero: troca de 320 ms no touch e 650 ms no desktop (`--hero-dur`); swipe dispara aos 28 px, ainda com o dedo na
  tela, e um gesto feito durante a animação entra na fila. Laterais escurecidas por opacidade (sem `filter`).
- Frase do hero com 2 linhas fixas no celular: a troca de fonte não desloca o layout (CLS 0).

## Onde cada foto é usada (nenhuma se repete)
| Seção | Arquivo original |
|---|---|
| Hero (exclusivas) | -46, -109, -72 |
| Quem Sou (principal / detalhe) | -45 / -76 |
| Ensaios (galeria horizontal) | -61, -66, ensaio-verde-agachado, ensaio-vermelho-corpo-inteiro, ensaio-verde-sentado |
| Carreira · Carimbada | @gabriellrec-69, @gabriellrec-54 |
| Carreira · Intermed (Natal/RN) | Intermed Litoral Leste - Natal_RN |
| Carreira · Echoes (Petrolina/PE) | Echoes - Petrolina_PNZ |
| Carreira · Na pista | @mjhulyalmeida-19, @gabriellrec-4, pista-cabine-camisa-amarela |
| Contato (fundo) | Intermed Litoral Leste - Natal_RN (1) |

`@gabriellrec-54 (1).jpg` era cópia idêntica de `@gabriellrec-54.jpg`, por isso foi descartada.

## Pendências — confirmar com o artista
Procure por `[PREENCHER]` no `index.html`.
1. Texto do "Quem Sou": cidade de origem, desde quando toca, estilos musicais.
2. Datas de Carimbada, Intermed e Echoes (a ordem da linha do tempo ainda não é cronológica confirmada).
3. Evento/local das fotos "Na pista" (@mjhulyalmeida-19 e @gabriellrec-4).
4. E-mail profissional, se houver.
7. Créditos dos fotógrafos das 3 fotos novas do ensaio e da foto de cabine com camisa amarela.
5. Domínio oficial: adicionar `<link rel="canonical">` e trocar a URL de `og:image` por URL absoluta.
6. Novos lançamentos: copiar o modelo comentado em `.releases__grid`.

## Fontes oficiais usadas
- Faixa: "Medley Hexa" · Garcez, DJ Bayma · 19/06/2026 · 3:30 (página oficial do Spotify)
- Bookings: WhatsApp oficial de bookings do artista (+55 81 99166-2429)
- Bio oficial: "DJ 🇧🇷|🇵🇹"

## Adicionar fotos aos Ensaios
1. Coloque o original na pasta de originais e adicione uma linha em `PHOTOS` no `scripts/prepare_images.py`.
2. Rode `python3 scripts/prepare_images.py <pasta_originais> images`.
3. Acrescente um item em `js/ensaios.js` (`id`, `src` sem o sufixo, `alt`, `w`, `h`).
A galeria ignora itens repetidos ou com arquivo inexistente e nunca clona fotos: o loop infinito move o próprio
elemento que saiu da tela para o fim da fila. Com poucas fotos (que não cubram a largura da tela), ela vai e volta suavemente.

## Fundo 3D
Cena em perspectiva (piso em grade, feixes de luz, bokeh, névoa e partículas) desenhada em canvas.
Ajusta partículas e taxa de quadros à capacidade do aparelho, pausa com a aba em segundo plano e mostra um quadro
estático com "reduzir movimento". Sem canvas, ficam as camadas CSS de fallback.

## Redes
Instagram: https://www.instagram.com/garcezmusic/ · YouTube: https://www.youtube.com/@garcezmusicc (canal "Garcez (BR)")

## Efeito Specular
Implementado em CSS/JS (classe `.specular`), adaptando o conceito do SpecularButton para molduras de fotos:
linha de ~1,25 px, brilho lento percorrendo a borda, reflexo que segue o mouse no desktop e brilho automático no celular.
Ajustes finos em `css/style.css`, bloco "Specular Image Frame" (`--spec-thick`, `--spec-line`, `--spec-red`, duração de `spec-orbit`) e em `js/main.js` (`REACH`).
