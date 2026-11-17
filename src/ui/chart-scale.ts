/** Passo "tondo" (1, 2, 2,5, 5 × 10^k) per un asse con circa `n` intervalli. */
export function niceStep(range: number, n: number) {
  const raw = Math.max(range, 1) / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/** Tacche da 0 al primo multiplo del passo oltre il massimo. */
export function ticksTo(max: number, n = 4) {
  const step = niceStep(max, n);
  const hi = Math.max(Math.ceil(max / step) * step, step);
  const out: number[] = [];
  for (let t = 0; t <= hi + step / 2; t += step) out.push(Math.round(t * 100) / 100);
  return { ticks: out, hi };
}
