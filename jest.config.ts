import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/application', '<rootDir>/tests/contract'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/ui/'],
};

export default config;
