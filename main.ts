// btc-cent-forecast-01 entry (Node 22, standard library only).
//
// It reads every <id>.in in the input directory — one case holding a market's
// 4,320 one-minute closes up to its checkpoint — and writes <id>.out with one
// forecast: the price 240 minutes after the checkpoint, in
// {"forecasts":[{"case":<id>,"price":<number>}]} form.
//
// Forecast: the last close, pulled 15% of the way toward the mean of the
// last 240 closes (the horizon's own length). Calibration notes: an earlier
// version added the median 240-minute change of the case's history to the
// last close — the proper-median estimator if changes were stationary.
// Measured on the six practice cases that scored 43935.36 cents against the
// house baseline's 44521.58, but the edge proved to be the practice week's
// steady downtrend, not a property of the price: scored walk-forward over
// two weeks of Binance BTCUSDT 1-minute closes (268 checkpoints, Oct 28 –
// Nov 11), the same rule lost to plain persistence (39761.7 vs 38364.2
// cents), and every drift/trend variant lost there too. What held up on all
// three datasets — the practice cases, walk-forward on the cases' own pool
// series, and the Binance fortnight — was this small mean reversion, from a
// flat plateau (every pull from 5% to 30% toward the 240-minute mean beat
// persistence on all three; 15% sits mid-plateau): the pool's mid can be
// knocked for a minute by one large trade, so the last close alone is a
// noisy anchor and a slight pull toward the recent mean trims that noise
// without betting on a trend. On the practice cases it scores 44452.57
// cents, a hair under the baseline's 44521.58; its claim is consistency
// across regimes, not a tuned fit to six cases.
//
// In-window re-check (2026-11-14, after the open): the pull-factor grid was
// re-run on all three datasets. Practice and pool walk-forward improve
// monotonically with the pull (44498.6 at 5% down to 44337.6 at 40% on
// practice), but the Binance fortnight is U-shaped with its minimum at
// 12–15% (38126.8 at 12%, 38133.6 at 15%, 38152.6 at 20%, 38326.8 at 30%,
// persistence 38364.2) — and the 12–15% band differs by 0.02%, i.e. noise.
// Tuning the pull to the practice cases alone would push it up and repeat
// the drift rule's mistake, so 15% stands: mid-plateau, the Binance
// minimum's shoulder, unchanged by the re-run. Deterministic: no
// randomness, no clock, no network.
//
// Built in-window after the competition opened (2026-11-14T20:00:00Z);
// the pre-open build of this entry was discarded and rebuilt here.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The smallest positive price on the grid: one unit of its 5 decimals. */
const MIN_PRICE = 0.00001;
/** The largest grid price below the scorer's exclusive 10,000,000-dollar cap. */
const MAX_PRICE = 9_999_999.99999;

/** The horizon every case asks for, in minutes; also the mean's window. */
const WINDOW = 240;
/** The pull toward the window mean: 15%, the middle of the measured plateau. */
const PULL = 0.15;

interface CaseMarket {
  id: string;
  prices: number[];
}

interface Case {
  markets: CaseMarket[];
}

/** x kept on the grid's 5 decimals and inside the scorer's (0, 10,000,000). */
const price5 = (x: number): number => Math.round(Math.min(MAX_PRICE, Math.max(MIN_PRICE, x)) * 1e5) / 1e5;

/** The last close pulled PULL of the way toward the mean of the last WINDOW closes. */
function forecast(m: CaseMarket): number {
  if (!Array.isArray(m.prices) || m.prices.length === 0) throw new Error(`market ${m.id} has no prices`);
  const prices = m.prices;
  const last = prices[prices.length - 1] as number;
  if (typeof last !== 'number' || !Number.isFinite(last)) throw new Error(`market ${m.id}'s last price is not a finite number`);
  const w = Math.min(WINDOW, prices.length);
  let sum = 0;
  for (let i = prices.length - w; i < prices.length; i++) sum += prices[i] as number;
  return price5(last + PULL * (sum / w - last));
}

mkdirSync(OUTPUT_DIR, { recursive: true });
// Every case file, in name order, so two runs write the same bytes.
const inputs = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort();
for (const file of inputs) {
  const id = file.slice(0, -'.in'.length);
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as Case;
  if (!Array.isArray(c.markets) || c.markets.length !== 1) throw new Error(`${file} does not hold exactly one market`);
  writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify({ forecasts: [{ case: id, price: forecast(c.markets[0] as CaseMarket) }] })}\n`);
}
