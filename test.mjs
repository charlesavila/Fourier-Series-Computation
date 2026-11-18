import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("./app.js", "utf8") + "\nglobalThis.__mathApi = { closeLoop, connectDrawnSegments, compileExpression, computeFourier, dft };";
const sandbox = { document: undefined, console, Math, Number, performance: undefined };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { closeLoop, connectDrawnSegments, compileExpression, computeFourier, dft } = sandbox.__mathApi;

const sine = compileExpression("y = sin(x)");
assert.ok(Math.abs(sine(Math.PI / 2) - 1) < 1e-12);
assert.equal(compileExpression("2*x^3 + 4")(2), 20);
const series = computeFourier(sine, -Math.PI, Math.PI, 3, 600);
assert.ok(Math.abs(series.coefficients[1].b - 1) < 0.01);
assert.ok(Math.abs(series.coefficients[1].a) < 0.01);
const square = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
const coefficients = dft(square, 1);
assert.ok(coefficients[0].amplitude > 0.9);
assert.equal(closeLoop([{ x: 0, y: 0 }, { x: 2, y: 0 }]).length, 3);
assert.equal(closeLoop([{ x: 0, y: 0 }, { x: 0, y: 0 }]).length, 2);
const connected = connectDrawnSegments([
  [{ x: 0, y: 0 }, { x: 10, y: 0 }],
  [{ x: 20, y: 10 }, { x: 30, y: 10 }],
  [{ x: 40, y: 20 }, { x: 50, y: 20 }],
]);
assert.ok(connected.length >= 8);
assert.equal(connected[0].x, 0);
assert.equal(connected[0].y, 0);
assert.equal(connected[connected.length - 1].x, connected[0].x);
assert.equal(connected[connected.length - 1].y, connected[0].y);
console.log("Fourier math tests passed.");
