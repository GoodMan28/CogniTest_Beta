import type { ReactNode } from 'react';

interface DonutChartProps {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  strokeWidth?: number;
  centerLabel?: ReactNode;
}

/**
 * Pure SVG donut chart — no external dependencies. Each segment
 * occupies a proportional arc; zero-value segments are skipped.
 */
const DonutChart = ({
  segments,
  size = 180,
  strokeWidth = 36,
  centerLabel,
}: DonutChartProps) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments
          .filter(s => s.value > 0)
          .map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const offset = -cumulativeOffset * circumference;
            cumulativeOffset += pct;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-500"
              />
            );
          })}
        {centerLabel && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold fill-gray-800"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments
          .filter(s => s.value > 0)
          .map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              {seg.label} ({total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%)
            </div>
          ))}
      </div>
    </div>
  );
};

export default DonutChart;
