import type { ReportDetailDTO } from '../../types/demoAnalysis';
import DonutChart from '../charts/DonutChart';

interface SubjectPerformanceProps {
  report: ReportDetailDTO;
}

const SUBJECT_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#f97316', // orange
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // violet
];

const ATTEMPT_COLORS = {
  correct: '#15803d',
  incorrect: '#dc2626',
  unattempted: '#d1d5db',
};

/**
 * "Subject-Wise Performance Analysis" — includes:
 * 1. Marks Distribution table with Pos(+)/Neg(-)
 * 2. Overall Marks Distribution pie chart
 * 3. Correct vs Incorrect vs Unattempted per subject table
 * 4. Per-subject Attempt Distribution pie charts
 * Matches PDF Sections 1-2.
 */
const SubjectPerformance = ({ report }: SubjectPerformanceProps) => {
  const subjectBreakdown = report.breakdowns.find(b => b.scope === 'subject');
  if (!subjectBreakdown || subjectBreakdown.buckets.length === 0) return null;

  // Compute Pos(+) and Neg(-) per subject from questions
  const subjectPosNeg: Record<string, { pos: number; neg: number }> = {};
  for (const q of report.questions) {
    if (!subjectPosNeg[q.subject]) subjectPosNeg[q.subject] = { pos: 0, neg: 0 };
    const marks = parseFloat(q.awardedMarks);
    if (marks > 0) subjectPosNeg[q.subject].pos += marks;
    else if (marks < 0) subjectPosNeg[q.subject].neg += marks;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Subject-Wise Performance Analysis
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          See how your total marks are spread across each subject — including your positive and negative scores.
        </p>
      </div>

      {/* Marks Distribution Table + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 overflow-x-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Marks Distribution & Overall Balance</h4>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Pos(+)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-red-600 uppercase tracking-wider">Neg(-)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectBreakdown.buckets.map(bucket => {
                const posNeg = subjectPosNeg[bucket.label] || { pos: 0, neg: 0 };
                return (
                  <tr key={bucket.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{bucket.label}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className="font-bold text-gray-800">{bucket.score}</span>
                      <span className="text-gray-400">/{bucket.maximumMarks}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-green-600">
                      {posNeg.pos}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-red-600">
                      {posNeg.neg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-center">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Overall Marks Distribution</h4>
          <DonutChart
            size={160}
            strokeWidth={32}
            segments={subjectBreakdown.buckets.map((b, i) => ({
              value: parseFloat(b.score),
              color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
              label: b.label,
            }))}
          />
        </div>
      </div>

      {/* Correct vs Incorrect vs Unattempted table */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Correct vs. Incorrect vs. Unattempted</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Correct</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-red-600 uppercase tracking-wider">Incorrect</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unattempted</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectBreakdown.buckets.map(bucket => (
                <tr key={bucket.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{bucket.label}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-green-600">
                    {bucket.correct}<span className="text-gray-400">/{bucket.questionCount}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-red-600">
                    {bucket.incorrect}<span className="text-gray-400">/{bucket.questionCount}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-gray-500">
                    {bucket.skipped}<span className="text-gray-400">/{bucket.questionCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-subject Attempt Distribution pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subjectBreakdown.buckets.map(bucket => (
          <div key={bucket.key} className="flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{bucket.label}</h4>
            <p className="text-xs text-gray-400 mb-2">Attempt Distribution</p>
            <DonutChart
              size={140}
              strokeWidth={28}
              segments={[
                { value: bucket.correct, color: ATTEMPT_COLORS.correct, label: 'Correct' },
                { value: bucket.incorrect, color: ATTEMPT_COLORS.incorrect, label: 'Incorrect' },
                { value: bucket.skipped, color: ATTEMPT_COLORS.unattempted, label: 'Unattempted' },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectPerformance;
