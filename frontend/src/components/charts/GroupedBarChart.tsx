interface BarGroup {
  label: string;
  values: Array<{ value: number; color: string; label: string }>;
}

interface GroupedBarChartProps {
  groups: BarGroup[];
  height?: number;
  barWidth?: number;
}

/**
 * Pure SVG grouped bar chart — renders clusters of bars per group.
 * Used for Difficulty Level Analysis (correct/incorrect/unattempted per Easy/Medium/Hard).
 */
const GroupedBarChart = ({
  groups,
  height = 220,
  barWidth = 28,
}: GroupedBarChartProps) => {
  const maxVal = Math.max(
    1,
    ...groups.flatMap(g => g.values.map(v => v.value))
  );

  const padding = { top: 24, right: 16, bottom: 48, left: 36 };
  const barsPerGroup = groups[0]?.values.length || 0;
  const groupWidth = barsPerGroup * barWidth + (barsPerGroup - 1) * 4 + 24;
  const chartWidth = padding.left + groups.length * groupWidth + padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal / tickCount) * i)
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="mx-auto"
      >
        {/* Y-axis ticks + grid */}
        {ticks.map(tick => {
          const y = padding.top + chartHeight - (tick / maxVal) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-400"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bar groups */}
        {groups.map((group, gi) => {
          const groupX = padding.left + gi * groupWidth + 12;
          return (
            <g key={group.label}>
              {group.values.map((v, vi) => {
                const barH = (v.value / maxVal) * chartHeight;
                const x = groupX + vi * (barWidth + 4);
                const y = padding.top + chartHeight - barH;
                return (
                  <g key={vi}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 0)}
                      fill={v.color}
                      rx={3}
                      className="transition-all duration-300"
                    />
                    {v.value > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 4}
                        textAnchor="middle"
                        className="text-[10px] font-semibold fill-gray-700"
                      >
                        {v.value}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Group label */}
              <text
                x={groupX + (barsPerGroup * (barWidth + 4) - 4) / 2}
                y={height - 10}
                textAnchor="middle"
                className="text-xs fill-gray-600 font-medium"
              >
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2">
        {groups[0]?.values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: v.color }}
            />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupedBarChart;
