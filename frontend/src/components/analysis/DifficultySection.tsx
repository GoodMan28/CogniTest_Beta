import type { ReportAnalysis } from '../../types/reportAnalysis';
import { STATUS_COLORS } from '../../types/reportAnalysis';
import GroupedBarChart from '../charts/GroupedBarChart';
import SectionCard, { fmtPct, marksTone, pctTone, tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
}

/**
 * "Difficulty Level Analysis" — grouped bar charts for overall and per-subject
 * Easy/Medium/Tough handling, plus a summary table. Matches PDF Section 5.
 */
const DifficultySection = ({ analysis }: Props) => {
  const { difficulty, subjects } = analysis;
  if (!difficulty.overall || difficulty.overall.length === 0) return null;

  const allUnrated = difficulty.overall.every(d => d.label === 'Unrated');

  const toGroups = (buckets: typeof difficulty.overall) =>
    buckets.map(b => ({
      label: b.label,
      values: [
        { value: b.correct, color: STATUS_COLORS.correct, label: 'Correct' },
        { value: b.incorrect, color: STATUS_COLORS.incorrect, label: 'Incorrect' },
        { value: b.skipped, color: STATUS_COLORS.unanswered, label: 'Unattempted' },
      ],
    }));

  const subjectOrder = subjects.map(s => s.label);

  return (
    <SectionCard
      icon="trending_up" iconColor="text-indigo-600"
      title="Difficulty Level Analysis"
      description="Every question has a level — Easy, Medium, or Tough. These charts show how you handled each zone across all subjects."
      tips={['Easy ones you missed = free marks lost.', 'Tough ones you cracked = real strength.']}
    >
      {allUnrated && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
          Difficulty tags aren't available for this paper yet, so all questions are shown as Unrated.
        </div>
      )}

      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Overall difficulty analysis</h4>
        <GroupedBarChart groups={toGroups(difficulty.overall)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 mb-8">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={`${thClass} text-left`}>Level</th>
              <th className={`${thClass} text-center`}>Correct</th>
              <th className={`${thClass} text-center`}>Incorrect</th>
              <th className={`${thClass} text-center`}>Unattempted</th>
              <th className={`${thClass} text-center`}>Accuracy %</th>
              <th className={`${thClass} text-center`}>Attempt %</th>
              <th className={`${thClass} text-center`}>Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {difficulty.overall.map(b => (
              <tr key={b.key}>
                <td className={`${tdClass} font-bold text-gray-900`}>{b.label}</td>
                <td className={`${tdClass} text-center font-black text-green-700`}>{b.correct}</td>
                <td className={`${tdClass} text-center font-black text-red-600`}>{b.incorrect}</td>
                <td className={`${tdClass} text-center font-black text-gray-500`}>{b.skipped}</td>
                <td className={`${tdClass} text-center font-black ${pctTone(b.accuracyPct)}`}>{fmtPct(b.accuracyPct)}</td>
                <td className={`${tdClass} text-center font-black ${pctTone(b.attemptPct)}`}>{fmtPct(b.attemptPct)}</td>
                <td className={`${tdClass} text-center font-black ${marksTone(b.score)}`}>{b.score}<span className="text-gray-400 text-xs font-medium">/{b.maxMarks}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.keys(difficulty.bySubject).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjectOrder
            .filter(s => (difficulty.bySubject[s] || []).length > 0)
            .map(subject => (
              <div key={subject}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{subject} difficulty analysis</h4>
                <GroupedBarChart groups={toGroups(difficulty.bySubject[subject])} height={180} barWidth={22} />
              </div>
            ))}
        </div>
      )}
    </SectionCard>
  );
};

export default DifficultySection;
