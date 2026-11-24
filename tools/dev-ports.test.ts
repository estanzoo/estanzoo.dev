import { describe, expect, it } from 'vitest';
import { portOptions } from './dev-ports';

describe('portOptions', () => {
  it('uses DEV_PORT and PREVIEW_PORT from the env', () => {
    expect(portOptions({ DEV_PORT: '5301', PREVIEW_PORT: '6301' })).toEqual({
      server: { port: 5301, strictPort: true },
      preview: { port: 6301, strictPort: true },
    });
  });

  it('falls back to the Vite defaults when the env has no ports', () => {
    expect(portOptions({})).toEqual({
      server: { port: 5173, strictPort: true },
      preview: { port: 4173, strictPort: true },
    });
  });
});
