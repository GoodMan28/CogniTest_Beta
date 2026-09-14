import { useState } from 'react';
import DOMPurify from 'dompurify';
import MarkdownText from '../MarkdownText';
import type { PracticeQuestionDTO } from '../../types/demoAnalysis';

const DIFFICULTY_STYLES: Record<PracticeQuestionDTO['difficulty'], string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

/**
 * One self-study practice question (not scored). Shared by PracticePanel
 * (inside Question Review) and FixItZone so both render identically:
 * LaTeX via MarkdownText, options labelled A/B/C/D, difficulty badge, and a
 * reveal that highlights the correct option and shows the solution.
 */
const PracticeQuestionCard = ({ question }: { question: PracticeQuestionDTO }) => {
  const [revealed, setRevealed] = useState(false);
  const isMcq = question.questionType === 'multiple_choice' && question.options.length > 0;
  const correctIndex = isMcq ? question.correctAnswer.charCodeAt(0) - 65 : -1;
  const correctOptionText = correctIndex >= 0 ? question.options[correctIndex] : undefined;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DIFFICULTY_STYLES[question.difficulty]}`}
        >
          {question.difficulty}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {question.questionType === 'numerical' ? 'Numerical' : 'MCQ'}
        </span>
      </div>

      <div className="text-sm text-gray-800 mb-3 leading-relaxed">
        <MarkdownText text={question.questionText} />
      </div>

      {question.media?.imageUrl && (
        <img src={question.media.imageUrl} alt="" className="mb-3 max-w-full rounded" />
      )}
      {question.media?.diagramSvg && (
        <div
          className="mb-3"
          // Sanitized server-side at import time AND again here on render.
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(question.media.diagramSvg, {
              USE_PROFILES: { svg: true, svgFilters: true },
            }),
          }}
        />
      )}

      {isMcq && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const highlight =
              revealed && idx === correctIndex
                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                : 'border-gray-200 bg-white';
            return (
              <div key={idx} className={`p-2 border rounded-md flex items-start space-x-2 text-sm ${highlight}`}>
                <span className="font-medium text-gray-900">{letter}.</span>
                <span className="text-gray-700"><MarkdownText text={opt} /></span>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setRevealed(prev => !prev)}
        className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
      >
        {revealed ? 'Hide Answer & Solution' : 'Check / Reveal Answer'}
      </button>

      {revealed && (
        <div className="mt-3 p-3 bg-white border border-indigo-100 rounded text-sm text-gray-700 space-y-2">
          <p>
            <span className="font-medium">Answer: </span>
            {isMcq ? (
              <>
                {question.correctAnswer}
                {correctOptionText !== undefined && (
                  <>
                    {' — '}
                    <MarkdownText text={correctOptionText} />
                  </>
                )}
              </>
            ) : (
              <MarkdownText text={question.correctAnswer} />
            )}
          </p>
          <p>
            <span className="font-medium">Solution: </span>
            <MarkdownText text={question.solutionText} />
          </p>
        </div>
      )}
    </div>
  );
};

export default PracticeQuestionCard;
