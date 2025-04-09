// jest.setup.js - Should ONLY set environment variables
process.env.NODE_ENV = 'test';

module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.js', './tests/setup.js'],
    testMatch: ['**/*.test.js'],
    verbose: true
};