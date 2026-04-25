# UX Latency Lab

Interactive lab for testing how latency and feedback patterns influence user perception.

## Experiments Included

1. **Interaction delay threshold**
   - Configure artificial delay.
   - Apply network profile presets.
   - Run repeated trials.
- Benchmark all built-in profiles in one shot.
- View measured timings and average.
- Session percentile cut points for median, P75, P95, and slowest-trial analysis.
- Profile benchmark summary calls out the fastest profile, harshest latency band, and the feedback-design takeaway.

2. **Loading feedback perception**
   - Compare spinner vs skeleton loading states.
   - Record perceived speed ratings.
   - Track average scores by loading strategy.

3. **Optimistic UI vs standard updates**
   - Adjustable simulated failure rate.
   - Standard flow waits for server before UI update.
   - Optimistic flow updates immediately and rolls back on failure.
   - Event log records behavior over time.
   - Success/rollback rate summary explains when optimistic UI is still justified.
- Session memo converts the current experiment data into a product-facing recommendation.
- Policy scorecard turns the current session into concrete guidance for action feedback, loader choice, and commit strategy.
- Release-readiness board condenses all three experiments into a single ship/no-ship style brief.
- Latency posture board turns the full session into a compact operating read on tail risk, loader posture, and rollback pressure.
- Intervention ladder turns the current evidence into a concrete acknowledge-vs-loader-vs-optimistic policy recommendation.
- Failure-rate sweep now ends with a policy-boundary summary so optimistic UI guidance reads like a decision memo instead of a raw table.
- Evidence coverage board shows which of the three lab tracks have enough data and what measurement gap should be closed next.
- Experiment debt board calls out unbalanced trials, missing baselines, and weak sample sizes before a session report is trusted.
- Evidence confidence board grades whether the current session is robust enough for product-facing conclusions.
- Session links now preserve the active profile, delay knob, and failure-rate setting for repeatable walkthroughs.

## Technical Design

- `index.html`: three experiment modules with semantic sections.
- `styles.css`: dark dashboard UI with responsive layout.
- `script.js`: async simulation engine for timing and request outcomes.

```mermaid
flowchart LR
  A[User Action] --> B[Simulated Network Delay]
  B --> C{Success?}
  C -->|Yes| D[Commit UI]
  C -->|No| E[Rollback or Keep State]
  D --> F[Log + Metrics]
  E --> F
```

## Local Run

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Portfolio Demo Path

1. Run `Benchmark Profiles` to create latency evidence.
2. Test skeleton loading and record a perceived-speed rating.
3. Sweep failure rates to find the optimistic-UI boundary.
4. Copy the session report as a product-facing recommendation.
5. Read the intervention ladder so the report ends with a specific feedback policy, not just raw metrics.

## GitHub Pages Compatibility

- Fully static.
- No backend dependencies.
- Deploy from repository root.

## Future Improvements

- Add charts for percentile latency distributions.
- Add offline-first scenarios and cache-hit simulations.
- Export experiment session data as JSON.
