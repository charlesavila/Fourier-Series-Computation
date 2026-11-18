const TAU = Math.PI * 2;
const FUNCTIONS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log, sqrt: Math.sqrt, abs: Math.abs };

function tokenize(source) {
  const tokens = [];
  const pattern = /\s*(?:(\d*\.?\d+(?:e[+-]?\d+)?)|([a-zA-Z]+)|([+\-*/^(),]))/gy;
  let position = 0;
  while (position < source.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Unexpected character near "${source.slice(position, position + 8)}".`);
    tokens.push(match[1] ? { type: "number", value: Number(match[1]) } : match[2] ? { type: "name", value: match[2].toLowerCase() } : { type: match[3] });
    position = pattern.lastIndex;
  }
  return tokens;
}

export function compileExpression(source) {
  const text = source.replace(/^\s*y\s*=\s*/i, "");
  const tokens = tokenize(text);
  let index = 0;
  const parseExpression = () => {
    let node = parseTerm();
    while (tokens[index]?.type === "+" || tokens[index]?.type === "-") {
      const operator = tokens[index++].type;
      const right = parseTerm();
      const left = node;
      node = x => operator === "+" ? left(x) + right(x) : left(x) - right(x);
    }
    return node;
  };
  const parseTerm = () => {
    let node = parsePower();
    while (tokens[index]?.type === "*" || tokens[index]?.type === "/") {
      const operator = tokens[index++].type;
      const right = parsePower();
      const left = node;
      node = x => operator === "*" ? left(x) * right(x) : left(x) / right(x);
    }
    return node;
  };
  const parsePower = () => {
    let node = parseUnary();
    if (tokens[index]?.type === "^") {
      index++;
      const right = parsePower();
      const left = node;
      node = x => Math.pow(left(x), right(x));
    }
    return node;
  };
  const parseUnary = () => {
    if (tokens[index]?.type === "+") { index++; return parseUnary(); }
    if (tokens[index]?.type === "-") { index++; const node = parseUnary(); return x => -node(x); }
    return parsePrimary();
  };
  const parsePrimary = () => {
    const token = tokens[index++];
    if (!token) throw new Error("The expression is incomplete.");
    if (token.type === "number") return () => token.value;
    if (token.type === "name") {
      if (token.value === "x") return x => x;
      if (token.value === "pi") return () => Math.PI;
      if (token.value === "e") return () => Math.E;
      if (!FUNCTIONS[token.value] || tokens[index]?.type !== "(") throw new Error(`Unknown name "${token.value}".`);
      index++;
      const argument = parseExpression();
      if (tokens[index]?.type !== ")") throw new Error(`Missing ")" after ${token.value}.`);
      index++;
      return x => FUNCTIONS[token.value](argument(x));
    }
    if (token.type === "(") {
      const node = parseExpression();
      if (tokens[index]?.type !== ")") throw new Error('Missing closing ")".');
      index++;
      return node;
    }
    throw new Error("Expected a number, x, function, or parenthesized expression.");
  };
  const result = parseExpression();
  if (index !== tokens.length) throw new Error("Unexpected content at the end of the expression.");
  return result;
}

export function computeFourier(fn, left, right, maxN = 40, samples = 1200) {
  if (!(right > left)) throw new Error("The right bound must be greater than the left bound.");
  const length = right - left;
  const values = Array.from({ length: samples }, (_, k) => {
    const x = left + length * k / samples;
    const value = fn(x);
    if (!Number.isFinite(value)) throw new Error(`The function is not finite at x = ${x.toPrecision(4)}.`);
    return value;
  });
  const coefficients = [];
  for (let n = 0; n <= maxN; n++) {
    let cosine = 0, sine = 0;
    for (let k = 0; k < samples; k++) {
      const angle = TAU * n * k / samples;
      cosine += values[k] * Math.cos(angle);
      sine += values[k] * Math.sin(angle);
    }
    coefficients.push({ n, a: 2 * cosine / samples, b: 2 * sine / samples });
  }
  coefficients[0].a /= 2;
  return { values, coefficients, left, right, length, samples };
}

export function dft(points, maxFrequency = 50) {
  const coefficients = [];
  for (let n = -maxFrequency; n <= maxFrequency; n++) {
    let real = 0, imaginary = 0;
    for (let k = 0; k < points.length; k++) {
      const angle = -TAU * n * k / points.length;
      real += points[k].x * Math.cos(angle) - points[k].y * Math.sin(angle);
      imaginary += points[k].x * Math.sin(angle) + points[k].y * Math.cos(angle);
    }
    real /= points.length; imaginary /= points.length;
    coefficients.push({ n, real, imaginary, amplitude: Math.hypot(real, imaginary), phase: Math.atan2(imaginary, real) });
  }
  return coefficients.sort((a, b) => b.amplitude - a.amplitude);
}

export function closeLoop(points) {
  if (points.length < 2) return points.slice();
  const first = points[0], last = points[points.length - 1];
  if (first.x === last.x && first.y === last.y) return points.slice();
  return points.concat({ ...first });
}

if (typeof document !== "undefined") {
const $ = id => document.getElementById(id);
const equationN = $("equation-n");
equationN.addEventListener("input", () => $("equation-n-output").value = equationN.value);
$("equation-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    const fn = compileExpression($("equation-input").value);
    const data = computeFourier(fn, Number($("left-bound").value), Number($("right-bound").value), 40);
    drawEquation(data, Number(equationN.value));
    $("equation-error").textContent = "";
  } catch (error) { $("equation-error").textContent = error.message; }
});

function drawEquation(data, selectedN) {
  const original = $("original-canvas"), approximation = $("fourier-canvas");
  const points = data.values.map((y, i) => ({ x: data.left + data.length * i / data.samples, y }));
  const harmonics = data.coefficients.slice(1, selectedN + 1);
  const approx = points.map(point => {
    let y = data.coefficients[0].a;
    for (const coefficient of harmonics) {
      const angle = TAU * coefficient.n * (point.x - data.left) / data.length;
      y += coefficient.a * Math.cos(angle) + coefficient.b * Math.sin(angle);
    }
    return { x: point.x, y };
  });
  const allY = points.concat(approx).map(point => point.y);
  drawGraph(original, points, data.left, data.right, Math.min(...allY), Math.max(...allY), "#62f4ff");
  drawGraph(approximation, approx, data.left, data.right, Math.min(...allY), Math.max(...allY), "#ff5ccc");
  $("coefficient-table").innerHTML = `<table><thead><tr><th>n</th><th>aₙ</th><th>bₙ</th></tr></thead><tbody>${data.coefficients.slice(0, selectedN + 1).map(c => `<tr><td>${c.n}</td><td>${c.a.toFixed(5)}</td><td>${c.b.toFixed(5)}</td></tr>`).join("")}</tbody></table>`;
}

function drawGraph(canvas, points, left, right, minY, maxY, color) {
  const ctx = canvas.getContext("2d"), width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height); ctx.strokeStyle = "rgba(145,167,199,.25)"; ctx.lineWidth = 1;
  const range = Math.max(maxY - minY, 1e-8), mapX = x => (x - left) / (right - left) * width, mapY = y => height - (y - minY) / range * height;
  ctx.beginPath(); ctx.moveTo(0, mapY(0)); ctx.lineTo(width, mapY(0)); ctx.stroke();
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(mapX(point.x), mapY(point.y)) : ctx.moveTo(mapX(point.x), mapY(point.y)));
  ctx.stroke(); ctx.shadowBlur = 0;
}

let animation = null, drawing = [];
function setShape(points, label) {
  const closed = closeLoop(points);
  if (closed.length < 3) throw new Error("Add at least two line segments.");
  const bounds = closed.reduce((acc, point) => ({ minX: Math.min(acc.minX, point.x), maxX: Math.max(acc.maxX, point.x), minY: Math.min(acc.minY, point.y), maxY: Math.max(acc.maxY, point.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const centerX = (bounds.minX + bounds.maxX) / 2, centerY = (bounds.minY + bounds.maxY) / 2;
  const scale = 240 / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
  const normalized = closed.slice(0, -1).map(point => ({ x: (point.x - centerX) * scale, y: -(point.y - centerY) * scale }));
  const count = Number($("arrow-count").value);
  animation = { coefficients: dft(normalized, count), points: normalized, phase: 0, trail: [], lastTime: performance.now(), label };
  $("shape-error").textContent = "";
  $("shape-status").textContent = `${label}: ${normalized.length} samples, ${count * 2 + 1} frequencies`;
  requestAnimationFrame(renderAnimation);
}

function renderAnimation(now) {
  if (!animation) return;
  const elapsed = Math.min((now - animation.lastTime) / 1000, .1);
  animation.lastTime = now;
  if (!$("pause-animation").dataset.paused) animation.phase = (animation.phase + elapsed * Number($("speed").value) * .15) % 1;
  const ctx = $("complex-canvas").getContext("2d"), width = ctx.canvas.width, height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height); ctx.save(); ctx.translate(width / 2, height / 2);
  let x = 0, y = 0; ctx.lineWidth = 1;
  for (const coefficient of animation.coefficients) {
    const radius = coefficient.amplitude, angle = TAU * coefficient.n * animation.phase + coefficient.phase;
    ctx.strokeStyle = "rgba(98,244,255,.2)"; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
    const nextX = x + radius * Math.cos(angle), nextY = y + radius * Math.sin(angle);
    ctx.strokeStyle = "#ff5ccc"; ctx.shadowColor = "#ff5ccc"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nextX, nextY); ctx.stroke(); ctx.shadowBlur = 0; x = nextX; y = nextY;
  }
  animation.trail.push({ x, y }); if (animation.trail.length > 900) animation.trail.shift();
  ctx.strokeStyle = "#f7f08a"; ctx.lineWidth = 2; ctx.beginPath();
  animation.trail.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke();
  ctx.fillStyle = "#62f4ff"; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.restore();
  requestAnimationFrame(renderAnimation);
}

$("equation-form").dispatchEvent(new Event("submit"));
$("speed").addEventListener("input", () => $("speed-output").value = `${Number($("speed").value).toFixed(1)}x`);
$("arrow-count").addEventListener("input", () => $("arrow-output").value = $("arrow-count").value);
$("pause-animation").addEventListener("click", event => {
  const button = event.currentTarget; button.dataset.paused = button.dataset.paused ? "" : "true"; button.textContent = button.dataset.paused ? "Resume" : "Pause";
});
document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab, .tab-content").forEach(item => item.classList.remove("active"));
  button.classList.add("active"); $(button.dataset.tab).classList.add("active");
}));

async function loadSvgText(text, label) {
  try {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error("The SVG could not be parsed.");
    const source = doc.querySelector("path");
    if (!source) throw new Error("This SVG does not contain a path element.");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "fixed"; svg.style.left = "-10000px"; svg.append(source.cloneNode(true)); document.body.append(svg);
    const path = svg.querySelector("path"), total = path.getTotalLength(), samples = 1000;
    const points = Array.from({ length: samples }, (_, index) => { const point = path.getPointAtLength(total * index / samples); return { x: point.x, y: point.y }; });
    svg.remove(); setShape(points, label);
  } catch (error) { $("shape-error").textContent = error.message; }
}
$("svg-file").addEventListener("change", async event => {
  const file = event.target.files[0]; if (file) loadSvgText(await file.text(), file.name);
});
$("load-example").addEventListener("click", async () => loadSvgText(await (await fetch("Quake.svg")).text(), "Quake.svg"));

const drawCanvas = $("draw-canvas"), drawContext = drawCanvas.getContext("2d");
let isDrawing = false;
function drawPoint(event) {
  const rect = drawCanvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * drawCanvas.width / rect.width, y: (event.clientY - rect.top) * drawCanvas.height / rect.height };
}
drawCanvas.addEventListener("pointerdown", event => { isDrawing = true; drawing = [drawPoint(event)]; drawCanvas.setPointerCapture(event.pointerId); });
drawCanvas.addEventListener("pointermove", event => {
  if (!isDrawing) return; const point = drawPoint(event), previous = drawing[drawing.length - 1];
  if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2) return; drawing.push(point);
  drawContext.strokeStyle = "#62f4ff"; drawContext.lineWidth = 2; drawContext.beginPath(); drawContext.moveTo(previous.x, previous.y); drawContext.lineTo(point.x, point.y); drawContext.stroke();
});
drawCanvas.addEventListener("pointerup", () => { isDrawing = false; });
$("clear-drawing").addEventListener("click", () => { drawing = []; drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height); });
$("use-drawing").addEventListener("click", () => { try { setShape(drawing, "Freehand loop"); } catch (error) { $("shape-error").textContent = error.message; } });
}
