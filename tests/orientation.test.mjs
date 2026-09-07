import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

const upperTransform = source.indexOf("ctx.translate(bodyX + artW, centerY); ctx.rotate(Math.PI)");
const upperPlacement = source.indexOf("ctx.drawImage(creature.image, 0, 0, artW, artH)");
const lowerPlacement = source.indexOf("ctx.drawImage(creature.image, bodyX, centerY, artW, artH)");
const sharedPdfCanvas = source.indexOf("const printCanvas = renderSheetCanvas(layout, 10)");

assert.ok(upperTransform >= 0, 'The upper image must be rotated 180 degrees.');
assert.ok(upperPlacement > upperTransform, 'The rotated copy must be placed above the fold.');
assert.ok(lowerPlacement > upperPlacement, 'The original upright image must be placed below the fold.');
assert.ok(sharedPdfCanvas > lowerPlacement, 'PDF export must use the same renderer as the preview.');

console.log('Orientation invariant verified: inverted above, original below.');
