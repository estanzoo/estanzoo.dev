// L1 contract: proves the real mocks (mocks/<section>/*.json) match the real sections
// (blueprint Step 8, R6). Every mock's vm, layered over mocks/_defaults.json, parses with
// its section's strict schema (an unknown field fails) and renders through the real View;
// across each section's mocks every union variant appears and every optional, nullable and
// boolean property shows both of its values. Each check collects every failure and asserts
// once, so one run names every broken mock and every gap.
// mocks/ is a vitest forceRerunTriggers input (vitest.config.ts): an edited mock reruns this.
// Leaves to other layers: the library on fixtures (tools/screens/contract.test.ts) and the
// schema walk (src/testing/vmCoverage.test.ts).
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { coverageGaps, mockFailures } from '../../tools/screens/contract';
import { screens } from './registry';

const MOCKS = fileURLToPath(new URL('../../mocks', import.meta.url));

describe('mock contract', () => {
  it('every mock parses with its section schema and renders through the real View', () => {
    const failures = mockFailures(MOCKS, screens);
    expect(failures, `broken mocks:\n${failures.join('\n')}`).toEqual([]);
  });

  it('the mocks of each section show every variant and both values of every optional and boolean', () => {
    const gaps = coverageGaps(MOCKS, screens);
    expect(gaps, `coverage gaps:\n${gaps.join('\n')}`).toEqual([]);
  });
});
