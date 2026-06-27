import { Router } from 'express';
import { db } from '../supabase.js';
import { MODELS, TENORS, lockedRate, tenorExpiry, getTenor } from '../lib/pricing.js';
import { livePrices } from '../lib/prices.js';

const router = Router();

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// GET /api/v1/curve — per-model rate term structure.
// line   = offered locked rates across tenors (1M/3M/6M) — what you can lock now (real).
// spot   = live blended OpenRouter price (the volatile rate you'd pay un-hedged) (real).
// observed/contracts = real locks already made at each tenor (fills in with volume).
router.get('/', async (_req, res) => {
  // live spot per model (best-effort; curve still works without it)
  let spotByKeyId = {};
  try {
    const live = await livePrices();
    live.forEach((p) => { if (p.spot != null) spotByKeyId[p.id] = p.spot; });
  } catch { /* spot optional */ }

  // real locks already made (paid intents), grouped by model+tenor
  const observed = {}; // id -> tenor -> [rate,...]
  try {
    const { data } = await db
      .from('topup_intents')
      .select('model_id, tenor, usdc_amount, tokens_m')
      .eq('status', 'paid')
      .limit(5000);
    (data || []).forEach((r) => {
      const tk = r.tokens_m > 0 ? r.usdc_amount / r.tokens_m : null;
      if (tk == null) return;
      (observed[r.model_id] ||= {});
      (observed[r.model_id][r.tenor || '1M'] ||= []).push(tk);
    });
  } catch { /* observed optional */ }

  const models = Object.entries(MODELS).map(([id, m]) => {
    const tenors = TENORS.map((t) => {
      const obs = observed[id]?.[t.key] || [];
      return {
        key: t.key,
        days: t.days,
        expiry: tenorExpiry(t.key).toISOString(),
        rate: lockedRate(id, t.key),
        observed: median(obs),
        contracts: obs.length,
      };
    });
    const first = tenors[0].rate, last = tenors[tenors.length - 1].rate;
    const slope = last - first;
    const shape = Math.abs(slope) < 1e-9 ? 'flat' : slope > 0 ? 'contango' : 'backwardation';
    return {
      id,
      label: m.label,
      tier: m.tier,
      spot: spotByKeyId[id] ?? null,
      base_rate: m.rate,
      tenors,
      shape,
      slope: +slope.toFixed(4),
    };
  });

  res.json({ ok: true, updated: Date.now(), tenors: TENORS.map((t) => t.key), models });
});

export default router;
