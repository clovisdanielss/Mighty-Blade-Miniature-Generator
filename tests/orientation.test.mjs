import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

const clearanceInput = source.indexOf("foldClearance: $('#fold-clearance')");
const clearanceRead = source.indexOf('const foldClearance = clampNumber(els.foldClearance.value, 0, 50, 2)');
const upperTransform = source.indexOf("ctx.translate(bodyX + artW, centerY - foldClearance); ctx.rotate(Math.PI)");
const upperPlacement = source.indexOf("ctx.drawImage(creature.image, 0, 0, artW, artH)");
const lowerTransform = source.indexOf("ctx.translate(bodyX + artW, centerY + foldClearance); ctx.scale(-1, 1)");
const lowerPlacement = source.indexOf("ctx.drawImage(creature.image, 0, 0, artW, artH)", lowerTransform);
const sharedPdfCanvas = source.indexOf("const printCanvas = renderSheetCanvas(layout, 10)");

assert.ok(clearanceInput >= 0, 'The global fold-clearance input must be connected.');
assert.ok(clearanceRead > clearanceInput, 'The fold clearance must be read from the sheet settings.');
assert.ok(upperTransform >= 0, 'The upper image must be rotated 180 degrees.');
assert.ok(upperPlacement > upperTransform, 'The rotated copy must be placed above the fold.');
assert.ok(lowerTransform > upperPlacement, 'The lower image must be horizontally mirrored.');
assert.ok(lowerPlacement > lowerTransform, 'The mirrored copy must be placed below the fold.');
assert.ok(sharedPdfCanvas > lowerPlacement, 'PDF export must use the same renderer as the preview.');

console.log('Fold clearance and orientation verified: rotated above, mirrored below.');
