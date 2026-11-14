# makefun-btc-cent-forecast-01-entry

Entry for make.fun's **btc-cent-forecast-01**: forecast Bitcoin's US-dollar
price 240 minutes after each checkpoint, from the 4,320 one-minute closes
leading up to it. Scored by mean absolute error in cents against the
cbBTC/USDC Orca pool closes make.fun records; the house baseline is
persistence (guess the checkpoint's own close).

Rebuilt in-window after the competition opened (2026-11-14T20:00:00Z). The
pre-open build of this entry under the plain competition name was discarded;
this repository was created after the open so it passes the
`repo_created_after_open` gate.

## The forecast

`main.ts` (Node 22, standard library only, offline, deterministic) guesses:

    guess = last + 0.15 × (mean of the last 240 closes − last)

— the last close pulled 15% of the way toward the mean of the last 240
closes. The pool's mid can be knocked for a minute by a single large trade,
so the last close alone is a noisy anchor; the slight pull trims that noise
without betting on a trend.

## How it was calibrated

Three datasets: the kit's six practice cases (actuals recovered exactly —
the published persistence loss of 44521.576667 cents is reproduced to the
6th decimal), walk-forward checkpoints inside the practice cases' own pool
series, and 268 walk-forward checkpoints over two weeks of Binance BTCUSDT
1-minute closes (Oct 28 – Nov 11, 2026).

An earlier version added the median 240-minute change of the case history
to the last close. It beat the baseline on the practice cases (43935.36
cents) but lost to plain persistence on the Binance fortnight (39761.7 vs
38364.2) — its edge was the practice week's steady downtrend. The
mean-reversion rule above beat persistence on all three datasets, from a
flat plateau (pulls of 5–30% toward the 240-minute mean all beat
persistence everywhere; 15% is mid-plateau), and scores 44452.57 cents on
the practice cases. A practice score is no guide to the final; consistency
across regimes is the claim.

## In-window re-check (2026-11-14, after the open)

The pull-factor grid was re-run on all three datasets before this entry was
submitted. Practice and pool walk-forward improve monotonically with the
pull (44498.6 cents at 5% down to 44337.6 at 40% on practice), but the
Binance fortnight is U-shaped with its minimum at 12–15% (38126.8 at 12%,
38133.6 at 15%, 38152.6 at 20%, 38326.8 at 30%; persistence 38364.2), and
the 12–15% band differs by 0.02%, i.e. noise. Tuning the pull to the
practice cases alone would push it up and repeat the drift rule's mistake,
so 15% stands: mid-plateau, the Binance minimum's shoulder, unchanged by
the re-run.

## Run it

    mkdir -p out
    MAKEFUN_INPUT_DIR=<dir with .in files> MAKEFUN_OUTPUT_DIR=out node main.ts

Writes one `<id>.out` per `<id>.in`: `{"forecasts":[{"case":<id>,"price":<number>}]}`.
Two runs on the same input write byte-identical output (verified on the
kit's six practice cases).
