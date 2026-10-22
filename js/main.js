/* GARCEZ — interações do site (sem dependências) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktopMQ = window.matchMedia("(min-width: 1024px)");

  /* ---------- Ano automático no rodapé ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Detecta se a fonte de títulos carregou ---------- */
  function checkFont() {
    if (!document.fonts || !document.fonts.forEach) return;
    var ok = false;
    document.fonts.forEach(function (f) {
      var fam = f.family.replace(/["']/g, "");
      if (fam === "Big Shoulders Display" && f.status === "loaded") ok = true;
    });
    root.classList.toggle("font-fallback", !ok);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(checkFont);
    window.addEventListener("load", function () { setTimeout(checkFont, 50); });
  }

  /* ---------- Preloader + entrada do hero ---------- */
  var preloader = document.getElementById("preloader");
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (preloader) preloader.classList.add("is-done");
    root.classList.add("is-ready");
  }
  if (reduceMotion.matches) {
    start();
  } else {
    // mostra a marca por um instante, mas nunca segura o visitante
    var minDelay = new Promise(function (r) { setTimeout(r, 750); });
    var heroImg = document.querySelector(".hero-card img");
    var heroLoaded = new Promise(function (r) {
      if (!heroImg || heroImg.complete) return r();
      heroImg.addEventListener("load", r, { once: true });
      heroImg.addEventListener("error", r, { once: true });
    });
    Promise.all([minDelay, heroLoaded]).then(start);
    setTimeout(start, 1400); // limite de segurança
  }

  /* ---------- Navbar: fundo ao rolar ---------- */
  var nav = document.getElementById("nav");
  function onScrollNav() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  onScrollNav();

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("menu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) {
      var first = menu.querySelector("a");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 120);
    }
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
      // mantém o foco dentro do menu aberto
      if (e.key === "Tab" && menu.classList.contains("is-open") && !desktopMQ.matches) {
        var items = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll("a")));
        var idx = items.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    // ao passar para desktop, o menu nunca fica "preso" aberto
    var onMQ = function () { if (desktopMQ.matches) setMenu(false); };
    if (desktopMQ.addEventListener) desktopMQ.addEventListener("change", onMQ);
    else desktopMQ.addListener(onMQ);
  }

  /* ---------- Seção ativa no menu ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute("data-nav")); })
    .filter(Boolean);

  function updateActive() {
    var probe = window.innerHeight * 0.4;
    var current = null;
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = s.id;
    });
    navLinks.forEach(function (a) {
      var on = a.getAttribute("data-nav") === current;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* =========================================================
     ENSAIOS — faixa fotográfica em LOOP INFINITO (dados em js/ensaios.js)
     · Cada foto é renderizada UMA única vez (ids/src repetidos e arquivos
       que falham ao carregar são descartados).
     · Loop real sem clones: quando uma foto sai totalmente pela esquerda,
       o PRÓPRIO elemento é movido para o fim da fila (e vice-versa).
       Assim nunca existem duas cópias da mesma foto na tela.
     · Se houver poucas fotos para cobrir a largura, a faixa vai e volta
       suavemente (sem clonar nada) até que existam fotos suficientes.
     · Arraste com mouse e dedo, com inércia; trackpad horizontal; setas.
     · O movimento automático desacelera ao interagir e retoma sozinho.
     ========================================================= */
  var gallery = document.getElementById("gallery");
  var track = document.getElementById("gallery-track");

  function renderGallery() {
    if (!gallery || !track) return [];
    var data = Array.isArray(window.ENSAIO_IMAGES) ? window.ENSAIO_IMAGES : [];
    // fotos exclusivas do hero nunca entram na galeria
    var heroOnly = {};
    (window.HERO_SLIDES || []).forEach(function (h) { heroOnly[h.src] = true; if (h.original) heroOnly[h.original] = true; });
    var seen = {};
    var frag = document.createDocumentFragment();
    var items = [];
    data.forEach(function (item) {
      if (!item || typeof item.src !== "string" || !item.src) return;
      if (heroOnly[item.src] || (item.original && heroOnly[item.original])) {
        if (window.console) console.warn("[Ensaios] foto exclusiva do hero bloqueada na galeria:", item.src);
        return;
      }
      var k1 = "id:" + (item.id || ""), k2 = "src:" + item.src;
      if ((item.id && seen[k1]) || seen[k2]) {
        if (window.console) console.warn("[Ensaios] foto repetida ignorada:", item.id || item.src);
        return;
      }
      seen[k1] = seen[k2] = true;

      var li = document.createElement("li");
      li.className = "gallery__item";
      li.setAttribute("data-id", item.id || item.src);
      var fig = document.createElement("figure");
      fig.className = "gallery__frame img-frame specular";
      var img = document.createElement("img");
      img.src = item.src + "-640.webp";
      img.srcset = item.src + "-640.webp 640w, " + item.src + "-1200.webp 1200w";
      img.sizes = "(min-width: 1024px) 27vw, (min-width: 768px) 40vw, 74vw";
      img.width = item.w || 1200;
      img.height = item.h || 1800;
      img.alt = item.alt || "Foto de ensaio de GARCEZ";
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      // arquivo inexistente: a foto sai da faixa em vez de deixar um buraco
      img.addEventListener("error", function () {
        if (window.console) console.warn("[Ensaios] arquivo não encontrado, removido:", item.src);
        if (li.parentNode) li.parentNode.removeChild(li);
        var i = items.indexOf(li); if (i >= 0) items.splice(i, 1);
        if (gallery._remeasure) gallery._remeasure();
      }, { once: true });
      fig.appendChild(img);
      li.appendChild(fig);
      frag.appendChild(li);
      items.push(li);
    });
    track.appendChild(frag);
    return items;
  }
  var galleryItems = renderGallery();

  if (gallery && track && galleryItems.length) {
    var gx = 0;                 // deslocamento da faixa (px)
    var gvel = 0;               // velocidade atual (px/s)
    var holdUntil = 0;          // até quando o automático fica em repouso
    var hovering = false, gDragging = false, gRunning = false, gLast = 0;
    var mode = "loop", bounceDir = -1, maxShift = 0;
    var gGap = 0, gEdge = 0;

    var baseSpeed = function () { return window.innerWidth < 768 ? 46 : 44; }; // px/s
    var touchDrag = false;
    var kids = function () { return track.children; };

    function measure() {
      var cs = getComputedStyle(track);
      gGap = parseFloat(cs.columnGap) || 0;
      gEdge = parseFloat(cs.paddingLeft) || 0;
      var total = 0, first = 0, c = kids();
      for (var i = 0; i < c.length; i++) {
        var w = c[i].offsetWidth + gGap;
        total += w; if (i === 0) first = w;
      }
      // loop real só quando, mesmo sem a 1ª foto, a faixa cobre toda a largura
      mode = c.length > 1 && total - first >= gallery.clientWidth + 2 ? "loop" : "bounce";
      maxShift = Math.max(0, gEdge * 2 + total - gGap - gallery.clientWidth);
      if (mode === "bounce") gx = Math.max(-maxShift, Math.min(0, gx));
      apply();
    }
    gallery._remeasure = measure;

    function apply() {
      track.style.transform = "translate3d(" + gx.toFixed(2) + "px,0,0)";
      if (typeof queueSpecular === "function") queueSpecular();
    }

    function move(dx) {
      gx += dx;
      if (mode === "loop") {
        var c = kids(), guard = 0;
        // saiu pela esquerda → vai para o fim
        while (c.length > 1 && gx + gEdge + c[0].offsetWidth + gGap <= 0 && guard++ < 20) {
          var w = c[0].offsetWidth + gGap;
          track.appendChild(c[0]);
          gx += w;
        }
        // arrastou para a direita além do início → a última vem para a frente
        while (c.length > 1 && gx > 0 && guard++ < 40) {
          var last = c[c.length - 1];
          var w2 = last.offsetWidth + gGap;
          track.insertBefore(last, c[0]);
          gx -= w2;
        }
      } else {
        if (gx <= -maxShift + 30) bounceDir = 1;
        if (gx >= -30) bounceDir = -1;
        gx = Math.max(-maxShift, Math.min(0, gx));
      }
      apply();
    }

    function gTick(now) {
      if (!gRunning) return;
      requestAnimationFrame(gTick);
      var dt = gLast ? Math.min(0.05, (now - gLast) / 1000) : 0;
      gLast = now;
      if (gDragging || !dt) return;
      var target = 0;
      if (!reduceMotion.matches && now >= holdUntil) {
        target = (mode === "loop" ? -1 : bounceDir) * baseSpeed() * (hovering ? 0.25 : 1);
        if (mode === "bounce" && maxShift < 2) target = 0;
      }
      // aproxima a velocidade do alvo: inércia ao soltar, rampa ao retomar
      var rate = now < holdUntil ? 2.0 : 2.2;      // desacelera suave ao soltar; retoma rápido
      gvel += (target - gvel) * (1 - Math.exp(-dt * rate));
      if (Math.abs(gvel) > 0.02) move(gvel * dt);
    }
    function gStart() { if (!gRunning) { gRunning = true; gLast = 0; requestAnimationFrame(gTick); } }
    function gStop() { gRunning = false; }

    // só anima quando visível e com a aba ativa
    var galleryVisible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        galleryVisible = en[0].isIntersecting;
        if (galleryVisible && !document.hidden) gStart(); else gStop();
      }, { threshold: 0.05 }).observe(gallery);
      // carrega as fotos um pouco antes de a faixa aparecer
      var preload = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        galleryItems.forEach(function (li) { var im = li.querySelector("img"); if (im) im.loading = "eager"; });
        preload.disconnect();
      }, { rootMargin: "900px 0px" });
      preload.observe(gallery);
    } else { galleryVisible = true; gStart(); }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) gStop(); else if (galleryVisible) gStart();
    });

    // hover desacelera (não trava)
    gallery.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
    gallery.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hovering = false; });

    // arrastar: mouse e toque (o gesto vertical continua rolando a página)
    var pid = null, sx = 0, sy = 0, lx = 0, lt = 0, dvel = 0, decided = false;
    gallery.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pid = e.pointerId; sx = lx = e.clientX; sy = e.clientY; lt = performance.now();
      decided = false; dvel = 0;
      if (e.pointerType === "mouse") { decided = true; startDrag(e); }
    });
    function startDrag(e) {
      gDragging = true; gvel = 0; touchDrag = e.pointerType !== "mouse";
      gallery.classList.add("is-dragging");
      try { gallery.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    gallery.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pid) return;
      if (!decided) {
        var mx = e.clientX - sx, my = e.clientY - sy;
        if (Math.abs(mx) < 4 && Math.abs(my) < 4) return;
        decided = true;
        if (Math.abs(my) > Math.abs(mx)) { pid = null; return; }   // rolagem vertical
        startDrag(e);
      }
      if (!gDragging) return;
      var now = performance.now();
      var d = e.clientX - lx;
      var dt = Math.max(1, now - lt) / 1000;
      dvel = dvel * 0.6 + (d / dt) * 0.4;
      lx = e.clientX; lt = now;
      move(d);
    });
    function endDrag() {
      if (!gDragging) { pid = null; return; }
      gDragging = false; pid = null;
      gallery.classList.remove("is-dragging");
      if (performance.now() - lt > 120) dvel = 0;           // soltou parado
      gvel = Math.max(-3200, Math.min(3200, dvel * (touchDrag ? 1.15 : 1)));  // inércia natural
      holdUntil = performance.now() + (touchDrag ? 700 : 1400);
      gLast = 0;
    }
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    // só quando a PRÓPRIA galeria perde a captura: no toque, o aviso de captura perdida da foto
    // (que o navegador prende ao dedo) sobe até aqui e encerrava o arraste no 1º movimento
    gallery.addEventListener("lostpointercapture", function (e) { if (e.target === gallery) endDrag(); });
    gallery.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // trackpad / roda horizontal
    gallery.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      gvel = 0; move(-e.deltaX);
      holdUntil = performance.now() + 1500;
    }, { passive: false });

    // teclado
    gallery.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var c = kids(); var step = (c[0] ? c[0].offsetWidth : 300) + gGap;
      gvel = (e.key === "ArrowRight" ? -1 : 1) * step * 2.4;   // ~1 foto com desaceleração
      holdUntil = performance.now() + 1600;
      if (!gRunning) { gStart(); }
    });

    var gResize = 0;
    window.addEventListener("resize", function () { clearTimeout(gResize); gResize = setTimeout(measure, 120); });
    window.addEventListener("load", measure);
    measure();
  }

  /* =========================================================
     SPECULAR IMAGE FRAME — linha de luz nas bordas das fotos
     Adaptação em CSS/JS do conceito do SpecularButton:
       radius ~20px · lineColor branco/vermelho claro · baseColor cinza escuro
       thickness ~1.25px · idleIntensity baixa (brilho que percorre a borda)
       followMouse no desktop (o trecho da borda perto do cursor acende)
     O efeito fica só na borda (máscara), nunca sobre a foto inteira.
     ========================================================= */
  var frames = Array.prototype.slice.call(document.querySelectorAll(".specular"));
  var litFrames = [];
  var REACH = 240; // distância (px) em que o cursor ainda acende a borda

  if ("IntersectionObserver" in window) {
    var specIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle("is-lit", en.isIntersecting);
        var i = litFrames.indexOf(en.target);
        if (en.isIntersecting && i < 0) litFrames.push(en.target);
        if (!en.isIntersecting && i >= 0) litFrames.splice(i, 1);
      });
    }, { rootMargin: "80px 0px" });
    frames.forEach(function (f) {
      // fase aleatória para o brilho não andar sincronizado em todas as fotos
      f.style.animationDelay = "0s";
      f.style.setProperty("--spec-delay", (-Math.random() * 9).toFixed(2) + "s");
      specIO.observe(f);
    });
  } else {
    frames.forEach(function (f) { f.classList.add("is-lit"); });
    litFrames = frames.slice();
  }

  var mouse = null, specQueued = false;
  function updateSpecular() {
    specQueued = false;
    if (!mouse) return;
    litFrames.forEach(function (f) {
      var r = f.getBoundingClientRect();
      var x = mouse.x - r.left, y = mouse.y - r.top;
      var dx = Math.max(r.left - mouse.x, 0, mouse.x - r.right);
      var dy = Math.max(r.top - mouse.y, 0, mouse.y - r.bottom);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var o = Math.max(0, 1 - dist / REACH);
      f.style.setProperty("--spec-x", x.toFixed(1) + "px");
      f.style.setProperty("--spec-y", y.toFixed(1) + "px");
      f.style.setProperty("--spec-o", o.toFixed(3));
    });
  }
  function queueSpecular() { if (!specQueued) { specQueued = true; requestAnimationFrame(updateSpecular); } }

  function enableMouseSpecular() {
    if (!finePointer.matches || reduceMotion.matches) return;
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      mouse = { x: e.clientX, y: e.clientY };
      queueSpecular();
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      mouse = null;
      litFrames.forEach(function (f) { f.style.setProperty("--spec-o", "0"); });
    });
    window.addEventListener("scroll", queueSpecular, { passive: true });
  }
  enableMouseSpecular();

  /* ---------- Entradas durante a rolagem (uma vez por elemento) ----------
     Elementos irmãos com .reveal entram em sequência (pequenos intervalos). */
  var touchUI = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var STEP = touchUI ? 50 : 80, MAXI = touchUI ? 2 : 3;   // intervalos curtos entre irmãos
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  reveals.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
    var idx = Math.min(sibs.indexOf(el), MAXI);
    if (idx > 0) el.style.transitionDelay = (idx * STEP) + "ms";
  });
  galleryItems.forEach(function (li, i) {
    li.classList.add("reveal", "reveal--media");
    li.style.transitionDelay = (Math.min(i, MAXI) * STEP) + "ms";
  });

  // Foto e moldura aparecem JUNTAS: antes de revelar, garante a imagem decodificada
  // (limite de 600ms — nunca segura o conteúdo por mais tempo que isso).
  function whenImagesReady(els, cb) {
    var imgs = [];
    els.forEach(function (el) { Array.prototype.push.apply(imgs, el.querySelectorAll("img")); });
    imgs = imgs.filter(function (i) { return !/scdn\.co/.test(i.src); });
    if (!imgs.length) return cb();
    var done = false, fin = function () { if (!done) { done = true; cb(); } };
    Promise.all(imgs.map(function (i) {
      if (i.loading === "lazy") i.loading = "eager";
      if (i.decode) return i.decode().catch(function () {});
      return new Promise(function (r) { if (i.complete) r(); else { i.onload = i.onerror = r; } });
    })).then(fin);
    setTimeout(fin, 600);
  }
  function showAll(list) { list.forEach(function (el) { el.classList.add("is-visible"); }); }

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    root.classList.add("reveal-on");               // só esconde quando a revelação está garantida
    // prepara (baixa + decodifica) as fotos um pouco antes de chegarem à tela
    var pre = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        pre.unobserve(en.target);
        en.target.querySelectorAll("img").forEach(function (i) {
          if (/scdn\.co/.test(i.src)) return;
          if (i.loading === "lazy") i.loading = "eager";
          if (i.decode) i.decode().catch(function () {});
        });
      });
    }, { rootMargin: "700px 0px 700px 0px" });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        whenImagesReady([en.target], function () { en.target.classList.add("is-visible"); });
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); if (el.querySelector("img")) pre.observe(el); });
    // a galeria entra inteira, com as fotos já prontas
    if (gallery && galleryItems.length) {
      pre.observe(gallery);
      var gio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        gio.disconnect();
        whenImagesReady(galleryItems.slice(0, 4), function () { showAll(galleryItems); });
      }, { threshold: 0.15 });
      gio.observe(gallery);
    }
  } else {
    showAll(reveals); showAll(galleryItems);
  }
  // âncora direta (ex.: site.com/#contato): garante conteúdo visível
  window.addEventListener("hashchange", function () {
    var t = document.querySelector(location.hash || "#none");
    if (t) showAll(Array.prototype.slice.call(t.querySelectorAll(".reveal")));
  });

  /* ---------- Linha do tempo: trilho vermelho acompanha a rolagem ---------- */
  var timeline = document.getElementById("timeline");
  var fill = document.getElementById("timeline-fill");
  function updateTimeline() {
    if (!timeline || !fill) return;
    var r = timeline.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh * 0.6 - r.top) / r.height;
    p = Math.max(0, Math.min(1, p));
    fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
  }

  /* ---------- Loop de rolagem (um rAF por frame) ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollNav();
      updateActive();
      updateTimeline();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  onScroll();

  /* ---------- Tratamento de falha de imagens ---------- */
  function markBroken(img) {
    var holder = img.closest(".release__cover, .img-frame, .contact__bg");
    if (holder) holder.classList.add("is-broken");
  }
  document.querySelectorAll("img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) markBroken(img);
    img.addEventListener("error", function () { markBroken(img); }, { once: true });
  });
})();
