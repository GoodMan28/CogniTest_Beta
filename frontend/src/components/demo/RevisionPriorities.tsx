import type { InsightLabel, ReportDetailDTO } from '../../types/demoAnalysis';

interface RevisionPrioritiesProps {
  report: ReportDetailDTO;
}

const LABEL_STYLES: Record<InsightLabel, string> = {
  Strength: 'bg-green-100 text-green-700',
  Developing: 'bg-blue-100 text-blue-700',
  'Needs improvement': 'bg-red-100 text-red-700',
  'Limited evidence': 'bg-gray-100 text-gray-600',
};

const RevisionPriorities = ({ report }: RevisionPrioritiesProps) => {
  const { revisionList, insights } = report;
  const labeledInsights = insights.filter(i => i.label !== 'Limited evidence');

  return (
    <div className="space-y-6">
      {revisionList.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revision Priorities</h3>
          <ul className="space-y-4">
            {revisionList.map(item => (
              <li key={`${item.subject}::${item.topic}`} className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm mt-0.5 mr-3">
                  {item.rank}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.subject} · {item.topic}</p>
                  <p className="text-sm text-gray-600">
                    Lost {item.marksLost} marks ({item.reason === 'skipped' ? 'mostly skipped' : 'mostly inaccurate'}
                    , question{item.questionNos.length > 1 ? 's' : ''} {item.questionNos.join(', ')})
                  </p>
                  {item.practiceCount > 0 && (
                    <p className="text-xs text-indigo-600 mt-0.5">{item.practiceCount} practice question{item.practiceCount > 1 ? 's' : ''} available</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {labeledInsights.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Topic Insights</h3>
          <p className="text-xs text-gray-400 mb-3">Heuristic labels based on this test only — not a validated diagnosis.</p>
          <ul className="space-y-2">
            {labeledInsights.map(insight => (
              <li key={insight.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{insight.subject} · {insight.topic}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LABEL_STYLES[insight.label]}`}>
                  {insight.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RevisionPriorities;
