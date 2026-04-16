const delayInput = document.getElementById('delay-input');
const delayRun = document.getElementById('delay-run');
const delayClear = document.getElementById('delay-clear');
const benchmarkProfilesButton = document.getElementById('benchmark-profiles');
const delayStatus = document.getElementById('delay-status');
const delayChart = document.getElementById('delay-chart');
const delaySummary = document.getElementById('delay-summary');
const delayP50 = document.getElementById('delay-p50');
const delayP75 = document.getElementById('delay-p75');
const delayP95 = document.getElementById('delay-p95');
const delaySlowest = document.getElementById('delay-slowest');
const networkProfile = document.getElementById('network-profile');
const profileBenchmarkBody = document.getElementById('profile-benchmark-body');

const loadSpinner = document.getElementById('load-spinner');
const loadSkeleton = document.getElementById('load-skeleton');
const loadingClear = document.getElementById('loading-clear');
const loadingStage = document.getElementById('loading-stage');
const ratingRow = document.getElementById('rating-row');
const ratingButtons = document.getElementById('rating-buttons');
const loadingSummary = document.getElementById('loading-summary');
const labInsights = document.getElementById('lab-insights');
const sessionMemo = document.getElementById('session-memo');
const policyScorecard = document.getElementById('policy-scorecard');

const failRate = document.getElementById('fail-rate');
const failRateLabel = document.getElementById('fail-rate-label');
const standardLikesEl = document.getElementById('standard-likes');
const optimisticLikesEl = document.getElementById('optimistic-likes');
const standardAction = document.getElementById('standard-action');
const optimisticAction = document.getElementById('optimistic-action');
const standardStatus = document.getElementById('standard-status');
const optimisticStatus = document.getElementById('optimistic-status');
const eventLog = document.getElementById('event-log');
const optimisticMetrics = document.getElementById('optimistic-metrics');
const optimisticRecommendation = document.getElementById('optimistic-recommendation');
const releaseBoard = document.getElementById('release-board');
const budgetCoach = document.getElementById('budget-coach');
const latencyPosture = document.getElementById('latency-posture');
const launchChecklist = document.getElementById('launch-checklist');
const exportSessionButton = document.getElementById('export-session');
const copyReportButton = document.getElementById('copy-report');
const importSessionButton = document.getElementById('import-session');
const importFileInput = document.getElementById('import-file');
const resetSessionButton = document.getElementById('reset-session');
const sweepFailureRatesButton = document.getElementById('sweep-failure-rates');
const failureSweepBody = document.getElementById('failure-sweep-body');

const STORAGE_KEY = 'ux_latency_lab_state_v1';
const profileMap = {
  snappy: { delay: 80, failRate: 5, label: 'Snappy Wi-Fi profile loaded.' },
  mobile: { delay: 180, failRate: 20, label: 'Mobile 5G profile loaded.' },
  degraded: { delay: 420, failRate: 40, label: 'Degraded campus Wi-Fi profile loaded.' },
};

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
    standardRuns: 0,
    standardFailures: 0,
    optimisticRuns: 0,
    optimisticRollbacks: 0,
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
      standardRuns: Number.isFinite(parsed.standardRuns) ? parsed.standardRuns : 0,
      standardFailures: Number.isFinite(parsed.standardFailures) ? parsed.standardFailures : 0,
      optimisticRuns: Number.isFinite(parsed.optimisticRuns) ? parsed.optimisticRuns : 0,
      optimisticRollbacks: Number.isFinite(parsed.optimisticRollbacks) ? parsed.optimisticRollbacks : 0,
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

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
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
    delaySummary.textContent = 'Average measured delay: - | P95: - | Fastest: -';
    delayP50.textContent = '-';
    delayP75.textContent = '-';
    delayP95.textContent = '-';
    delaySlowest.textContent = '-';
    renderSessionMemo();
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

  const avg = average(state.delayResults);
  const p50 = percentile(state.delayResults, 50);
  const p75 = percentile(state.delayResults, 75);
  const p95 = percentile(state.delayResults, 95);
  const fastest = Math.min(...state.delayResults);
  const slowest = Math.max(...state.delayResults);
  delaySummary.textContent = `Average measured delay: ${avg.toFixed(1)} ms | P95: ${p95.toFixed(
    1
  )} ms | Fastest: ${fastest.toFixed(1)} ms`;
  delayP50.textContent = `${p50.toFixed(1)} ms`;
  delayP75.textContent = `${p75.toFixed(1)} ms`;
  delayP95.textContent = `${p95.toFixed(1)} ms`;
  delaySlowest.textContent = `${slowest.toFixed(1)} ms`;
  renderSessionMemo();
}

function renderOutcomeStats() {
  const standardSuccessRate =
    state.standardRuns > 0 ? ((state.standardRuns - state.standardFailures) / state.standardRuns) * 100 : null;
  const optimisticConfirmRate =
    state.optimisticRuns > 0 ? ((state.optimisticRuns - state.optimisticRollbacks) / state.optimisticRuns) * 100 : null;

  optimisticMetrics.textContent = `Standard success: ${
    standardSuccessRate === null ? '-' : `${standardSuccessRate.toFixed(0)}%`
  } (${state.standardRuns} runs) | Optimistic confirmation: ${
    optimisticConfirmRate === null ? '-' : `${optimisticConfirmRate.toFixed(0)}%`
  } (${state.optimisticRuns} runs)`;

  if (!state.standardRuns && !state.optimisticRuns) {
    optimisticRecommendation.textContent = 'Run both save flows to compare rollback risk against perceived speed.';
    renderSessionMemo();
    return;
  }

  if ((optimisticConfirmRate ?? 0) >= 85 && (standardSuccessRate ?? 0) >= 85) {
    optimisticRecommendation.textContent = 'High confirmation rates make optimistic UI a strong default for this failure profile.';
    renderSessionMemo();
    return;
  }

  if ((optimisticConfirmRate ?? 100) < 70) {
    optimisticRecommendation.textContent = 'Rollback frequency is high enough that optimistic UI needs stronger affordances or should be avoided.';
    renderSessionMemo();
    return;
  }

  optimisticRecommendation.textContent = 'Optimistic UI is plausible, but the rollback rate still needs careful messaging and undo behavior.';
  renderSessionMemo();
}

function renderLoadingSummary() {
  const spinnerAvg = average(state.loadRatings.spinner);
  const skeletonAvg = average(state.loadRatings.skeleton);

  if (!state.loadRatings.spinner.length && !state.loadRatings.skeleton.length) {
    loadingSummary.textContent = 'No ratings recorded.';
    renderSessionMemo();
    return;
  }

  loadingSummary.textContent = `Avg perceived speed (higher is better): spinner ${spinnerAvg.toFixed(2)}, skeleton ${skeletonAvg.toFixed(
    2
  )}`;
  renderSessionMemo();
}

function renderInsights() {
  const lines = [];

  if (state.delayResults.length) {
    const avg = average(state.delayResults);
    lines.push(avg <= 120 ? 'Delay trials are still in the near-instant range.' : `Average measured delay is ${avg.toFixed(0)} ms, which users will notice.`);
  } else {
    lines.push('Run delay trials to see when responsiveness starts to degrade.');
  }

  if (state.loadRatings.spinner.length || state.loadRatings.skeleton.length) {
    const spinnerAvg = average(state.loadRatings.spinner);
    const skeletonAvg = average(state.loadRatings.skeleton);
    if (spinnerAvg === skeletonAvg) {
      lines.push('Spinner and skeleton ratings are tied so far.');
    } else {
      lines.push(`${skeletonAvg > spinnerAvg ? 'Skeleton screens' : 'Spinners'} currently feel faster in your trial data.`);
    }
  } else {
    lines.push('Rate both loading flows to compare perceived speed.');
  }

  const optimisticEntries = state.eventEntries.filter((entry) => entry.message.includes('Optimistic flow')).length;
  lines.push(
    optimisticEntries
      ? 'Optimistic actions have enough event history to discuss confirmation vs rollback tradeoffs.'
      : 'Trigger standard and optimistic saves to collect event-log evidence for the case study.'
  );

  if (state.optimisticRuns || state.standardRuns) {
    lines.push(
      state.optimisticRollbacks > state.standardFailures
        ? 'Optimistic saves are failing more visibly than standard saves in this session.'
        : 'Optimistic saves are not failing more often than standard saves so far.'
    );
  }

  labInsights.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}

function renderSessionMemo() {
  if (!sessionMemo) return;

  const notes = [];
  if (state.delayResults.length) {
    const avgDelay = average(state.delayResults);
    notes.push(`Interaction threshold: ${recommendedFeedback(avgDelay)} at ${avgDelay.toFixed(0)} ms average.`);
  }

  if (state.loadRatings.spinner.length || state.loadRatings.skeleton.length) {
    const spinnerAvg = average(state.loadRatings.spinner);
    const skeletonAvg = average(state.loadRatings.skeleton);
    const winner = skeletonAvg >= spinnerAvg ? 'Skeleton flow' : 'Spinner flow';
    notes.push(`Perception winner: ${winner} currently feels faster in user ratings.`);
  }

  if (state.standardRuns || state.optimisticRuns) {
    const optimisticRollbackRate =
      state.optimisticRuns > 0 ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : 0;
    notes.push(
      optimisticRollbackRate <= 20
        ? `Optimistic UI memo: rollback risk is ${optimisticRollbackRate.toFixed(0)}%, so optimistic feedback is defensible.`
        : `Optimistic UI memo: rollback risk is ${optimisticRollbackRate.toFixed(0)}%, so rollback messaging needs to be explicit.`
    );
  }

  sessionMemo.innerHTML = notes.length
    ? notes.map((note) => `<p>${note}</p>`).join('')
    : '<p>Run the experiments to produce a session memo.</p>';
  renderPolicyScorecard();
}

function renderPolicyScorecard() {
  if (!policyScorecard) return;

  const cards = [];
  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  cards.push({
    title: 'Action feedback',
    detail:
      avgDelay === null
        ? 'Need delay trials before choosing between silent, inline, or heavy feedback states.'
        : avgDelay <= 120
          ? 'Keep actions lightweight. Immediate state changes should be enough for this latency band.'
          : avgDelay <= 320
            ? 'Use inline pending feedback. Full skeletons are likely overkill at this response time.'
            : 'Escalate to stronger loading affordances or optimistic updates because the delay is noticeable.',
  });

  cards.push({
    title: 'Loading treatment',
    detail:
      spinnerAvg === null && skeletonAvg === null
        ? 'Collect loader ratings before standardizing a waiting pattern.'
        : (skeletonAvg ?? 0) >= (spinnerAvg ?? 0)
          ? 'Skeleton screens are currently winning the perception test in this session.'
          : 'Spinners are currently landing better than skeletons in this session.',
  });

  cards.push({
    title: 'Commit strategy',
    detail:
      rollbackRate === null
        ? 'Run optimistic and standard saves before locking the commit pattern.'
        : rollbackRate <= 20
          ? `Optimistic UI is viable here. Rollback rate is ${rollbackRate.toFixed(0)}%.`
          : `Keep stronger rollback messaging or fall back to standard commits. Rollback rate is ${rollbackRate.toFixed(0)}%.`,
  });

  policyScorecard.innerHTML = cards
    .map((card) => `<p><strong>${card.title}:</strong> ${card.detail}</p>`)
    .join('');
  renderReleaseBoard();
}

function renderReleaseBoard() {
  if (!releaseBoard) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  const delayVerdict =
    avgDelay === null ? 'Collect more delay trials.' : avgDelay <= 180 ? 'Green on action latency.' : avgDelay <= 350 ? 'Yellow: visible lag band.' : 'Red: delay will be felt.';
  const loaderVerdict =
    spinnerAvg === null && skeletonAvg === null
      ? 'No loader preference data yet.'
      : (skeletonAvg ?? 0) >= (spinnerAvg ?? 0)
        ? 'Skeletons are winning perceived-speed ratings.'
        : 'Spinners are winning perceived-speed ratings.';
  const commitVerdict =
    rollbackRate === null
      ? 'No commit-strategy evidence yet.'
      : rollbackRate <= 20
        ? `Optimistic UI looks shippable at ${rollbackRate.toFixed(0)}% rollback risk.`
        : `Rollback risk is ${rollbackRate.toFixed(0)}%, so ship with stronger undo/copy or stay conservative.`;

  releaseBoard.innerHTML = `
    <p><strong>Release Readiness</strong></p>
    <p>${delayVerdict}</p>
    <p>${loaderVerdict}</p>
    <p>${commitVerdict}</p>
  `;
  renderBudgetCoach();
  renderLaunchChecklist();
}

function renderBudgetCoach() {
  if (!budgetCoach) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const p95Delay = state.delayResults.length ? percentile(state.delayResults, 95) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;
  const loaderWinner =
    spinnerAvg === null && skeletonAvg === null
      ? 'Collect loader ratings before standardizing a waiting treatment.'
      : (skeletonAvg ?? 0) >= (spinnerAvg ?? 0)
        ? 'Skeletons are the safer default for this session.'
        : 'Spinners are currently landing better than skeletons.';

  const lines = [];
  lines.push(
    avgDelay === null
      ? 'Latency budget coach: run delay trials to establish the response-time band.'
      : `Latency budget coach: average ${avgDelay.toFixed(0)} ms and P95 ${p95Delay.toFixed(0)} ms place this flow in the ${recommendedFeedback(avgDelay).toLowerCase()} band.`
  );
  lines.push(loaderWinner);
  lines.push(
    rollbackRate === null
      ? 'Commit strategy still needs evidence from both optimistic and standard runs.'
      : rollbackRate <= 20
        ? `Optimistic updates are supportable here because rollback risk is ${rollbackRate.toFixed(0)}%.`
        : `Rollback risk is ${rollbackRate.toFixed(0)}%, so optimistic updates need undo messaging or should stay limited.`
  );

  budgetCoach.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
  renderLatencyPosture();
}

function renderLatencyPosture() {
  if (!latencyPosture) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const p95Delay = state.delayResults.length ? percentile(state.delayResults, 95) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  if (avgDelay === null && rollbackRate === null && skeletonAvg === null && spinnerAvg === null) {
    latencyPosture.innerHTML = '<p><strong>Latency posture:</strong> Needs evidence. Run the three lab tracks to produce an operating posture.</p>';
    return;
  }

  const posture =
    avgDelay !== null && avgDelay <= 180 && (rollbackRate === null || rollbackRate <= 20)
      ? 'Tight'
      : avgDelay !== null && avgDelay <= 320 && (rollbackRate === null || rollbackRate <= 30)
        ? 'Manageable'
        : 'Fragile';
  const loaderWinner =
    skeletonAvg === null && spinnerAvg === null
      ? 'No loader preference evidence yet.'
      : (skeletonAvg ?? 0) >= (spinnerAvg ?? 0)
        ? 'Skeletons currently carry the wait-state better.'
        : 'Spinners currently feel lighter than skeletons.';
  const rollbackNote =
    rollbackRate === null
      ? 'Optimistic rollback risk still needs data.'
      : rollbackRate <= 20
        ? `Rollback risk is contained at ${rollbackRate.toFixed(0)}%.`
        : `Rollback risk has climbed to ${rollbackRate.toFixed(0)}%, so failure copy matters.`;

  latencyPosture.innerHTML = `
    <p><strong>Latency posture: ${posture}</strong></p>
    <p>${avgDelay === null ? 'Delay band still needs more trials.' : `Measured average ${avgDelay.toFixed(0)} ms with P95 ${p95Delay.toFixed(0)} ms.`}</p>
    <p>${loaderWinner}</p>
    <p>${rollbackNote}</p>
  `;
}

function renderLaunchChecklist() {
  if (!launchChecklist) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  const checks = [
    {
      label: 'Interaction budget',
      status: avgDelay === null ? 'Needs data' : avgDelay <= 180 ? 'Pass' : avgDelay <= 320 ? 'Watch' : 'Fail',
      detail:
        avgDelay === null
          ? 'Run more delay trials before choosing a default feedback tier.'
          : avgDelay <= 180
            ? 'Current latency is inside the quick-response band.'
            : avgDelay <= 320
              ? 'Latency is visible, so inline pending feedback should be mandatory.'
              : 'Latency is heavy enough that stronger loader or optimistic treatment is needed.',
    },
    {
      label: 'Loader preference',
      status: spinnerAvg === null && skeletonAvg === null ? 'Needs data' : 'Pass',
      detail:
        spinnerAvg === null && skeletonAvg === null
          ? 'No perception ratings yet.'
          : `${(skeletonAvg ?? 0) >= (spinnerAvg ?? 0) ? 'Skeleton' : 'Spinner'} flow is winning the current rating sample.`,
    },
    {
      label: 'Optimistic rollback risk',
      status: rollbackRate === null ? 'Needs data' : rollbackRate <= 20 ? 'Pass' : rollbackRate <= 35 ? 'Watch' : 'Fail',
      detail:
        rollbackRate === null
          ? 'Run both commit flows before standardizing on optimistic updates.'
          : rollbackRate <= 20
            ? `Rollback risk is ${rollbackRate.toFixed(0)}%, which is acceptable for optimistic UI.`
            : rollbackRate <= 35
              ? `Rollback risk is ${rollbackRate.toFixed(0)}%; ship only with clear undo or retry messaging.`
              : `Rollback risk is ${rollbackRate.toFixed(0)}%; standard confirmation is safer.`,
    },
  ];

  launchChecklist.innerHTML = checks
    .map((check) => `<p><strong>${check.label} (${check.status}):</strong> ${check.detail}</p>`)
    .join('');
}

function recommendedFeedback(avgDelay) {
  if (avgDelay <= 120) return 'Immediate state only';
  if (avgDelay <= 320) return 'Inline pending state';
  return 'Skeleton or optimistic UI';
}

function optimisticRecommendationForRate(rollbackRate) {
  if (rollbackRate <= 15) return 'Optimistic UI is viable';
  if (rollbackRate <= 30) return 'Use optimistic UI with explicit undo';
  return 'Prefer standard confirmation';
}

async function benchmarkProfiles() {
  benchmarkProfilesButton.disabled = true;
  delayStatus.textContent = 'Benchmarking built-in profiles...';

  const rows = [];
  for (const [key, profile] of Object.entries(profileMap)) {
    const samples = [];

    for (let index = 0; index < 4; index += 1) {
      const start = performance.now();
      await new Promise((resolve) => setTimeout(resolve, profile.delay));
      samples.push(performance.now() - start);
    }

    const avg = average(samples);
    const p95 = percentile(samples, 95);
    rows.push({
      label: key === 'snappy' ? 'Snappy Wi-Fi' : key === 'mobile' ? 'Mobile 5G' : 'Degraded campus Wi-Fi',
      avg,
      p95,
      feedback: recommendedFeedback(avg),
    });
  }

  profileBenchmarkBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.label}</td>
          <td>${row.avg.toFixed(1)} ms</td>
          <td>${row.p95.toFixed(1)} ms</td>
          <td>${row.feedback}</td>
        </tr>
      `
    )
    .join('');

  delayStatus.textContent = 'Profile benchmark complete.';
  benchmarkProfilesButton.disabled = false;
}

function sweepFailureRates() {
  if (!failureSweepBody) return;

  const sampleSize = 200;
  const rates = [0, 10, 25, 40, 60];
  const rows = rates.map((rate) => {
    let rollbacks = 0;
    for (let index = 0; index < sampleSize; index += 1) {
      if (Math.random() * 100 < rate) {
        rollbacks += 1;
      }
    }

    const rollbackRate = (rollbacks / sampleSize) * 100;
    return {
      rate,
      confirmed: `${(100 - rollbackRate).toFixed(0)}%`,
      rollback: `${rollbackRate.toFixed(0)}%`,
      recommendation: optimisticRecommendationForRate(rollbackRate),
    };
  });

  failureSweepBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.rate}%</td>
          <td>${row.confirmed}</td>
          <td>${row.rollback}</td>
          <td>${row.recommendation}</td>
        </tr>
      `
    )
    .join('');

  addLog('Failure-rate sweep completed for optimistic UI guidance.', 'success');
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
  renderInsights();
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
      renderInsights();
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
  renderInsights();
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
  state.standardRuns += 1;

  try {
    const response = await simulateServerCall();
    state.standardLikes += 1;
    syncLikeCounters();
    standardStatus.textContent = `Success in ${response.latency.toFixed(0)} ms.`;
    addLog('Standard flow committed like after server confirmation.', 'success');
  } catch (error) {
    state.standardFailures += 1;
    standardStatus.textContent = 'Request failed. UI state unchanged.';
    addLog('Standard flow request failed; no UI update applied.', 'fail');
  } finally {
    renderOutcomeStats();
    renderInsights();
    saveState();
    standardPending = false;
    standardAction.disabled = false;
  }
}

async function runOptimistic() {
  if (optimisticPending) return;

  optimisticPending = true;
  optimisticAction.disabled = true;
  state.optimisticRuns += 1;

  state.optimisticLikes += 1;
  syncLikeCounters();
  optimisticStatus.textContent = 'Updated immediately. Syncing with server...';

  try {
    const response = await simulateServerCall();
    optimisticStatus.textContent = `Confirmed in ${response.latency.toFixed(0)} ms.`;
    addLog('Optimistic flow confirmed successfully.', 'success');
  } catch (error) {
    state.optimisticLikes -= 1;
    state.optimisticRollbacks += 1;
    syncLikeCounters();
    optimisticStatus.textContent = 'Server rejected update. Rolled back.';
    addLog('Optimistic flow rolled back after server failure.', 'fail');
  } finally {
    renderOutcomeStats();
    renderInsights();
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
  state.standardRuns = fresh.standardRuns;
  state.standardFailures = fresh.standardFailures;
  state.optimisticRuns = fresh.optimisticRuns;
  state.optimisticRollbacks = fresh.optimisticRollbacks;
  state.eventEntries = fresh.eventEntries;

  standardStatus.textContent = 'Idle';
  optimisticStatus.textContent = 'Idle';
  delayStatus.textContent = 'No trials yet.';
  loadingStage.innerHTML = '<p>Run a loading mode to begin.</p>';
  ratingRow.classList.add('hidden');
  currentLoadType = null;

  renderDelayResults();
  renderLoadingSummary();
  renderOutcomeStats();
  renderInsights();
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
    standardRuns: state.standardRuns,
    standardFailures: state.standardFailures,
    optimisticRuns: state.optimisticRuns,
    optimisticRollbacks: state.optimisticRollbacks,
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

function buildSessionReport() {
  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const p95Delay = state.delayResults.length ? percentile(state.delayResults, 95) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const optimisticRollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;
  const standardFailureRate = state.standardRuns ? (state.standardFailures / state.standardRuns) * 100 : null;

  return [
    '# UX Latency Lab Session Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Interaction Delay',
    avgDelay === null
      ? '- No delay trials recorded yet.'
      : `- Average: ${avgDelay.toFixed(1)} ms | P95: ${p95Delay.toFixed(1)} ms | Recommendation: ${recommendedFeedback(avgDelay)}`,
    '',
    '## Loading Perception',
    spinnerAvg === null && skeletonAvg === null
      ? '- No loading ratings recorded yet.'
      : `- Spinner avg: ${spinnerAvg === null ? '-' : spinnerAvg.toFixed(2)} | Skeleton avg: ${skeletonAvg === null ? '-' : skeletonAvg.toFixed(2)}`,
    '',
    '## Optimistic UI',
    state.standardRuns || state.optimisticRuns
      ? `- Standard failure rate: ${standardFailureRate === null ? '-' : `${standardFailureRate.toFixed(0)}%`} | Optimistic rollback rate: ${
          optimisticRollbackRate === null ? '-' : `${optimisticRollbackRate.toFixed(0)}%`
        }`
      : '- No optimistic-vs-standard trials recorded yet.',
    '',
    '## Current Verdict',
    `- ${optimisticRecommendation.textContent}`,
  ].join('\n');
}

function importSessionData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      state.delayResults = Array.isArray(parsed.delayResults) ? parsed.delayResults.slice(0, 20) : [];
      state.loadRatings = {
        spinner: Array.isArray(parsed.loadRatings?.spinner) ? parsed.loadRatings.spinner.slice(0, 40) : [],
        skeleton: Array.isArray(parsed.loadRatings?.skeleton) ? parsed.loadRatings.skeleton.slice(0, 40) : [],
      };
      state.standardLikes = Number.isFinite(parsed.standardLikes) ? parsed.standardLikes : 0;
      state.optimisticLikes = Number.isFinite(parsed.optimisticLikes) ? parsed.optimisticLikes : 0;
      state.standardRuns = Number.isFinite(parsed.standardRuns) ? parsed.standardRuns : 0;
      state.standardFailures = Number.isFinite(parsed.standardFailures) ? parsed.standardFailures : 0;
      state.optimisticRuns = Number.isFinite(parsed.optimisticRuns) ? parsed.optimisticRuns : 0;
      state.optimisticRollbacks = Number.isFinite(parsed.optimisticRollbacks) ? parsed.optimisticRollbacks : 0;
      state.eventEntries = Array.isArray(parsed.eventEntries) ? parsed.eventEntries.slice(0, 14) : [];

      renderDelayResults();
      renderLoadingSummary();
      renderOutcomeStats();
      renderInsights();
      syncLikeCounters();
      renderEventLog();
      saveState();
      addLog('Imported session snapshot JSON.', 'success');
    } catch (error) {
      addLog('Import failed: invalid JSON format.', 'fail');
    }
  };
  reader.readAsText(file);
}

failRate.addEventListener('input', () => {
  failRateLabel.textContent = failRate.value;
});
networkProfile.addEventListener('change', () => {
  const profile = profileMap[networkProfile.value];
  if (!profile) return;
  delayInput.value = String(profile.delay);
  failRate.value = String(profile.failRate);
  failRateLabel.textContent = String(profile.failRate);
  delayStatus.textContent = profile.label;
});

delayRun.addEventListener('click', runDelayTrial);
delayClear.addEventListener('click', clearDelayTrials);
benchmarkProfilesButton.addEventListener('click', benchmarkProfiles);
loadSpinner.addEventListener('click', () => runLoadingScenario('spinner'));
loadSkeleton.addEventListener('click', () => runLoadingScenario('skeleton'));
loadingClear.addEventListener('click', clearRatings);
standardAction.addEventListener('click', runStandard);
optimisticAction.addEventListener('click', runOptimistic);
exportSessionButton.addEventListener('click', exportSessionData);
copyReportButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildSessionReport());
    addLog('Copied session report to clipboard.', 'success');
  } catch (error) {
    addLog('Clipboard copy failed while building the session report.', 'fail');
  }
});
importSessionButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', () => {
  const file = importFileInput.files?.[0];
  if (!file) return;
  importSessionData(file);
  importFileInput.value = '';
});
resetSessionButton.addEventListener('click', resetSession);
sweepFailureRatesButton.addEventListener('click', sweepFailureRates);

renderRatingButtons();
renderDelayResults();
renderLoadingSummary();
renderOutcomeStats();
renderInsights();
syncLikeCounters();
renderEventLog();
addLog('Latency lab initialized from local session storage.', 'success');
