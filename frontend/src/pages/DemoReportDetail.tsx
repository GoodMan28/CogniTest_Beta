import { useParams, useNavigate } from 'react-router-dom';
import { useDemoReport } from '../hooks/useDemoReport';
import { ArrowLeft } from 'lucide-react';
import ScoreSummary from '../components/demo/ScoreSummary';
import SubjectPerformance from '../components/demo/SubjectPerformance';
import HitRateTable from '../components/demo/HitRateTable';
import DifficultyAnalysis from '../components/demo/DifficultyAnalysis';
import QuestionTypeMarksTable from '../components/demo/QuestionTypeMarksTable';
import BreakdownTable from '../components/demo/BreakdownTable';
import ComparisonTable from '../components/demo/ComparisonTable';
import QuestionReview from '../components/demo/QuestionReview';
import FixItZone from '../components/demo/FixItZone';
import ChapterDrillDown from '../components/demo/ChapterDrillDown';
import StrengthsAndImprovements from '../components/demo/StrengthsAndImprovements';
import RevisionPriorities from '../components/demo/RevisionPriorities';
import LockedFeatureCard from '../components/demo/LockedFeatureCard';

const DemoReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Called exactly once per report page; PracticePanel/ReflectionInput
  // receive getPracticeQuestions/updateReflection as props rather than
  // each calling this hook themselves (defect D13).
  const { report, loading, error, updateReflection, getPracticeQuestions } = useDemoReport(id);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p className="font-medium">Error loading report details</p>
        <p className="text-sm mt-1">{error || 'Your analysis is not published yet.'}</p>
        <button
          onClick={() => navigate('/student/reports')}
          className="mt-3 text-sm text-red-700 underline font-medium hover:text-red-900"
        >
          Go back to reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Back button + title */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/student/reports')}
          className="mr-4 p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full shadow-sm hover:shadow transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">← Quiz Analysis Report</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed performance breakdown</p>
        </div>
      </div>

      {/* ── Section 1: Scoreboard ── */}
      <ScoreSummary report={report} />

      {/* ── Section 2: Subject-Wise Performance ── */}
      <SubjectPerformance report={report} />

      {/* ── Section 3: Hit Rate vs Hustle Rate ── */}
      <HitRateTable report={report} />

      {/* ── Section 5: Difficulty Level Analysis ── */}
      <DifficultyAnalysis report={report} />

      {/* ── Section 6: Marks by Question Type ── */}
      <QuestionTypeMarksTable report={report} />

      {/* ── Cohort Comparisons ── */}
      <ComparisonTable report={report} />

      {/* ── Section 7: Question-by-Question Breakdown ── */}
      <QuestionReview
        report={report}
        getPracticeQuestions={getPracticeQuestions}
        updateReflection={updateReflection}
      />

      {/* ── Section 8: Fix It Zone ── */}
      <FixItZone
        report={report}
        getPracticeQuestions={getPracticeQuestions}
        updateReflection={updateReflection}
      />

      {/* ── Section 9: Chapter Drill Down ── */}
      <ChapterDrillDown report={report} />

      {/* ── Section 10-13: Strengths & Improvements ── */}
      <StrengthsAndImprovements report={report} />

      {/* ── Revision Priorities + Breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <BreakdownTable report={report} />
        </div>

        <div className="space-y-8">
          <RevisionPriorities report={report} />

          {/* Locked Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Analytics</h3>
            <LockedFeatureCard
              title="Time Management Analysis"
              description="Discover exactly where you spent too much time and learn to optimize your test pacing."
            />
            <LockedFeatureCard
              title="AI Peer Group Benchmarking"
              description="See how you compare to top students with identical preparation profiles."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoReportDetail;
