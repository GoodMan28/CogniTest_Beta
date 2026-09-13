import type { ReportAnalysis } from '../../types/reportAnalysis';
import { subjectColor } from '../../types/reportAnalysis';
import SectionCard, { marksTone, tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
  onOpenQuestion?: (subject: string, questionId: string) => void;
}

const StatusPill = ({ status }: { status: 'correct' | 'incorrect' | 'unanswered' }) => {
  if (status === 'correct') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
        <span className="material-symbols-outlined text-[14px]">check_circle</span> Correct
      </span>
    );
  }
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
 * "Question-by-Question Breakdown: Learn from Every Move" — one row per
 * question with status, chapter, difficulty, cohort correctness rate, and
 * marks. Highlights questions most/fewest students got right vs. this
 * student's own result. Matches PDF Section 7.
 */
const QuestionBreakdownSection = ({ analysis, onOpenQuestion }: Props) => {
  const { subjects, questions, cohort } = analysis;
  if (questions.length === 0) return null;

  const bySubject = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!bySubject.has(q.subject)) bySubject.set(q.subject, []);
    bySubject.get(q.subject)!.push(q);
  }

  return (
    <SectionCard
      icon="manage_search" iconColor="text-indigo-600"
      title="Question-by-Question Breakdown: Learn from Every Move"
      description="This section takes you inside your paper — one question at a time. See your status (correct, incorrect, or unattempted), the chapter it belongs to, and how others performed on the same question."
      tips={["Use it to spot your concept gaps. If most students got it right but you missed it — revise that concept. If few students got it right and you did — that's a genuine strength."]}
      action={<div className="text-xs text-gray-500 font-medium">Batch size: {cohort.size}</div>}
    >
      {subjects.map((s, i) => {
        const rows = bySubject.get(s.label) || [];
        if (rows.length === 0) return null;
        const correct = rows.filter(q => q.status === 'correct').length;
        const incorrect = rows.filter(q => q.status === 'incorrect').length;
        const skipped = rows.filter(q => q.status === 'unanswered').length;

        return (
          <div key={s.key} className="mb-8 last:mb-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColor(s.label, i) }} />
              <h4 className="text-base font-black text-gray-800">{s.label}</h4>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-3">
              {rows.length} questions · {correct} correct · {incorrect} incorrect · {skipped} skipped
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={`${thClass} text-left w-16`}>Q.No.</th>
                    <th className={`${thClass} text-left w-28`}>Status</th>
                    <th className={`${thClass} text-left`}>Chapter</th>
                    <th className={`${thClass} text-left w-24`}>Difficulty</th>
                    <th className={`${thClass} text-center w-40`}>% Student Correct</th>
                    <th className={`${thClass} text-center w-20`}>Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(q => {
                    const missedButMostGotIt = q.status !== 'correct' && q.pctStudentsCorrect >= 70;
                    const gotItButRare = q.status === 'correct' && q.pctStudentsCorrect < 40;
                    const clickable = !!onOpenQuestion;
                    return (
                      <tr
                        key={q.questionNo}
                        onClick={() => onOpenQuestion?.(q.subject, q.questionId)}
                        title={clickable ? `Open in ${q.subject} tab` : undefined}
                        className={`${missedButMostGotIt ? 'bg-amber-50/60' : ''} ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      >
                        <td className={`${tdClass} font-bold text-gray-900`}>{q.questionNo}</td>
                        <td className={tdClass}><StatusPill status={q.status} /></td>
                        <td className={`${tdClass} text-gray-600`}>{q.chapter.join(', ')}</td>
                        <td className={tdClass}>
                          {q.difficulty === 'Unrated' ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{q.difficulty}</span>
                          )}
                        </td>
                        <td className={`${tdClass} text-center`}>
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-bold ${missedButMostGotIt ? 'text-amber-700' : gotItButRare ? 'text-green-700' : 'text-gray-600'}`}>
                              {q.pctStudentsCorrect}%{gotItButRare ? <> <span className="material-symbols-outlined text-[12px] text-green-700">star</span></> : ''}
                            </span>
                            <span className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden inline-block">
                              <span className="h-full block bg-gray-400 rounded-full" style={{ width: `${q.pctStudentsCorrect}%` }} />
                            </span>
                          </div>
                        </td>
                        <td className={`${tdClass} text-center font-bold ${marksTone(q.awardedMarks)}`}>
                          {q.awardedMarks > 0 ? `+${q.awardedMarks}` : q.awardedMarks}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </SectionCard>
  );
};

export default QuestionBreakdownSection;
