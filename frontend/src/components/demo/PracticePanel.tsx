import { useState } from 'react';
import PracticeQuestionCard from './PracticeQuestionCard';
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

  const handleLoad = async () => {
    setLoading(true);
    const qs = await getPracticeQuestions(questionNo);
    setQuestions(qs);
    setLoaded(true);
    setLoading(false);
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
      {questions.map(q => (
        <PracticeQuestionCard key={q.sourceKey} question={q} />
      ))}
    </div>
  );
};

export default PracticePanel;
