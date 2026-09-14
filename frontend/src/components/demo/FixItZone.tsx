import { useState } from 'react';
import PracticeQuestionCard from './PracticeQuestionCard';
import type { PracticeQuestionDTO, ReflectionItemDTO, ReportDetailDTO } from '../../types/demoAnalysis';

interface FixItZoneProps {
  report: ReportDetailDTO;
  getPracticeQuestions: (questionNo: number) => Promise<PracticeQuestionDTO[]>;
  updateReflection: (
    questionNo: number,
    text: string,
    buildId: string,
    contentHash: string
  ) => Promise<ReflectionItemDTO | null | undefined>;
}

const REASONS = [
  'Calculation Mistake',
  'Formula/Concept Wrong Applied',
  "Didn't Understand Q",
  'Tukka but Wrong',
  'Time Ran Out',
  'Formula/Concept Forgotten',
] as const;

/**
 * "Fix It Zone: Because Every Mistake Has a Comeback" — lists only
 * incorrect and skipped questions with a structured reason dropdown
 * and a "Fix it" button that opens practice. Matches PDF Section 8.
 */
const FixItZone = ({ report, getPracticeQuestions }: FixItZoneProps) => {
  const fixableQuestions = report.questions.filter(q => q.status !== 'correct');
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [practiceOpen, setPracticeOpen] = useState<number | null>(null);
  const [practiceData, setPracticeData] = useState<PracticeQuestionDTO[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);

  if (fixableQuestions.length === 0) return null;

  // Group by subject
  const bySubject: Record<string, typeof fixableQuestions> = {};
  for (const q of fixableQuestions) {
    if (!bySubject[q.subject]) bySubject[q.subject] = [];
    bySubject[q.subject].push(q);
  }

  const handleFixIt = async (questionNo: number) => {
    if (practiceOpen === questionNo) {
      setPracticeOpen(null);
      return;
    }
    setPracticeLoading(true);
    try {
      const data = await getPracticeQuestions(questionNo);
      setPracticeData(data);
      setPracticeOpen(questionNo);
    } catch {
      setPracticeData([]);
      setPracticeOpen(questionNo);
    } finally {
      setPracticeLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🔧</span>
            Fix It Zone: Because Every Mistake Has a Comeback
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            See every question you missed or skipped, pick the reason, and hit Fix It — you'll get practice questions to master that concept.
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
          {fixableQuestions.length} question{fixableQuestions.length !== 1 ? 's' : ''} to fix
        </div>
      </div>

      {Object.entries(bySubject).map(([subject, questions]) => (
        <div key={subject} className="mt-6">
          <h4 className="text-base font-semibold text-gray-800 mb-3">{subject}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Q.No.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapter</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Reason</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map(q => (
                  <tr key={q.questionNo} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-700">
                      Q{q.questionNo}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        q.status === 'incorrect'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {q.status === 'incorrect' ? '✗ Incorrect' : '○ Skipped'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {q.chapter.join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={reasons[q.questionNo] || ''}
                        onChange={e => setReasons(prev => ({ ...prev, [q.questionNo]: e.target.value }))}
                        className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select reason...</option>
                        {REASONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleFixIt(q.questionNo)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        ✏️ Fix it
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline practice panel */}
          {questions.some(q => practiceOpen === q.questionNo) && (
            <div className="mt-4 ml-4 border-l-2 border-indigo-200 pl-4">
              {practiceLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                  Loading practice questions...
                </div>
              ) : practiceData.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-2">No practice questions available for this concept.</p>
              ) : (
                <div className="space-y-3 py-2">
                  <h5 className="text-sm font-medium text-gray-700">Practice Questions — self-study, not scored</h5>
                  {practiceData.map(pq => (
                    <PracticeQuestionCard key={pq.sourceKey} question={pq} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FixItZone;
