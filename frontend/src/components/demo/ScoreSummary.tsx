import type { ReportDetailDTO } from '../../types/demoAnalysis';
import DonutChart from '../charts/DonutChart';

interface ScoreSummaryProps {
  report: ReportDetailDTO;
}

/**
 * "Scoreboard: Where You Stand Right Now" — hero section with score,
 * accuracy, attempt %, question cards, and a question distribution
 * donut chart. Matches PDF Section 1.
 */
const ScoreSummary = ({ report }: ScoreSummaryProps) => {
  const { summary, test } = report;

  const accuracy = summary.accuracyPct !== null ? `${summary.accuracyPct}%` : 'N/A';
  const attempt = summary.coveragePct !== null ? `${summary.coveragePct}%` : 'N/A';

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-5 mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">💪</span>
          Scoreboard: Where You Stand Right Now
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Here you can see your total marks and question-wise breakup.
          The accuracy and attempt ratio reveal how effectively you used your time in the test.
          Aim to increase both attempt and accuracy together — that's the real growth formula.
        </p>
        <p className="text-xs text-gray-400 mt-1">{test.title} · {test.examType}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-1">🏆 Marks Scored</div>
          <div className="text-2xl font-bold text-indigo-700">
            {summary.score}<span className="text-base text-indigo-400">/{summary.maximumMarks}</span>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="text-xs font-medium text-purple-500 uppercase tracking-wider mb-1">🎯 Accuracy</div>
          <div className="text-2xl font-bold text-purple-700">{accuracy}</div>
        </div>

        <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
          <div className="text-xs font-medium text-teal-500 uppercase tracking-wider mb-1">📈 Attempt</div>
          <div className="text-2xl font-bold text-teal-700">{attempt}</div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">📝 Questions</div>
          <div className="text-2xl font-bold text-blue-700">{summary.questionCount}</div>
        </div>
      </div>

      {/* Question count cards + donut chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200 text-center">
            <div className="text-green-500 text-lg mb-1">✓</div>
            <div className="text-2xl font-bold text-green-700">{summary.correct}</div>
            <div className="text-xs text-green-600 font-medium">Questions Correct</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200 text-center">
            <div className="text-red-500 text-lg mb-1">✗</div>
            <div className="text-2xl font-bold text-red-700">{summary.incorrect}</div>
            <div className="text-xs text-red-600 font-medium">Questions Incorrect</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 text-center">
            <div className="text-gray-400 text-lg mb-1">○</div>
            <div className="text-2xl font-bold text-gray-700">{summary.skipped}</div>
            <div className="text-xs text-gray-600 font-medium">Questions Unattempted</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Question Distribution</h4>
          <DonutChart
            size={170}
            strokeWidth={32}
            segments={[
              { value: summary.correct, color: '#15803d', label: 'Correct' },
              { value: summary.incorrect, color: '#dc2626', label: 'Incorrect' },
              { value: summary.skipped, color: '#d1d5db', label: 'Unattempted' },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-right">
        Computed: {new Date(test.computedAt).toLocaleString()}
      </p>
    </div>
  );
};

export default ScoreSummary;
