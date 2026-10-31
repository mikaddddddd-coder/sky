// The three answers to "how was the sky?" each carry a little swatch of that sky, so they
// read at a glance. Shared by the question page and the card on the Tonight page.
import type { Aura } from '../components/Glass';
import type { Rating } from '../lib/feedback';
import type { StringKey } from '../lib/i18n/strings';

export const FEEDBACK_SKIES: Record<Rating, { swatch: readonly [string, string, ...string[]]; desc: StringKey; aura: Aura }> = {
  0: { swatch: ['#2A3050', '#4A5274', '#6B7290'], desc: 'feedbackNoneDesc', aura: { color: '#8FA8FF', x: 0.1, y: 0.5, strength: 0.1 } },
  1: { swatch: ['#2E3166', '#A86A8C', '#F0B184'], desc: 'feedbackSomeDesc', aura: { color: '#FFB86B', x: 0.1, y: 0.5, strength: 0.2 } },
  2: { swatch: ['#4A1838', '#D9422F', '#FFB25C'], desc: 'feedbackFireDesc', aura: { color: '#FF5A36', x: 0.1, y: 0.5, strength: 0.32 } },
};
