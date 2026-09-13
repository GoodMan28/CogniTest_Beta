import { useState } from 'react';
import type { ReportDetailDTO, MetricBucket } from '../../types/demoAnalysis';

interface ChapterDrillDownProps {
  report: ReportDetailDTO;
}

/**
 * "Drill Down Mode: Track Every Concept You Touched" — shows chapter
 * breakdown per subject with correct/incorrect/skipped counts and
 * expandable topic rows. Matches PDF Section 9.
 */
const ChapterDrillDown = ({ report }: ChapterDrillDownProps) => {
  const chapterBreakdown = report.breakdowns.find(b => b.scope === 'chapter');
  const topicBreakdown = report.breakdowns.find(b => b.scope === 'topic');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!chapterBreakdown || chapterBreakdown.buckets.length === 0) return null;

  // Group chapters by subject
  const subjectChapters: Record<string, MetricBucket[]> = {};
  for (const bucket of chapterBreakdown.buckets) {
    const subject = bucket.subject || 'Other';
    if (!subjectChapters[subject]) subjectChapters[subject] = [];
    subjectChapters[subject].push(bucket);
  }

  // Group topics by subject and chapter for drill-down
  const topicsByChapter: Record<string, MetricBucket[]> = {};
  if (topicBreakdown) {
    for (const t of topicBreakdown.buckets) {
      // We'll key topics by their subject so they appear under the right subject heading
      const subjectKey = t.subject || 'Other';
      if (!topicsByChapter[subjectKey]) topicsByChapter[subjectKey] = [];
      topicsByChapter[subjectKey].push(t);
    }
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">🔍</span>
          Drill Down Mode: Track Every Concept You Touched
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          See how you performed in each chapter — with counts of correct, incorrect, and skipped questions.
          Click on any chapter to open its subtopics and see where small gaps remain.
        </p>
      </div>

      {Object.entries(subjectChapters).map(([subject, chapters]) => (
        <div key={subject} className="mt-6">
          <h4 className="text-base font-semibold text-gray-800 mb-3">{subject}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapter</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Correct</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-red-600 uppercase tracking-wider">Incorrect</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-amber-600 uppercase tracking-wider">Skipped</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chapters.map(chapter => {
                  const isExpanded = expanded.has(chapter.key);
                  // Get matching topics for this subject
                  const topics = topicsByChapter[subject] || [];

                  return (
                    <>
                      <tr
                        key={chapter.key}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(chapter.key)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="mr-2 text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                          {chapter.label}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-green-600">
                          {chapter.correct}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-red-600">
                          {chapter.incorrect}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold text-amber-600">
                          {chapter.skipped}
                        </td>
                      </tr>
                      {isExpanded && topics.length > 0 && topics.map(topic => (
                        <tr key={`${chapter.key}-${topic.key}`} className="bg-gray-50">
                          <td className="px-4 py-2 pl-10 whitespace-nowrap text-xs text-gray-600 italic">
                            ↳ {topic.label}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-center text-green-500">
                            {topic.correct}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-center text-red-500">
                            {topic.incorrect}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs text-center text-amber-500">
                            {topic.skipped}
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChapterDrillDown;
