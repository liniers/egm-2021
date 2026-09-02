/* ============================================================
   EGM Cadena SER — rebuild exacto (lienzo 1080)
   ============================================================ */
const { gsap } = window;
gsap.registerPlugin(ScrollTrigger);
const HAS_DRAW = typeof DrawSVGPlugin !== "undefined"; if (HAS_DRAW) gsap.registerPlugin(DrawSVGPlugin);
const HAS_SPLIT = typeof SplitText !== "undefined"; if (HAS_SPLIT) gsap.registerPlugin(SplitText);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const IMG = "assets/img/";
const fmt = new Intl.NumberFormat("es-ES");
const dots = v => fmt.format(v).replace(/\./g, '<span class="dot">.</span>');

const stage = document.getElementById("stage");
const wrap  = document.getElementById("stageWrap");
const gridSvg = document.getElementById("grid");
const art  = document.getElementById("art");
const chartsL = document.getElementById("charts");
const textL = document.getElementById("text");

/* ---------- Escalado del lienzo ---------- */
function fit() {
  const w = Math.min(window.innerWidth || 900, 1080);
  const s = w / 1080;
  stage.style.transform = `scale(${s})`;
  wrap.style.width  = w + "px";
  wrap.style.height = 4852 * s + "px";
  wrap.style.margin = "0 auto";
  ScrollTrigger.refresh();
}

/* ---------- Grid exacto ---------- */
const grid = await fetch("assets/data/grid.json").then(r => r.json());
function renderGrid() {
  const ns = "http://www.w3.org/2000/svg";
  const mk = (x1, y1, x2, y2) => {
    const l = document.createElementNS(ns, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    gridSvg.appendChild(l); return l;
  };
  grid.H.forEach(([y, x1, x2]) => mk(x1, y, x2, y));
  grid.V.forEach(([x, y1, y2]) => mk(x, y1, x, y2));
}
renderGrid();

/* ---------- Helpers de colocación ---------- */
function el(parent, tag, cls, styles, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (styles) Object.assign(n.style, styles);
  if (html != null) n.innerHTML = html;
  parent.appendChild(n);
  return n;
}
// texto absoluto: x,y = top-left en coords de diseño
function T(x, y, html, { size = 40, cls = "", ls = 0, w, color, lh = 0.9 } = {}) {
  return el(textL, "p", "t " + cls, {
    left: x + "px", top: y + "px", fontSize: size + "px",
    letterSpacing: ls + "px", lineHeight: lh,
    ...(w ? { width: w + "px", whiteSpace: "normal" } : {}),
    ...(color ? { color } : {})
  }, html);
}
function block(layer, x, y, w, h, cls) {
  return el(layer, "div", "block " + cls, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
}
function image(x, y, w, src, { h } = {}) {
  return el(art, "img", "portrait", { left: x + "px", top: y + "px", width: w + "px", ...(h ? { height: h + "px" } : {}) }, null),
         (art.lastChild.src = IMG + src, art.lastChild);
}

/* ============================================================
   SECCIÓN 1 — Hero + Radio Hablada  (y 0..1016)
   ============================================================ */
function heroSection() {
  // --- Imágenes / arte (detrás) ---
  const sol = el(art, "img", "portrait", { left: "1px", top: "291px", width: "621px" }); sol.src = IMG + "sol.svg";
  const andando = el(art, "img", "portrait", { left: "20px", top: "300px", width: "590px" }); andando.src = IMG + "andando.png";
  const escuchando = el(art, "img", "portrait", { left: "705px", top: "560px", width: "330px" }); escuchando.src = IMG + "escuchando.png";
  const logo = el(art, "img", "portrait", { left: "873px", top: "95px", width: "164px" }); logo.src = IMG + "logo-positivo.svg";

  // --- Bloque navy Radio Hablada (derecha abajo) ---
  block(art, 619, 712, 461, 305, "navy");

  // --- Barras Radio Hablada (columna izquierda, y 610..1016) ---
  const bars = [
    { cadena: "SER",       v: 4067000, cls: "yellow", y: 610 },
    { cadena: "COPE",      v: 3411000, cls: "gray",   y: 711 },
    { cadena: "ONDA CERO", v: 1866000, cls: "green",  y: 813 },
    { cadena: "RNE",       v: 1091000, cls: "red",    y: 915 }
  ];
  const maxV = 4067000, fullW = 618, rowH = 101;
  bars.forEach(b => {
    const w = Math.round(fullW * b.v / maxV);
    const bar = block(chartsL, 0, b.y, w, rowH, b.cls);
    bar.dataset.w = w; bar.style.width = "0px";
    // valor + cadena
    const inYellow = b.cls === "yellow";
    T(w + (inYellow ? -250 : 14), b.y + 22, `${dots(b.v)}`, { size: 40, color: "var(--navy)" });
    T(w + (inYellow ? -250 : 14), b.y + 66, b.cadena, { size: 20, cls: "neutra light", color: "var(--navy)", ls: 1 });
  });

  // --- Textos ---
  T(67, 30, dots(4067000), { size: 150, ls: -2 });                       // 4.067.000
  T(70, 190, "O Y E N T E S", { size: 52, cls: "neutra light", ls: 6, color: "var(--navy)" });
  T(694, 240, "La SER,", { size: 80 });
  T(694, 314, `<span class="em">líder</span> de la`, { size: 80 });
  T(694, 388, "radio", { size: 80 });
  // Radio HABLADA (sobre bloque navy)
  T(743, 770, "Radio", { size: 96, color: "var(--cream)" });
  T(718, 852, "HABLADA", { size: 60, cls: "neutra light", ls: 4, color: "var(--cream)" });
}
heroSection();

/* ============================================================
   Animaciones de scroll
   ============================================================ */
function initScroll() {
  // Grid: dibujar cada línea al entrar
  gridSvg.querySelectorAll("line").forEach(line => {
    if (reduce) return;
    if (HAS_DRAW) gsap.set(line, { drawSVG: "0%" });
    ScrollTrigger.create({
      trigger: line, start: "top 92%", once: true,
      onEnter: () => HAS_DRAW && gsap.to(line, { drawSVG: "100%", duration: 1, ease: "power2.inOut" })
    });
  });

  // Barras: crecer
  chartsL.querySelectorAll(".block").forEach(bar => {
    ScrollTrigger.create({
      trigger: bar, start: "top 85%", once: true,
      onEnter: () => gsap.to(bar, { width: bar.dataset.w + "px", duration: 0.9, ease: "power3.out" })
    });
  });

  // Textos: fade-up
  textL.querySelectorAll(".t").forEach(t => {
    if (reduce) return;
    gsap.set(t, { y: 24, opacity: 0 });
    ScrollTrigger.create({
      trigger: t, start: "top 90%", once: true,
      onEnter: () => gsap.to(t, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" })
    });
  });

  // Progreso
  const pb = document.getElementById("progress");
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => pb.style.width = (s.progress * 100).toFixed(1) + "%" });
}

fit();
initScroll();
window.addEventListener("resize", fit);
