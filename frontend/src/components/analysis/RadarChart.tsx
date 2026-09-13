import { useState } from 'react';
import { SUBJECT_HEX } from '../../utils/radarUtils';

interface CategoryAccuracy {
  category: string;
  accuracy: number;
  count: number;
}

interface RadarChartProps {
  categoryAccuracies: CategoryAccuracy[];
  subject: string;
  theme: { stroke: string; bg?: string; text?: string }; // from SUBJECT_THEMES or similar
  onCategoryHover?: (category: string | null) => void;
}

const RadarChart = ({ categoryAccuracies, subject, theme, onCategoryHover }: RadarChartProps) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<CategoryAccuracy | null>(null);

  const cx = 150;
  const cy = 135;
  const radius = 80;
  const numPoints = categoryAccuracies.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map(level => {
    return Array.from({ length: numPoints }).map((_, i) => {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const x = cx + radius * level * Math.cos(angle);
      const y = cy + radius * level * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  });

  const getPoints = (accuracies: CategoryAccuracy[]) => {
    return accuracies.map((item, i) => {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const scoreFraction = Math.min(Math.max(item.accuracy, 10), 100) / 100;
      const x = cx + radius * scoreFraction * Math.cos(angle);
      const y = cy + radius * scoreFraction * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const hexTheme = SUBJECT_HEX[subject] || { fill: 'rgba(107, 114, 128, 0.2)', stroke: '#4b5563' };

  return (
    <div className="w-full flex items-center justify-center relative">
      <svg viewBox="0 0 300 270" width="100%" height="100%" className="overflow-visible">
        {gridPaths.map((path, idx) => (
          <polygon key={idx} points={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}

        {categoryAccuracies.map((_, i) => {
          const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" />;
        })}

        <polygon
          points={getPoints(categoryAccuracies)}
          fill={hexTheme.fill}
          strokeWidth="0"
          className="transition-all duration-500"
        />
        <polygon
          points={getPoints(categoryAccuracies)}
          fill="none"
          stroke={hexTheme.stroke}
          strokeWidth="2.5"
          className="transition-all duration-500"
        />

        {categoryAccuracies.map((item, i) => {
          const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
          const scoreFraction = Math.min(Math.max(item.accuracy, 10), 100) / 100;
          const x = cx + radius * scoreFraction * Math.cos(angle);
          const y = cy + radius * scoreFraction * Math.sin(angle);
          const isHovered = hoveredCategory === item.category;

          return (
            <g key={i} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                fill={isHovered ? hexTheme.stroke : '#ffffff'}
                stroke={hexTheme.stroke}
                strokeWidth="2"
                className="transition-all duration-150"
                onMouseEnter={(e) => {
                  setHoveredCategory(item.category);
                  onCategoryHover?.(item.category);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + window.scrollX - 70, y: rect.top + window.scrollY - 85 });
                  setTooltipContent(item);
                }}
                onMouseLeave={() => {
                  setHoveredCategory(null);
                  onCategoryHover?.(null);
                  setTooltipPos(null);
                  setTooltipContent(null);
                }}
              />
            </g>
          );
        })}

        {categoryAccuracies.map((item, i) => {
          const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
          const labelOffset = 18;
          const lx = cx + (radius + labelOffset) * Math.cos(angle);
          const ly = cy + (radius + labelOffset) * Math.sin(angle);

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.1) textAnchor = 'start';
          if (Math.cos(angle) < -0.1) textAnchor = 'end';

          const isHovered = hoveredCategory === item.category;

          return (
            <text
              key={`label-${i}`}
              x={lx}
              y={ly + 4}
              textAnchor={textAnchor}
              className={`text-[9px] sm:text-[10px] font-bold transition-colors ${
                isHovered ? theme.text : 'fill-gray-500'
              }`}
            >
              {item.category}
            </text>
          );
        })}
      </svg>

      {tooltipPos && tooltipContent && (
        <div
          className="absolute z-20 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs flex flex-col gap-1 border border-gray-800"
          style={{ left: tooltipPos.x - 30, top: tooltipPos.y - 120 }}
        >
          <span className="font-black uppercase tracking-wider text-[10px] text-gray-400">
            {tooltipContent.category}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-black text-white">{tooltipContent.accuracy}%</span>
            <span className="text-[10px] text-gray-400 font-semibold">{tooltipContent.count} questions attempts</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarChart;
