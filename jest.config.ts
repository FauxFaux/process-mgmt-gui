import type { Config } from 'jest';

const config: Config = {
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.lint/',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    '/node_modules/' /* default value */,
    '/process-mgmt/' /* npm is very confused about how relative paths work */,
  ],
  moduleNameMapper: {
    '\\.(webp|png|css)$': '<rootDir>/mocks/fileMock.js',
  },
};

export default config;
