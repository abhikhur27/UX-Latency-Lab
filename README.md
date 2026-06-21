# Interaction Latency Explorer

Interactive lab for testing how latency and feedback patterns influence user perception.

## Experiments Included

1. **Interaction delay threshold**
   - Configure artificial delay.
   - Apply network profile presets.
   - Run repeated trials.
- Benchmark all built-in profiles in one shot.
- Built-in profile benchmarking now includes jitter, so the profile table distinguishes slow averages from genuinely noisy latency.
- Profile benchmark runs can now be exported as CSV and preserved inside session snapshots for later product review.
- Delay trials can be exported as CSV for spreadsheet review or product review docs.
- Delay trials now render as a percentile-annotated trend chart with 100 ms / 250 ms / 500 ms budget guides.
- View measured timings and average.
- Session percentile cut points for median, P75, P95, and slowest-trial analysis.
- Profile benchmark summary now calls out the fastest profile, harshest latency band, and the noisiest jitter profile before making a feedback recommendation.
- Latency budget board maps the current trial distribution to instant, responsive, and loader-worthy product thresholds.

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
- Keyboard shortcuts now include `R` (copy report) and `L` (copy shareable session link).
- Policy scorecard turns the current session into concrete guidance for action feedback, loader choice, and commit strategy.
- Baseline compare snapshots let one session be saved and contrasted against a later run so latency or rollback improvements are measured, not just claimed.
- Release-readiness board condenses all three experiments into a single ship/no-ship style brief.
- Latency posture board turns the full session into a compact operating read on tail risk, loader posture, and rollback pressure.
- Intervention ladder turns the current evidence into a concrete acknowledge-vs-loader-vs-optimistic policy recommendation.
- Failure-rate sweep now ends with a policy-boundary summary so optimistic UI guidance reads like a decision memo instead of a raw table.
- Evidence coverage board shows which of the three lab tracks have enough data and what measurement gap should be closed next.
- Experiment debt board calls out unbalanced trials, missing baselines, and weak sample sizes before a session report is trusted.
- Evidence confidence board grades whether the current session is robust enough for product-facing conclusions.
- Rollback rehearsal board reads optimistic failures as a product-copy burden, not just an error percentage.
- Ship gate board compresses the current evidence into a simple ready / conditional / hold recommendation.

## Session handoff

- Export delay trials when you need raw measurements in CSV.
- Export the full session when you want a reusable artifact for later product review.
- Copy the report or decision ledger when you need the product-facing conclusion without reopening the app.
- Next experiment board prioritizes the single best follow-up measurement so the session closes its biggest evidence gap first.
- Recovery copy board drafts a status-line pattern for slow or rollback-prone flows based on the current evidence.
- Friction budget board combines delay and rollback evidence into one read on how much explicit UI ceremony the flow can afford.
- Persona board turns the current evidence into likely reactions from impatient, cautious, and observant users before the session gets shared as policy.
- Perception gap board compares measured delay, loading ratings, and rollback pressure so the session can name where user feeling diverges from raw timing.
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

## Portfolio Positioning

- Honest label: browser experiment lab for latency and optimistic UI behavior.
- Strongest walkthrough: run one benchmark, one loader comparison, and one rollback sweep tied to a product decision.
- Current bar: evidence that leads to a decision is more valuable than adding more summary boards.

## Session Artifacts

- `Copy Session Report` is for the one-paragraph product recommendation.
- `Copy Decision Ledger` is for a more explicit policy handoff when you need loader, acknowledgement, and rollback posture spelled out.
- Exported session JSON is the reproducibility path when the same experiment setup should be reopened later.

## Reproducible Session Flow

- Use the session link when only the active knobs matter.
- Use the copied report or decision ledger when the evidence already supports a product-facing recommendation.
- Use exported session JSON when the experiment evidence itself should be re-opened and challenged later.
- Use `Save Baseline` when you want a before/after delta against a later tuning pass without exporting or importing another file first.

## Future Improvements

- Add charts for percentile latency distributions.
- Add offline-first scenarios and cache-hit simulations.
- Add side-by-side historical session comparisons for repeated product reviews.

## Product Decision Gate

Use this gate before claiming a UX recommendation:

1. At least one profile benchmark run with percentile readout.
2. At least one loader comparison with user-perception input.
3. At least one optimistic-flow failure sweep.
4. Export one decision ledger that names the recommended feedback policy.

## Quick Verification Command

Run this syntax check before sharing updates:
- node --check script.js

## Demo Flow

1. Benchmark a fast and slow profile.
2. Run the loader comparison and optimistic update experiment back to back.
3. Copy the session memo once the release-readiness board has enough evidence for a product call.

## Product Review Route

If this is being used in a portfolio or interview setting, keep the conclusion pointed:

1. Name the target UX question first.
2. Run only the experiment that answers that question.
3. End with one copied recommendation instead of narrating every board on screen.

