/**
 * Coerces a numeric identifier that may arrive as a string (e.g. from
 * `Object.keys()`) to a proper `number`. Always uses radix 10.
 */
export function toNumericId(x: number | string): number {
  return typeof x === 'number' ? x : parseInt(x, 10);
}
