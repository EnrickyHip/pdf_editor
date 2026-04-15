const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterSetup: ['<rootDir>/.jest/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*mock*.{js,jsx,ts,tsx}',
    '!src/styles/**/*.{js,jsx,ts,tsx}',
    '!src/pages/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
  ],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/.out/', '/public/'],
};

module.exports = createJestConfig(customJestConfig);
