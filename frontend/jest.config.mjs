// frontend/jest.config.mjs
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // ISSO É CRUCIAL
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/testes_front/**/*.test.(ts|tsx|js|jsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)