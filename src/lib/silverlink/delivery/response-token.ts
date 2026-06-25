import { randomBytes } from "node:crypto";

// Day8 범위: 토큰 생성만 한다. 실제 만료/응답 검증 로직은 Day9(/r/[token])에서 구현한다.
export function generateResponseToken(): string {
  return randomBytes(24).toString("base64url");
}

const DEFAULT_RESPONSE_TOKEN_TTL_DAYS = 3;

// 마스터플랜에 구체적 만료 기간이 명시되어 있지 않아 3일로 임의 설정 — 필요해지면 이 한 곳만 바꾸면 된다.
export function getDefaultExpiresAt(): string {
  return new Date(Date.now() + DEFAULT_RESPONSE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
