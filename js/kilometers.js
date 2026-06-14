/* ============================================================
   EV LIFECYCLE MANAGEMENT — KILOMETER INTELLIGENCE
   Odometer logs analytics, fleet utilization charts, and service predictions
   ============================================================ */

const KilometersView = (() => {

  function render(container) {
    const vehicles = Store.getVehicles();

    // Sort by Odometer high/low
    const highestRunners = [...vehicles].sort((a, b) => b.currentKm - a.currentKm).slice(0, 5);
    const lowestRunners = [...vehicles].sort((a, b) => a.currentKm - b.currentKm).slice(0, 5);

    // Fleet Stats
    const totalKm = vehicles.reduce((sum, v) => sum + (v.currentKm || 0), 0);
    const avgKm = vehicles.length > 0 ? Math.round(totalKm / vehicles.length) : 0;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Odometer Intelligence</h1>
          <p class="page-subtitle">Historical distance analysis, usage logs, and predictive service schedules</p>
        </div>
      </div>

      <!-- Distance stats overview card grid -->
      <div class="grid-3 mb-6">
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--primary);">
          <span class="detail-label">Total Cumulative Fleet Distance</span>
          <span class="font-bold text-primary" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${totalKm.toLocaleString()} KM</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Sum of all active EV odometers</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--accent-emerald);">
          <span class="detail-label">Average Vehicle Odo Distance</span>
          <span class="font-bold text-emerald" style="font-size: var(--text-2xl); font-family: var(--font-mono);">${avgKm.toLocaleString()} KM</span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Distance mean per vehicle</span>
        </div>
        <div class="card" style="display: flex; flex-direction: column; gap: var(--space-1); border-left: 3px solid var(--accent-violet);">
          <span class="detail-label">Fleet Running Velocity</span>
          <span class="font-bold text-brand" style="font-size: var(--text-2xl); font-family: var(--font-mono);">
            ${Math.round(avgKm / 6)} KM <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-muted);">/ month</span>
          </span>
          <span class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px;">Calculated fleet running average</span>
        </div>
      </div>

      <!-- Service Milestones Predictions Table -->
      <div class="card mb-6">
        <h3 class="card-title mb-4">Predictive Service Forecasts</h3>
        <p class="card-subtitle mb-4">Service calendar predictions calculated by analyzing average monthly run rates</p>
        <div class="table-wrapper">
          <table class="table table-clickable">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Spec Variant</th>
                <th>Current Odo</th>
                <th>Avg. Running (Month)</th>
                <th>Next Service Milestone</th>
                <th>Milestone Target</th>
                <th>Forecasted Service Due</th>
              </tr>
            </thead>
            <tbody>
              ${vehicles.map(v => {
                const forecast = calculateServiceForecast(v);
                return `
                  <tr onclick="App.navigateTo('vehicles', '${v.id}')">
                    <td><span class="font-semibold">${v.customerName}</span></td>
                    <td>${v.model}</td>
                    <td class="mono font-semibold">${v.currentKm.toLocaleString()} KM</td>
                    <td class="mono">${forecast.monthlyRate.toLocaleString()} KM/mo</td>
                    <td class="font-semibold text-brand">${forecast.nextService}</td>
                    <td class="mono">${forecast.targetKm.toLocaleString()} KM</td>
                    <td>
                      <span class="badge ${forecast.isOverdue ? 'badge-overdue' : 'badge-completed'}">
                        ${forecast.timeString}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
              ${vehicles.length === 0 ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: var(--space-10);">No running metrics logged.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Fleet utilization high / low runner grids -->
      <div class="grid-2">
        <div class="card">
          <h3 class="card-title mb-4">Highest Runners (Fleet Top 5)</h3>
          <div class="table-wrapper">
            <table class="table table-clickable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Model</th>
                  <th>Current Odo</th>
                </tr>
              </thead>
              <tbody>
                ${highestRunners.map(v => `
                  <tr onclick="App.navigateTo('vehicles', '${v.id}')">
                    <td><span class="font-semibold">${v.customerName}</span></td>
                    <td>${v.model}</td>
                    <td class="mono font-semibold text-primary">${v.currentKm.toLocaleString()} KM</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title mb-4">Lowest Runners (Fleet Bottom 5)</h3>
          <div class="table-wrapper">
            <table class="table table-clickable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Model</th>
                  <th>Current Odo</th>
                </tr>
              </thead>
              <tbody>
                ${lowestRunners.map(v => `
                  <tr onclick="App.navigateTo('vehicles', '${v.id}')">
                    <td><span class="font-semibold">${v.customerName}</span></td>
                    <td>${v.model}</td>
                    <td class="mono font-semibold text-amber">${v.currentKm.toLocaleString()} KM</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function calculateServiceForecast(v) {
    // Calculate monthly running rate
    // Calculate days since delivery
    const daysSinceDelivery = Math.max(1, (new Date() - new Date(v.deliveryDate)) / (1000 * 60 * 60 * 24));
    const months = daysSinceDelivery / 30.4;
    const monthlyRate = Math.max(200, Math.round(v.currentKm / months)); // default min 200 km/month

    // Find next uncompleted service
    let nextS = null;
    let nextIdx = -1;
    for (let i = 0; i < v.services.length; i++) {
      if (!v.services[i].completedKm) {
        nextS = v.services[i];
        nextIdx = i;
        break;
      }
    }

    if (!nextS) {
      return {
        monthlyRate,
        nextService: 'All Done',
        targetKm: v.services[3].dueKm,
        timeString: 'Up to Date',
        isOverdue: false
      };
    }

    const kmRemaining = nextS.dueKm - v.currentKm;
    const isOverdue = kmRemaining < 0;

    let timeString = '';
    if (isOverdue) {
      timeString = 'OVERDUE';
    } else {
      const monthsRemaining = kmRemaining / monthlyRate;
      if (monthsRemaining < 1) {
        timeString = 'Due this month';
      } else {
        timeString = `Due in ~${Math.round(monthsRemaining)} months`;
      }
    }

    return {
      monthlyRate,
      nextService: `Service #${nextS.serviceNumber}`,
      targetKm: nextS.dueKm,
      timeString,
      isOverdue
    };
  }

  return {
    render
  };
})();
