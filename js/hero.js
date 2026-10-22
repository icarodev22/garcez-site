/*
  HERO — carrossel 3D com 3 fotos EXCLUSIVAS do hero.

  Estas fotos não podem aparecer em nenhuma outra seção do site.
  A galeria de Ensaios (js/ensaios.js → ENSAIO_IMAGES) usa outra lista e,
  por segurança, bloqueia automaticamente qualquer item que esteja aqui.

  Cada slide traz sua paleta: o vermelho/preto é a identidade GARCEZ;
  azul e ciano são variações cinematográficas temporárias do hero.
*/
window.HERO_SLIDES = [
  {
    id: "vermelho",
    src: "images/hero/garcez-vermelho",
    original: "@psimoesll - GARCEZ -46.jpg",
    alt: "GARCEZ com três óculos escuros empilhados, corrente prateada e camiseta preta, diante de um fundo vermelho",
    focus: "50% 22%",
    palette: { c1: "#e5092b", c2: "#4a000c", c3: "#ff1738" },
    theme:   { accent: "#e5092b", hot: "#ff1738", deep: "#4a000c" }      // vermelho oficial
  },
  {
    id: "azul",
    src: "images/hero/garcez-azul",
    original: "@psimoesll - GARCEZ -109.jpg",
    alt: "GARCEZ de óculos laranja e casaco escuro de gola alta, sob luz azul elétrica",
    focus: "52% 24%",
    palette: { c1: "#1d4bff", c2: "#050f3a", c3: "#4d86ff" },
    theme:   { accent: "#2d5bff", hot: "#5b8cff", deep: "#06103d" }
  },
  {
    id: "ciano",
    src: "images/hero/garcez-ciano",
    original: "@psimoesll - GARCEZ -72.jpg",
    alt: "GARCEZ de óculos escuros segurando o capuz do moletom branco, em fundo ciano",
    focus: "50% 20%",
    palette: { c1: "#10c3d3", c2: "#02303a", c3: "#3ee8f2" },
    theme:   { accent: "#12b4c4", hot: "#3ee8f2", deep: "#02303a" }
  }
];

(function () {
  "use strict";

  var hero = document.getElementById("inicio");
  var stage = document.getElementById("hero-cards");
  if (!hero || !stage) return;

  var slides = (window.HERO_SLIDES || []).filter(function (s, i, arr) {
    return s && s.src && arr.findIndex(function (o) { return o.src === s.src; }) === i;
  });
  var n = slides.length;
  if (!n) return;

  // duração vem do CSS (--hero-dur): 650ms no desktop (cinematográfico), 320ms no touch/celular
  var cssDur = function () { return parseFloat(getComputedStyle(hero).getPropertyValue("--hero-dur")) || 650; };
  var AUTOPLAY = 7000;         // ms
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var current = 0, busy = false, timer = 0, inView = true;

  var countEl = document.getElementById("hero-current");
  var totalEl = document.getElementById("hero-total");
  var progress = document.getElementById("hero-progress");
  var pad = function (v) { return (v < 10 ? "0" : "") + v; };
  if (totalEl) totalEl.textContent = pad(n);

  // ---- renderiza as fotos (uma única vez cada) ----
  var cards = slides.map(function (s, i) {
    var fig = document.createElement("figure");
    fig.className = "hero-card";
    var img = document.createElement("img");
    img.src = s.src + "-720.webp";
    img.srcset = s.src + "-720.webp 720w, " + s.src + "-1365.webp 1365w";
    img.sizes = "(min-width: 1024px) 34vw, 62vw";
    img.width = 1365; img.height = 2048;
    img.alt = s.alt;
    img.decoding = "async";
    img.draggable = false;
    if (i === 0) { img.fetchPriority = "high"; img.loading = "eager"; }
    else img.loading = "eager";              // só 3 fotos: carregam juntas para a troca ser instantânea
    img.style.objectPosition = s.focus || "50% 25%";
    fig.appendChild(img);
    stage.appendChild(fig);
    return fig;
  });

  cards.forEach(function (c) {
    var im = c.querySelector("img");
    if (im && im.decode) im.decode().catch(function () {});
  });

  function posOf(i) {
    var k = (i - current + n) % n;
    if (k === 0) return "center";
    if (k === 1) return "right";
    if (k === n - 1) return "left";
    return "hidden";
  }

  function paint() {
    var s = slides[current];
    hero.style.setProperty("--hero-c1", s.palette.c1);
    hero.style.setProperty("--hero-c2", s.palette.c2);
    hero.style.setProperty("--hero-c3", s.palette.c3);
    hero.setAttribute("data-slide", s.id);
    // TEMA DO SITE: a cor do slide vira o destaque de todas as seções (css/style.css → --accent*).
    // O preto segue como base; os tokens transicionam em 650ms, junto com as fotos.
    var th = s.theme || { accent: s.palette.c1, hot: s.palette.c3, deep: s.palette.c2 };
    var rootStyle = document.documentElement.style;
    rootStyle.setProperty("--accent", th.accent);
    rootStyle.setProperty("--accent-hot", th.hot);
    rootStyle.setProperty("--accent-deep", th.deep);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", th.deep);
    cards.forEach(function (c, i) {
      var p = posOf(i);
      c.setAttribute("data-pos", p);
      c.setAttribute("aria-hidden", p === "center" ? "false" : "true");
    });
    if (countEl) countEl.textContent = pad(current + 1);
  }

  function restartProgress() {
    if (!progress) return;
    progress.classList.remove("is-running");
    void progress.offsetWidth;                     // reinicia a animação CSS
    if (autoplayOn()) progress.classList.add("is-running");
  }

  var pending = 0;                                  // 1 gesto feito durante a animação entra na fila
  function go(dir) {
    if (n < 2) return;
    if (busy) { pending = dir; return; }
    busy = true; pending = 0;
    hero.classList.add("is-moving");
    hero.setAttribute("data-dir", dir > 0 ? "next" : "prev");
    current = (current + dir + n) % n;             // circular
    paint();
    hero.dispatchEvent(new Event("hero:change"));
    schedule();
    setTimeout(function () {
      busy = false; hero.classList.remove("is-moving");
      if (pending) { var d = pending; pending = 0; go(d); }
    }, reduce.matches ? 60 : cssDur());
  }
  var next = function () { go(1); };
  var prev = function () { go(-1); };

  // ---- autoplay ----
  function autoplayOn() { return !reduce.matches && inView && !document.hidden && n > 1; }
  function schedule() {
    clearTimeout(timer);
    restartProgress();
    if (autoplayOn()) timer = setTimeout(next, AUTOPLAY);
  }
  document.addEventListener("visibilitychange", schedule);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; schedule(); }, { threshold: 0.35 }).observe(hero);
  }
  if (reduce.addEventListener) reduce.addEventListener("change", schedule);

  // ---- teclado (acessibilidade; não há controles visíveis) ----
  hero.addEventListener("keydown", function (e) {
    if (e.target.closest("a")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  // ---- DESLIZAR COM O DEDO (touch) — em todo o hero ----
  // touch-action: pan-y no hero → a rolagem vertical continua nativa; se o navegador
  // assumir a rolagem vertical ele dispara pointercancel e nada é trocado.
  var sx = 0, sy = 0, st = 0, pid = null;
  hero.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;            // mouse usa a roda
    if (e.target.closest("a, button")) return;        // toque em botão não é swipe
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now();
  });
  // dispara DURANTE o movimento (não espera soltar o dedo): resposta imediata
  var SWIPE_MIN = 28;                                // px horizontais
  hero.addEventListener("pointermove", function (e) {
    if (e.pointerId !== pid) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2) {
      pid = null;                                    // um gesto = uma troca
      (dx < 0 ? next : prev)();
    }
  });
  hero.addEventListener("pointerup", function (e) { if (e.pointerId === pid) pid = null; });
  hero.addEventListener("pointercancel", function () { pid = null; });

  // ---- RODA DO MOUSE / TRACKPAD (desktop) — sem prender a página ----
  // Só atua com a página no topo (hero inteiro na tela). Para baixo: 1→2→3 e, no último
  // slide, a página desce normalmente. Para cima: 3→2→1 e, no primeiro, nada é bloqueado.
  // Um gesto = uma troca: eventos do mesmo gesto (inércia do trackpad) são absorvidos.
  var gestureFromTop = false, gestureUsed = false, gestureAcc = 0, lastWheel = 0;
  var WHEEL_GAP = 300;        // ms sem eventos = gesto novo
  var COOLDOWN = 750;      // (desktop)         // ms após uma troca em que a rolagem é absorvida (animação de 650ms + folga)
  var lastChange = -1e9;
  var WHEEL_MIN = 28;         // deslocamento mínimo para contar como intenção
  function atTop() { return window.scrollY <= 2 && hero.getBoundingClientRect().top >= -2; }
  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // zoom/gesto lateral: ignora
    var now = performance.now();
    if (now - lastWheel > WHEEL_GAP) { gestureFromTop = atTop(); gestureUsed = false; gestureAcc = 0; }
    lastWheel = now;
    // só gestos que COMEÇARAM com a página no topo trocam slide (quem volta rolando para cima
    // com inércia não troca a foto sem querer)
    if (!gestureFromTop || !atTop()) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    // o gesto que já trocou um slide (e a janela logo após a troca) é absorvido: sem saltos múltiplos
    if (now - lastChange < COOLDOWN) { if (e.cancelable) e.preventDefault(); gestureUsed = true; return; }
    // o MESMO gesto continuou depois da animação = intenção clara de descer: a página rola livre
    if (gestureUsed) return;
    // limites: depois do último (descendo) ou antes do primeiro (subindo) a página rola livre
    if ((dir > 0 && current === n - 1) || (dir < 0 && current === 0)) return;
    if (e.cancelable) e.preventDefault();
    gestureAcc += e.deltaY * (e.deltaMode === 1 ? 33 : 1);
    if (Math.abs(gestureAcc) < WHEEL_MIN || busy) return;
    gestureUsed = true;
    lastChange = now;
    go(dir);
  }, { passive: false });

  // ---- parallax sutil (só desktop com mouse) ----
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function parallax() {
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    hero.style.setProperty("--px", cx.toFixed(4));
    hero.style.setProperty("--py", cy.toFixed(4));
    if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) raf = requestAnimationFrame(parallax);
    else raf = 0;
  }
  if (fine.matches && !reduce.matches) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(parallax);
    });
    hero.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(parallax); });
  }

  // ---- fundo do hero em UM canvas de meia resolução ----
  // Luz difusa não perde nada em meia resolução e um único canvas custa muito
  // menos que várias camadas grandes animadas. As cores vêm das variáveis CSS
  // (--hero-c1/2/3), que fazem a transição de 650ms — então o fundo muda em
  // sincronia exata com as fotos.
  var cv = document.getElementById("hero-canvas");
  var cctx = cv && cv.getContext ? cv.getContext("2d") : null;
  var useCanvas = !!cctx;
  if (useCanvas) {
    hero.classList.add("has-hero-canvas");
    var CW = 0, CH = 0, SCALE = 0.5, pts = [], cRun = false, cRaf = 0, cLast = 0, cStart = performance.now();
    var lowPower = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 768;
    // luz difusa e partículas lentas ficam fluidas a 30 fps (metade do custo); aparelhos modestos: 24 fps
    var cInterval = lowPower ? 1000 / 24 : 1000 / 30;

    var parse = function (str) {
      var m = str.match(/\d+(\.\d+)?/g);
      return m ? [ +m[0], +m[1], +m[2] ] : [229, 9, 43];
    };
    var rgba = function (c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a.toFixed(3) + ")"; };

    var sizeCanvas = function () {
      var r = hero.getBoundingClientRect();
      CW = Math.max(1, Math.round(r.width * SCALE));
      CH = Math.max(1, Math.round(r.height * SCALE));
      cv.width = CW; cv.height = CH;
      var count = window.innerWidth < 768 ? 14 : 26;
      pts = [];
      for (var i = 0; i < count; i++) pts.push({ x: Math.random(), y: Math.random(), v: 0.012 + Math.random() * 0.02, r: 0.6 + Math.random() * 1.1, ph: Math.random() * 6.28 });
    };

    var draw = function (now) {
      var t = (now - cStart) / 1000;
      var dt = cLast ? Math.min(0.05, (now - cLast) / 1000) : 0;
      cLast = now;
      var cs = getComputedStyle(hero);
      var c1 = parse(cs.getPropertyValue("--hero-c1")), c2 = parse(cs.getPropertyValue("--hero-c2")), c3 = parse(cs.getPropertyValue("--hero-c3"));
      var px = parseFloat(cs.getPropertyValue("--px")) || 0, py = parseFloat(cs.getPropertyValue("--py")) || 0;
      var M = Math.max(CW, CH);

      cctx.globalCompositeOperation = "source-over";
      cctx.fillStyle = "#050505";
      cctx.fillRect(0, 0, CW, CH);
      cctx.globalCompositeOperation = "lighter";

      // luz A (cor principal) e luz B (tom escuro) derivando devagar
      var ax = CW * (0.12 + 0.08 * Math.sin(t * 0.09)) - px * 20, ay = CH * (0.05 + 0.06 * Math.cos(t * 0.07));
      var g = cctx.createRadialGradient(ax, ay, 0, ax, ay, M * 0.75);
      g.addColorStop(0, rgba(c1, 0.55)); g.addColorStop(0.45, rgba(c1, 0.16)); g.addColorStop(1, rgba(c1, 0));
      cctx.fillStyle = g; cctx.fillRect(0, 0, CW, CH);
      var bx = CW * (0.9 - 0.06 * Math.sin(t * 0.08)), by = CH * (1.0 - 0.05 * Math.cos(t * 0.06));
      g = cctx.createRadialGradient(bx, by, 0, bx, by, M * 0.7);
      g.addColorStop(0, rgba(c2, 0.9)); g.addColorStop(1, rgba(c2, 0));
      cctx.fillStyle = g; cctx.fillRect(0, 0, CW, CH);

      // feixes volumétricos que varrem a cena
      for (var k = 0; k < 2; k++) {
        var ox = CW * (k ? 0.82 : 0.2), oy = -CH * 0.08;
        var ang = Math.sin(t * (k ? 0.36 : 0.3) + k * 2) * 0.32 + (k ? -0.12 : 0.12);
        var len = CH * 1.3, half = len * 0.2;
        var ex = ox + Math.sin(ang) * len, ey = oy + Math.cos(ang) * len;
        var nx = Math.cos(ang) * half, ny = -Math.sin(ang) * half;
        var bg = cctx.createLinearGradient(ox, oy, ex, ey);
        var pulse = 0.75 + 0.25 * Math.sin(t * 0.5 + k);
        bg.addColorStop(0, rgba(c3, 0.32 * pulse)); bg.addColorStop(0.7, rgba(c3, 0));
        cctx.fillStyle = bg;
        cctx.beginPath(); cctx.moveTo(ox, oy); cctx.lineTo(ex + nx, ey + ny); cctx.lineTo(ex - nx, ey - ny); cctx.closePath(); cctx.fill();
      }

      // halo difuso atrás do artista (respira)
      var hx = CW / 2 - px * 12, hy = CH * 0.45 - py * 9;
      var breathe = 0.85 + 0.15 * Math.sin(t * 0.9);
      g = cctx.createRadialGradient(hx, hy, 0, hx, hy, Math.min(CW, CH) * 0.62);
      g.addColorStop(0, rgba(c3, 0.5 * breathe)); g.addColorStop(0.4, rgba(c1, 0.2 * breathe)); g.addColorStop(1, rgba(c1, 0));
      cctx.fillStyle = g; cctx.fillRect(0, 0, CW, CH);

      // partículas subindo
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y -= p.v * dt;
        if (p.y < 0.25) { p.y = 1.02; p.x = Math.random(); }
        var life = Math.min(1, (p.y - 0.25) / 0.2) * Math.min(1, (1.02 - p.y) / 0.12);
        var a = life * (0.55 + 0.35 * Math.sin(t * 1.4 + p.ph));
        var x = p.x * CW - px * 8, y = p.y * CH;
        g = cctx.createRadialGradient(x, y, 0, x, y, p.r * 3);
        g.addColorStop(0, "rgba(255,255,255," + (a * 0.9).toFixed(3) + ")");
        g.addColorStop(0.35, rgba(c3, a * 0.7)); g.addColorStop(1, rgba(c3, 0));
        cctx.fillStyle = g; cctx.fillRect(x - p.r * 3, y - p.r * 3, p.r * 6, p.r * 6);
      }
      cctx.globalCompositeOperation = "source-over";
    };

    var cLoop = function (now) {
      if (!cRun) return;
      cRaf = requestAnimationFrame(cLoop);
      if (cLast && now - cLast < cInterval - 1) return;
      draw(now);
    };
    var cStartLoop = function () {
      if (cRun) return;
      if (reduce.matches) { draw(performance.now()); return; }
      cRun = true; cLast = 0; cRaf = requestAnimationFrame(cLoop);
    };
    var cStop = function () { cRun = false; cancelAnimationFrame(cRaf); };

    sizeCanvas();
    var cInView = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { cInView = en[0].isIntersecting; if (cInView && !document.hidden) cStartLoop(); else cStop(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) cStop(); else if (cInView) cStartLoop(); });
    var cRT = 0;
    window.addEventListener("resize", function () { clearTimeout(cRT); cRT = setTimeout(function () { sizeCanvas(); draw(performance.now()); }, 150); });
    // com movimento reduzido, redesenha só durante a troca de cor
    hero.addEventListener("hero:change", function () {
      if (!reduce.matches) return;
      var end = performance.now() + 700;
      (function step(n) { draw(n); if (n < end) requestAnimationFrame(step); })(performance.now());
    });
    cStartLoop();
  }

  // ---- partículas em CSS (somente fallback sem canvas) ----
  var dots = document.getElementById("hero-particles");
  if (dots && !useCanvas && !reduce.matches) {
    var count = window.innerWidth < 768 ? 10 : 22;
    for (var i = 0; i < count; i++) {
      var d = document.createElement("span");
      var size = (Math.random() * 2.2 + 1.2).toFixed(1);
      d.style.left = (Math.random() * 100).toFixed(2) + "%";
      d.style.top = (40 + Math.random() * 60).toFixed(2) + "%";
      d.style.width = d.style.height = size + "px";
      d.style.animationDuration = (12 + Math.random() * 12).toFixed(1) + "s";
      d.style.animationDelay = (-Math.random() * 20).toFixed(1) + "s";
      dots.appendChild(d);
    }
  }

  paint();
  hero.classList.add("hero--ready");
  schedule();
})();
