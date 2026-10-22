/*
  GARCEZ — Fundo 3D de palco (Canvas 2D, sem dependências)

  Cena projetada em perspectiva real (x, y, z → tela):
    · piso de palco em grade que avança lentamente em direção à câmera
    · feixes de luz vermelha (moving heads) que varrem a escuridão
    · névoa luminosa no horizonte que "respira"
    · partículas suspensas em profundidade (poeira de palco)
  A câmera se move de leve com o cursor (desktop), com a rolagem e com
  uma órbita automática bem lenta (toque).

  Otimização: nº de partículas conforme a tela/dispositivo, DPR limitado,
  30 fps em aparelhos modestos, pausa com a aba em segundo plano,
  quadro único estático com prefers-reduced-motion, e fallback para as
  camadas CSS se o canvas não estiver disponível.
*/
(function () {
  "use strict";

  var canvas = document.getElementById("stage3d");
  if (!canvas || !canvas.getContext) return;              // fallback: camadas CSS
  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var root = document.documentElement;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fineMQ = window.matchMedia("(hover: hover) and (pointer: fine)");

  var cores = navigator.hardwareConcurrency || 4;
  var mem = navigator.deviceMemory || 4;
  var modest = cores <= 4 || mem <= 4;

  var W = 0, H = 0, DPR = 1, F = 1;        // F = distância focal
  var particles = [];
  var beams = [];
  var bokeh = [];
  var running = false, rafId = 0, lastFrame = 0, t0 = performance.now();
  var frameInterval = 1000 / 60;

  // câmera
  var cam = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollZ = 0;

  var FLOOR_Y = 260;          // altura do piso (abaixo da câmera)
  var FAR = 2600, NEAR = 60;

  function rand(a, b) { return a + Math.random() * (b - a); }

  // cores vindas do TEMA central (--accent / --accent-hot / --accent-deep em css/style.css)
  var C = { a: "229, 9, 43", h: "255, 23, 56", d: "74, 0, 12", l: "255, 200, 208" };
  function rgbOf(str, fb) {
    var m = String(str).match(/\d+(\.\d+)?/g);
    return m && m.length >= 3 ? [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])] : fb;
  }
  function readTheme() {
    var cs = getComputedStyle(root);
    var a = rgbOf(cs.getPropertyValue("--accent"), [229, 9, 43]);
    var h = rgbOf(cs.getPropertyValue("--accent-hot"), [255, 23, 56]);
    var d = rgbOf(cs.getPropertyValue("--accent-deep"), [74, 0, 12]);
    C.a = a.join(", "); C.h = h.join(", "); C.d = d.join(", ");
    C.l = [h[0] + (255 - h[0]) * .7, h[1] + (255 - h[1]) * .7, h[2] + (255 - h[2]) * .7].map(Math.round).join(", ");
  }

  function setup() {
    var small = window.innerWidth < 768;
    DPR = Math.min(window.devicePixelRatio || 1, small || modest ? 1.25 : 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    F = Math.max(W, H) * 0.62;
    frameInterval = modest || small ? 1000 / 30 : 1000 / 60;

    // partículas: proporcionais à área, com teto por capacidade
    var cap = modest ? 70 : small ? 90 : 170;
    var count = Math.min(cap, Math.round((W * H) / 9000));
    particles = [];
    for (var i = 0; i < count; i++) particles.push(spawn(true));

    // bokeh: luzes de palco desfocadas, bem ao fundo (camada mais distante)
    bokeh = [];
    var nk = small ? 5 : 9;
    for (var k = 0; k < nk; k++) {
      bokeh.push({ x: rand(-1800, 1800), y: rand(-500, 120), z: rand(2000, 2500),
                   r: rand(40, 110), phase: rand(0, 6.28), sp: rand(0.15, 0.35) });
    }

    // feixes (moving heads presos no "teto")
    var nb = small ? 3 : 5;
    beams = [];
    for (var b = 0; b < nb; b++) {
      beams.push({
        x: (b - (nb - 1) / 2) * (small ? 420 : 520),
        z: rand(900, 1500),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.12, 0.22),
        swing: rand(0.35, 0.6),
        width: rand(0.09, 0.14),
        power: rand(0.55, 1)
      });
    }
  }

  function spawn(initial) {
    return {
      x: rand(-1400, 1400),
      y: rand(-700, FLOOR_Y),
      z: initial ? rand(NEAR, FAR) : FAR,
      vz: rand(14, 34),                   // avança em direção à câmera
      vy: rand(-6, -1.5),                 // sobe devagar
      r: rand(0.6, 1.8),
      warm: Math.random() < 0.72,         // vermelho x branco
      tw: rand(0, Math.PI * 2)
    };
  }

  // projeção perspectiva
  function px(x, z) { return W / 2 + ((x - cam.x) * F) / z; }
  function py(y, z) { return H * 0.42 + ((y - cam.y) * F) / z; }

  function drawHaze(t) {
    var breathe = 0.78 + 0.22 * Math.sin(t * 0.35);
    var hy = py(0, FAR);
    var g = ctx.createRadialGradient(W / 2 - cam.x * 0.05, hy, 0, W / 2, hy, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(" + C.a + "," + (0.28 * breathe).toFixed(3) + ")");
    g.addColorStop(0.35, "rgba(" + C.d + "," + (0.12 * breathe).toFixed(3) + ")");
    g.addColorStop(1, "rgba(8, 8, 8, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBokeh(t) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < bokeh.length; i++) {
      var k = bokeh[i];
      var x = px(k.x + Math.sin(t * 0.05 + k.phase) * 80, k.z);
      var y = py(k.y, k.z);
      var r = (k.r * F) / k.z * 2.2;
      var a = 0.09 + 0.06 * Math.sin(t * k.sp + k.phase);
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(" + C.h + "," + a.toFixed(3) + ")");
      g.addColorStop(0.6, "rgba(" + C.a + "," + (a * 0.5).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + C.a + ", 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawFloor(t) {
    var spacing = 160;
    var offset = ((t * 70 + scrollZ) % spacing);
    ctx.lineWidth = 1;
    // linhas transversais (avançando)
    for (var z = FAR; z > NEAR + 40; z -= spacing) {
      var zz = z - offset;
      if (zz < NEAR + 20) continue;
      var y = py(FLOOR_Y, zz);
      if (y > H + 4) continue;
      var depth = 1 - zz / FAR;
      var a = Math.pow(depth, 1.4) * 0.5;
      ctx.strokeStyle = "rgba(" + C.a + "," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(px(-2600, zz), y);
      ctx.lineTo(px(2600, zz), y);
      ctx.stroke();
    }
    // linhas longitudinais (fuga para o horizonte)
    for (var x = -2600; x <= 2600; x += 220) {
      var g = ctx.createLinearGradient(0, py(FLOOR_Y, FAR), 0, H);
      g.addColorStop(0, "rgba(" + C.a + ", 0)");
      g.addColorStop(1, "rgba(" + C.a + ", 0.3)");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(px(x, FAR), py(FLOOR_Y, FAR));
      ctx.lineTo(px(x, NEAR + 20), py(FLOOR_Y, NEAR + 20));
      ctx.stroke();
    }
  }

  function drawBeams(t) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < beams.length; i++) {
      var b = beams[i];
      var ang = Math.sin(t * b.speed + b.phase) * b.swing;      // varredura
      var pulse = 0.7 + 0.3 * Math.sin(t * 0.5 + b.phase * 2);  // intensidade varia
      var ox = px(b.x, b.z), oy = py(-900, b.z);                 // origem no teto
      var len = H * 1.5;
      var dx = Math.sin(ang), dy = Math.cos(ang);
      var ex = ox + dx * len, ey = oy + dy * len;
      var half = len * b.width;
      var nx = dy * half, ny = -dx * half;

      var g = ctx.createLinearGradient(ox, oy, ex, ey);
      var a0 = 0.32 * b.power * pulse;
      g.addColorStop(0, "rgba(" + C.h + "," + a0.toFixed(3) + ")");
      g.addColorStop(0.25, "rgba(" + C.a + "," + (a0 * 0.55).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + C.a + ", 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex + nx, ey + ny);
      ctx.lineTo(ex - nx, ey - ny);
      ctx.closePath();
      ctx.fill();

      // núcleo mais estreito e brilhante
      var g2 = ctx.createLinearGradient(ox, oy, ex, ey);
      g2.addColorStop(0, "rgba(" + C.l + "," + (a0 * 0.5).toFixed(3) + ")");
      g2.addColorStop(0.4, "rgba(" + C.h + ", 0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex + nx * 0.18, ey + ny * 0.18);
      ctx.lineTo(ex - nx * 0.18, ey - ny * 0.18);
      ctx.closePath();
      ctx.fill();

      // lente da luminária
      var lg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 26);
      lg.addColorStop(0, "rgba(" + C.l + "," + (0.5 * pulse).toFixed(3) + ")");
      lg.addColorStop(1, "rgba(" + C.h + ", 0)");
      ctx.fillStyle = lg;
      ctx.fillRect(ox - 26, oy - 26, 52, 52);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawParticles(t, dt, animate) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (animate) {
        p.z -= p.vz * dt;
        p.y += p.vy * dt;
        if (p.z < NEAR || p.y < -900) { particles[i] = spawn(false); continue; }
      }
      var sx = px(p.x, p.z), sy = py(p.y, p.z);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      var depth = 1 - p.z / FAR;                    // 0 longe → 1 perto
      var size = Math.max(0.6, (p.r * F) / p.z * 1.15);
      var a = Math.min(1, 0.2 + depth * 1.5) * (0.55 + 0.3 * Math.sin(t * 1.3 + p.tw));
      var col = p.warm ? C.h : "255, 235, 238";
      if (size > 2.2) {                              // perto da câmera: fora de foco
        var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.2);
        g.addColorStop(0, "rgba(" + col + "," + (a * 0.5).toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(sx - size * 2.2, sy - size * 2.2, size * 4.4, size * 4.4);
      } else {
        ctx.fillStyle = "rgba(" + col + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function render(now, animate) {
    var t = (now - t0) / 1000;
    var dt = animate ? Math.min(0.05, (now - (lastFrame || now)) / 1000) : 0;
    lastFrame = now;

    // câmera: cursor (desktop) + órbita lenta automática + rolagem
    var orbitX = Math.sin(t * 0.07) * 60, orbitY = Math.cos(t * 0.05) * 22;
    var scrollY = window.scrollY || 0;
    scrollZ = scrollY * 0.35;
    var targetX = cam.tx + orbitX;
    var targetY = cam.ty + orbitY - Math.min(scrollY * 0.04, 90);
    cam.x += (targetX - cam.x) * 0.04;
    cam.y += (targetY - cam.y) * 0.04;

    readTheme();
    ctx.clearRect(0, 0, W, H);
    drawHaze(t);
    drawBokeh(t);
    drawFloor(t);
    drawBeams(t);
    drawParticles(t, dt, animate);
  }

  // o hero tem fundo próprio e opaco: enquanto ele cobre a tela, o palco não precisa ser desenhado
  var heroEl = document.getElementById("inicio");
  var heroCovers = false;
  if (heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { heroCovers = en[0].intersectionRatio > 0.97 && en[0].boundingClientRect.top <= 1; },
      { threshold: [0, 0.5, 0.9, 0.97, 0.98, 1] }).observe(heroEl);
  }

  function loop(now) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (now - lastFrame < frameInterval - 1) return;
    if (heroCovers) { lastFrame = now; return; }
    render(now, true);
  }

  function start() {
    if (running) return;
    if (reduceMQ.matches) { render(performance.now(), false); return; }  // quadro estático
    running = true;
    lastFrame = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  // cursor (somente desktop)
  function onPointer(e) {
    if (e.pointerType !== "mouse") return;
    cam.tx = (e.clientX / W - 0.5) * 160;
    cam.ty = (e.clientY / H - 0.5) * 70;
  }

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setup();
      if (!running) render(performance.now(), false);
    }, 150);
  }
  function onVisibility() { if (document.hidden) stop(); else start(); }
  function onMotionPref() { stop(); start(); }

  setup();
  root.classList.add("has-stage3d");
  start();

  if (fineMQ.matches) window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionPref);

  // limpeza (ex.: navegação com bfcache)
  window.addEventListener("pagehide", function () {
    stop();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      if (fineMQ.matches) window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      start();
    }
  });
})();
