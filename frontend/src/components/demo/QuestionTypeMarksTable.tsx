import type { ReportDetailDTO } from '../../types/demoAnalysis';

interface QuestionTypeMarksTableProps {
  report: ReportDetailDTO;
}

/**
 * "Marks by Question Type: Where You Earn the Most" — shows score per
 * question type per subject, matching the PDF sample report Section 6.
 * Computes the cross-tab from the questions array.
 */
const QuestionTypeMarksTable = ({ report }: QuestionTypeMarksTableProps) => {
  const subjects = new Set<string>();
  const types = new Set<string>();
  const grid: Record<string, Record<string, { score: number; max: number }>> = {};

  for (const q of report.questions) {
    subjects.add(q.subject);
    const tLabel = q.questionType === 'multiple_choice' ? 'Single Correct' : 'Numerical';
    types.add(tLabel);

    if (!grid[q.subject]) grid[q.subject] = {};
    if (!grid[q.subject][tLabel]) grid[q.subject][tLabel] = { score: 0, max: 0 };

    grid[q.subject][tLabel].score += parseFloat(q.awardedMarks);
    grid[q.subject][tLabel].max += parseFloat(q.maximumMarks);
  }

  const subjectList = Array.from(subjects);
  const typeList = Array.from(types);

  if (subjectList.length === 0) return null;

  // Compute totals
  const totals: Record<string, { score: number; max: number }> = {};
  for (const t of typeList) {
    totals[t] = { score: 0, max: 0 };
    for (const s of subjectList) {
      const cell = grid[s]?.[t];
      if (cell) {
        totals[t].score += cell.score;
        totals[t].max += cell.max;
      }
    }
  }

  const formatScore = (val: number) => val < 0 ? val.toString() : val.toString();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">💯</span>
          Marks by Question Type
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          See how many marks you scored from each question type in every subject.
          Use it to find your high-yield question types and identify where marks are slipping away.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              {typeList.map(t => (
                <th key={t} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subjectList.map(subject => (
              <tr key={subject} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{subject}</td>
                {typeList.map(t => {
                  const cell = grid[subject]?.[t];
                  const score = cell ? cell.score : 0;
                  const max = cell ? cell.max : 0;
                  return (
                    <td key={t} className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className={score < 0 ? 'text-red-600 font-semibold' : 'text-gray-700 font-semibold'}>
                        {formatScore(score)}
                      </span>
                      <span className="text-gray-400">/{max}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Total</td>
              {typeList.map(t => (
                <td key={t} className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-800">
                  {formatScore(totals[t].score)}/{totals[t].max}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionTypeMarksTable;
