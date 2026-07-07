"use client";

type SparklineProps = {
  data: number[]; // 0-100, 오래된 순서 (왼쪽→오른쪽)
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({ data, width = 120, height = 36, color = "#2563eb" }: SparklineProps) {
  if (data.length === 0) return null;

  const padX = 2;
  const padY = 3;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * w;
    const y = padY + (1 - (v - min) / range) * h;
    return [x, y] as [number, number];
  });

  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");

  // 채우기용 polygon (아래쪽 닫기)
  const areaPoints = [
    `${points[0][0]},${padY + h}`,
    ...points.map(([x, y]) => `${x},${y}`),
    `${points[points.length - 1][0]},${padY + h}`,
  ].join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.03} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 마지막 점 강조 */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={3}
        fill={color}
      />
    </svg>
  );
}
