const delayInput = document.getElementById('delay-input');
const delayRun = document.getElementById('delay-run');
const delayClear = document.getElementById('delay-clear');
const delayStatus = document.getElementById('delay-status');
const delayChart = document.getElementById('delay-chart');
const delaySummary = document.getElementById('delay-summary');

const loadSpinner = document.getElementById('load-spinner');
const loadSkeleton = document.getElementById('load-skeleton');
const loadingClear = document.getElementById('loading-clear');
const loadingStage = document.getElementById('loading-stage');
const ratingRow = document.getElementById('rating-row');
const ratingButtons = document.getElementById('rating-buttons');
const loadingSummary = document.getElementById('loading-summary');

const failRate = document.getElementById('fail-rate');
const failRateLabel = document.getElementById('fail-rate-label');
const standardLikesEl = document.getElementById('standard-likes');
const optimisticLikesEl = document.getElementById('optimistic-likes');
const standardAction = document.getElementById('standard-action');
const optimisticAction = document.getElementById('optimistic-action');
const standardStatus = document.getElementById('standard-status');
const optimisticStatus = document.getElementById('optimistic-status');
const eventLog = document.getElementById('event-log');
const exportSessionButton = document.getElementById('export-session');
const resetSessionButton = document.getElementById('reset-session');

const STORAGE_KEY = 'ux_latency_lab_state_v1';

let currentLoadType = null;
let standardPending = false;
let optimisticPending = false;

const state = loadState();

function defaultState() {
  return {
    delayResults: [],
    loadRatings: {
      spinner: [],
      skeleton: [],
    },
    standardLikes: 0,
    optimisticLikes: 0,
    eventEntries: [],
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return defaultState();

    return {
      ...defaultState(),
      ...parsed,
      loadRatings: {
        spinner: Array.isArray(parsed.loadRatings?.spinner) ? parsed.loadRatings.spinner : [],
        skeleton: Array.isArray(parsed.loadRatings?.skeleton) ? parsed.loadRatings.skeleton : [],
      },
      eventEntries: Array.isArray(parsed.eventEntries) ? parsed.eventEntries : [],
      delayResults: Array.isArray(parsed.delayResults) ? parsed.delayResults : [],
    };
  } catch (error) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function syncLikeCounters() {
  standardLikesEl.textContent = String(state.standardLikes);
  optimisticLikesEl.textContent = String(state.optimisticLikes);
}

function renderEventLog() {
  eventLog.innerHTML = '';

  state.eventEntries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = entry.type || '';
    item.textContent = `${entry.time} - ${entry.message}`;
    eventLog.appendChild(item);
  });
}

function addLog(message, type) {
  const now = new Date().toLocaleTimeString();
  state.eventEntries.unshift({ time: now, message, type: type || '' });

  while (state.eventEntries.length > 14) {
    state.eventEntries.pop();
  }

  renderEventLog();
  saveState();
}

function renderDelayResults() {
  if (!state.delayResults.length) {
    delayChart.innerHTML = '';
    delaySummary.textContent = 'Average measured delay: -';
    return;
  }

  const maxValue = Math.max(...state.delayResults);
  delayChart.innerHTML = '';

  state.delayResults.forEach((result) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(8, (result / maxValue) * 100)}%`;
    bar.title = `${result.toFixed(0)} ms`;
    delayChart.appendChild(bar);
  });

  delaySummary.textContent = `Average measured delay: ${average(state.delayResults).toFixed(1)} ms`;
}

function renderLoadingSummary() {
  const spinnerAvg = average(state.loadRatings.spinner);
  const skeletonAvg = average(state.loadRatings.skeleton);

  if (!state.loadRatings.spinner.length && !state.loadRatings.skeleton.length) {
    loadingSummary.textContent = 'No ratings recorded.';
    return;
  }

  loadingSummary.textContent = `Avg perceived speed (higher is better): spinner ${spinnerAvg.toFixed(2)}, skeleton ${skeletonAvg.toFixed(
    2
  )}`;
}

async function runDelayTrial() {
  const delay = Number(delayInput.value);
  if (!Number.isFinite(delay) || delay < 0) {
    delayStatus.textContent = 'Delay must be a number >= 0.';
    return;
  }

  delayRun.disabled = true;
  const start = performance.now();
  delayStatus.textContent = `Running trial with ${delay} ms artificial delay...`;

  await new Promise((resolve) => setTimeout(resolve, delay));
  const measured = performance.now() - start;

  state.delayResults.push(measured);
  if (state.delayResults.length > 20) state.delayResults.shift();

  delayStatus.textContent = `Measured response: ${measured.toFixed(1)} ms`;
  renderDelayResults();
  saveState();

  delayRun.disabled = false;
}

function clearDelayTrials() {
  state.delayResults = [];
  delayStatus.textContent = 'Delay trials cleared.';
  renderDelayResults();
  saveState();
}

function renderRatingButtons() {
  ratingButtons.innerHTML = '';

  for (let score = 1; score <= 5; score += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(score);
    button.addEventListener('click', () => {
      if (!currentLoadType) return;

      state.loadRatings[currentLoadType].push(score);
      addLog(`${currentLoadType} flow rated ${score}/5`, 'success');

      renderLoadingSummary();
      saveState();
      ratingRow.classList.add('hidden');
      currentLoadType = null;
    });
    ratingButtons.appendChild(button);
  }
}

async function runLoadingScenario(type) {
  currentLoadType = null;
  ratingRow.classList.add('hidden');

  loadSpinner.disabled = true;
  loadSkeleton.disabled = true;

  loadingStage.innerHTML = '';

  if (type === 'spinner') {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    loadingStage.appendChild(spinner);
  } else {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    for (let i = 0; i < 3; i += 1) {
      skeleton.appendChild(document.createElement('div'));
    }
    loadingStage.appendChild(skeleton);
  }

  const simulatedLatency = 1200 + Math.random() * 1400;
  await new Promise((resolve) => setTimeout(resolve, simulatedLatency));

  loadingStage.innerHTML = `<p>Loaded in ${simulatedLatency.toFixed(0)} ms. Rate perceived speed (1-5).</p>`;
  currentLoadType = type;
  ratingRow.classList.remove('hidden');

  loadSpinner.disabled = false;
  loadSkeleton.disabled = false;
}

function clearRatings() {
  state.loadRatings = { spinner: [], skeleton: [] };
  loadingSummary.textContent = 'No ratings recorded.';
  ratingRow.classList.add('hidden');
  currentLoadType = null;
  addLog('Loading perception ratings cleared.', 'success');
  saveState();
}

function simulateServerCall() {
  const failChance = Number(failRate.value) / 100;
  const latency = 700 + Math.random() * 1400;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failChance) {
        reject(new Error('Request failed'));
      } else {
        resolve({ latency });
      }
    }, latency);
  });
}

async function runStandard() {
  if (standardPending) return;

  standardPending = true;
  standardAction.disabled = true;
  standardStatus.textContent = 'Waiting for server...';

  try {
    const response = await simulateServerCall();
    state.standardLikes += 1;
    syncLikeCounters();
    standardStatus.textContent = `Success in ${response.latency.toFixed(0)} ms.`;
    addLog('Standard flow committed like after server confirmation.', 'success');
  } catch (error) {
    standardStatus.textContent = 'Request failed. UI state unchanged.';
    addLog('Standard flow request failed; no UI update applied.', 'fail');
  } finally {
    saveState();
    standardPending = false;
    standardAction.disabled = false;
  }
}

async function runOptimistic() {
  if (optimisticPending) return;

  optimisticPending = true;
  optimisticAction.disabled = true;

  state.optimisticLikes += 1;
  syncLikeCounters();
  optimisticStatus.textContent = 'Updated immediately. Syncing with server...';

  try {
    const response = await simulateServerCall();
    optimisticStatus.textContent = `Confirmed in ${response.latency.toFixed(0)} ms.`;
    addLog('Optimistic flow confirmed successfully.', 'success');
  } catch (error) {
    state.optimisticLikes -= 1;
    syncLikeCounters();
    optimisticStatus.textContent = 'Server rejected update. Rolled back.';
    addLog('Optimistic flow rolled back after server failure.', 'fail');
  } finally {
    saveState();
    optimisticPending = false;
    optimisticAction.disabled = false;
  }
}

function resetSession() {
  const fresh = defaultState();
  state.delayResults = fresh.delayResults;
  state.loadRatings = fresh.loadRatings;
  state.standardLikes = fresh.standardLikes;
  state.optimisticLikes = fresh.optimisticLikes;
  state.eventEntries = fresh.eventEntries;

  standardStatus.textContent = 'Idle';
  optimisticStatus.textContent = 'Idle';
  delayStatus.textContent = 'No trials yet.';
  loadingStage.innerHTML = '<p>Run a loading mode to begin.</p>';
  ratingRow.classList.add('hidden');
  currentLoadType = null;

  renderDelayResults();
  renderLoadingSummary();
  syncLikeCounters();
  renderEventLog();

  addLog('Session reset. Local data cleared.', 'success');
  saveState();
}

function exportSessionData() {
  const exported = {
    exportedAt: new Date().toISOString(),
    delayResults: state.delayResults,
    loadRatings: state.loadRatings,
    standardLikes: state.standardLikes,
    optimisticLikes: state.optimisticLikes,
    eventEntries: state.eventEntries,
  };

  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ux-latency-lab-session-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  addLog('Exported session snapshot JSON.', 'success');
}

failRate.addEventListener('input', () => {
  failRateLabel.textContent = failRate.value;
});

delayRun.addEventListener('click', runDelayTrial);
delayClear.addEventListener('click', clearDelayTrials);
loadSpinner.addEventListener('click', () => runLoadingScenario('spinner'));
loadSkeleton.addEventListener('click', () => runLoadingScenario('skeleton'));
loadingClear.addEventListener('click', clearRatings);
standardAction.addEventListener('click', runStandard);
optimisticAction.addEventListener('click', runOptimistic);
exportSessionButton.addEventListener('click', exportSessionData);
resetSessionButton.addEventListener('click', resetSession);

renderRatingButtons();
renderDelayResults();
renderLoadingSummary();
syncLikeCounters();
renderEventLog();
addLog('Latency lab initialized from local session storage.', 'success');
