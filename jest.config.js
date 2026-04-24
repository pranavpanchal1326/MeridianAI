const nextJest = require("next/jest")
const createJestConfig = nextJest({ dir: "./" })
const customJestConfig = {
  setupFilesAfterFramework: [],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@lib/(.*)$": "<rootDir>/lib/$1",
    "^@components/(.*)$": "<rootDir>/app/components/$1",
  },
}
module.exports = createJestConfig(customJestConfig)