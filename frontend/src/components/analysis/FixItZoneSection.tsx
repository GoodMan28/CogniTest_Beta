import { useState } from 'react';
import type { ReportAnalysis } from '../../types/reportAnalysis';
import { FIX_IT_REASONS, subjectColor } from '../../types/reportAnalysis';
import SectionCard, { tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
  onSaveReason: (questionNo: number, reason: string) => Promise<void>;
  onFixIt: (questionNo: number, label: string) => void;
  onOpenQuestion?: (subject: string, questionId: string) => void;
  onPracticeAll?: () => void;
  readOnly?: boolean;
}

const StatusPill = ({ status }: { status: 'incorrect' | 'unanswered' }) => {
  if (status === 'incorrect') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="material-symbols-outlined text-[14px]">cancel</span> Incorrect
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
      <span className="material-symbols-outlined text-[14px]">hourglass_empty</span> Skipped
    </span>
  );
};

/**
 * "Fix It Zone: Because Every Mistake Has a Comeback" — every missed/skipped
 * question, a reason dropdown persisted via onSaveReason, and a Fix It
 * button that opens targeted practice. Matches PDF Section 8.
 */
const FixItZoneSection = ({ analysis, onSaveReason, onFixIt, onOpenQuestion, onPracticeAll, readOnly }: Props) => {
  const fixable = analysis.questions.filter(q => q.status !== 'correct');

  // Seeded once from the report's saved reasons. The caller mounts this
  // component with `key={analysis.reportId}` so switching to a different
  // report remounts it fresh instead of needing an effect to re-seed here.
  const [reasons, setReasons] = useState<Record<number, string>>(() => {
    const seeded: Record<number, string> = {};
    for (const q of analysis.questions) {
      if (q.reason) seeded[q.questionNo] = q.reason;
    }
    return seeded;
  });
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [failedFor, setFailedFor] = useState<number | null>(null);

  if (fixable.length === 0) {
    return (
      <SectionCard icon="build" iconColor="text-red-500" title="Fix It Zone: Because Every Mistake Has a Comeback">
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm font-bold text-green-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-600">celebration</span>
          Nothing to fix — every question you attempted was correct. <span className="material-symbols-outlined text-[20px] text-green-600 mr-2">celebration</span>
        </div>
      </SectionCard>
    );
  }

  const bySubject = new Map<string, typeof fixable>();
  for (const q of fixable) {
    if (!bySubject.has(q.subject)) bySubject.set(q.subject, []);
    bySubject.get(q.subject)!.push(q);
  }

  const handleReasonChange = async (questionNo: number, reason: string) => {
    const prev = reasons[questionNo] || '';
    setReasons(r => ({ ...r, [questionNo]: reason }));
    setSaving(s => ({ ...s, [questionNo]: true }));
    setFailedFor(null);
    try {
      await onSaveReason(questionNo, reason);
    } catch {
      setReasons(r => ({ ...r, [questionNo]: prev }));
      setFailedFor(questionNo);
      setTimeout(() => setFailedFor(f => (f === questionNo ? null : f)), 3000);
    } finally {
      setSaving(s => ({ ...s, [questionNo]: false }));
    }
  };

  const taggedCount = fixable.filter(q => reasons[q.questionNo]).length;

  return (
    <SectionCard
      icon="build" iconColor="text-red-500"
      title="Fix It Zone: Because Every Mistake Has a Comeback"
      description="Here's your repair shop for marks. See every question you missed or skipped, pick the reason, and hit Fix It — you'll instantly get a similar question to practice."
      action={onPracticeAll ? (
        <button
          onClick={onPracticeAll}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
        >
          Practice Your Incorrect &amp; Skipped Questions
        </button>
      ) : undefined}
    >
      {Array.from(bySubject.entries()).map(([subject, rows], i) => (
        <div key={subject} className="mb-8 last:mb-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColor(subject, i) }} />
            <h4 className="text-base font-black text-gray-800">{subject}</h4>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={`${thClass} text-left w-16`}>Q.No.</th>
                  <th className={`${thClass} text-left w-28`}>Status</th>
                  <th className={`${thClass} text-left`}>Chapter</th>
                  <th className={`${thClass} text-left w-56`}>Reason</th>
                  <th className={`${thClass} text-center w-24`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(q => (
                  <tr key={q.questionNo}>
                    <td className={tdClass}>
                      <button
                        onClick={() => onOpenQuestion?.(q.subject, q.questionId)}
                        className={`font-bold text-gray-900 ${onOpenQuestion ? 'hover:underline hover:text-blue-600' : ''}`}
                      >
                        Q{q.questionNo}
                      </button>
                    </td>
                    <td className={tdClass}><StatusPill status={q.status as 'incorrect' | 'unanswered'} /></td>
                    <td className={`${tdClass} text-gray-600`}>{q.chapter.join(', ')}</td>
                    <td className={tdClass}>
                      <select
                        value={reasons[q.questionNo] || ''}
                        disabled={!!readOnly || !!saving[q.questionNo]}
                        onChange={e => handleReasonChange(q.questionNo, e.target.value)}
                        className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">Select reason...</option>
                        {FIX_IT_REASONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {failedFor === q.questionNo && (
                        <p className="text-[11px] text-red-600 font-bold mt-1">Couldn't save</p>
                      )}
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <button
                        onClick={() => onFixIt(q.questionNo, `Q${q.questionNo} · ${q.subject} · ${q.chapter.join(', ')}`)}
                        className="inline-flex items-center gap-0.5 text-indigo-700 text-xs font-bold hover:underline whitespace-nowrap"
                      >
                        {q.hasLinkedPractice && (
                          <span className="material-symbols-outlined text-[14px]" title="Has authored practice questions">bookmark</span>
                        )}
                        <span className="material-symbols-outlined text-[14px] text-indigo-700">edit</span> Fix it
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 font-medium mt-2">
        {fixable.length} question{fixable.length !== 1 ? 's' : ''} to fix · {taggedCount} tagged with a reason
      </p>
    </SectionCard>
  );
};

export default FixItZoneSection;
