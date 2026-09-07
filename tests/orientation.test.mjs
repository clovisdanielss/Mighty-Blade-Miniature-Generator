import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../dist/js/app.js', import.meta.url), 'utf8');

const invertedDefinition = source.indexOf("const invertedImageData = rotatedImageData(creature.image)");
const upperPlacement = source.indexOf("target.addImage(invertedImageData, 'PNG', bodyX, centerY - artH");
const lowerPlacement = source.indexOf("target.addImage(imageData, 'PNG', bodyX, centerY, artW, artH");

assert.ok(invertedDefinition >= 0, 'PDF export must create a 180-degree copy.');
assert.ok(upperPlacement > invertedDefinition, 'The inverted copy must be placed above the fold.');
assert.ok(lowerPlacement > upperPlacement, 'The original upright image must be placed below the fold.');

console.log('Orientation invariant verified: inverted above, original below.');
