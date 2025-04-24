// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest', // TypeScriptファイルをトランスフォーム
  },
  moduleNameMapper: { // tsconfig.json の paths に合わせた設定 (必要に応じて)
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  // Kuromoji.js の辞書読み込みに対応するための設定 (非同期処理を含むテスト用)
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 30000, // Kuromoji.js の初期化に時間がかかる場合があるためタイムアウトを延長
};
