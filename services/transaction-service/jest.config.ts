import type { Config } from 'jest';

const config: Config = {
  displayName: 'transaction-service',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts', '!**/*.dto.ts', '!**/entities/**', '!**/metrics/**'],
  coverageDirectory: '../coverage',
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 70, statements: 70 } },
  testEnvironment: 'node',
};

export default config;
