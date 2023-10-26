module.exports = {
  preset: 'ts-jest',
  clearMocks: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['lcov', 'text'],
  roots: ['src'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'unit.xml',
        titleTemplate: '{title}',
        classNameTemplate: '{classname}',
      },
    ],
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/webviews/', '/dist-/'],
  testEnvironment: 'node',
};
