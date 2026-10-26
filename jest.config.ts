import type { Config } from "jest";
import nextJest from "next/jest.js";

// Next.js 설정(next.config.ts, .env)을 테스트에서도 그대로 쓰게 해 준다
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // 테스트 안에서 브라우저 화면을 흉내 낸다
  testEnvironment: "jsdom",
  // 테스트마다 먼저 실행할 파일
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // "@/..." import를 src 폴더로 연결 (tsconfig.json과 같게)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
