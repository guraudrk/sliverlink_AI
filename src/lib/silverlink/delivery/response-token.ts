import { randomBytes } from "node:crypto";

// Day8 범위: 토큰 생성만 한다. 실제 만료/응답 검증 로직은 Day9(/r/[token])에서 구현한다.
export function generateResponseToken(): string {
  return randomBytes(24).toString("base64url");
}
