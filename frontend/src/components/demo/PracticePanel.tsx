import { useState } from 'react';
import DOMPurify from 'dompurify';
import type { PracticeQuestionDTO } from '../../types/demoAnalysis';

interface PracticePanelProps {
  questionNo: number;
  getPracticeQuestions: (questionNo: number) => Promise<PracticeQuestionDTO[]>;
}

// Receives getPracticeQuestions as a prop rather than calling useDemoReport
// itself — with one PracticePanel per question, a report with many
// questions would otherwise trigger one redundant GET /reports/{id} per
// panel (defect D13).
const PracticePanel = ({ questionNo, getPracticeQuestions }: PracticePanelProps) => {
  const [questions, setQuestions] = useState<PracticeQuestionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const handleLoad = async () => {
    setLoading(true);
    const qs = await getPracticeQuestions(questionNo);
    setQuestions(qs);
    setLoaded(true);
    setLoading(false);
  };

  const toggleReveal = (index: number) => {
    setRevealed(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (!loaded && !loading) {
    return (
      <button
        onClick={handleLoad}
        className="mt-4 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium transition-colors"
      >
        Load Practice Questions
      </button>
    );
  }

  if (loading) {
    return <div className="mt-4 text-sm text-gray-500">Loading practice content...</div>;
  }

  if (questions.length === 0) {
    return <div className="mt-4 text-sm text-gray-500 italic">No practice questions available for this concept.</div>;
  }

  return (
    <div className="mt-6 space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Self-study practice — not scored</h4>
      {questions.map((q, idx) => (
        <div key={q.sourceKey} className="bg-gray-50 border border-gray-200 rounded p-4">
          <div className="text-sm text-gray-800 mb-3">{q.questionText}</div>
          {q.media?.imageUrl && (
            <img src={q.media.imageUrl} alt="" className="mb-3 max-w-full rounded" />
          )}
          {q.media?.diagramSvg && (
            <div
              className="mb-3"
              // Sanitized server-side at import time AND again here on
              // render, via DOMPurify — never trust untrusted SVG twice
              // removed from its source.
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(q.media.diagramSvg, {
                  USE_PROFILES: { svg: true, svgFilters: true },
                }),
              }}
            />
          )}
          {q.questionType === 'multiple_choice' && q.options.length > 0 && (
            <ul className="list-disc pl-5 mb-3 text-sm text-gray-700">
              {q.options.map((opt, i) => (
                <li key={i}>{opt}</li>
              ))}
            </ul>
          )}

          <button
            onClick={() => toggleReveal(idx)}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
          >
            {revealed[idx] ? 'Hide Answer & Solution' : 'Check / Reveal Answer'}
          </button>

          {revealed[idx] && (
            <div className="mt-3 p-3 bg-white border border-indigo-100 rounded text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">Answer: </span>{q.correctAnswer}</p>
              <p><span className="font-medium">Solution: </span>{q.solutionText}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PracticePanel;
