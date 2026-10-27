import { useId } from 'react';

/** Unique, url()-safe prefix for SVG gradient ids, so stacked screens never share one. */
export function useSvgId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
