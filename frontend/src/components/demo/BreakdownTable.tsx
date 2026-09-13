import { useState } from 'react';
import type { Breakdown, ReportDetailDTO } from '../../types/demoAnalysis';

interface BreakdownTableProps {
  report: ReportDetailDTO;
}

const renderBucketTable = (breakdown: Breakdown) => {
  if (breakdown.buckets.length === 0) {
    return (
      <div className="mt-3 p-4 text-sm text-gray-500 bg-gray-50 rounded">
        No questions in this category.
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto">
      {breakdown.overlapping && (
        <p className="text-xs text-amber-600 mb-2 font-medium">
          Overlapping categories; do not sum rows.
        </p>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{breakdown.label}</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {breakdown.buckets.map(bucket => (
            <tr key={bucket.key}>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{bucket.label}</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                {bucket.score} / {bucket.maximumMarks}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                {bucket.coveragePct !== null ? `${bucket.coveragePct}%` : 'Not enough data'}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                {bucket.accuracyPct !== null ? `${bucket.accuracyPct}%` : 'Not enough data'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BreakdownTable = ({ report }: BreakdownTableProps) => {
  const [showMore, setShowMore] = useState(false);
  const byScope = Object.fromEntries(report.breakdowns.map(b => [b.scope, b])) as Record<string, Breakdown>;

  const primary: Array<{ title: string; breakdown?: Breakdown }> = [
    { title: 'Subject', breakdown: byScope.subject },
    { title: 'Difficulty', breakdown: byScope.difficulty },
  ];
  const more: Array<{ title: string; breakdown?: Breakdown }> = [
    { title: 'Subject × Difficulty', breakdown: byScope.subjectDifficulty },
    { title: 'Question Type', breakdown: byScope.questionType },
    { title: 'Unit', breakdown: byScope.unit },
    { title: 'Chapter', breakdown: byScope.chapter },
    { title: 'Topic', breakdown: byScope.topic },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {primary.map(({ title, breakdown }) => (
          <div key={title} className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">{title} Breakdown</h3>
            {breakdown ? renderBucketTable(breakdown) : (
              <div className="mt-3 p-4 text-sm text-gray-500 bg-gray-50 rounded">No questions in this category.</div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <button
          onClick={() => setShowMore(s => !s)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          {showMore ? 'Hide detailed breakdowns' : 'Show unit / chapter / topic / question-type breakdowns'}
        </button>
        {showMore && (
          <div className="mt-4 space-y-6">
            {more.map(({ title, breakdown }) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
                {breakdown ? renderBucketTable(breakdown) : (
                  <div className="mt-3 p-4 text-sm text-gray-500 bg-gray-50 rounded">No questions in this category.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BreakdownTable;
