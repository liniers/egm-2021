/* ============================================================
   EGM Cadena SER — scrollytelling sobre SVG de Illustrator
   · grid dibujándose (DrawSVG) al entrar cada bloque
   · barras/gráficos creciendo desde 0 (stagger .15)
   · entrada de texto por bloque, enmascarada por línea (SplitText-like)
   · count-up de cifras (ease out)
   · hover en barras y en el bloque de Javier del Pino (cuadrados)
   · sol y pelotas ligados al scroll
   ============================================================ */
const { gsap } = window;
gsap.registerPlugin(ScrollTrigger);
const HAS_DRAW = typeof DrawSVGPlugin !== "undefined";
if (HAS_DRAW) gsap.registerPlugin(DrawSVGPlugin);
const HAS_FLIP = typeof Flip !== "undefined";
if (HAS_FLIP) gsap.registerPlugin(Flip);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const nf = new Intl.NumberFormat("es-ES");
const SVGNS = "http://www.w3.org/2000/svg";

const frame = document.getElementById("frame");
const markup = await fetch("assets/svg/infografia.svg").then(r => r.text());
frame.innerHTML = markup;
const svg = frame.querySelector("svg");
document.getElementById("loading")?.remove();
// Normaliza los hrefs de las imágenes (Illustrator los exporta sin prefijo/sin codificar)
svg.querySelectorAll("image").forEach(im => {
  const h = im.getAttribute("href") || im.getAttribute("xlink:href") || "";
  const m = h.match(/([^/]+\.png)$/);
  if (m) { im.setAttribute("href", "assets/svg/" + encodeURIComponent(m[1])); im.removeAttribute("xlink:href"); }
});
let defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(SVGNS, "defs"), svg.firstChild);
await (document.fonts ? document.fonts.ready : Promise.resolve());

/* Reposiciona la foto sentada (-5.png) para que se apoye sobre el top de la caja Radio Hablada */
(function seatPhoto() {
  const img = [...svg.querySelectorAll("image")].find(i => (i.getAttribute("href") || "").includes("-5.png"));
  if (!img) return;
  const mt = /translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\)/.exec(img.getAttribute("transform") || "");
  const ms = /scale\(\s*([\d.-]+)/.exec(img.getAttribute("transform") || "");
  if (!mt || !ms) return;
  const s0 = +ms[1], s = s0 * 2;                    // x2 de escala
  const h = +(img.getAttribute("height") || 969), w = +(img.getAttribute("width") || 1956);
  const box = [...svg.querySelectorAll("rect")].map(r => ({ b: r.getBBox(), f: getComputedStyle(r).fill }))
    .find(o => o.b.x > 600 && o.b.y > 650 && o.b.y < 800 && o.b.width > 300 && /25,\s*43,\s*119/.test(o.f));
  const bx = box ? box.b.x : 619, bw = box ? box.b.width : 463, boxTop = box ? box.b.y : 712;
  const tx = (bx + bw / 2) - (w * s) / 2;            // centrado horizontal en el bloque
  const ty = boxTop - h * s;                         // base sobre el top de la caja
  img.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})`);
})();

const sections = [...svg.querySelectorAll("g[id]")].filter(g => /-_/.test(g.id));
const xyOf = el => {
  const m = /translate\(\s*([\d.-]+)[,\s]+([\d.-]+)/.exec(el.getAttribute("transform") || "");
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  const b = el.getBBox(); return [b.x, b.y];
};

/* ============================================================
   1. COUNT-UP de cifras (detecta fragmentos, ignora "fantasmas")
   ============================================================ */
const numericEls = new Set();
function detectNumbers() {
  const cand = [...svg.querySelectorAll("text")].filter(t => {
    const s = t.textContent.trim();
    if (!s || !/^[0-9Ooº.,\s]+$/.test(s)) return false;
    if ((s.match(/\./g) || []).length >= 2) return false;   // descarta número completo "fantasma"
    return true;
  }).map(t => ({ t, xy: xyOf(t) }));
  const byLine = new Map();
  for (const o of cand) { const k = o.xy[1].toFixed(1); (byLine.get(k) || byLine.set(k, []).get(k)).push(o); }
  const out = [];
  for (const [, items] of byLine) {
    items.sort((a, b) => a.xy[0] - b.xy[0]);
    let run = [items[0]];
    const flush = () => {
      const str = run.map(o => o.t.textContent).join("");
      const digits = str.replace(/[Oo]/g, "0").replace(/[^\d]/g, "");
      if (digits.length >= 3 && digits.length <= 7) {
        const value = parseInt(digits, 10);
        if (value >= 100) out.push({ els: run.map(o => o.t), value, useO: /[Oo]/.test(str) });
      }
    };
    for (let i = 1; i < items.length; i++) {
      if (items[i].xy[0] - run[run.length - 1].xy[0] > 90) { flush(); run = [items[i]]; }
      else run.push(items[i]);
    }
    flush();
  }
  return out;
}
const fmt = (v, useO) => { const s = nf.format(Math.round(v)); return useO ? s.replace(/0/g, "O") : s; };
function setupCountUp() {
  detectNumbers().forEach(num => {
    num.els.forEach(e => numericEls.add(e));
    const left = num.els[0], parent = left.parentNode;
    const ov = document.createElementNS(SVGNS, "text");
    ov.setAttribute("class", left.getAttribute("class") || "");
    ov.setAttribute("transform", left.getAttribute("transform") || "");
    const span = document.createElementNS(SVGNS, "tspan");
    span.setAttribute("x", "0"); span.setAttribute("y", "0"); ov.appendChild(span);
    ov.style.visibility = "hidden"; parent.appendChild(ov);
    const hide = v => num.els.forEach(e => e.style.opacity = v);
    const obj = { n: Math.round(num.value * 0.975) };
    span.textContent = fmt(obj.n, num.useO);
    ScrollTrigger.create({
      trigger: left, start: "top 82%", once: true,
      onEnter: () => {
        if (reduce) return;
        hide(0); ov.style.visibility = "visible";
        gsap.to(obj, {
          n: num.value, duration: 1.2, ease: "power2.out",
          onUpdate: () => span.textContent = fmt(obj.n, num.useO),
          onComplete: () => { ov.remove(); hide(""); }
        });
      }
    });
  });
}
setupCountUp();

/* ============================================================
   2. SEPARADORES DE ONDA (los del usuario, duplicados 3× en horizontal)
   Se agrupan los elementos del separador (líneas + polylines onduladas),
   se enmascaran a la banda visible (0..1080) y se DESPLAZAN a la derecha
   con el scroll. El periodo de duplicación (1176px) hace el bucle continuo.
   (Las líneas del grid NO se animan.)
   ============================================================ */
let cid = 0;
const PERIOD = 1176;                 // offset de duplicación de las ondas del usuario
function firstY(el) {
  if (el.tagName === "line") return +el.getAttribute("y1");
  const p = (el.getAttribute("points") || "").trim().split(/[\s,]+/);
  return parseFloat(p[1]);
}
function setupWaves() {
  if (reduce) return [];
  // detectar bandas separadoras: filas y de polylines onduladas (las ondas del usuario)
  const polys = [...svg.querySelectorAll("polyline")].filter(p => {
    const pts = (p.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
    if (pts.length < 12) return false;
    const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
    return (Math.max(...xs) - Math.min(...xs)) > 300 && (Math.max(...ys) - Math.min(...ys)) < 60;
  });
  if (!polys.length) return [];
  const ys = polys.map(firstY).sort((a, b) => a - b);
  const yTop = Math.min(...ys) - 16, yBot = Math.max(...ys) + 16;

  // todos los elementos del separador (líneas + polylines) dentro de la banda
  const els = [...svg.querySelectorAll("line, polyline")].filter(e => {
    const y = firstY(e); return y > yTop && y < yBot;
  });
  const parent = els[0].parentNode;

  // máscara a la banda visible
  const id = "wave" + (cid++);
  const cp = document.createElementNS(SVGNS, "clipPath"); cp.id = id; cp.setAttribute("clipPathUnits", "userSpaceOnUse");
  const cr = document.createElementNS(SVGNS, "rect");
  cr.setAttribute("x", 0); cr.setAttribute("y", yTop); cr.setAttribute("width", 1080); cr.setAttribute("height", yBot - yTop);
  cp.appendChild(cr); defs.appendChild(cp);
  const outer = document.createElementNS(SVGNS, "g"); outer.setAttribute("clip-path", `url(#${id})`);
  const inner = document.createElementNS(SVGNS, "g");
  parent.insertBefore(outer, els[0]); outer.appendChild(inner);
  els.forEach(e => inner.appendChild(e));

  // desplazamiento suave ±200px (a un lado y otro) ligado al scroll
  gsap.fromTo(inner, { x: -200 }, {
    x: 200, ease: "none",
    scrollTrigger: { trigger: outer, start: "top bottom", end: "bottom top", scrub: 0.6 }
  });
  return [inner];
}
const waveEls = setupWaves();

/* ============================================================
   3. BARRAS y GRÁFICOS creciendo desde 0 (stagger .15)
   ============================================================ */
const BAR_FILLS = ["#f3d800", "#f4d730", "#eed600", "#62768a", "#657689", "#80bb76", "#88bb72", "#db2a00", "#cb0000"];
const rgbToHex = f => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(f);
  return m ? "#" + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, "0")).join("") : f;
};
const isBarFill = n => { const h = rgbToHex((getComputedStyle(n).fill || "").toLowerCase()); return BAR_FILLS.includes(h); };

function setupBars() {
  const bars = [...svg.querySelectorAll("rect, path")].filter(n => {
    if (!isBarFill(n)) return false;
    const b = n.getBBox(); return b.width > 55 && b.height > 22;
  });
  // agrupar por sección (beat) y decidir orientación POR CHART, no por barra
  const groups = new Map();
  bars.forEach(b => { const s = beatOf(b) || b.closest("g[id]") || svg; (groups.get(s) || groups.set(s, []).get(s)).push(b); });
  groups.forEach(list => {
    const bb = list.map(b => b.getBBox());
    const xs = bb.map(b => b.x), ys = bb.map(b => b.y);
    // columnas repartidas en horizontal → barras verticales (crecen de abajo a arriba)
    const vertical = list.length >= 2
      ? (Math.max(...xs) - Math.min(...xs)) > (Math.max(...ys) - Math.min(...ys))
      : (bb[0].height > bb[0].width);
    list.sort((a, b) => vertical ? (a.getBBox().x - b.getBBox().x) : (a.getBBox().y - b.getBBox().y));
    list.forEach((bar, i) => {
      const b = bar.getBBox();
      const from = vertical ? { scaleY: 0, svgOrigin: `${b.x} ${b.y + b.height}` } : { scaleX: 0, svgOrigin: `${b.x} ${b.y}` };
      const to = vertical ? { scaleY: 1 } : { scaleX: 1 };
      if (reduce) return;
      gsap.set(bar, from);
      ScrollTrigger.create({
        trigger: bar, start: "top 85%", once: true,
        onEnter: () => gsap.to(bar, { ...to, duration: 1.3, ease: "power3.out", delay: i * 0.15 })
      });
    });
  });
  return bars;
}
const barEls = setupBars();

/* ---- cuadrados concéntricos (Javier) creciendo desde el centro ---- */
function javierSquares() {
  const sq = [...svg.querySelectorAll("rect")].filter(r => {
    const b = r.getBBox(); return Math.abs(b.width - b.height) < 8 && b.width > 60 && b.y > 2600 && b.y < 2780;
  });
  return sq;
}
const squares = javierSquares();
// se dibujan con el trazo (DrawSVG), sin escalar
squares.forEach((s, i) => {
  if (reduce || !HAS_DRAW) return;
  gsap.set(s, { drawSVG: "0%" });
  ScrollTrigger.create({
    trigger: s, start: "top 85%", once: true,
    onEnter: () => gsap.to(s, { drawSVG: "100%", duration: 1, ease: "power2.inOut", delay: (i % 4) * 0.15 })
  });
});

/* ============================================================
   4. ENTRADA DE TEXTO por bloque, enmascarada por línea
   ============================================================ */
function maskLine(els) {
  const parent = els[0].parentNode;
  const ctm = svg.getScreenCTM().inverse();
  let y0 = 1e9, y1 = -1e9;
  els.forEach(e => {
    const r = e.getBoundingClientRect();
    for (const sy of [r.top, r.bottom]) {
      const p = svg.createSVGPoint(); p.x = r.left; p.y = sy;
      const q = p.matrixTransform(ctm); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
  });
  const h = y1 - y0, pad = h * 0.3;
  const id = "ml" + (cid++);
  const cp = document.createElementNS(SVGNS, "clipPath"); cp.id = id; cp.setAttribute("clipPathUnits", "userSpaceOnUse");
  const cr = document.createElementNS(SVGNS, "rect");
  cr.setAttribute("x", -200); cr.setAttribute("y", y0 - pad); cr.setAttribute("width", 1600); cr.setAttribute("height", h + pad * 2);
  cp.appendChild(cr); defs.appendChild(cp);
  const outer = document.createElementNS(SVGNS, "g"); outer.setAttribute("clip-path", `url(#${id})`);
  const inner = document.createElementNS(SVGNS, "g");
  parent.insertBefore(outer, els[0]); outer.appendChild(inner);
  els.forEach(e => inner.appendChild(e));
  return { inner, h: h + pad };
}
function setupTextReveal() {
  if (reduce) return;
  sections.forEach(sec => {
    const els = [...sec.querySelectorAll("text")].filter(t => t.textContent.trim() && !numericEls.has(t));
    if (!els.length) return;
    // agrupar por línea (baseline y)
    const byLine = new Map();
    els.forEach(t => { const k = xyOf(t)[1].toFixed(0); (byLine.get(k) || byLine.set(k, []).get(k)).push(t); });
    const lines = [...byLine.entries()].sort((a, b) => +a[0] - +b[0]).map(e => e[1]);
    const inners = lines.map(l => maskLine(l));
    inners.forEach(o => gsap.set(o.inner, { y: o.h }));
    ScrollTrigger.create({
      trigger: sec, start: "top 78%", once: true,
      onEnter: () => inners.forEach((o, i) =>
        gsap.to(o.inner, { y: 0, duration: 1, ease: "power3.out", delay: i * 0.08 }))
    });
  });
}
setupTextReveal();

/* ============================================================
   5. HOVER: barras  +  cuadrados de Javier del Pino
   ============================================================ */
// sección "beat" (grupo con nombre) que contiene un elemento
function beatOf(n) { let p = n; while (p && p !== svg) { if (p.tagName === "g" && p.id && /-_/.test(p.id)) return p; p = p.parentNode; } return null; }

function setupBarHover() {
  // por beat: barras + textos (cifras Y emisoras), orientación y centros precalculados
  const beats = new Map();
  const get = s => beats.get(s) || beats.set(s, { bars: [], texts: [] }).get(s);
  barEls.forEach(b => { const s = beatOf(b); if (s) get(s).bars.push(b); });
  beats.forEach((e, beat) => {
    e.texts = [...beat.querySelectorAll("text")].filter(t =>
      t.textContent.trim() && parseFloat(getComputedStyle(t).fontSize) <= 55);   // fuera titulares
    const bb = e.bars.map(b => b.getBBox());
    const xs = bb.map(b => b.x), ys = bb.map(b => b.y);
    e.vertical = e.bars.length >= 2
      ? (Math.max(...xs) - Math.min(...xs)) > (Math.max(...ys) - Math.min(...ys))
      : (bb[0] && bb[0].height > bb[0].width);
    // centro de cada barra en el eje transversal (X si vertical, Y si horizontal)
    e.centers = new Map(e.bars.map((b, i) => [b, e.vertical ? bb[i].x + bb[i].width / 2 : bb[i].y + bb[i].height / 2]));
  });

  // dueño de un texto = barra cuyo centro transversal es el más cercano (se calcula al vuelo)
  const ownerOf = (e, t) => {
    const [tx, ty] = xyOf(t), p = e.vertical ? tx : ty;
    let best = null, bd = 1e9;
    e.bars.forEach(b => { const d = Math.abs(p - e.centers.get(b)); if (d < bd) { bd = d; best = b; } });
    return best;
  };

  barEls.forEach(bar => {
    bar.style.transition = "opacity .25s";
    const s = beatOf(bar), e = s && beats.get(s);
    bar.addEventListener("mouseenter", () => {
      if (!e) return;
      e.bars.forEach(b => { if (b !== bar) b.style.opacity = 0.28; });
      e.texts.forEach(t => { t.style.transition = "opacity .25s"; t.style.opacity = ownerOf(e, t) === bar ? "" : 0.28; });
    });
    bar.addEventListener("mouseleave", () => {
      if (!e) return;
      e.bars.forEach(b => b.style.opacity = "");
      e.texts.forEach(t => t.style.opacity = "");
    });
  });
}
setupBarHover();

/* ============================================================
   CURSOR personalizado (punto → pill "Escucha …") sobre barras amarillas SER
   ============================================================ */
function setupCursor() {
  const cursor = document.querySelector(".cursor"), pill = document.querySelector("[data-egm-cursor]");
  if (!cursor || !pill || !HAS_FLIP) return;
  const cursorBg = cursor.querySelector(".cursor-bg");
  const bgHolder = pill.querySelector("[data-egm-cursor-bg]");
  const label = pill.querySelector(".egm-pill__text");
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;

  gsap.set([cursor, pill], { xPercent: -50, yPercent: -50 });
  const cx = gsap.quickTo(cursor, "x", { duration: 0.12, ease: "power3" });
  const cy = gsap.quickTo(cursor, "y", { duration: 0.12, ease: "power3" });
  const px = gsap.quickTo(pill, "x", { duration: 0.12, ease: "power3" });
  const py = gsap.quickTo(pill, "y", { duration: 0.12, ease: "power3" });
  window.addEventListener("mousemove", e => { cx(e.clientX); cy(e.clientY); px(e.clientX); py(e.clientY); }, { passive: true });

  let active = false;
  const show = txt => {
    label.textContent = txt;
    if (active) return; active = true;
    const st = Flip.getState(cursorBg);
    bgHolder.appendChild(cursorBg);
    pill.setAttribute("data-egm-cursor", "active");
    Flip.from(st, { duration: 0.35, ease: "back.out(1.4)" });
  };
  const hide = () => {
    if (!active) return; active = false;
    const st = Flip.getState(cursorBg, { props: "opacity" });
    cursor.appendChild(cursorBg);
    pill.setAttribute("data-egm-cursor", "");
    Flip.from(st, { duration: 0.45, ease: "power4.out" });
  };

  // programa según la sección
  const programFor = el => {
    const b = beatOf(el), id = b ? b.id : "";
    if (/Dato_Principal|Radio_Hablada/.test(id)) return "Cadena SER";
    if (/Hoy_por_Hoy|a_anas|Mananas|Ma\S*anas/.test(id)) return "Hoy por Hoy";
    if (/La_Ventana|Tardes/.test(id)) return "La Ventana";
    if (/Hora25|Noches/.test(id)) return "Hora 25";
    if (/A_vivir|Fin_de_semana/.test(id)) return "A vivir que son dos días";
    if (/El_Larguero/.test(id)) return "El Larguero";
    return "Cadena SER";
  };

  // URL de cadenaser.com por programa → click abre en ventana externa
  const URLS = {
    "Cadena SER": "https://cadenaser.com/",
    "Hoy por Hoy": "https://cadenaser.com/cadena-ser/hoy-por-hoy/",
    "La Ventana": "https://cadenaser.com/cadena-ser/la-ventana/",
    "Hora 25": "https://cadenaser.com/cadena-ser/hora-25",
    "A vivir que son dos días": "https://cadenaser.com/cadena-ser/a-vivir-que-son-dos-dias",
    "El Larguero": "https://cadenaser.com/cadena-ser/el-larguero",
    "Carrusel Deportivo": "https://cadenaser.com/cadena-ser/carrusel-deportivo",
    "El Faro": "https://cadenaser.com/cadena-ser/el-faro",
    "Hora 14": "https://cadenaser.com/cadena-ser/hora-14",
    "Si Amanece Nos Vamos": "https://cadenaser.com/cadena-ser/si-amanece-nos-vamos"
  };
  const wire = (el, program) => {
    el.style.cursor = "pointer";
    el.addEventListener("mouseenter", () => show("Escucha " + program));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("click", () => { const u = URLS[program]; if (u) window.open(u, "_blank", "noopener"); });
  };

  // objetivos = barras amarillas SER + cuadrado amarillo SER (Javier)
  const YELLOW = ["#f3d800", "#f4d730", "#eed600"];
  const isYellowFill = n => YELLOW.includes(rgbToHex((getComputedStyle(n).fill || "").toLowerCase()));
  const isYellowStroke = n => YELLOW.includes(rgbToHex((getComputedStyle(n).stroke || "").toLowerCase()));
  [...barEls.filter(isYellowFill), ...squares.filter(isYellowStroke)]
    .forEach(t => wire(t, programFor(t)));

  // Zonas de hover (personas / bloques que no son barras)
  const ZONES = [
    { x: 285, y: 2585, w: 520, h: 480, txt: "A vivir que son dos días" }, // Javier del Pino
    { x: 65,  y: 3400, w: 505, h: 500, txt: "El Larguero" },              // Manu Carreño
    { x: 570, y: 3386, w: 495, h: 490, txt: "Carrusel Deportivo" },       // Dani Garrido
    { x: 0,   y: 3935, w: 360, h: 545, txt: "El Faro" },                  // Mara Torres
    { x: 360, y: 3935, w: 360, h: 545, txt: "Hora 14" },                  // José Antonio Marcos
    { x: 720, y: 3935, w: 360, h: 545, txt: "Si Amanece Nos Vamos" }      // Roberto Sánchez
  ];
  ZONES.forEach(z => {
    const r = document.createElementNS(SVGNS, "rect");
    r.setAttribute("x", z.x); r.setAttribute("y", z.y);
    r.setAttribute("width", z.w); r.setAttribute("height", z.h);
    r.setAttribute("fill", "transparent");
    svg.appendChild(r);                 // encima de todo → captura el hover de la zona
    wire(r, z.txt);
  });
}
setupCursor();

function setupJavierHover() {
  // cuadrados por lado (sábado x<400 / domingo x>400), agrupados en NIVELES por tamaño
  const side = x => (x < 400 ? "sab" : "dom");
  const raw = { sab: [], dom: [] };
  squares.forEach(s => raw[side(s.getBBox().x)].push(s));
  // agrupa rects con tamaño similar (doble contorno) en un mismo nivel; niveles de mayor a menor = SER..RNE
  const toLevels = arr => {
    arr.sort((a, b) => b.getBBox().width - a.getBBox().width);
    const levels = [];
    arr.forEach(s => {
      const w = s.getBBox().width;
      const lv = levels.find(L => Math.abs(L.w - w) < 18);
      if (lv) lv.rects.push(s); else levels.push({ w, rects: [s] });
    });
    return levels;                       // [{w, rects:[...]}] ordenados SER..RNE
  };
  const bySide = { sab: toLevels(raw.sab), dom: toLevels(raw.dom) };
  // swatches de leyenda (rects ~27px) por lado, ordenados por y (SER..RNE)
  const sw = [...svg.querySelectorAll("rect")].filter(r => {
    const b = r.getBBox(); return Math.abs(b.width - 27.3) < 3 && Math.abs(b.height - 27.3) < 3;
  });
  const swSide = { sab: [], dom: [] };
  sw.forEach(r => swSide[side(r.getBBox().x)].push(r));
  ["sab", "dom"].forEach(k => swSide[k].sort((a, b) => a.getBBox().y - b.getBBox().y));

  ["sab", "dom"].forEach(k => {
    const levels = bySide[k], sws = swSide[k];
    const allRects = levels.flatMap(L => L.rects);
    sws.forEach((swatch, i) => {
      // zona hover amplia (swatch + cifra) sobre la fila de leyenda
      const b = swatch.getBBox();
      const hot = document.createElementNS(SVGNS, "rect");
      hot.setAttribute("x", b.x - 4); hot.setAttribute("y", b.y - 4);
      hot.setAttribute("width", 320); hot.setAttribute("height", b.height + 8);
      hot.setAttribute("fill", "transparent"); hot.style.cursor = "pointer";
      swatch.parentNode.appendChild(hot);
      const target = levels[i] ? levels[i].rects : [];
      hot.addEventListener("mouseenter", () => {
        allRects.forEach(s => { s.style.transition = "opacity .25s"; s.style.opacity = target.includes(s) ? 1 : 0.18; });
        sws.forEach((s, j) => { s.style.transition = "opacity .25s"; s.style.opacity = j === i ? 1 : 0.25; });
        target.forEach(s => s.style.strokeWidth = "4");
      });
      hot.addEventListener("mouseleave", () => {
        allRects.forEach(s => s.style.opacity = "");
        sws.forEach(s => s.style.opacity = "");
        target.forEach(s => s.style.strokeWidth = "");
      });
    });
  });
}
setupJavierHover();

/* ============================================================
   6. SOL y PELOTAS ligados al scroll
   ============================================================ */
function scrub(el, from, to) {
  const b = el.getBBox(); const ox = b.x + b.width / 2, oy = b.y + b.height / 2;
  gsap.fromTo(el, { ...from, svgOrigin: `${ox} ${oy}` },
    { ...to, svgOrigin: `${ox} ${oy}`, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
}
function setupScrollFX() {
  if (reduce) return;
  // El SOL real = grupo de rayos blancos tras los caminantes (NO #Artwork_9, que es el logo SER)
  const ray = [...svg.querySelectorAll("line, path")].find(e => {
    const st = getComputedStyle(e).stroke || "";
    if (!/255,\s*255,\s*255/.test(st)) return false;
    const b = e.getBBox(); return b.y > 200 && b.y < 680 && b.x < 680 && b.width < 700;
  });
  const sol = ray ? ray.parentNode : null;
  if (sol) scrub(sol, { rotation: -8, y: 40 }, { rotation: 8, y: -40 });
  const balls = new Set();
  svg.querySelectorAll("circle").forEach(c => { if (Math.abs(parseFloat(c.getAttribute("r")) - 20.4) < 1) balls.add(c.parentNode); });
  [...balls].forEach((ball, i) => {
    const c = ball.querySelector("circle");
    const cx = +c.getAttribute("cx"), cy = +c.getAttribute("cy");
    gsap.fromTo(ball, { rotation: 0, svgOrigin: `${cx} ${cy}` },
      { rotation: 360 * (i % 2 ? -1 : 1), svgOrigin: `${cx} ${cy}`, ease: "none",
        scrollTrigger: { trigger: ball, start: "top bottom", end: "bottom top", scrub: 0.6 } });
  });
}
setupScrollFX();

/* progreso */
const pb = document.getElementById("progress");
ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => pb.style.width = (s.progress * 100).toFixed(1) + "%" });

window.__dbg = { sections, detectNumbers, barEls, squares, waveEls };
