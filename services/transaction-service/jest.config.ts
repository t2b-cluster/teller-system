import type { Config } from 'jest';

const config: Config = {
  displayName: 'transaction-service',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts', '!**/*.dto.ts', '!**/entities/**', '!**/metrics/**'],
  coverageDirectory: '../coverage',
  coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
  testEnvironment: 'node',
};

export default config;
