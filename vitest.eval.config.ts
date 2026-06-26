import { defineConfig } from "vitest/config";

// 실제 Gemini API를 호출하는 평가 전용 설정 — 일반 vitest.config.ts(include: *.test.ts)와는
// 별도로 분리한다. *.eval.ts는 비용/속도/네트워크 의존성이 있어 매 코드 수정마다 도는
// `npx vitest run`에는 절대 섞이면 안 되고, 사용자가 의도적으로 `npm run evaluate:rag`를
// 실행할 때만 돌아야 한다.
export default defineConfig({
  test: {
    include: ["src/**/*.eval.ts"],
    exclude: ["node_modules", "tests/e2e/**"],
    testTimeout: 60000,
  },
});
