import type { Breakdown, ReportDetailDTO } from '../../types/demoAnalysis';
import GroupedBarChart from '../charts/GroupedBarChart';

interface DifficultyAnalysisProps {
  report: ReportDetailDTO;
}

const COLORS = {
  correct: '#15803d',    // green-700
  incorrect: '#dc2626',  // red-600
  unattempted: '#d1d5db', // gray-300
};

/**
 * "Difficulty Level Analysis" — shows grouped bar charts for
 * overall difficulty and per-subject difficulty breakdowns.
 * Matches PDF Section 5.
 */
const DifficultyAnalysis = ({ report }: DifficultyAnalysisProps) => {
  const difficultyBreakdown = report.breakdowns.find(b => b.scope === 'difficulty');
  const subjectDifficultyBreakdown = report.breakdowns.find(b => b.scope === 'subjectDifficulty');

  if (!difficultyBreakdown || difficultyBreakdown.buckets.length === 0) return null;

  const makeGroups = (breakdown: Breakdown) => {
    return breakdown.buckets.map(bucket => ({
      label: bucket.label,
      values: [
        { value: bucket.correct, color: COLORS.correct, label: 'Correct' },
        { value: bucket.incorrect, color: COLORS.incorrect, label: 'Incorrect' },
        { value: bucket.skipped, color: COLORS.unattempted, label: 'Unattempted' },
      ],
    }));
  };

  // Group subjectDifficulty by subject
  const subjectGroups: Record<string, Breakdown['buckets']> = {};
  if (subjectDifficultyBreakdown) {
    for (const bucket of subjectDifficultyBreakdown.buckets) {
      const subject = bucket.subject || 'Other';
      if (!subjectGroups[subject]) subjectGroups[subject] = [];
      subjectGroups[subject].push(bucket);
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Difficulty Level Analysis
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Every question has a level — Easy, Medium, or Tough. These charts show how you handled each zone.
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">👉 Easy ones you missed = free marks lost.</p>
          <p className="text-xs text-gray-500">👉 Tough ones you cracked = real strength.</p>
        </div>
      </div>

      {/* Overall difficulty */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Overall difficulty analysis</h4>
        <GroupedBarChart groups={makeGroups(difficultyBreakdown)} />
      </div>

      {/* Per-subject difficulty */}
      {Object.entries(subjectGroups).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {Object.entries(subjectGroups).map(([subject, buckets]) => {
            const groups = buckets.map(b => ({
              label: b.label.replace(`${subject} `, '').replace(`${subject}::`, ''),
              values: [
                { value: b.correct, color: COLORS.correct, label: 'Correct' },
                { value: b.incorrect, color: COLORS.incorrect, label: 'Incorrect' },
                { value: b.skipped, color: COLORS.unattempted, label: 'Unattempted' },
              ],
            }));
            return (
              <div key={subject}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{subject} difficulty analysis</h4>
                <GroupedBarChart groups={groups} height={180} barWidth={22} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DifficultyAnalysis;
