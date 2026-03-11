const delayInput = document.getElementById('delay-input');
const delayRun = document.getElementById('delay-run');
const delayStatus = document.getElementById('delay-status');
const delayChart = document.getElementById('delay-chart');
const delaySummary = document.getElementById('delay-summary');

const loadSpinner = document.getElementById('load-spinner');
const loadSkeleton = document.getElementById('load-skeleton');
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

const delayResults = [];
const loadRatings = {
  spinner: [],
  skeleton: [],
};

let currentLoadType = null;
let standardLikes = 0;
let optimisticLikes = 0;
let standardPending = false;
let optimisticPending = false;

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addLog(message, type) {
  const entry = document.createElement('li');
  entry.className = type || '';
  entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  eventLog.prepend(entry);

  while (eventLog.children.length > 14) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function renderDelayResults() {
  if (!delayResults.length) {
    delayChart.innerHTML = '';
    delaySummary.textContent = 'Average measured delay: -';
    return;
  }

  const maxValue = Math.max(...delayResults);
  delayChart.innerHTML = '';

  delayResults.forEach((result) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(8, (result / maxValue) * 100)}%`;
    bar.title = `${result.toFixed(0)} ms`;
    delayChart.appendChild(bar);
  });

  delaySummary.textContent = `Average measured delay: ${average(delayResults).toFixed(1)} ms`;
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

  delayResults.push(measured);
  if (delayResults.length > 16) delayResults.shift();

  delayStatus.textContent = `Measured response: ${measured.toFixed(1)} ms`;
  renderDelayResults();
  delayRun.disabled = false;
}

function renderRatingButtons() {
  ratingButtons.innerHTML = '';

  for (let score = 1; score <= 5; score += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(score);
    button.addEventListener('click', () => {
      if (!currentLoadType) return;
      loadRatings[currentLoadType].push(score);

      const spinnerAvg = average(loadRatings.spinner);
      const skeletonAvg = average(loadRatings.skeleton);
      loadingSummary.textContent = `Avg perceived speed (higher is better): spinner ${spinnerAvg.toFixed(
        2
      )}, skeleton ${skeletonAvg.toFixed(2)}`;

      addLog(`${currentLoadType} flow rated ${score}/5`, 'success');
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
    standardLikes += 1;
    standardLikesEl.textContent = String(standardLikes);
    standardStatus.textContent = `Success in ${response.latency.toFixed(0)} ms.`;
    addLog('Standard flow committed like after server confirmation.', 'success');
  } catch (error) {
    standardStatus.textContent = 'Request failed. UI state unchanged.';
    addLog('Standard flow request failed; no UI update applied.', 'fail');
  } finally {
    standardPending = false;
    standardAction.disabled = false;
  }
}

async function runOptimistic() {
  if (optimisticPending) return;

  optimisticPending = true;
  optimisticAction.disabled = true;

  optimisticLikes += 1;
  optimisticLikesEl.textContent = String(optimisticLikes);
  optimisticStatus.textContent = 'Updated immediately. Syncing with server...';

  try {
    const response = await simulateServerCall();
    optimisticStatus.textContent = `Confirmed in ${response.latency.toFixed(0)} ms.`;
    addLog('Optimistic flow confirmed successfully.', 'success');
  } catch (error) {
    optimisticLikes -= 1;
    optimisticLikesEl.textContent = String(optimisticLikes);
    optimisticStatus.textContent = 'Server rejected update. Rolled back.';
    addLog('Optimistic flow rolled back after server failure.', 'fail');
  } finally {
    optimisticPending = false;
    optimisticAction.disabled = false;
  }
}

failRate.addEventListener('input', () => {
  failRateLabel.textContent = failRate.value;
});

delayRun.addEventListener('click', runDelayTrial);
loadSpinner.addEventListener('click', () => runLoadingScenario('spinner'));
loadSkeleton.addEventListener('click', () => runLoadingScenario('skeleton'));
standardAction.addEventListener('click', runStandard);
optimisticAction.addEventListener('click', runOptimistic);

renderRatingButtons();
renderDelayResults();
addLog('Latency lab initialized.', 'success');