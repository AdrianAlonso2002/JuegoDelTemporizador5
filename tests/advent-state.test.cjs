const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRules, empty } = require('../advent-state.js');
// Use the actual content configuration, including the two real challenges.
global.window = {};
require('../config.js');
const config = window.ADVENT_CONFIG;
const content = day => config.days.find(item => item.day === day) || { type: 'letter' };
const rules = createRules(config, content);
const december = day => new Date(2026, 11, day);
function through(last, state = empty()) {
  for (let day = 1; day <= last; day++) {
    assert.equal(rules.open(day, state, december(31)), true);
    if (content(day).type === 'puzzle') assert.equal(rules.solve(day, content(day).answer, state), true);
  }
  return state;
}
test('No se salta ningún regalo aunque hayan pasado todas las fechas', () => {
  const state = empty();
  for (let day = 2; day <= 30; day++) assert.equal(rules.open(day, state, new Date(2027, 1, 1)), false);
  assert.equal(rules.open(1, state, december(31)), true);
  assert.equal(rules.open(3, state, december(31)), false);
  assert.equal(rules.open(2, state, december(31)), true);
});
test('Las fechas cambian exactamente a medianoche, incluso con el anterior completado', () => {
  const state = empty();
  assert.equal(rules.open(1, state, new Date(2026, 10, 30, 23, 59, 59)), false);
  assert.equal(rules.open(1, state, december(1)), true);
  assert.equal(rules.status(2, state, new Date(2026, 11, 1, 23, 59, 59)), 'date');
  assert.equal(rules.status(2, state, december(2)), 'available');
});
test('Abrir el anagrama no lo completa; fallar o cerrar no desbloquea el siguiente', () => {
  const state = through(3);
  assert.equal(rules.open(4, state, december(31)), true);
  assert.equal(rules.status(4, state), 'pending');
  assert.equal(rules.solve(4, 'otra palabra', state), false);
  assert.equal(rules.open(5, state, december(31)), false);
  const restored = rules.restore(JSON.parse(JSON.stringify(state)));
  assert.equal(rules.status(4, restored), 'pending');
  assert.equal(rules.status(5, restored, december(31)), 'sequence');
  assert.equal(rules.solve(4, '  RECUERDOS  ', restored), true);
  assert.equal(rules.open(5, restored, december(31)), true);
  assert.equal(rules.open(6, restored, december(31)), false);
  assert.equal(rules.solve(5, 'JUNTOS', restored), true);
  assert.equal(rules.open(6, restored, december(31)), true);
});
test('No se puede resolver un reto antes de abrirlo ni duplicar el progreso', () => {
  const state = through(3);
  assert.equal(rules.solve(4, 'recuerdos', state), false);
  assert.equal(rules.open(4, state, december(31)), true);
  assert.equal(rules.open(4, state, december(31)), false);
  rules.solve(4, 'recuerdos', state);
  rules.solve(4, 'RECUERDOS', state);
  assert.equal(state.opened.filter(day => day === 4).length, 1);
  assert.equal(state.completed.filter(day => day === 4).length, 1);
});
test('Cumpleaños requiere los 29 regalos y el 17 de enero de 2027', () => {
  const state = through(28);
  assert.equal(rules.status(30, state, new Date(2027, 0, 17)), 'sequence');
  assert.equal(rules.open(29, state, december(29)), true);
  assert.equal(rules.status(30, state, new Date(2027, 0, 17)), 'sequence');
  assert.equal(rules.solve(29, 'regalos', state), true);
  assert.equal(rules.status(30, state, december(30)), 'date');
  assert.equal(rules.open(30, state, new Date(2027, 0, 16, 23, 59, 59)), false);
  assert.equal(rules.open(30, state, new Date(2027, 0, 17)), true);
});
test('La demo adelanta las fechas, conserva los bloqueos y no modifica el progreso real', () => {
  const real = through(2);
  const before = JSON.stringify(real);
  const demo = empty();
  assert.equal(rules.open(2, demo, december(1), true), false);
  for (let day = 1; day <= 4; day++) assert.equal(rules.open(day, demo, new Date(2026, 10, 23), true), true);
  assert.equal(rules.open(5, demo, december(31), true), false);
  assert.equal(JSON.stringify(real), before);
});
test('Migración de la versión anterior: conserva el orden y pide resolver los retos', () => {
  const state = rules.restore([1, 2, 3, 4, 5, 6, 29, 30]);
  assert.deepEqual(state.opened, [1, 2, 3, 4]);
  assert.deepEqual(state.completed, [1, 2, 3]);
  assert.deepEqual(rules.restore([3, 29]), empty());
  assert.deepEqual(rules.restore({opened:'incorrecto',completed:[1]}), empty());
  assert.deepEqual(rules.restore(null), empty());
});
test('El nuevo estado conserva los retos completados al recargar', () => {
  const state = through(6);
  assert.deepEqual(rules.restore(JSON.parse(JSON.stringify(state))), state);
  assert.equal(rules.status(7, rules.restore(state), december(31)), 'available');
});
test('Los días 1–6 y 17 tienen las imágenes locales; los retos tienen las pistas exactas', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  for (const day of [1,2,3,4,5,6,17]) assert.ok(fs.existsSync(path.join(__dirname,'..',content(day).image)));
  assert.equal(content(4).clue, 'DORCUEERS');
  assert.equal(content(5).clue, 'más _____.');
});

test('Cada regalo tiene una imagen, incluido cumpleaños, y existen ambas imágenes de espera', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  assert.equal(config.days.length, 30);
  assert.equal(new Set(config.days.map(item => item.day)).size, 30);
  for (let day = 1; day <= 30; day++) {
    const item = content(day);
    assert.ok(item.image, `Falta la imagen del día ${day}`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', item.image)));
    assert.ok(item.imageAlt);
    for (const extra of item.extraImages || []) assert.ok(fs.existsSync(path.join(__dirname, '..', extra.image)));
  }
  assert.equal(config.waitImages.length, 2);
  for (const image of config.waitImages) assert.ok(fs.existsSync(path.join(__dirname, '..', image.image)));
});

test('Desde el 8 se repiten dos retos y un día de texto libre; todos los anagramas son válidos', () => {
  const { normalizeAnswer } = require('../advent-state.js');
  const letters = value => normalizeAnswer(value).replace(/[^a-z]/g, '').split('').sort().join('');
  for (let day = 8; day <= 29; day++) {
    const item = content(day);
    assert.equal(item.type, (day - 8) % 3 < 2 ? 'puzzle' : 'photo', `Patrón incorrecto el día ${day}`);
    if (item.type === 'puzzle') assert.equal(letters(item.clue), letters(item.answer), `Anagrama incorrecto el día ${day}`);
    else assert.ok(typeof item.text === 'string', `El día ${day} debe tener texto`);
  }
});

test('Los encuadres quedan dentro de la imagen original y el texto del día 7 se conserva', () => {
  const photos = config.days.flatMap(item => [item, ...(item.extraImages || [])]).concat(config.waitImages);
  for (const photo of photos) {
    if (!photo.imageCrop) continue;
    const { x, y, width, height } = photo.imageCrop;
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1, photo.image);
  }
  assert.match(content(7).text, /forma de ser/);
  assert.match(content(7).text, /hacia delante/);
  assert.match(content(7).text, /acompañas en todo momento/);
});

test('El recorrido completo exige resolver cada reto y conserva el progreso al recargar', () => {
  const state = empty();
  const now = new Date(2027, 0, 17);
  for (let day = 1; day <= 30; day++) {
    assert.equal(rules.open(day, state, now), true, `Abrir día ${day}`);
    if (content(day).type === 'puzzle') {
      assert.equal(rules.status(day + 1, state, now), 'sequence');
      assert.equal(rules.solve(day, content(day).answer.toUpperCase(), state), true);
    }
    assert.deepEqual(rules.restore(JSON.parse(JSON.stringify(state))), state);
  }
  assert.equal(state.completed.length, 30);
});
