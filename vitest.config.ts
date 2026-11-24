import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Mocks are data, not imports: list them so an edited mock reruns the contract test
      // (src/screens/contract.test.ts) in watch mode.
      forceRerunTriggers: [...configDefaults.forceRerunTriggers, '**/mocks/**/*.json'],
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: ['src/**/*.test.tsx'],
            setupFiles: ['./vitest.setup.dom.ts'],
          },
        },
      ],
    },
  }),
);
