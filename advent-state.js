/* Reglas compartidas por la interfaz y las pruebas, sin dependencias del navegador. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdventState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const empty = () => ({ version: 2, opened: [], completed: [] });
  const normalizeAnswer = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  function createRules(config, getContent) {
    function dateFor(day) {
      const value = day === 30 ? config.birthdayDate : day === 29 ? config.grandPrizeDate : `${config.year}-${String(config.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const [year, month, date] = value.split('-').map(Number);
      return new Date(year, month - 1, date);
    }
    function restore(raw) {
      const state = empty();
      const opened = Array.isArray(raw) ? raw : Array.isArray(raw?.opened) ? raw.opened : [];
      const completed = Array.isArray(raw?.completed) ? raw.completed : [];
      for (let day = 1; day <= 30; day++) {
        if (!opened.includes(day) || (day > 1 && !state.completed.includes(day - 1))) break;
        state.opened.push(day);
        if (getContent(day).type !== 'puzzle' || completed.includes(day)) state.completed.push(day);
      }
      return state;
    }
    function status(day, state, now = new Date(), demo = false) {
      if (!Number.isInteger(day) || day < 1 || day > 30) return 'invalid';
      if (state.opened.includes(day)) return state.completed.includes(day) ? 'completed' : 'pending';
      if (day > 1 && !state.completed.includes(day - 1)) return 'sequence';
      return demo || now >= dateFor(day) ? 'available' : 'date';
    }
    function open(day, state, now = new Date(), demo = false) {
      if (status(day, state, now, demo) !== 'available') return false;
      state.opened.push(day);
      if (getContent(day).type !== 'puzzle') state.completed.push(day);
      return true;
    }
    function solve(day, answer, state) {
      const item = getContent(day);
      if (item.type !== 'puzzle' || !state.opened.includes(day) || !item.answer || normalizeAnswer(answer) !== normalizeAnswer(item.answer)) return false;
      if (!state.completed.includes(day)) state.completed.push(day);
      return true;
    }
    return { dateFor, restore, status, open, solve };
  }
  return { empty, normalizeAnswer, createRules };
});
