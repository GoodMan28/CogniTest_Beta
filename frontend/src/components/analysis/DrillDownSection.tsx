import { Fragment, useMemo, useState } from 'react';
import type { ReportAnalysis } from '../../types/reportAnalysis';
import { subjectColor } from '../../types/reportAnalysis';
import SectionCard, { fmtPct, pctTone, tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
  defaultExpanded?: boolean;
}

/**
 * "Drill Down Mode: Track Every Concept You Touched" — chapter breakdown per
 * subject, expandable to per-topic sub-rows. Matches PDF Section 9.
 */
const DrillDownSection = ({ analysis, defaultExpanded }: Props) => {
  const { chapters, subjects } = analysis;

  const allChapterKeys = useMemo(
    () => Object.values(chapters).flatMap(list => list.map(c => c.key)),
    [chapters]
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(defaultExpanded ? allChapterKeys : [])
  );

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const subjectsWithChapters = subjects.filter(s => (chapters[s.label] || []).length > 0);
  if (subjectsWithChapters.length === 0) return null;

  return (
    <SectionCard
      icon="manage_search" iconColor="text-indigo-600"
      title="Drill Down Mode: Track Every Concept You Touched"
      description="This section shows how you performed in each chapter — with counts of correct, incorrect, and skipped questions."
      tips={['Click on any chapter to open its subtopics and see where you\'re truly mastering concepts and where small gaps remain. Use it to focus your revision smartly — chapter by chapter, concept by concept.']}
    >
      {subjectsWithChapters.map((s, i) => {
        const chapterList = chapters[s.label] || [];
        return (
          <div key={s.key} className="mb-8 last:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColor(s.label, i) }} />
              <h4 className="text-base font-black text-gray-800">{s.label}</h4>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={`${thClass} text-left`}>Chapter</th>
                    <th className={`${thClass} text-center w-20`}>Correct</th>
                    <th className={`${thClass} text-center w-20`}>Incorrect</th>
                    <th className={`${thClass} text-center w-20`}>Skipped</th>
                    <th className={`${thClass} text-center w-24`}>Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chapterList.map(chapter => {
                    const isOpen = expanded.has(chapter.key);
                    return (
                      <Fragment key={chapter.key}>
                        <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggle(chapter.key)}>
                          <td className={`${tdClass} font-medium text-gray-900 whitespace-normal`}>
                            <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-gray-400">
                              {isOpen ? 'expand_more' : 'chevron_right'}
                            </span>
                            {chapter.label}
                          </td>
                          <td className={`${tdClass} text-center font-black text-green-600`}>{chapter.correct}</td>
                          <td className={`${tdClass} text-center font-black text-red-500`}>{chapter.incorrect}</td>
                          <td className={`${tdClass} text-center font-black text-amber-500`}>{chapter.skipped}</td>
                          <td className={`${tdClass} text-center font-black ${pctTone(chapter.accuracyPct)}`}>{fmtPct(chapter.accuracyPct)}</td>
                        </tr>
                        {isOpen && (
                          chapter.topics.length > 0 ? (
                            chapter.topics.map(topic => (
                              <tr key={`${chapter.key}::${topic.key}`} className="bg-gray-50">
                                <td className={`${tdClass} pl-10 text-xs text-gray-600 italic whitespace-normal`}>↳ {topic.label}</td>
                                <td className={`${tdClass} text-center text-xs text-green-500`}>{topic.correct}</td>
                                <td className={`${tdClass} text-center text-xs text-red-500`}>{topic.incorrect}</td>
                                <td className={`${tdClass} text-center text-xs text-amber-500`}>{topic.skipped}</td>
                                <td className={`${tdClass} text-center text-xs ${pctTone(topic.accuracyPct)}`}>{fmtPct(topic.accuracyPct)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr key={`${chapter.key}::empty`} className="bg-gray-50">
                              <td colSpan={5} className={`${tdClass} pl-10 text-xs text-gray-400 italic`}>No topic tags on these questions.</td>
                            </tr>
                          )
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              A question tagged with several chapters is counted in each — chapter totals can exceed the subject total.
            </p>
          </div>
        );
      })}
    </SectionCard>
  );
};

export default DrillDownSection;
