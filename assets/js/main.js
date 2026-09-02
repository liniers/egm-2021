/* ============================================================
   EGM Cadena SER — scrollytelling
   GSAP (ScrollTrigger + DrawSVG + SplitText + Observer) + D3
   ============================================================ */

const { gsap } = window;
gsap.registerPlugin(ScrollTrigger, Observer);
const HAS_DRAW  = typeof DrawSVGPlugin !== "undefined";
const HAS_SPLIT = typeof SplitText !== "undefined";
if (HAS_DRAW)  gsap.registerPlugin(DrawSVGPlugin);
if (HAS_SPLIT) gsap.registerPlugin(SplitText);

const IMG = "assets/img/";
const fmt = new Intl.NumberFormat("es-ES");
const miles = v => fmt.format(v);          // 4.067.000
// Cifra Bely con los puntos de millar en naranja (detalle del diseño)
const milesDots = v => fmt.format(v).replace(/\./g, '<span class="num-dot">.</span>');
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// SVG reales de los separadores (stroke exacto del diseño)
const [SEP_ONDAS, SEP_LINEAS] = await Promise.all([
  fetch(IMG + "separador-ondas.svg").then(r => r.text()),
  fetch(IMG + "separador-lineas.svg").then(r => r.text())
]);

/* ---------- helpers de color ---------- */
let COLORS = {};
const col = key => COLORS[key] || "#192b77";

/* ============================================================
   1. Carga de datos y construcción del DOM
   ============================================================ */
const data = await fetch("assets/data/data.json").then(r => r.json());
COLORS = data.colors;

const root = document.getElementById("sections");

data.sections.forEach((sec, i) => {
  root.appendChild(buildSection(sec, i));
  // separador entre secciones (no tras la última)
  if (i < data.sections.length - 1) {
    root.appendChild(buildSeparator(i % 2 === 0 ? "ondas" : "lineas"));
  }
});

/* ---------- Constructores de sección ---------- */
function buildSection(sec, i) {
  const el = document.createElement("section");
  el.className = "section";
  el.id = "sec-" + sec.id;
  el.dataset.kind = sec.id;

  const content = document.createElement("div");
  content.className = "section__content";

  if (sec.hero)         content.innerHTML = heroMarkup(sec);
  else if (sec.grupos)  content.innerHTML = findeMarkup(sec);
  else if (sec.protagonistas) content.innerHTML = deportesMarkup(sec);
  else if (sec.cards)   content.innerHTML = genericosMarkup(sec);
  else                  content.innerHTML = standardMarkup(sec);

  el.appendChild(content);
  return el;
}

/* Titular con posible mezcla Bely + itálica */
function titleBlock(sec) {
  return `
    <div class="reveal titleblock">
      <h2 class="kicker split-title">${sec.kicker}</h2>
      <p class="subtitle">${sec.title}</p>
    </div>`;
}

function chartHolder(id, opts = "") {
  return `<div class="chart" data-chart="${id}" ${opts}></div>`;
}

function heroMarkup(sec) {
  const top = sec.bars[0];
  return `
    <div class="hero">
      <div class="hero__big reveal font-title">${milesDots(top.valor)}
        <small>oyentes</small>
      </div>
      <p class="hero__claim reveal font-title" style="margin-top:.4em">
        La SER, <span class="em">líder</span> de la radio
      </p>
      <div class="hero__hablada reveal" style="margin-top:.5em">
        Radio <span class="thin">Hablada</span>
      </div>
      <div style="margin-top:2.2em">
        ${chartHolder("hablada")}
      </div>
    </div>`;
}

function standardMarkup(sec) {
  const p = sec.protagonista;
  return `
    ${titleBlock(sec)}
    <div class="two-col" style="margin-top:2em">
      <div class="reveal">${chartHolder(sec.id)}</div>
      <div class="protagonista reveal">
        ${p.img ? `<img class="portrait" src="${IMG}${p.img}" alt="${p.nombre}" loading="lazy">` : ""}
        <div class="protagonista__name font-title" style="margin-top:.4em">${p.nombre}</div>
        <div class="protagonista__prog">${p.programa}</div>
        <div class="protagonista__num font-title" style="margin-top:.2em">${milesDots(p.valor)}
          <small>oyentes</small>
        </div>
      </div>
    </div>`;
}

function findeMarkup(sec) {
  const p = sec.protagonista;
  const legend = bars => `
    <ul class="legend">
      ${bars.map(b => `
        <li>
          <span class="legend__sw" style="background:${col(b.color)}"></span>
          <span class="legend__val font-title">${milesDots(b.valor)}</span>
          <span class="legend__prog"><b>${b.cadena}</b> ${b.programa || ""}</span>
        </li>`).join("")}
    </ul>`;
  const grupo = (g, side) => `
    <div class="reveal finde-col finde-${side}">
      ${chartHolder(sec.id + "-" + g.label.toLowerCase())}
      ${legend(g.bars)}
    </div>`;
  const dia = g => `
    <div class="finde-dia reveal">
      <div class="subtitle">${g.label}</div>
      <div class="protagonista__num font-title" style="font-size:clamp(30px,5vw,56px)">${milesDots(g.destacado)}</div>
      <small class="subtitle">oyentes</small>
    </div>`;
  return `
    <div class="finde-top">
      ${grupo(sec.grupos[0], "left")}
      <div class="finde-center reveal">
        <div class="finde-heads">
          <span class="subtitle">Sábado</span>
          <span class="subtitle">Domingo</span>
        </div>
        <div class="reveal titleblock" style="text-align:center">
          <h2 class="kicker split-title">${sec.kicker}</h2>
          <p class="subtitle">${sec.title}</p>
        </div>
        ${p.img ? `<img class="portrait" src="${IMG}${p.img}" alt="${p.nombre}">` : ""}
        <div class="protagonista__name font-title">${p.nombre}</div>
        <div class="protagonista__prog up">${p.programa}</div>
        <div class="finde-dias">${sec.grupos.map(dia).join("")}</div>
      </div>
      ${grupo(sec.grupos[1], "right")}
    </div>`;
}

function deportesMarkup(sec) {
  const chevron = `<svg class="chevron" viewBox="0 0 165 29" width="120" xmlns="http://www.w3.org/2000/svg"><path d="M0.22 0.67L82.15 27.95L164.09 0.67" fill="none" stroke="#192b77" stroke-width="1.4"/></svg>`;
  const persona = (pr, side) => `
    <div class="reveal dep-col dep-${side}">
      <div class="dep-lado">
        <div class="kicker" style="font-size:clamp(30px,5vw,58px)">${pr.lado}</div>
        <p class="subtitle">${pr.lado2}</p>
        ${chevron}
      </div>
      <div class="protagonista__name font-title" style="margin-top:.2em">${pr.nombre}</div>
      <div class="protagonista__prog">${pr.programa}</div>
      <div class="protagonista__num font-title" style="margin-top:.15em">${milesDots(pr.valor)}
        <small>oyentes${pr.nota ? "*" : ""}</small>
      </div>
      ${pr.sabado ? `
        <div class="dep-week">
          <div><span class="dep-day">SÁB /</span> <span class="font-title">${milesDots(pr.sabado)}</span></div>
          <div><span class="dep-day">DOM /</span> <span class="font-title">${milesDots(pr.domingo)}</span></div>
          <small class="subtitle" style="letter-spacing:.02em">oyentes</small>
        </div>` : ""}
      ${pr.nota ? `<p class="dep-nota">${pr.nota}</p>` : ""}
    </div>`;
  return `
    <div class="reveal deportes-title">
      <h2 class="kicker split-title font-title">Los<br>deportes</h2>
      <p class="subtitle">de la SER</p>
    </div>
    <div class="deportes-grid">
      ${persona(sec.protagonistas[0], "left")}
      <div class="dep-photo reveal">
        ${sec.img ? `<img class="portrait" src="${IMG}${sec.img}" alt="Manu Carreño y Dani Garrido">` : ""}
      </div>
      ${persona(sec.protagonistas[1], "right")}
    </div>`;
}

function genericosMarkup(sec) {
  const card = c => `
    <article class="card reveal">
      ${c.img ? `<img class="card__img" src="${IMG}${c.img}" alt="${c.nombre}">` : ""}
      <div class="card__name font-title">${c.nombre}</div>
      <div class="card__prog">${c.programa}</div>
      <div class="card__num font-title">${milesDots(c.valor)}</div>
    </article>`;
  return `
    ${titleBlock(sec)}
    <div class="cards" style="margin-top:1.6em">
      ${sec.cards.map(card).join("")}
    </div>`;
}

/* ============================================================
   2. Separadores animados (ondas / líneas)  — patrón Observer
   ============================================================ */
function wavePath(y, w = 1080, step = 28.68, amp = 10) {
  let d = `M0 ${y}`;
  let up = true;
  for (let x = step; x <= w; x += step) {
    d += `L${x.toFixed(1)} ${(up ? y + amp : y - amp).toFixed(1)}`;
    up = !up;
  }
  return d;
}

function buildSeparator(type) {
  const wrap = document.createElement("div");
  wrap.className = "separator";
  wrap.dataset.sep = type;
  wrap.innerHTML = type === "ondas" ? SEP_ONDAS : SEP_LINEAS;
  return wrap;
}

/* ============================================================
   3. Gráficos D3 (barras horizontales animables)
   ============================================================ */
function drawBars(container, bars) {
  const el = d3.select(container);
  el.selectAll("*").remove();

  const rows = bars.length;
  const rowH = 46, gap = 16, padL = 4, padR = 8;
  const W = container.clientWidth || 480;
  const H = rows * rowH + (rows - 1) * gap;

  const max = d3.max(bars, d => d.valor);
  const x = d3.scaleLinear().domain([0, max]).range([0, W - 2]);

  const svg = el.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMinYMin meet");

  const g = svg.selectAll("g.row")
    .data(bars).enter().append("g")
    .attr("class", "row")
    .attr("transform", (d, i) => `translate(0,${i * (rowH + gap)})`);

  // barra
  g.append("rect")
    .attr("class", "bar")
    .attr("x", 0).attr("y", 0)
    .attr("height", rowH)
    .attr("fill", d => col(d.color))
    .attr("width", 0)
    .attr("data-w", d => x(d.valor));

  // etiqueta cadena (dentro/fuera según tamaño)
  g.append("text")
    .attr("class", "bar-label-cadena")
    .attr("x", 10).attr("y", 20)
    .attr("fill", d => contrast(col(d.color)))
    .text(d => d.cadena)
    .style("opacity", 0);

  // programa
  g.append("text")
    .attr("class", "bar-label-prog")
    .attr("x", 10).attr("y", 36)
    .attr("fill", d => contrast(col(d.color)))
    .text(d => d.programa || "")
    .style("opacity", 0);

  // valor
  g.append("text")
    .attr("class", d => "bar-value" + (d.color === "ser" ? " big" : ""))
    .attr("x", d => x(d.valor) + 10)
    .attr("y", rowH / 2 + 6)
    .attr("fill", "var(--ser)")
    .text(d => miles(d.valor))
    .style("opacity", 0);

  return { svg, g, x };
}

/* ---- Gráfico de cuadrados concéntricos (fin de semana) ---- */
function drawSquares(container, bars) {
  const el = d3.select(container);
  el.selectAll("*").remove();
  const S = Math.min(container.clientWidth || 240, 260);
  const max = d3.max(bars, d => d.valor);
  const min = S * 0.16;                       // lado mínimo (valor más bajo)
  const side = v => min + (S - min) * (v / max);
  const sorted = [...bars].sort((a, b) => b.valor - a.valor);  // mayor detrás

  const svg = el.append("svg")
    .attr("viewBox", `0 0 ${S} ${S}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", S + "px");

  svg.selectAll("rect").data(sorted).enter().append("rect")
    .attr("fill", "none")
    .attr("stroke", d => col(d.color))
    .attr("stroke-width", 3)
    .attr("x", d => (S - side(d.valor)) / 2)
    .attr("y", d => (S - side(d.valor)) / 2)
    .attr("width", 0).attr("height", 0)
    .attr("data-s", d => side(d.valor));
  return svg;
}

function animateSquares(container) {
  const svg = container.querySelector("svg");
  if (!svg || svg.dataset.done) return;
  svg.dataset.done = "1";
  const rects = svg.querySelectorAll("rect");
  rects.forEach((r, i) => {
    const s = +r.getAttribute("data-s");
    gsap.to(r, {
      attr: { width: s, height: s }, duration: 0.8, ease: "power3.out", delay: i * 0.1
    });
  });
}

/* contraste texto sobre barra */
function contrast(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0,2),16), gg = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  const lum = (0.299*r + 0.587*gg + 0.114*b) / 255;
  return lum > 0.6 ? "#192b77" : "#faf2ef";
}

function animateBars(container) {
  const svg = container.querySelector("svg");
  if (!svg || svg.dataset.done) return;
  svg.dataset.done = "1";
  const rects = svg.querySelectorAll("rect.bar");
  const tl = gsap.timeline();
  rects.forEach((rect, i) => {
    const target = +rect.getAttribute("data-w");
    const row = rect.parentNode;
    tl.to(rect, { attr: { width: target }, duration: 0.9, ease: "power3.out" }, i * 0.12)
      .to(row.querySelectorAll("text"), { opacity: 1, duration: 0.4 }, i * 0.12 + 0.35);
  });
}

/* ============================================================
   4. Animaciones de scroll: líneas, texto, barras, separadores
   ============================================================ */
function drawLine(target, delay = 0) {
  if (prefersReduced) return;
  if (HAS_DRAW) {
    gsap.fromTo(target, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.1, ease: "power2.inOut", delay });
  } else {
    // fallback nativo con stroke-dasharray
    target.forEach ? target.forEach(setDash) : setDash(target);
    function setDash(p) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(p, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", delay });
    }
  }
}

function initScroll() {
  /* ---- Titulares con SplitText ---- */
  gsap.utils.toArray(".split-title").forEach(node => {
    let targets = node;
    if (HAS_SPLIT && !prefersReduced) {
      const split = new SplitText(node, { type: "chars" });
      targets = split.chars;
      gsap.set(targets, { yPercent: 110, opacity: 0 });
    }
    ScrollTrigger.create({
      trigger: node, start: "top 82%", once: true,
      onEnter: () => {
        if (HAS_SPLIT && !prefersReduced)
          gsap.to(targets, { yPercent: 0, opacity: 1, stagger: 0.03, duration: 0.7, ease: "back.out(1.6)" });
      }
    });
  });

  /* ---- Reveal genérico de bloques ---- */
  gsap.utils.toArray(".reveal").forEach(node => {
    if (node.classList.contains("titleblock")) return;
    gsap.set(node, { y: 34, opacity: 0 });
    ScrollTrigger.create({
      trigger: node, start: "top 88%", once: true,
      onEnter: () => gsap.to(node, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
    });
  });

  /* ---- Gráficos D3 ---- */
  document.querySelectorAll(".chart").forEach(c => {
    ScrollTrigger.create({
      trigger: c, start: "top 80%", once: true,
      onEnter: () => c.dataset.kind === "squares" ? animateSquares(c) : animateBars(c)
    });
  });

  /* ---- Separadores: Observer (dibujo al entrar/salir) ---- */
  document.querySelectorAll(".separator").forEach(sep => {
    const paths = sep.querySelectorAll("path");
    // estado inicial oculto
    if (!prefersReduced) gsap.set(paths, { drawSVG: HAS_DRAW ? "50% 50%" : undefined, opacity: 0 });
    ScrollTrigger.create({
      trigger: sep, start: "top 90%", end: "bottom 10%",
      onEnter:     () => revealSep(paths, 1),
      onEnterBack: () => revealSep(paths, 1),
      onLeave:     () => revealSep(paths, 0),
      onLeaveBack: () => revealSep(paths, 0)
    });
  });

  function revealSep(paths, show) {
    if (prefersReduced) return;
    if (HAS_DRAW) {
      gsap.to(paths, { drawSVG: show ? "0% 100%" : "50% 50%", opacity: 1, duration: 0.7, stagger: 0.04, ease: "power2.out" });
    } else {
      gsap.to(paths, { opacity: show ? 1 : 0, duration: 0.6, stagger: 0.04 });
    }
  }

  /* ---- Progreso ---- */
  const bar = document.getElementById("progress");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: self => { bar.style.width = (self.progress * 100).toFixed(1) + "%"; }
  });
}

/* ============================================================
   5. Render de todos los gráficos + arranque
   ============================================================ */
function renderAllCharts() {
  data.sections.forEach(sec => {
    if (sec.bars && !sec.hero) mount(sec.id, sec.bars, "bars");
    if (sec.hero) mount("hablada", sec.bars, "bars");
    if (sec.grupos) sec.grupos.forEach(g => mount(sec.id + "-" + g.label.toLowerCase(), g.bars, "squares"));
  });
  function mount(id, bars, kind) {
    const c = document.querySelector(`[data-chart="${id}"]`);
    if (!c) return;
    c.dataset.kind = kind;
    kind === "squares" ? drawSquares(c, bars) : drawBars(c, bars);
  }
}

renderAllCharts();
initScroll();

// re-render de gráficos en resize (debounce)
let rt;
window.addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    renderAllCharts();
    document.querySelectorAll(".chart svg").forEach(s => { delete s.dataset.done; });
    document.querySelectorAll(".chart").forEach(c =>
      c.dataset.kind === "squares" ? animateSquares(c) : animateBars(c));
    ScrollTrigger.refresh();
  }, 250);
});
