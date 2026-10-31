// Simplified ↔ traditional Chinese, character by character. Good enough for place
// names, which is all the app converts: the geocoder stores many of them only in
// traditional characters, while the app shows simplified.
import { S2T, T2S } from './hanziTables';

function table(pairs: string): Map<string, string> {
  const chars = Array.from(pairs);
  const map = new Map<string, string>();
  for (let i = 0; i + 1 < chars.length; i += 2) map.set(chars[i], chars[i + 1]);
  return map;
}

let s2t: Map<string, string> | undefined;
let t2s: Map<string, string> | undefined;

const convert = (text: string, map: Map<string, string>) =>
  Array.from(text, (ch) => map.get(ch) ?? ch).join('');

export const toSimplified = (text: string) => convert(text, (t2s ??= table(T2S)));
export const toTraditional = (text: string) => convert(text, (s2t ??= table(S2T)));
