// Locked-rate model catalogue.
// rate = USD per 1,000,000 tokens (blended prompt+completion for MVP simplicity).
// Balances are stored in micro-USD (1 micro = $0.000001).
//
// Model IDs are OpenRouter slugs — verify/adjust against https://openrouter.ai/models
// (provider renames checkpoints periodically). To add a model: map an id -> { tier, rate, label }.
export const MODELS = {
  'deepseek/deepseek-chat': { tier: 'futures', rate: 0.14, label: 'DeepSeek Forward' },
  'meta-llama/llama-3.3-70b-instruct': { tier: 'futures', rate: 0.18, label: 'Llama Forward' },
  'qwen/qwen-2.5-72b-instruct': { tier: 'futures', rate: 0.16, label: 'Qwen Forward' },
  'mistralai/mistral-large': { tier: 'futures', rate: 0.22, label: 'Mistral Forward' },
  'openai/gpt-4o': { tier: 'capacity', rate: 3.50, label: 'GPT Capacity' },
  'google/gemini-2.5-pro': { tier: 'capacity', rate: 2.50, label: 'Gemini Capacity' },
  'anthropic/claude-sonnet-4.6': { tier: 'capacity', rate: 1.80, label: 'Claude Capacity' },
};

export function getModel(id) {
  return MODELS[id] || null;
}

// Lock tenors. Base locked rate (above) is the 1M rate; longer tenors carry a
// contango premium (future compute priced higher). Tweak `mult` to reshape the curve.
export const TENORS = [
  { key: '1M', days: 30,  mult: 1.00 },
  { key: '3M', days: 91,  mult: 1.10 },
  { key: '6M', days: 182, mult: 1.22 },
];
export const DEFAULT_TENOR = '1M';
export function getTenor(key) { return TENORS.find((t) => t.key === key) || TENORS[0]; }

// Locked rate ($/M tokens) for a model at a tenor.
export function lockedRate(id, tenorKey) {
  const m = MODELS[id]; if (!m) return null;
  return +(m.rate * getTenor(tenorKey).mult).toFixed(4);
}

// Expiry timestamp for a tenor measured from now.
export function tenorExpiry(tenorKey) {
  return new Date(Date.now() + getTenor(tenorKey).days * 86400_000);
}

/**
 * Cost in micro-USD for a request.
 * cost_usd = totalTokens / 1e6 * rate  ->  micros = totalTokens * rate
 */
export function costMicros(totalTokens, ratePerMtok) {
  return Math.ceil(totalTokens * ratePerMtok);
}

export function listCatalogue() {
  return Object.entries(MODELS).map(([id, m]) => ({
    id,
    tier: m.tier,
    label: m.label,
    locked_rate_per_mtok: m.rate,
  }));
}
