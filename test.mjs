import assert from "node:assert/strict";
import { closeLoop, compileExpression, computeFourier, dft } from "./app.js";

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
console.log("Fourier math tests passed.");
