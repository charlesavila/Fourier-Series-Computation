const TAU = Math.PI * 2;
const CONFIG = Object.freeze({
  equation: Object.freeze({ maxHarmonic: 100, samples: 1200 }),
  shape: Object.freeze({ defaultFrequency: 35 }),
  supportedFunctions: Object.freeze(["sin", "cos", "tan", "exp", "log", "sqrt", "abs"]),
});
const FUNCTIONS = Object.fromEntries(CONFIG.supportedFunctions.map(name => [name, Math[name]]));

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

function compileExpression(source) {
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

function computeFourier(fn, left, right, maxN = CONFIG.equation.maxHarmonic, samples = CONFIG.equation.samples) {
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

function dft(points, maxFrequency = 50) {
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

function closeLoop(points) {
  if (points.length < 2) return points.slice();
  const first = points[0], last = points[points.length - 1];
  if (first.x === last.x && first.y === last.y) return points.slice();
  return points.concat({ ...first });
}

function connectDrawnSegments(segments) {
  const usable = segments.map(segment => segment.filter((point, index, points) =>
    index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y
  )).filter(segment => segment.length > 0);
  if (usable.length === 0) return [];

  const points = [];
  usable.forEach((segment, index) => {
    if (index > 0) {
      points.push({ ...usable[index - 1][usable[index - 1].length - 1] }, { ...segment[0] });
    }
    points.push(...segment);
  });

  if (points.length > 1) points.push({ ...points[0] });
  return points;
}

if (typeof document !== "undefined") {
const $ = id => document.getElementById(id);
function openMode(activeMode) {
  document.querySelectorAll(".mode-button").forEach(button => {
    const isActive = button.dataset.mode === activeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll(".mode-panel").forEach(panel => {
    const isActive = panel.id === activeMode;
    panel.hidden = !isActive;
    panel.setAttribute("aria-hidden", String(!isActive));
  });
  if (activeMode !== "shape-panel") animation = null;
  const panel = $(activeMode);
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.querySelectorAll(".mode-button").forEach(button => {
  button.addEventListener("click", () => openMode(button.dataset.mode));
});
const equationN = $("equation-n");
const equationNManual = $("equation-n-manual");
let equationData = null;
function setEquationN(value) {
  const parsed = Number.parseInt(value, 10);
  const selectedN = Number.isFinite(parsed) ? Math.min(CONFIG.equation.maxHarmonic, Math.max(1, parsed)) : 1;
  equationN.value = selectedN;
  equationNManual.value = selectedN;
  $("equation-n-output").textContent = selectedN;
  if (equationData) drawEquation(equationData, selectedN);
}
equationN.addEventListener("input", () => setEquationN(equationN.value));
equationNManual.addEventListener("input", () => setEquationN(equationNManual.value));
$("equation-form").addEventListener("submit", event => {
  event.preventDefault();
  event.stopPropagation();
  try {
    const fn = compileExpression($("equation-input").value);
    const data = computeFourier(fn, Number($("left-bound").value), Number($("right-bound").value), CONFIG.equation.maxHarmonic, CONFIG.equation.samples);
    equationData = data;
    setEquationN(equationN.value);
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
  ctx.clearRect(0, 0, width, height);
  const range = Math.max(maxY - minY, 1e-8);
  const paddedMinY = Math.min(minY, 0) - range * 0.08;
  const paddedMaxY = Math.max(maxY, 0) + range * 0.08;
  const paddedRange = paddedMaxY - paddedMinY;
  const plotLeft = 58, plotRight = width - 18, plotTop = 18, plotBottom = height - 42;
  const mapX = x => plotLeft + (x - left) / (right - left) * (plotRight - plotLeft);
  const mapY = y => plotBottom - (y - paddedMinY) / paddedRange * (plotBottom - plotTop);
  const niceStep = (span, targetTicks = 8) => {
    const rough = span / targetTicks;
    const power = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-12))));
    const fraction = rough / power;
    const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return factor * power;
  };

  const xStep = niceStep(right - left);
  const yStep = niceStep(paddedRange);
  ctx.font = "12px Segoe UI";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(145,167,199,.16)";
  ctx.fillStyle = "rgba(231,247,255,.72)";
  ctx.lineWidth = 1;
  for (let y = Math.ceil(paddedMinY / yStep) * yStep; y <= paddedMaxY + yStep * 0.5; y += yStep) {
    const py = mapY(y);
    ctx.beginPath(); ctx.moveTo(plotLeft, py); ctx.lineTo(plotRight, py); ctx.stroke();
    ctx.fillText(Number(y.toPrecision(6)).toString(), plotLeft - 8, py);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = Math.ceil(left / xStep) * xStep; x <= right + xStep * 0.5; x += xStep) {
    const px = mapX(x);
    ctx.beginPath(); ctx.moveTo(px, plotTop); ctx.lineTo(px, plotBottom); ctx.stroke();
    ctx.fillText(Number(x.toPrecision(6)).toString(), px, plotBottom + 8);
  }
  ctx.strokeStyle = "rgba(231,247,255,.55)";
  ctx.beginPath(); ctx.moveTo(plotLeft, plotTop); ctx.lineTo(plotLeft, plotBottom); ctx.lineTo(plotRight, plotBottom); ctx.stroke();

  if (paddedMinY <= 0 && paddedMaxY >= 0) {
    ctx.strokeStyle = "rgba(231,247,255,.38)";
    ctx.beginPath(); ctx.moveTo(plotLeft, mapY(0)); ctx.lineTo(plotRight, mapY(0)); ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(231,247,255,.72)";
  ctx.fillText("x", (plotLeft + plotRight) / 2, height - 16);
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
  const normalized = closed.slice(0, -1).map(point => ({
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
  }));
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
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
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
const drawCanvas = $("draw-canvas"), drawContext = drawCanvas.getContext("2d");
let isDrawing = false, drawingSegments = [], currentSegment = [];
function drawPoint(event) {
  const rect = drawCanvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * drawCanvas.width / rect.width, y: (event.clientY - rect.top) * drawCanvas.height / rect.height };
}
function redrawDrawing() {
  drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawContext.strokeStyle = "#62f4ff";
  drawContext.lineWidth = 2;
  drawingSegments.forEach(segment => {
    if (segment.length < 2) return;
    drawContext.beginPath();
    drawContext.moveTo(segment[0].x, segment[0].y);
    segment.slice(1).forEach(point => drawContext.lineTo(point.x, point.y));
    drawContext.stroke();
  });

  if (drawingSegments.length > 1) {
    drawContext.strokeStyle = "rgba(255,92,204,.95)";
    drawContext.setLineDash([7, 7]);
    drawingSegments.slice(1).forEach((segment, index) => {
      const previous = drawingSegments[index];
      drawContext.beginPath();
      drawContext.moveTo(previous[previous.length - 1].x, previous[previous.length - 1].y);
      drawContext.lineTo(segment[0].x, segment[0].y);
      drawContext.stroke();
    });
    if (drawingSegments[drawingSegments.length - 1].length > 0) {
      const finalSegment = drawingSegments[drawingSegments.length - 1];
      const firstSegment = drawingSegments[0];
      drawContext.beginPath();
      drawContext.moveTo(finalSegment[finalSegment.length - 1].x, finalSegment[finalSegment.length - 1].y);
      drawContext.lineTo(firstSegment[0].x, firstSegment[0].y);
      drawContext.stroke();
    }
    drawContext.setLineDash([]);
  }
}
drawCanvas.addEventListener("pointerdown", event => {
  isDrawing = true;
  currentSegment = [drawPoint(event)];
  drawingSegments.push(currentSegment);
  redrawDrawing();
  drawCanvas.setPointerCapture(event.pointerId);
});
drawCanvas.addEventListener("pointermove", event => {
  if (!isDrawing) return; const point = drawPoint(event), previous = currentSegment[currentSegment.length - 1];
  if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2) return;
  currentSegment.push(point);
  redrawDrawing();
});
drawCanvas.addEventListener("pointerup", () => { isDrawing = false; });
$("clear-drawing").addEventListener("click", () => { drawing = []; drawingSegments = []; currentSegment = []; redrawDrawing(); });
$("use-drawing").addEventListener("click", () => {
  try {
    const connected = connectDrawnSegments(drawingSegments);
    if (connected.length < 3) throw new Error("Draw at least one line segment.");
    drawing = connected;
    setShape(drawing, "Freehand loop");
  } catch (error) { $("shape-error").textContent = error.message; }
});
}
