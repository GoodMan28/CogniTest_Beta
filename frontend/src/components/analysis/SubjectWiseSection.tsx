import type { ReportAnalysis } from '../../types/reportAnalysis';
import { STATUS_COLORS, subjectColor } from '../../types/reportAnalysis';
import DonutChart from '../charts/DonutChart';
import SectionCard, { marksTone, tdClass, thClass } from './SectionCard';

interface Props {
  analysis: ReportAnalysis;
}

/**
 * "Subject-Wise Performance Analysis" — marks distribution with Pos(+)/Neg(-),
 * overall marks pie, C/I/U table and per-subject attempt pies (PDF pages 1–2).
 */
const SubjectWiseSection = ({ analysis }: Props) => {
  const { subjects } = analysis;
  if (subjects.length === 0) return null;

  return (
    <SectionCard
      icon="bar_chart" iconColor="text-indigo-600"
      title="Subject-Wise Performance Analysis"
      description="See how your total marks are spread across each subject — including your positive and negative scores."
    >
      {/* Marks distribution + overall pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:break-inside-avoid">
        <div className="lg:col-span-2">
          <h4 className="text-sm font-bold text-gray-800 mb-3">Marks Distribution &amp; Overall Balance</h4>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={`${thClass} text-left`}>Subject</th>
                  <th className={`${thClass} text-center`}>Total Marks</th>
                  <th className={`${thClass} text-center`}>Pos(+)</th>
                  <th className={`${thClass} text-center`}>Neg(-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((s, i) => (
                  <tr key={s.key}>
                    <td className={`${tdClass} font-bold`} style={{ color: subjectColor(s.label, i) }}>{s.label}</td>
                    <td className={`${tdClass} text-center`}>
                      <span className={`font-black ${marksTone(s.score)}`}>{s.score}</span>
                      <span className="text-gray-400 text-xs">/{s.maxMarks}</span>
                    </td>
                    <td className={`${tdClass} text-center font-bold text-green-700`}>{s.positiveMarks}</td>
                    <td className={`${tdClass} text-center font-bold ${s.negativeMarks < 0 ? 'text-red-600' : 'text-gray-400'}`}>{s.negativeMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-indigo-100 p-4">
          <h4 className="text-sm font-bold text-gray-800 mb-2">Overall Marks Distribution</h4>
          {subjects.some(s => s.score > 0) ? (
            <DonutChart
              size={160}
              strokeWidth={34}
              segments={subjects.map((s, i) => ({ value: Math.max(0, s.score), color: subjectColor(s.label, i), label: s.label }))}
            />
          ) : (
            <p className="text-xs text-gray-400 py-8">No positive marks to distribute yet.</p>
          )}
        </div>
      </div>

      {/* Correct vs Incorrect vs Unattempted */}
      <div className="print:break-inside-avoid">
        <h4 className="text-sm font-bold text-gray-800">Correct vs. Incorrect vs. Unattempted</h4>
        <p className="text-xs text-gray-500 font-medium mb-3">The table and pie charts show your correct, incorrect, and unattempted question count clearly.</p>
        <div className="overflow-x-auto rounded-lg border border-gray-100 mb-6">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={`${thClass} text-left`}>Subject</th>
                <th className={`${thClass} text-center`}>Correct</th>
                <th className={`${thClass} text-center`}>Incorrect</th>
                <th className={`${thClass} text-center`}>Unattempted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s, i) => (
                <tr key={s.key}>
                  <td className={`${tdClass} font-bold`} style={{ color: subjectColor(s.label, i) }}>{s.label}</td>
                  <td className={`${tdClass} text-center`}><span className="font-black text-green-700">{s.correct}</span><span className="text-gray-400 text-xs">/{s.questionCount}</span></td>
                  <td className={`${tdClass} text-center`}><span className="font-black text-red-600">{s.incorrect}</span><span className="text-gray-400 text-xs">/{s.questionCount}</span></td>
                  <td className={`${tdClass} text-center`}><span className="font-black text-gray-600">{s.skipped}</span><span className="text-gray-400 text-xs">/{s.questionCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center">
              <div className="self-start flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColor(s.label, i) }} />
                <div>
                  <div className="text-sm font-black text-gray-900">{s.label}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Attempt Distribution</div>
                </div>
              </div>
              <DonutChart
                size={140}
                strokeWidth={30}
                segments={[
                  { value: s.correct, color: STATUS_COLORS.correct, label: 'Correct' },
                  { value: s.incorrect, color: STATUS_COLORS.incorrect, label: 'Incorrect' },
                  { value: s.skipped, color: STATUS_COLORS.unanswered, label: 'Unattempted' },
                ]}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};

export default SubjectWiseSection;
