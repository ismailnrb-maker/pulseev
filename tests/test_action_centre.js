const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const fixture = JSON.parse(fs.readFileSync('tests/action_centre_golden.json', 'utf8'));
const source = fs.readFileSync('js/action-centre.js', 'utf8') + '\n;globalThis.__engine = ActionCentreEngine;';
const memory = new Map();
const context = {
  console,
  Date,
  localStorage: {
    getItem: key => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, value),
  },
};
vm.createContext(context);
vm.runInContext(source, context);

const cases = context.__engine.buildCandidates(fixture.vehicles, new Date(fixture.now));
const scores = Object.fromEntries(cases.map(item => [item.caseType, item.riskScore]));
assert.deepStrictEqual(JSON.parse(JSON.stringify(scores)), fixture.expected);
const fridayAfterHours = new Date('2026-09-04T15:00:00Z');
assert.strictEqual(context.__engine.addBusinessTime(fridayAfterHours, 'critical').toISOString(), '2026-09-07T07:30:00.000Z');
assert.strictEqual(context.__engine.addBusinessTime(fridayAfterHours, 'high').toISOString(), '2026-09-07T12:30:00.000Z');
assert.strictEqual(context.__engine.addBusinessTime(fridayAfterHours, 'medium').toISOString(), '2026-09-09T12:30:00.000Z');
console.log('Offline Action Centre matches the shared golden risk fixture.');
