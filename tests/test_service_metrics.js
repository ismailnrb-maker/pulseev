const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const memory = new Map([['ev_auth_mode', 'offline']]);
const context = {
  console,
  Date,
  setInterval: () => 0,
  clearInterval: () => {},
  localStorage: {
    getItem: key => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/store.js', 'utf8') + '\n;globalThis.__store = Store;', context);

(async () => {
  await context.__store.sync();
  const stats = context.__store.getStats();
  assert.strictEqual(stats.vehiclesWithOverdueService, 6);
  assert.strictEqual(stats.overdueServiceMilestones, 7);
  assert.strictEqual(stats.criticalOverdueVehicles, 1);
  assert.ok(stats.vehiclesWithOverdueService < stats.overdueServiceMilestones);
  console.log('Fleet Overview service metrics are deduplicated by vehicle.');
})().catch(error => { console.error(error); process.exit(1); });
