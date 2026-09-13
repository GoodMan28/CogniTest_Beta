import type { ReportDetailDTO } from '../../types/demoAnalysis';

interface ComparisonTableProps {
  report: ReportDetailDTO;
}

const ComparisonTable = ({ report }: ComparisonTableProps) => {
  const { comparisons } = report;

  if (!comparisons.available) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Cohort Comparisons</h3>
        <p className="text-sm text-gray-500">{comparisons.unavailableReason}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-1">Cohort Comparisons</h3>
      <p className="text-xs text-gray-500 mb-4">
        {comparisons.cohortLabel} · {comparisons.cohortSize} evaluated students
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Your Score</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Class Average</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">{comparisons.topperLabel}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparisons.rows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.label}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-indigo-600 font-bold">{row.yourScore}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">{row.classAverage}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">{row.topperScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-3">
        Computed {new Date(comparisons.computedAt).toLocaleString()}
      </p>
    </div>
  );
};

export default ComparisonTable;
