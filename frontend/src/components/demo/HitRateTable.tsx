import type { ReportDetailDTO } from '../../types/demoAnalysis';

interface HitRateTableProps {
  report: ReportDetailDTO;
}

/**
 * "Hit Rate vs Hustle Rate" — shows Accuracy % (how often you hit the
 * target) vs Attempt % (how brave you were) per subject. Matches the
 * PDF sample report Section 3.
 */
const HitRateTable = ({ report }: HitRateTableProps) => {
  const subjectBreakdown = report.breakdowns.find(b => b.scope === 'subject');
  if (!subjectBreakdown || subjectBreakdown.buckets.length === 0) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Hit Rate vs. Hustle Rate
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Your Accuracy % shows how often you hit the target. Your Attempt % shows how brave you were to take a shot.
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">👉 High hustle but low hit rate? Slow down and aim better.</p>
          <p className="text-xs text-gray-500">👉 High hit rate but low hustle? You're playing too safe — time to push limits!</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy %</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subjectBreakdown.buckets.map(bucket => {
              const accuracy = bucket.accuracyPct !== null ? parseFloat(bucket.accuracyPct) : null;
              const attempt = bucket.coveragePct !== null ? parseFloat(bucket.coveragePct) : null;

              const accColor = accuracy !== null
                ? accuracy >= 80 ? 'text-green-600 font-bold' : accuracy >= 50 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'
                : 'text-gray-400';

              const attColor = attempt !== null
                ? attempt >= 80 ? 'text-green-600 font-bold' : attempt >= 50 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'
                : 'text-gray-400';

              return (
                <tr key={bucket.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-700">{bucket.label}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center ${accColor}`}>
                    {accuracy !== null ? `${bucket.accuracyPct}%` : 'N/A'}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center ${attColor}`}>
                    {attempt !== null ? `${bucket.coveragePct}%` : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HitRateTable;
