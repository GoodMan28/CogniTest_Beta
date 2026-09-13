import { useState } from 'react';
import DOMPurify from 'dompurify';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import type { PracticeQuestionDTO, QuestionStatus, ReflectionItemDTO, ReportDetailDTO } from '../../types/demoAnalysis';
import PracticePanel from './PracticePanel';
import ReflectionInput from './ReflectionInput';

interface QuestionReviewProps {
  report: ReportDetailDTO;
  getPracticeQuestions: (questionNo: number) => Promise<PracticeQuestionDTO[]>;
  updateReflection: (
    questionNo: number,
    text: string,
    buildId: string,
    contentHash: string
  ) => Promise<ReflectionItemDTO | null | undefined>;
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  correct: '✓ Correct',
  incorrect: '✗ Incorrect',
  skipped: '- Skipped',
};

// All status/answer values below come straight from the stored snapshot
// (report.questions[*].status/studentAnswer/correctAnswer) — this
// component never re-grades an answer itself (defect D12). Numerical
// answers render as plain values (including "0", a real correct answer,
// not "not attempted").
const QuestionReview = ({ report, getPracticeQuestions, updateReflection }: QuestionReviewProps) => {
  const [filter, setFilter] = useState<'all' | QuestionStatus>('all');

  const filteredQuestions = report.questions.filter(q => filter === 'all' || q.status === filter);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Question Review</h3>

        <div className="flex space-x-2 bg-gray-100 p-1 rounded-md">
          {(['all', 'correct', 'incorrect', 'skipped'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filter === f
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f} ({report.questions.filter(q => f === 'all' || q.status === f).length})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {filteredQuestions.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No questions match this filter.</p>
        ) : (
          filteredQuestions.map(q => (
            <div key={q.questionNo} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className={`px-4 py-3 border-b flex justify-between items-center ${
                q.status === 'correct' ? 'bg-green-50 border-green-200' :
                q.status === 'incorrect' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-900">Q{q.questionNo}</span>
                  <span className="text-sm font-medium px-2 py-0.5 rounded bg-white shadow-sm">
                    {q.subject}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm font-medium">
                  <span className={
                    q.status === 'correct' ? 'text-green-700' :
                    q.status === 'incorrect' ? 'text-red-700' : 'text-gray-600'
                  }>
                    {STATUS_LABEL[q.status]}
                  </span>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="prose prose-sm max-w-none text-gray-800 mb-4">
                  <Latex>{q.questionText}</Latex>
                </div>

                {q.media?.imageUrl && (
                  <img src={q.media.imageUrl} alt="" className="mb-4 max-w-full rounded" />
                )}
                {q.media?.diagramSvg && (
                  <div
                    className="mb-4"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(q.media.diagramSvg, {
                        USE_PROFILES: { svg: true, svgFilters: true },
                      }),
                    }}
                  />
                )}

                {q.questionType === 'multiple_choice' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {q.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = q.studentAnswer === letter;
                      const isCorrectAnswer = q.correctAnswer === letter;

                      let optClass = "border-gray-200 bg-white";
                      if (isCorrectAnswer) optClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                      else if (isSelected && !isCorrectAnswer) optClass = "border-red-500 bg-red-50 ring-1 ring-red-500";

                      return (
                        <div key={idx} className={`p-3 border rounded-md flex items-start space-x-3 ${optClass}`}>
                          <span className="font-medium text-gray-900">{letter}.</span>
                          <span className="text-gray-700"><Latex>{opt}</Latex></span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2 mb-6">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Your Answer: </span>
                      <span className={
                        q.status === 'correct' ? 'text-green-700 font-medium' :
                        q.status === 'incorrect' ? 'text-red-700 font-medium' : 'text-gray-500 italic'
                      }>
                        {q.studentAnswer !== null ? q.studentAnswer : 'Not attempted'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Correct Answer: </span>
                      <span className="text-gray-900 font-medium">{q.correctAnswer}</span>
                    </div>
                  </div>
                )}

                {q.selectedOptionExplanation && q.status === 'incorrect' && (
                  <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded text-sm text-gray-700">
                    <span className="font-medium">Why this option is wrong: </span>{q.selectedOptionExplanation}
                  </div>
                )}

                <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-gray-700">
                  <span className="font-medium">Solution: </span><Latex>{q.solutionText}</Latex>
                </div>

                {/* Practice and Reflection */}
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <PracticePanel questionNo={q.questionNo} getPracticeQuestions={getPracticeQuestions} />
                  <ReflectionInput
                    questionNo={q.questionNo}
                    buildId={report.buildId}
                    contentHash={q.contentHash}
                    initialText={report.reflections[String(q.questionNo)]?.text || ''}
                    updateReflection={updateReflection}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionReview;
