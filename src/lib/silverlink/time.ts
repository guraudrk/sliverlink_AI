const SEOUL_TIME_ZONE = "Asia/Seoul";
const SEOUL_UTC_OFFSET = "+09:00";

const seoulPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getSeoulParts(date: Date) {
  const lookup = Object.fromEntries(
    seoulPartsFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return lookup as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

/** 서버의 로컬 타임존과 무관하게 Asia/Seoul 기준 wall-clock 시각으로 ISO datetime 문자열을 만든다. */
export function getRequestedAt(date: Date = new Date()): string {
  const { year, month, day, hour, minute, second } = getSeoulParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${SEOUL_UTC_OFFSET}`;
}

/** 서버의 로컬 타임존과 무관하게 Asia/Seoul 기준 날짜(YYYY-MM-DD)를 만든다. */
export function getTodayDate(date: Date = new Date()): string {
  const { year, month, day } = getSeoulParts(date);
  return `${year}-${month}-${day}`;
}
