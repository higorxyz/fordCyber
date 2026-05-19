"use client";

import { VehicleSystem } from "@/data/client";

interface Props {
  systems: VehicleSystem[];
  size?: number;
}

const COLORS: Record<VehicleSystem["status"], string> = {
  good: "#22c55e",
  warn: "#facc15",
  bad: "#C41E3A",
};

export default function HealthRing({ systems, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const ringWidth = 10;
  const gap = 3;

  const overall = Math.round(
    systems.reduce((acc, s) => acc + s.health, 0) / systems.length
  );

  const innerClear = size * 0.32;
  const maxRings = systems.length;
  const outerR = cx - 8;
  const minR = innerClear / 2 + ringWidth / 2;
  const step = maxRings > 1 ? (outerR - minR) / (maxRings - 1) : 0;

  const valueFontPx = Math.round(size * 0.18);
  const labelFontPx = Math.max(9, Math.round(size * 0.046));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {systems.map((s, i) => {
          const r = outerR - i * step;
          if (r < minR - 0.5) return null;
          const circ = 2 * Math.PI * r;
          const offset = circ - (s.health / 100) * circ;
          return (
            <g key={s.name}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#2D2D2D"
                strokeWidth={ringWidth}
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={COLORS[s.status]}
                strokeWidth={ringWidth}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{
                  filter: `drop-shadow(0 0 6px ${COLORS[s.status]}80)`,
                  transition: "stroke-dashoffset 1s ease-out",
                }}
              />
            </g>
          );
        })}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{
          width: innerClear,
          height: innerClear,
          left: (size - innerClear) / 2,
          top: (size - innerClear) / 2,
        }}
      >
        <div
          className="font-display font-bold text-white tabular-nums leading-none"
          style={{ fontSize: valueFontPx }}
        >
          {overall}
          <span className="text-ford-blue-light">%</span>
        </div>
        <div
          className="font-display tracking-[0.25em] uppercase text-white/60 mt-1 text-center leading-tight"
          style={{ fontSize: labelFontPx }}
        >
          Saúde
          <br />
          Geral
        </div>
      </div>
    </div>
  );
}
