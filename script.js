const delayInput = document.getElementById('delay-input');
const delayRun = document.getElementById('delay-run');
const delayClear = document.getElementById('delay-clear');
const benchmarkProfilesButton = document.getElementById('benchmark-profiles');
const delayStatus = document.getElementById('delay-status');
const delayChart = document.getElementById('delay-chart');
const delaySummary = document.getElementById('delay-summary');
const delayVolatility = document.getElementById('delay-volatility');
const latencyBudgetBoard = document.getElementById('latency-budget-board');
const delayP50 = document.getElementById('delay-p50');
const delayP75 = document.getElementById('delay-p75');
const delayP95 = document.getElementById('delay-p95');
const delaySlowest = document.getElementById('delay-slowest');
const networkProfile = document.getElementById('network-profile');
const profileBenchmarkBody = document.getElementById('profile-benchmark-body');
const profileBenchmarkSummary = document.getElementById('profile-benchmark-summary');

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
const interventionLadder = document.getElementById('intervention-ladder');
const latencyPosture = document.getElementById('latency-posture');
const evidenceCoverage = document.getElementById('evidence-coverage');
const experimentDebt = document.getElementById('experiment-debt');
const confidenceBoard = document.getElementById('confidence-board');
const rollbackToleranceBoard = document.getElementById('rollback-tolerance-board');
const rollbackRehearsalBoard = document.getElementById('rollback-rehearsal-board');
const launchChecklist = document.getElementById('launch-checklist');
const shipGateBoard = document.getElementById('ship-gate-board');
const nextExperimentBoard = document.getElementById('next-experiment-board');
const decisionLedgerBoard = document.getElementById('decision-ledger-board');
const interactionContractBoard = document.getElementById('interaction-contract-board');
const trustBudgetBoard = document.getElementById('trust-budget-board');
const frictionBudgetBoard = document.getElementById('friction-budget-board');
const personaBoard = document.getElementById('persona-board');
const exportSessionButton = document.getElementById('export-session');
const copyReportButton = document.getElementById('copy-report');
const copySessionLinkButton = document.getElementById('copy-session-link');
const importSessionButton = document.getElementById('import-session');
const importFileInput = document.getElementById('import-file');
const resetSessionButton = document.getElementById('reset-session');
const sweepFailureRatesButton = document.getElementById('sweep-failure-rates');
const failureSweepBody = document.getElementById('failure-sweep-body');
const failureSweepSummary = document.getElementById('failure-sweep-summary');

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
  syncUrlState();
}

function syncUrlState() {
  const params = new URLSearchParams(window.location.search);
  params.set('profile', networkProfile.value);
  params.set('delay', delayInput.value);
  params.set('failRate', failRate.value);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function hydrateFromUrlState() {
  const params = new URLSearchParams(window.location.search);
  const requestedProfile = params.get('profile');
  if (requestedProfile && profileMap[requestedProfile]) {
    networkProfile.value = requestedProfile;
  }

  const requestedDelay = Number.parseInt(params.get('delay') || '', 10);
  if (Number.isInteger(requestedDelay) && requestedDelay >= 0 && requestedDelay <= 3000) {
    delayInput.value = String(requestedDelay);
  }

  const requestedFailRate = Number.parseInt(params.get('failRate') || '', 10);
  if (Number.isInteger(requestedFailRate) && requestedFailRate >= 0 && requestedFailRate <= 80) {
    failRate.value = String(requestedFailRate);
    failRateLabel.textContent = String(requestedFailRate);
  }
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

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function renderDelayVolatility() {
  if (!delayVolatility) return;
  if (!state.delayResults.length) {
    delayVolatility.innerHTML = '<p>Run a few trials to see whether latency is merely slow or actually volatile.</p>';
    return;
  }

  const avg = average(state.delayResults);
  const p95 = percentile(state.delayResults, 95);
  const p50 = percentile(state.delayResults, 50);
  const stdev = standardDeviation(state.delayResults);
  const spread = Math.max(...state.delayResults) - Math.min(...state.delayResults);
  const volatility =
    stdev >= 140 || p95 - p50 >= 180 ? 'High volatility' : stdev >= 70 || p95 - p50 >= 90 ? 'Moderate volatility' : 'Low volatility';

  delayVolatility.innerHTML = [
    `<p><strong>${volatility}:</strong> standard deviation ${stdev.toFixed(1)} ms across ${state.delayResults.length} trial${state.delayResults.length === 1 ? '' : 's'}.</p>`,
    `<p><strong>Tail gap:</strong> P95 sits ${(p95 - p50).toFixed(1)} ms above the median, so the slow edge is ${p95 - p50 >= 150 ? 'material enough to justify stronger pending feedback.' : 'present but still fairly contained.'}</p>`,
    `<p><strong>Range:</strong> fastest-to-slowest spread is ${spread.toFixed(1)} ms around a ${avg.toFixed(1)} ms average.</p>`,
  ].join('');
}

function renderLatencyBudgetBoard() {
  if (!latencyBudgetBoard) return;
  if (!state.delayResults.length) {
    latencyBudgetBoard.innerHTML = '<p>Run trials to see which user-facing latency budgets the current profile is breaking.</p>';
    return;
  }

  const p50 = percentile(state.delayResults, 50);
  const p95 = percentile(state.delayResults, 95);
  const budgets = [
    { label: 'Instant feedback', threshold: 100 },
    { label: 'Feels responsive', threshold: 250 },
    { label: 'Needs explicit loading', threshold: 500 },
  ];
  const breaches = budgets.filter((budget) => p95 > budget.threshold);
  const posture =
    p95 <= 100 ? 'Instant-tier' :
    p95 <= 250 ? 'Responsive-tier' :
    p95 <= 500 ? 'Loader-tier' :
    'Delay-risk tier';

  latencyBudgetBoard.innerHTML = [
    `<p><strong>${posture}:</strong> median ${p50.toFixed(1)} ms, P95 ${p95.toFixed(1)} ms.</p>`,
    `<p><strong>Budget breaches:</strong> ${breaches.length ? breaches.map((budget) => `${budget.label} (> ${budget.threshold} ms)`).join(', ') : 'none'}.</p>`,
    `<p><strong>Product cue:</strong> ${p95 > 500 ? 'Treat this flow as explicitly latent and design around acknowledgement plus progress.' : p95 > 250 ? 'Keep the interaction lightweight, but show a stronger loader before users wonder if the action stuck.' : 'The profile stays inside common response budgets, so micro-feedback can stay minimal.'}</p>`,
  ].join('');
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
    renderDelayVolatility();
    renderLatencyBudgetBoard();
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
  renderDelayVolatility();
  renderLatencyBudgetBoard();
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
  renderEvidenceCoverage();
  renderExperimentDebt();
  renderConfidenceBoard();
  renderRollbackToleranceBoard();
  renderRollbackRehearsalBoard();
  renderInterventionLadder();
  renderShipGateBoard();
  renderNextExperimentBoard();
  renderDecisionLedgerBoard();
  renderInteractionContractBoard();
  renderTrustBudgetBoard();
  renderFrictionBudgetBoard();
  renderPersonaBoard();
}

function renderShipGateBoard() {
  if (!shipGateBoard) return;

  const hasDelayEvidence = state.delayResults.length >= 3;
  const hasLoadingEvidence = state.loadRatings.spinner.length + state.loadRatings.skeleton.length >= 2;
  const hasRollbackEvidence = state.standardRuns + state.optimisticRuns >= 4;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : 0;

  if (!hasDelayEvidence || !hasLoadingEvidence || !hasRollbackEvidence) {
    shipGateBoard.innerHTML = '<p><strong>Ship gate:</strong> not ready. Close the biggest evidence gap before treating this session as product policy.</p>';
    return;
  }

  const p95 = percentile(state.delayResults, 95);
  if (p95 <= 250 && rollbackRate <= 25) {
    shipGateBoard.innerHTML = '<p><strong>Ship gate:</strong> ready. Tail latency stays responsive and optimistic rollback pressure is still controlled.</p>';
  } else if (p95 <= 500 && rollbackRate <= 40) {
    shipGateBoard.innerHTML = '<p><strong>Ship gate:</strong> conditional. The flow is only defensible with stronger acknowledgement and a clearer rollback story.</p>';
  } else {
    shipGateBoard.innerHTML = '<p><strong>Ship gate:</strong> hold. Tail latency or rollback pain is still too high for a confident launch recommendation.</p>';
  }
}

function renderInterventionLadder() {
  if (!interventionLadder) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;

  const loaderPreference =
    spinnerAvg === null && skeletonAvg === null
      ? 'Collect both loader ratings before locking a default.'
      : skeletonAvg > spinnerAvg
        ? 'Prefer skeleton states once the wait becomes visible.'
        : 'A simple spinner is still acceptable for this session profile.';

  const baseTier =
    avgDelay === null
      ? 'Need delay trials before choosing a feedback tier.'
      : avgDelay <= 120
        ? 'Tier 1: instant acknowledgement only.'
        : avgDelay <= 260
          ? 'Tier 2: acknowledge immediately, then show progress if the wait continues.'
          : 'Tier 3: commit to visible loading feedback from the start.';

  const optimisticTier =
    rollbackRate === null
      ? 'Need both standard and optimistic runs before deciding on optimistic commits.'
      : rollbackRate <= 15
        ? 'Optimistic commits are acceptable if undo language stays visible.'
        : rollbackRate <= 30
          ? 'Use optimistic UI only for low-cost actions with obvious rollback messaging.'
          : 'Avoid optimistic commits here; rollback pressure is too visible.';

  interventionLadder.innerHTML = `<p><strong>Intervention ladder</strong></p><p>${baseTier}</p><p>${loaderPreference}</p><p>${optimisticTier}</p>`;
}

function renderEvidenceCoverage() {
  if (!evidenceCoverage) return;

  const delayReady = state.delayResults.length >= 3;
  const loaderReady = state.loadRatings.spinner.length > 0 && state.loadRatings.skeleton.length > 0;
  const optimisticReady = state.standardRuns > 0 && state.optimisticRuns > 0;
  const covered = [delayReady, loaderReady, optimisticReady].filter(Boolean).length;
  const nextGap = !delayReady
    ? 'Run at least three delay trials.'
    : !loaderReady
      ? 'Rate both spinner and skeleton flows.'
      : !optimisticReady
        ? 'Run both standard and optimistic commits.'
        : 'The session has enough evidence to support a product-facing recommendation.';

  evidenceCoverage.innerHTML = `
    <p><strong>Evidence coverage:</strong> ${covered}/3 lab tracks have enough data.</p>
    <p><strong>Delay trials:</strong> ${delayReady ? 'Ready' : 'Needs more samples'} (${state.delayResults.length} recorded).</p>
    <p><strong>Loader ratings:</strong> ${loaderReady ? 'Ready' : 'Incomplete'} (spinner ${state.loadRatings.spinner.length}, skeleton ${state.loadRatings.skeleton.length}).</p>
    <p><strong>Commit strategy:</strong> ${optimisticReady ? 'Ready' : 'Incomplete'} (standard ${state.standardRuns}, optimistic ${state.optimisticRuns}).</p>
    <p><strong>Next gap:</strong> ${nextGap}</p>
  `;
}

function renderExperimentDebt() {
  if (!experimentDebt) return;

  const debts = [];
  if (state.delayResults.length > 0 && state.delayResults.length < 5) {
    debts.push(`add ${5 - state.delayResults.length} more delay trial${5 - state.delayResults.length === 1 ? '' : 's'} before trusting tail latency`);
  }
  if (state.loadRatings.spinner.length !== state.loadRatings.skeleton.length) {
    debts.push('balance spinner and skeleton ratings so the loader comparison is fair');
  }
  if (state.optimisticRuns > 0 && state.standardRuns === 0) {
    debts.push('run the standard flow once to preserve a baseline');
  }
  if (state.standardRuns > 0 && state.optimisticRuns === 0) {
    debts.push('run the optimistic flow once to measure rollback pressure');
  }

  experimentDebt.innerHTML = debts.length
    ? `<p><strong>Experiment debt:</strong> ${debts.join('; ')}.</p>`
    : '<p><strong>Experiment debt:</strong> no obvious measurement gaps in the current session.</p>';
}

function renderConfidenceBoard() {
  if (!confidenceBoard) return;

  const delaySamples = state.delayResults.length;
  const loaderSamples = state.loadRatings.spinner.length + state.loadRatings.skeleton.length;
  const commitSamples = state.standardRuns + state.optimisticRuns;
  const avgDelay = delaySamples ? average(state.delayResults) : null;
  const p95Delay = delaySamples ? percentile(state.delayResults, 95) : null;
  const delayVariance = avgDelay === null || p95Delay === null ? 0 : Math.max(0, p95Delay - avgDelay);
  const balancedLoaders = Math.abs(state.loadRatings.spinner.length - state.loadRatings.skeleton.length) <= 1;

  const evidenceScore = [
    delaySamples >= 5,
    loaderSamples >= 4 && balancedLoaders,
    commitSamples >= 6 && state.standardRuns > 0 && state.optimisticRuns > 0,
  ].filter(Boolean).length;

  const confidence =
    evidenceScore === 3 && delayVariance <= 90
      ? 'High'
      : evidenceScore >= 2
        ? 'Medium'
        : 'Low';

  const cue =
    confidence === 'High'
      ? 'The current recommendation set is sturdy enough to use in a product-facing walkthrough.'
      : confidence === 'Medium'
        ? 'The session is directionally useful, but one more balanced pass would make the guidance easier to defend.'
        : 'Treat the current recommendations as exploratory until the missing tracks are filled in.';

  confidenceBoard.innerHTML = `
    <p><strong>Evidence confidence: ${confidence}</strong></p>
    <p><strong>Delay samples:</strong> ${delaySamples} (${avgDelay === null ? 'no variance read yet' : `P95 spread ${delayVariance.toFixed(0)} ms`}).</p>
    <p><strong>Loader balance:</strong> spinner ${state.loadRatings.spinner.length}, skeleton ${state.loadRatings.skeleton.length}${balancedLoaders ? '' : ' - rebalance the rating counts'}.</p>
    <p><strong>Commit coverage:</strong> standard ${state.standardRuns}, optimistic ${state.optimisticRuns}.</p>
    <p><strong>Cue:</strong> ${cue}</p>
  `;
}

function renderRollbackToleranceBoard() {
  if (!rollbackToleranceBoard) return;

  if (!state.optimisticRuns) {
    rollbackToleranceBoard.innerHTML = '<p><strong>Rollback tolerance:</strong> run optimistic saves to see whether the current failure profile is still socially survivable.</p>';
    return;
  }

  const rollbackRate = (state.optimisticRollbacks / state.optimisticRuns) * 100;
  const label =
    rollbackRate <= 10 ? 'Comfortable' : rollbackRate <= 25 ? 'Guarded' : 'Fragile';
  const cue =
    rollbackRate <= 10
      ? 'Rollback pressure is low enough that optimistic UI can stay default if the confirmation language is clear.'
      : rollbackRate <= 25
        ? 'Optimistic UI still works, but only with explicit undo and visible pending state.'
        : 'Rollback pressure is high enough that standard confirmation should retake the default for risky actions.';

  rollbackToleranceBoard.innerHTML = `
    <p><strong>Rollback tolerance: ${label}</strong></p>
    <p><strong>Observed rollback rate:</strong> ${rollbackRate.toFixed(1)}% across ${state.optimisticRuns} optimistic run${state.optimisticRuns === 1 ? '' : 's'}.</p>
    <p><strong>Policy cue:</strong> ${cue}</p>
  `;
}

function renderRollbackRehearsalBoard() {
  if (!rollbackRehearsalBoard) return;

  if (!state.optimisticRuns) {
    rollbackRehearsalBoard.innerHTML = '<p>No optimistic runs yet. Trigger a few saves before treating rollback copy as a real rehearsal burden.</p>';
    return;
  }

  const rollbackRate = (state.optimisticRollbacks / Math.max(1, state.optimisticRuns)) * 100;
  const recentFailures = state.eventEntries.filter((entry) => entry.type === 'fail').length;
  const label =
    rollbackRate >= 35
      ? 'High rehearsal burden'
      : rollbackRate >= 18
        ? 'Moderate rehearsal burden'
        : 'Light rehearsal burden';

  rollbackRehearsalBoard.innerHTML = `
    <p><strong>Rollback rehearsal: ${label}</strong></p>
    <p><strong>Observed rollback rate:</strong> ${rollbackRate.toFixed(0)}% across ${state.optimisticRuns} optimistic run${state.optimisticRuns === 1 ? '' : 's'}.</p>
    <p><strong>Failure-copy pressure:</strong> ${recentFailures} recent fail log${recentFailures === 1 ? '' : 's'} mean the team is rehearsing apology and recovery, not just speed.</p>
    <p><strong>Cue:</strong> ${rollbackRate >= 25 ? 'If this shipped, undo language and post-failure confirmation would be part of the core interaction contract.' : 'Rollback remains a contingency path, not the main user narrative.'}</p>
  `;
}

function renderNextExperimentBoard() {
  if (!nextExperimentBoard) return;

  const missingDelay = state.delayResults.length < 5;
  const missingLoader = state.loadRatings.spinner.length === 0 || state.loadRatings.skeleton.length === 0;
  const missingCommit = state.standardRuns < 3 || state.optimisticRuns < 3;
  let nextStep = 'Repeat the harshest profile once more and then export the session report.';

  if (missingDelay) {
    nextStep = `Run ${5 - state.delayResults.length} more delay trial${5 - state.delayResults.length === 1 ? '' : 's'} to stabilize the latency band read.`;
  } else if (missingLoader) {
    nextStep = 'Collect at least one spinner and one skeleton rating so the loader recommendation is earned, not guessed.';
  } else if (missingCommit) {
    nextStep = 'Balance optimistic and standard save runs so rollback guidance is backed by both sides of the tradeoff.';
  }

  nextExperimentBoard.innerHTML = `
    <p><strong>Next experiment</strong></p>
    <p>${nextStep}</p>
    <p><strong>Why this first:</strong> It closes the biggest remaining hole in the session evidence chain.</p>
  `;
}

function renderDecisionLedgerBoard() {
  if (!decisionLedgerBoard) return;

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  const rows = [
    {
      label: 'Acknowledge timing',
      state:
        avgDelay === null
          ? 'Unproven'
          : avgDelay <= 120
            ? 'Proven'
            : avgDelay <= 260
              ? 'Conditional'
              : 'Proven',
      detail:
        avgDelay === null
          ? 'Need delay trials before locking an acknowledgement tier.'
          : avgDelay <= 120
            ? 'Silent or near-silent acknowledgement is defensible.'
            : avgDelay <= 260
              ? 'A subtle pending state is warranted if the wait keeps stretching.'
              : 'Visible acknowledgement should start immediately.'
    },
    {
      label: 'Loader default',
      state:
        spinnerAvg === null || skeletonAvg === null
          ? 'Unproven'
          : skeletonAvg === spinnerAvg
            ? 'Conditional'
            : 'Proven',
      detail:
        spinnerAvg === null || skeletonAvg === null
          ? 'Need both spinner and skeleton ratings before calling a winner.'
          : skeletonAvg >= spinnerAvg
            ? `Skeletons currently lead by ${(skeletonAvg - spinnerAvg).toFixed(1)} points on perceived speed.`
            : `Spinners currently lead by ${(spinnerAvg - skeletonAvg).toFixed(1)} points on perceived speed.`
    },
    {
      label: 'Optimistic commits',
      state:
        rollbackRate === null
          ? 'Unproven'
          : rollbackRate <= 15
            ? 'Proven'
            : rollbackRate <= 30
              ? 'Conditional'
              : 'Hold',
      detail:
        rollbackRate === null
          ? 'Need optimistic runs before judging rollback survivability.'
          : rollbackRate <= 15
            ? 'Rollback pressure is low enough that optimistic UI can stay on the table.'
            : rollbackRate <= 30
              ? 'Only safe for low-cost actions with explicit undo language.'
              : 'Rollback pressure is too visible for optimistic defaults.'
    }
  ];

  decisionLedgerBoard.innerHTML = rows
    .map((row) => `<p><strong>${row.label}:</strong> ${row.state}. ${row.detail}</p>`)
    .join('');
}

function renderInteractionContractBoard() {
  if (!interactionContractBoard) return;

  const p95Delay = state.delayResults.length ? percentile(state.delayResults, 95) : null;
  const skeletonAvg = state.loadRatings.skeleton.length ? average(state.loadRatings.skeleton) : null;
  const spinnerAvg = state.loadRatings.spinner.length ? average(state.loadRatings.spinner) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;

  const acknowledgeRule =
    p95Delay === null
      ? 'Run a few delay trials to learn when acknowledgment can stay invisible.'
      : p95Delay <= 120
        ? 'Silent acknowledgment is acceptable; the tail is still effectively instant.'
        : p95Delay <= 300
          ? 'Use a subtle pending state before the user starts doubting whether the action landed.'
          : 'Show explicit pending acknowledgment immediately; the tail is too visible to hide.';

  const loaderRule =
    skeletonAvg === null || spinnerAvg === null
      ? 'Rate both loader styles before locking a loader contract.'
      : skeletonAvg >= spinnerAvg
        ? `Prefer skeletons for longer waits; they are scoring ${(skeletonAvg - spinnerAvg).toFixed(1)} points better than spinners on average.`
        : `Spinner is currently winning by ${(spinnerAvg - skeletonAvg).toFixed(1)} points, so placeholder complexity may not be earning its keep yet.`;

  const optimisticRule =
    rollbackRate === null
      ? 'Run optimistic and standard saves before declaring instant commits safe.'
      : rollbackRate <= 15
        ? 'Optimistic writes are socially survivable under the current failure profile.'
        : rollbackRate <= 30
          ? 'Optimistic writes are viable only with explicit rollback copy and low-stakes actions.'
          : 'Do not ship silent optimistic writes here; rollback pressure is too high.';

  interactionContractBoard.innerHTML = `
    <p><strong>Interaction contract</strong></p>
    <p><strong>Acknowledge:</strong> ${acknowledgeRule}</p>
    <p><strong>Loader:</strong> ${loaderRule}</p>
    <p><strong>Commit policy:</strong> ${optimisticRule}</p>
  `;
}

function renderTrustBudgetBoard() {
  if (!trustBudgetBoard) return;

  const p95Delay = state.delayResults.length ? percentile(state.delayResults, 95) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;
  const loaderGap =
    state.loadRatings.spinner.length && state.loadRatings.skeleton.length
      ? Math.abs(average(state.loadRatings.spinner) - average(state.loadRatings.skeleton))
      : null;

  if (p95Delay === null && rollbackRate === null && loaderGap === null) {
    trustBudgetBoard.innerHTML = '<p><strong>Trust budget:</strong> no evidence yet. Run the three lab tracks before claiming the interaction is emotionally cheap.</p>';
    return;
  }

  const trustRisk =
    (p95Delay !== null && p95Delay > 450 ? 2 : p95Delay !== null && p95Delay > 250 ? 1 : 0) +
    (rollbackRate !== null && rollbackRate > 30 ? 2 : rollbackRate !== null && rollbackRate > 15 ? 1 : 0) +
    (loaderGap !== null && loaderGap < 0.5 ? 1 : 0);
  const label = trustRisk <= 1 ? 'Healthy' : trustRisk <= 3 ? 'Spend carefully' : 'Overdrawn';

  trustBudgetBoard.innerHTML = `
    <p><strong>Trust budget: ${label}</strong></p>
    <p><strong>Tail delay:</strong> ${p95Delay === null ? 'needs data' : `${p95Delay.toFixed(0)} ms P95`}.</p>
    <p><strong>Rollback pressure:</strong> ${rollbackRate === null ? 'needs data' : `${rollbackRate.toFixed(1)}% optimistic rollback rate`}.</p>
    <p><strong>Loader clarity:</strong> ${loaderGap === null ? 'needs both ratings' : loaderGap < 0.5 ? 'users are barely distinguishing the loader treatments' : 'one loader strategy is clearly winning'}.</p>
  `;
}

function renderFrictionBudgetBoard() {
  if (!frictionBudgetBoard) return;

  if (!state.delayResults.length && !state.optimisticRuns) {
    frictionBudgetBoard.innerHTML = '<p><strong>Friction budget:</strong> no evidence yet. Run latency and optimistic-save experiments before deciding whether the flow can feel lightweight.</p>';
    return;
  }

  const avgDelay = state.delayResults.length ? average(state.delayResults) : null;
  const rollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : null;
  const label =
    avgDelay !== null && avgDelay <= 180 && (rollbackRate === null || rollbackRate <= 10)
      ? 'Lightweight'
      : avgDelay !== null && avgDelay <= 320 && (rollbackRate === null || rollbackRate <= 25)
        ? 'Conditional'
        : 'Heavy';

  frictionBudgetBoard.innerHTML = `
    <p><strong>Friction budget: ${label}</strong></p>
    <p><strong>Latency load:</strong> ${avgDelay === null ? 'not measured yet' : `${avgDelay.toFixed(0)} ms average`}.</p>
    <p><strong>Rollback load:</strong> ${rollbackRate === null ? 'not measured yet' : `${rollbackRate.toFixed(0)}% of optimistic runs reversed`}.</p>
    <p><strong>Cue:</strong> ${
      label === 'Lightweight'
        ? 'This interaction can stay simple; extra ceremony would cost more than it saves.'
        : label === 'Conditional'
          ? 'Keep the flow lean, but spend friction carefully on acknowledgement or undo where the evidence is weakest.'
          : 'The interaction is no longer emotionally cheap. Spend explicit UI friction on clarity, recovery, or staged commitment.'
    }</p>
  `;
}

function renderPersonaBoard() {
  if (!personaBoard) return;

  const p95 = percentile(state.delayResults, 95);
  const skeletonAvg = average(state.loadRatings.skeleton);
  const spinnerAvg = average(state.loadRatings.spinner);
  const optimisticRollbackRate = state.optimisticRuns ? (state.optimisticRollbacks / state.optimisticRuns) * 100 : 0;

  const impatient =
    p95 > 400
      ? 'will notice the tail quickly and needs acknowledgement before the interaction feels stuck.'
      : 'is unlikely to mind the raw latency as long as the action visibly lands immediately.';
  const cautious =
    optimisticRollbackRate >= 30
      ? 'will prefer explicit confirmation because the current optimistic rollback rate is visibly high.'
      : 'can tolerate optimistic feedback because reversals are still relatively uncommon in this session.';
  const observant =
    skeletonAvg > spinnerAvg + 0.4
      ? 'is currently rewarding skeletons more than spinners, so structural preview is winning the honesty test.'
      : spinnerAvg > skeletonAvg + 0.4
        ? 'is currently rewarding spinners more than skeleton placeholders in this sample.'
        : 'is not showing a strong loader preference yet, so more ratings would sharpen the call.';

  personaBoard.innerHTML = `
    <p><strong>Impatient user:</strong> ${impatient}</p>
    <p><strong>Cautious user:</strong> ${cautious}</p>
    <p><strong>Observant user:</strong> ${observant}</p>
  `;
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

  if (profileBenchmarkSummary) {
    const fastest = rows.reduce((best, row) => (row.avg < best.avg ? row : best));
    const harshest = rows.reduce((worst, row) => (row.p95 > worst.p95 ? row : worst));
    profileBenchmarkSummary.innerHTML = `
      <p><strong>Fastest profile:</strong> ${fastest.label} at ${fastest.avg.toFixed(1)} ms average.</p>
      <p><strong>Harshest profile:</strong> ${harshest.label} at ${harshest.p95.toFixed(1)} ms P95.</p>
      <p><strong>Takeaway:</strong> Size feedback patterns for the harshest band, not the happy path.</p>
    `;
  }

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

  if (failureSweepSummary) {
    const safeBand = rows.filter((row) => row.recommendation === 'Optimistic UI is viable');
    const guardedBand = rows.filter((row) => row.recommendation === 'Use optimistic UI with explicit undo');
    const riskyBand = rows.filter((row) => row.recommendation === 'Prefer standard confirmation');
    const safest = safeBand.length ? `${safeBand[0].rate}%-${safeBand[safeBand.length - 1].rate}%` : 'none';
    const guarded = guardedBand.length ? `${guardedBand[0].rate}%-${guardedBand[guardedBand.length - 1].rate}%` : 'none';
    const risky = riskyBand.length ? `${riskyBand[0].rate}%+` : 'none';
    failureSweepSummary.innerHTML = `
      <p><strong>Policy boundary:</strong> optimistic UI is comfortable in the ${safest} failure band, needs explicit undo in the ${guarded} band, and becomes hard to justify at ${risky}.</p>
    `;
  }

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
    `- ${(interventionLadder?.textContent || '').replace(/\s+/g, ' ').trim()}`,
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

function isEditableTarget(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName));
}

failRate.addEventListener('input', () => {
  failRateLabel.textContent = failRate.value;
  syncUrlState();
});
networkProfile.addEventListener('change', () => {
  const profile = profileMap[networkProfile.value];
  if (!profile) return;
  delayInput.value = String(profile.delay);
  failRate.value = String(profile.failRate);
  failRateLabel.textContent = String(profile.failRate);
  delayStatus.textContent = profile.label;
  syncUrlState();
});
delayInput.addEventListener('input', syncUrlState);

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
copySessionLinkButton.addEventListener('click', async () => {
  syncUrlState();
  try {
    await navigator.clipboard.writeText(window.location.href);
    addLog('Copied a shareable session link with the active profile and knobs.', 'success');
  } catch (error) {
    addLog('Clipboard copy failed while building the session link.', 'fail');
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

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'd') {
    event.preventDefault();
    runDelayTrial();
  } else if (key === 'b') {
    event.preventDefault();
    benchmarkProfiles();
  } else if (key === 's') {
    event.preventDefault();
    runLoadingScenario('spinner');
  } else if (key === 'k') {
    event.preventDefault();
    runLoadingScenario('skeleton');
  } else if (key === 'o') {
    event.preventDefault();
    runOptimistic();
  } else if (key === 't') {
    event.preventDefault();
    runStandard();
  } else if (key === 'f') {
    event.preventDefault();
    sweepFailureRates();
  }
});

hydrateFromUrlState();
renderRatingButtons();
renderDelayResults();
renderLoadingSummary();
renderOutcomeStats();
renderInsights();
renderEvidenceCoverage();
syncLikeCounters();
renderEventLog();
addLog('Latency lab initialized from local session storage.', 'success');
