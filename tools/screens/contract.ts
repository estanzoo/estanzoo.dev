// Mock contract library (blueprint Step 8, R6). src/screens/contract.test.ts runs it over
// the real mocks/ and the screen registry:
//
//   mockFailures(dir, registry)  one line per mock that fails to parse with its section's
//                                strict schema (layered over _defaults.json) or to render
//                                through the real View; each starts with the mock file
//   coverageGaps(dir, registry)  '<section>: <gap>' for every union variant no mock of the
//                                section shows and every optional/nullable/boolean property
//                                its mocks show one way only (src/testing/vmCoverage.ts)
import type { Screen } from '../../src/screens/defineScreen';
import { vmCoverage } from '../../src/testing/vmCoverage';
import { listMocks, loadMock, renderMock } from './screens';

export function mockFailures(dir: string, registry: Screen[]): string[] {
  const failures: string[] = [];
  for (const ref of listMocks(dir)) {
    try {
      renderMock(registry, ref, loadMock(dir, ref));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message.startsWith(ref.file) ? message : `${ref.file}: the View cannot render it: ${message}`);
    }
  }
  return failures;
}

export function coverageGaps(dir: string, registry: Screen[]): string[] {
  const refs = listMocks(dir);
  return registry.flatMap((screen) => {
    const vms = refs
      .filter((ref) => ref.section === screen.section)
      .map((ref) => screen.schema.safeParse(loadMock(dir, ref).vm))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
    return vmCoverage(screen.schema, vms).map((gap) => `${screen.section}: ${gap}`);
  });
}
