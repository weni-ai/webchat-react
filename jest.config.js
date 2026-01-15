module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.[jt]sx?$',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.svg(\\?react)?$': '<rootDir>/test/__mocks__/svgrMock.js',
    '^marked$': '<rootDir>/test/__mocks__/marked.js',
    '^@weni/webchat-service$': '<rootDir>/test/__mocks__/@weni/webchat-service.js',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/__tests__/**', '!src/**/?(*.)+(test|spec).[jt]sx?'],
};
