import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
// import katex from 'katex';
import 'katex/dist/katex.min.css';
import mockRecommendations from '../data/mockRecommendations.json';

import LatexText from '../components/LatexText';

const Reports = () => {
  const { studentId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');

  const [institute, setInstitute] = useState<{ name: string; logoUrl?: string; themeColor?: string } | null>(null);

  useEffect(() => {
    axios.get('/api/v1/institute')
      .then(res => setInstitute(res.data))
      .catch(err => console.error('Failed to fetch institute', err));
  }, []);

  // Admin states
  const [tests, setTests] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Admin Analytics states
  const [viewingAnalyticsTest, setViewingAnalyticsTest] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<'Physics' | 'Chemistry' | 'Biology'>('Physics');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<any | null>(null);

  // Admin Sample PDF states
  const [samplePdfData, setSamplePdfData] = useState<{ test: any; questions: any[] } | null>(null);
  const [samplePdfLoading, setSamplePdfLoading] = useState<string | null>(null);

  const handleViewSamplePdf = async (testId: string) => {
    try {
      setSamplePdfLoading(testId);
      const res = await axios.get(`/api/v1/reports/test/${testId}/questions`);
      setSamplePdfData(res.data);
    } catch (error) {
      console.error('Failed to fetch test questions for PDF:', error);
      alert('Could not load test questions. Please try again.');
    } finally {
      setSamplePdfLoading(null);
    }
  };

  // Admin Analytics Print states
  const [printAnalyticsData, setPrintAnalyticsData] = useState<any | null>(null);
  const [printAnalyticsLoading, setPrintAnalyticsLoading] = useState<string | null>(null);

  const handlePrintAnalytics = async (testId: string) => {
    try {
      setPrintAnalyticsLoading(testId);
      const res = await axios.get(`/api/v1/reports/test/${testId}/analytics`);
      setPrintAnalyticsData(res.data);
    } catch (error) {
      console.error('Failed to fetch analytics for print:', error);
      alert('Could not load analytics. Please try again.');
    } finally {
      setPrintAnalyticsLoading(null);
    }
  };

  const handleViewAnalytics = async (testId: string) => {
    try {
      setAnalyticsLoading(true);
      const res = await axios.get(`/api/v1/reports/test/${testId}/analytics`);
      setViewingAnalyticsTest(res.data);
    } catch (error) {
      console.error('Failed to fetch test analytics:', error);
      alert('Error fetching analytics for this test. Make sure reports exist.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getPhysicsCategory = (chapter: string): string => {
    const ch = chapter.toLowerCase();
    if (ch.includes('kinematics') || ch.includes('motion') || ch.includes('work') || ch.includes('rotational') || ch.includes('gravitation') || ch.includes('mechanics')) {
      return 'Mechanics';
    }
    if (ch.includes('thermo') || ch.includes('heat') || ch.includes('ktg') || ch.includes('kinetic theory')) {
      return 'Thermodynamics';
    }
    if (ch.includes('electro') || ch.includes('electricity') || ch.includes('magnet') || ch.includes('current')) {
      return 'Electrodynamics';
    }
    if (ch.includes('optics') || ch.includes('ray') || ch.includes('wave')) {
      return 'Optics';
    }
    return 'Modern Physics';
  };

  const getChemistryCategory = (chapter: string): string => {
    const ch = chapter.toLowerCase();
    if (ch.includes('organic') || ch.includes('hydrocarbon') || ch.includes('haloalkane') || ch.includes('alcohol') || ch.includes('aldehyde') || ch.includes('amine') || ch.includes('ether')) {
      return 'Organic Chemistry';
    }
    if (ch.includes('inorganic') || ch.includes('bonding') || ch.includes('p-block') || ch.includes('d-block') || ch.includes('coordination') || ch.includes('periodic') || ch.includes('metallurgy') || ch.includes('block')) {
      return 'Inorganic Chemistry';
    }
    return 'Physical Chemistry';
  };

  const getBiologyCategory = (chapter: string): string => {
    const ch = chapter.toLowerCase();
    if (ch.includes('cell') || ch.includes('biomolecule') || ch.includes('division')) {
      return 'Cell Biology';
    }
    if (ch.includes('genetics') || ch.includes('inheritance') || ch.includes('evolution') || ch.includes('molecular basis')) {
      return 'Genetics';
    }
    if (ch.includes('human') || ch.includes('digestion') || ch.includes('breathing') || ch.includes('circulation') || ch.includes('excretion') || ch.includes('locomotion') || ch.includes('neural') || ch.includes('chemical coordination') || ch.includes('physiology')) {
      return 'Human Physiology';
    }
    if (ch.includes('plant') || ch.includes('photosynthesis') || ch.includes('respiration in plants') || ch.includes('transport in plants') || ch.includes('mineral nutrition') || ch.includes('growth')) {
      return 'Plant Physiology';
    }
    return 'Ecology';
  };

  const getCategory = (chapter: string, subject: 'Physics' | 'Chemistry' | 'Biology'): string => {
    if (subject === 'Physics') return getPhysicsCategory(chapter);
    if (subject === 'Chemistry') return getChemistryCategory(chapter);
    return getBiologyCategory(chapter);
  };

  const SUBJECT_THEMES = {
    Physics: {
      color: 'text-blue-600',
      bg: 'bg-blue-500',
      border: 'border-blue-200',
      activeBg: 'bg-blue-500',
      activeText: 'text-white',
      progress: 'bg-blue-500',
      lightBorder: 'border-blue-100',
      hover: 'hover:bg-blue-50',
      fill: 'fill-blue-500/20',
      stroke: 'stroke-blue-600',
      text: 'text-blue-600'
    },
    Chemistry: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-600',
      border: 'border-emerald-200',
      activeBg: 'bg-emerald-600',
      activeText: 'text-white',
      progress: 'bg-emerald-500',
      lightBorder: 'border-emerald-100',
      hover: 'hover:bg-emerald-50',
      fill: 'fill-emerald-500/20',
      stroke: 'stroke-emerald-600',
      text: 'text-emerald-600'
    },
    Biology: {
      color: 'text-amber-600',
      bg: 'bg-amber-600',
      border: 'border-amber-200',
      activeBg: 'bg-amber-600',
      activeText: 'text-white',
      progress: 'bg-amber-500',
      lightBorder: 'border-amber-100',
      hover: 'hover:bg-amber-50',
      fill: 'fill-amber-500/20',
      stroke: 'stroke-amber-600',
      text: 'text-amber-600'
    }
  };

  // Student states
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Physics' | 'Chemistry' | 'Biology'>('Overview');
  const [masterySubject, setMasterySubject] = useState<'Physics' | 'Chemistry' | 'Biology'>('Physics');

  // Practice Modal State
  const [practiceModalData, setPracticeModalData] = useState<any[] | null>(null);
  const [practiceModalAnswers, setPracticeModalAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const printReportId = params.get('printReportId');
    if (printReportId) {
      setLoading(false);
      fetchReviewDetails(printReportId).then(() => {
        setTimeout(() => {
          window.print();
          if (params.get('closeAfterPrint')) {
            window.close();
          }
        }, 1000);
      });
      return;
    }

    if (isAdmin) {
      fetchTests().then(() => {
        if (location.state && (location.state as any).openTestAnalyticsId) {
          handleViewAnalytics((location.state as any).openTestAnalyticsId);
          // Clean up the state so it doesn't trigger again on reload
          window.history.replaceState({}, document.title);
        }
      });
    } else if (studentId) {
      fetchStudentReports().then(() => {
        if (location.state && (location.state as any).autoPrintReportId) {
          fetchReviewDetails((location.state as any).autoPrintReportId).then(() => {
            setTimeout(() => window.print(), 500);
          });
          window.history.replaceState({}, document.title);
        }
      });
    }
  }, [isAdmin, studentId, location.state]);

  const fetchTests = async () => {
    try {
      const res = await axios.get('/api/v1/tests');
      setTests(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch tests for reports:', error);
      setLoading(false);
    }
  };

  const fetchStudentReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/reports/student/${studentId}`);
      setReports(res.data);
    } catch (error) {
      console.error('Failed to fetch student reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (testId: string) => {
    try {
      await axios.post(`/api/v1/reports/publish/${testId}`);
      fetchTests();
    } catch (error) {
      console.error('Failed to publish test reports:', error);
    }
  };

  const fetchReviewDetails = async (reportId: string) => {
    try {
      setReviewLoading(true);
      const res = await axios.get(`/api/v1/reports/${reportId}/review`);
      setReviewData(res.data);
      setSelectedReportId(reportId);
    } catch (error) {
      console.error('Failed to fetch test review data:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const isInitialAnalyticsOpen = location.state && (location.state as any).openTestAnalyticsId && !viewingAnalyticsTest;

  if (loading || reviewLoading || isInitialAnalyticsOpen) {
    return <div className="p-8 text-gray-500 flex items-center justify-center min-h-[400px]">Loading reports...</div>;
  }

  // --- STUDENT VIEW: DETAILED TEST REVIEW ---
  if (!isAdmin && selectedReportId && reviewData) {
    const { report, test, questions, batchScores } = reviewData;
    const correctCount = report.performance.correct.length;
    const incorrectCount = report.performance.incorrect.length;
    const unansweredCount = report.performance.unanswered.length;
    const totalAttempted = correctCount + incorrectCount;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    // Subject Performance Analytics
    const subjects = ['Physics', 'Chemistry', 'Biology'] as const;
    const subjectStats = subjects.map(sub => {
      const subQs = questions.filter((q: any) => q.subject === sub);
      let c = 0, i = 0, u = 0, score = 0;
      subQs.forEach((q: any) => {
        if (q.status === 'correct') { c++; score += 4; }
        else if (q.status === 'incorrect') { i++; score -= 1; }
        else u++;
      });
      const total = c + i + u;
      const attempted = c + i;
      const acc = attempted > 0 ? Math.round((c / attempted) * 100) : 0;
      return { subject: sub, correct: c, incorrect: i, unanswered: u, score, accuracy: acc, totalQuestions: total };
    });

    // Topic Mastery Analytics
    const topicStats: Record<string, { correct: number, total: number, subject: string }> = {};
    questions.forEach((q: any) => {
      if (!q.chapter) return;
      if (!topicStats[q.chapter]) topicStats[q.chapter] = { correct: 0, total: 0, subject: q.subject };
      if (q.status !== 'unanswered') topicStats[q.chapter].total++;
      if (q.status === 'correct') topicStats[q.chapter].correct++;
    });

    const allTopics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total > 0)
      .map(([chapter, stats]) => ({
        chapter,
        subject: stats.subject,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        total: stats.total
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const masteryTopics = allTopics.filter(t => t.subject === masterySubject).slice(0, 4);
    const weakestTopics = allTopics.filter(t => t.subject === masterySubject).sort((a, b) => a.accuracy - b.accuracy).slice(0, 2);

    // Collect all weak chapters across all subjects for question review tagging
    const allWeakChapters = new Set<string>();
    ['Physics', 'Chemistry', 'Biology'].forEach(sub => {
      const weak = allTopics.filter(t => t.subject === sub).sort((a, b) => a.accuracy - b.accuracy).slice(0, 2).map(t => t.chapter);
      weak.forEach(w => allWeakChapters.add(w));
    });

    // Marks Lost Analysis for Weakest Topics
    let weakTopicsMarksLost = 0;
    const mPq = test?.marksPerQuestion || 4;
    const nPq = test?.negativeMarking || 1;
    const weakChapterNames = weakestTopics.map(t => t.chapter);
    questions.forEach((q: any) => {
      if (weakChapterNames.includes(q.chapter)) {
        if (q.status === 'incorrect') weakTopicsMarksLost += (mPq + nPq);
        else if (q.status === 'unanswered') weakTopicsMarksLost += mPq;
      }
    });

    const filteredQuestions = questions.filter((q: any) => {
      if (activeTab !== 'Overview' && q.subject !== activeTab) return false;
      if (statusFilter === 'all') return true;
      return q.status === statusFilter;
    });

    // Calculate Real Rank
    let rank = 1;
    let totalBatchStudents = 1;
    let percentile = 100;

    if (batchScores && batchScores.length > 0) {
      totalBatchStudents = batchScores.length;
      rank = batchScores.filter((s: number) => s > report.score).length + 1;
      const studentsBelow = batchScores.filter((s: number) => s < report.score).length;
      percentile = totalBatchStudents > 1
        ? Math.round((studentsBelow / (totalBatchStudents - 1)) * 1000) / 10
        : 100;
    }

    return (
      <div className="flex flex-col min-w-0 w-full p-8 overflow-hidden bg-gray-50/50 print:p-0 print:bg-white print:overflow-visible h-full">

        {/* === PRINTABLE PDF VIEW (HIDDEN IN UI, VISIBLE IN PDF) === */}
        <div className="hidden print:block w-full text-black">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
            <div>
              {institute?.logoUrl ? (
                <img src={(institute.logoUrl?.startsWith("data:") ? institute.logoUrl : `${import.meta.env.VITE_API_URL || ''}${institute.logoUrl}`)} alt={institute.name || 'Institute Logo'} className="max-h-16 object-contain mb-4" />
              ) : (
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{institute?.name || 'CogniTest Institute'}</h1>
              )}
              <h2 className="text-2xl font-bold text-gray-800">{test.title}</h2>
              <p className="text-gray-500 mt-1">Diagnostic Report &bull; {new Date(report.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Student Details</div>
              <p className="font-medium text-gray-900">{studentId}</p>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-3 gap-6 mb-8 page-break-inside-avoid">
            <div className="border border-gray-300 rounded-xl p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Total Score</div>
              <div className="text-3xl font-black text-gray-900">{report.score} <span className="text-lg text-gray-500">/ {report.totalMarks}</span></div>
            </div>
            <div className="border border-gray-300 rounded-xl p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Accuracy</div>
              <div className="text-3xl font-black text-gray-900">{accuracy}%</div>
            </div>
            <div className="border border-gray-300 rounded-xl p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Questions Attempted</div>
              <div className="text-3xl font-black text-gray-900">{totalAttempted} <span className="text-lg text-gray-500">/ {questions.length}</span></div>
            </div>
          </div>

          {/* Quick Stats Strip (Print Version) */}
          <div className="grid grid-cols-4 gap-6 mb-8 page-break-inside-avoid">
            {[
              { label: 'Correct', val: correctCount },
              { label: 'Incorrect', val: incorrectCount },
              { label: 'Unanswered', val: unansweredCount },
              { label: 'Total', val: questions.length }
            ].map((s, i) => (
              <div key={i} className="border border-gray-300 rounded-xl p-4 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{s.label}</span>
                <span className="text-2xl font-black text-gray-900">{s.val}</span>
              </div>
            ))}
          </div>

          {/* Subject Performance (Print Version) */}
          <div className="mb-8 page-break-inside-avoid">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Subject Performance Analytics</h3>
            <div className="grid grid-cols-3 gap-6">
              {subjectStats.map((sub, i) => (
                <div key={i} className="border border-gray-300 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-black text-gray-900">{sub.subject}</h4>
                    <span className="text-lg font-black text-gray-900">{sub.score} <span className="text-xs font-medium text-gray-500">/ {sub.totalQuestions * 4}</span></span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Accuracy:</span>
                    <span>{sub.accuracy}%</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mt-1">
                    <span>Correct / Incorrect:</span>
                    <span>{sub.correct} / {sub.incorrect}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Batch Standing & Rank (Print Version) */}
          <div className="mb-8 page-break-inside-avoid border border-gray-300 rounded-xl p-4 flex justify-between items-center bg-gray-50">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Batch Standing</div>
              <div className="text-3xl font-black text-blue-600">AIR #{rank}</div>
              <div className="text-sm font-bold text-gray-700 mt-1">Percentile: {percentile.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cohort Size</div>
              <div className="text-2xl font-black text-gray-900">{totalBatchStudents} Students</div>
            </div>
          </div>

          {/* Topic Mastery (Print Version) */}
          <div className="mb-8 page-break-inside-avoid">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Topic Mastery</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="border border-green-200 bg-green-50/50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-green-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">trending_up</span> Strongest Topics
                </h4>
                <div className="space-y-2">
                  {allTopics.slice(0, 3).map((t: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm font-bold text-gray-800">
                      <span>{t.chapter} <span className="text-xs font-normal text-gray-500">({t.subject})</span></span>
                      <span className="text-green-600">{t.accuracy}%</span>
                    </div>
                  ))}
                  {allTopics.length === 0 && <div className="text-xs text-gray-500">No data available</div>}
                </div>
              </div>

              <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">trending_down</span> Action Required
                </h4>
                <div className="space-y-2">
                  {allTopics.slice(-3).reverse().map((t: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm font-bold text-gray-800">
                      <span>{t.chapter} <span className="text-xs font-normal text-gray-500">({t.subject})</span></span>
                      <span className="text-red-600">{t.accuracy}%</span>
                    </div>
                  ))}
                  {allTopics.length === 0 && <div className="text-xs text-gray-500">No data available</div>}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Complete Question Collection</h3>

          {/* Full Question List */}
          <div className="space-y-6">
            {questions.map((q: any) => (
              <div key={q.questionId} className="border border-gray-300 rounded-xl p-6 page-break-inside-avoid">
                <div className="flex items-start gap-4 mb-4">
                  <span className="bg-gray-900 text-white w-8 h-8 rounded flex items-center justify-center font-bold flex-shrink-0">Q{q.questionNo}</span>
                  <div className="flex-1 font-semibold text-gray-900">
                    <LatexText text={q.questionText} />
                  </div>
                </div>

                {q.diagramSvg && (
                  <div className="mb-4 pl-12">
                    <div className="max-w-[400px] border border-gray-200 p-2 rounded bg-white" dangerouslySetInnerHTML={{ __html: q.diagramSvg }} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pl-12 mb-4">
                  {q.options.map((opt: string, i: number) => {
                    const letter = String.fromCharCode(65 + i);
                    const isCorrect = q.correctOption === letter;
                    const isStudentSelected = q.studentChoice === letter;

                    let style = 'bg-white border-gray-200';
                    if (isCorrect) style = 'bg-green-50 border-green-300 font-bold';
                    else if (isStudentSelected && !isCorrect) style = 'bg-red-50 border-red-300';

                    return (
                      <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${style}`}>
                        <span className="font-bold">{letter}.</span>
                        <div className="flex-1">
                          <LatexText text={opt} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pl-12 flex gap-4 text-sm font-medium">
                  <div className="bg-gray-100 px-3 py-1.5 rounded flex gap-2">
                    <span className="text-gray-500">Correct Answer:</span>
                    <span className="text-green-700 font-bold">{q.correctOption}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1.5 rounded flex gap-2">
                    <span className="text-gray-500">Your Answer:</span>
                    <span className={q.status === 'correct' ? 'text-green-700 font-bold' : q.status === 'incorrect' ? 'text-red-600 font-bold' : 'text-gray-500 font-bold'}>
                      {q.studentChoice || 'Skipped'}
                    </span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1.5 rounded text-gray-500">
                    Subject: {q.subject}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === INTERACTIVE UI (HIDDEN IN PDF) === */}
        <div className="print:hidden flex flex-col min-w-0 w-full h-full overflow-hidden">
          {/* Header Navigation */}
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedReportId(null);
                  setReviewData(null);
                  setStatusFilter('all');
                  setExpandedQuestionId(null);
                  setActiveTab('Overview');
                  fetchStudentReports();
                }}
                className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Reports
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm print:hidden">
                  Review: {test.title}
                </span>
                <button
                  onClick={() => {
                    setActiveTab('Overview');
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-sm print:hidden"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Download PDF
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 px-2">
              {['Overview', 'Physics', 'Chemistry', 'Biology'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab as any); setStatusFilter('all'); setExpandedQuestionId(null); }}
                  className={`py-3 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'Overview' ? (
            <div className="space-y-8 animate-in fade-in duration-300 overflow-y-auto pr-2 pb-10">
              {/* Hero Stats */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-full mb-3 uppercase tracking-widest border border-blue-100">
                    Test Result
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 mb-1">{test.title}</h1>
                  <p className="text-gray-500 font-medium text-sm">
                    Completed on {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-8 bg-gray-50 px-8 py-5 rounded-xl border border-gray-100">
                  <div className="text-center pr-8 border-r border-gray-200">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Score</div>
                    <div className="text-4xl font-black text-gray-900">{report.score}</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">/ {report.totalMarks}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Accuracy</div>
                    <div className="text-3xl font-black text-blue-600">{accuracy}%</div>
                    <div className="text-xs font-bold text-gray-500 mt-1">{totalAttempted} Attempted</div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Correct', val: correctCount, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                  { label: 'Incorrect', val: incorrectCount, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                  { label: 'Unanswered', val: unansweredCount, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
                  { label: 'Total Questions', val: questions.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
                ].map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${s.bg} ${s.border} flex flex-col justify-center items-center`}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</span>
                    <span className={`text-2xl font-black ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>

              {/* Subject Performance */}
              <div>
                <h3 className="text-lg font-black text-gray-800 mb-4 tracking-tight">Subject Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subjectStats.map((sub, i) => {
                    const theme = SUBJECT_THEMES[sub.subject as keyof typeof SUBJECT_THEMES];
                    return (
                      <div key={i} className={`bg-white rounded-xl border ${theme.lightBorder} p-6 shadow-sm relative overflow-hidden group`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.bg} opacity-50`} />
                        <div className="flex justify-between items-start mb-6">
                          <h4 className={`text-xl font-black ${theme.color}`}>{sub.subject}</h4>
                          <span className={`text-xl font-black text-gray-900`}>{sub.score} <span className="text-sm font-medium text-gray-400">/ {sub.totalQuestions * 4}</span></span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                              <span>Accuracy</span>
                              <span>{sub.accuracy}%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full ${theme.bg} rounded-full`} style={{ width: `${sub.accuracy}%` }} />
                            </div>
                          </div>
                          <div className="flex gap-4 pt-2 text-xs font-bold">
                            <span className="text-green-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> {sub.correct}</span>
                            <span className="text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cancel</span> {sub.incorrect}</span>
                            <span className="text-gray-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">hourglass_empty</span> {sub.unanswered}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Batch Standing */}
              <div className="mb-8">
                <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">YOUR BATCH STANDING</h3>
                <p className="text-xs text-gray-500 font-medium mt-1 mb-4">Compared to {totalBatchStudents} {totalBatchStudents === 1 ? 'student' : 'students'}</p>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-full md:w-1/3 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">YOUR RANK</h4>
                      <div className="text-4xl font-black text-blue-600">AIR #{rank}</div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">PERCENTILE</h4>
                      <div className="text-2xl font-black text-gray-900">{percentile.toFixed(1)}%</div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-sm font-medium text-blue-800">
                        You're ahead of {percentile.toFixed(1)}% of students. Keep pushing!
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-2/3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Score Distribution</h4>
                    <div className="relative h-48 w-full">
                      {/* Simulated SVG bell curve */}
                      <svg viewBox="0 0 400 100" className="w-full h-full drop-shadow-sm" preserveAspectRatio="none">
                        <path
                          d="M0,90 Q50,90 100,70 T200,20 T300,70 T400,90 L400,100 L0,100 Z"
                          fill="url(#curve-gradient)"
                          stroke="#2563eb"
                          strokeWidth="2"
                        />
                        <defs>
                          <linearGradient id="curve-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1={percentile * 4} y1="0" x2={percentile * 4} y2="100" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                        <text x={Math.min(370, percentile * 4 + 5)} y="15" fontSize="10" fill="#2563eb" fontWeight="bold">You</text>
                      </svg>
                      <div className="absolute bottom-0 w-full flex justify-between text-[10px] font-bold text-gray-400 px-2 mt-2 border-t border-gray-100 pt-2">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Topic Mastery */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-800 tracking-tight">YOUR TOPIC MASTERY</h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">{masterySubject} Breakdown</p>
                    </div>
                    <select
                      value={masterySubject}
                      onChange={(e) => setMasterySubject(e.target.value as any)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 font-bold text-gray-700 bg-gray-50 outline-none focus:border-blue-500"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3 flex-1 items-start content-start">
                    {masteryTopics.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 col-span-2">No topic data available.</p>
                    ) : masteryTopics.map((topic, i) => {
                      let dotColor = 'bg-green-500';
                      if (topic.accuracy < 50) dotColor = 'bg-red-500';
                      else if (topic.accuracy < 75) dotColor = 'bg-amber-500';

                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50/50 rounded-md border border-gray-100 shadow-sm w-fit">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></div>
                            <span className="text-sm font-bold text-gray-800 truncate" title={topic.chapter}>{topic.chapter}</span>
                          </div>
                          <span className="text-xs font-black text-gray-500">{topic.accuracy}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Performance Insight */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
                  <h3 className="text-lg font-black text-gray-800 mb-1 tracking-tight">AI PERFORMANCE INSIGHT</h3>
                  <p className="text-xs text-gray-500 font-medium mb-6">Your personal coach</p>

                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 flex-1 flex flex-col justify-between relative z-10">
                    <div className="space-y-4 mb-6">
                      <p className="text-sm font-medium text-gray-700 flex items-start gap-2 leading-relaxed">
                        <span>
                          Your {masterySubject} accuracy dropped mainly because of <strong className="text-red-500">{weakestTopics[0]?.chapter || 'certain'}</strong> and <strong className="text-red-500">{weakestTopics[1]?.chapter || 'specific'}</strong> questions.
                        </span>
                      </p>
                      <p className="text-sm font-medium text-gray-700 flex items-start gap-2 leading-relaxed">
                        <span>
                          You lost approximately <strong className="text-gray-900">{weakTopicsMarksLost} marks</strong> directly due to mistakes and unattempted questions in these topics.
                        </span>
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Your Next Focus</h4>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {weakestTopics.map((t, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white border border-blue-100 text-blue-600 rounded-full text-sm font-bold shadow-sm">
                            {i + 1}. {t.chapter}
                          </span>
                        ))}
                        {weakestTopics.length === 0 && (
                          <span className="text-sm text-gray-400">No weak topics found!</span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/student/custom-tests?subject=${masterySubject}`)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                        Start Personalized Practice &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="animate-in fade-in duration-300 flex flex-col min-h-0 flex-1">
              {/* Filter Controls (All, Correct, Incorrect, Unanswered) */}
              <div className="flex border-b border-gray-200 mb-6 bg-white rounded-xl shadow-sm border p-1 gap-1 flex-shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  All {activeTab} Questions ({questions.filter((q: any) => q.subject === activeTab).length})
                </button>
                <button
                  onClick={() => setStatusFilter('correct')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${statusFilter === 'correct' ? 'bg-green-600 text-white shadow-sm' : 'text-green-700 hover:bg-green-50/50'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Correct ({questions.filter((q: any) => q.subject === activeTab && q.status === 'correct').length})
                </button>
                <button
                  onClick={() => setStatusFilter('incorrect')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${statusFilter === 'incorrect' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-red-50/50'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Incorrect ({questions.filter((q: any) => q.subject === activeTab && q.status === 'incorrect').length})
                </button>
                <button
                  onClick={() => setStatusFilter('unanswered')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${statusFilter === 'unanswered' ? 'bg-gray-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                  Unanswered ({questions.filter((q: any) => q.subject === activeTab && q.status === 'unanswered').length})
                </button>
              </div>

              {/* Question Review List (Interactive rendering like Question Bank) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0">
                <div className="overflow-auto h-full">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-10 bg-gray-50/95 border-b border-gray-200 backdrop-blur-sm">
                      <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4 w-20">Q.No</th>
                        <th className="p-4">Question Text</th>
                        <th className="p-4 w-40">Subject</th>
                        <th className="p-4 w-40 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-gray-400">
                            No questions found matching this category.
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map((q: any) => {
                          const isExpanded = expandedQuestionId === q.questionId;
                          const truncatedText = q.questionText.length > 100 ? q.questionText.substring(0, 100) + '...' : q.questionText;

                          return (
                            <tr key={q.questionId} className="group">
                              <td colSpan={4} className="p-0">
                                {/* Row Summary */}
                                <div
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.questionId)}
                                  className={`flex items-center cursor-pointer transition-colors p-4 ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}
                                >
                                  <div className="w-20 font-bold text-gray-900">{q.questionNo}</div>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-gray-800 truncate font-medium">{truncatedText}</p>
                                  </div>
                                  <div className="w-40 text-gray-500 font-medium">{q.subject}</div>
                                  <div className="w-40 flex items-center justify-center">
                                    {q.status === 'correct' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Correct
                                      </span>
                                    )}
                                    {q.status === 'incorrect' && (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                          <span className="material-symbols-outlined text-[14px]">cancel</span> Incorrect
                                        </span>
                                      </div>
                                    )}
                                    {q.status === 'unanswered' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
                                        <span className="material-symbols-outlined text-[14px]">hourglass_empty</span> Unanswered
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Row Details (Visible on click) */}
                                {isExpanded && (
                                  <div className="border-t border-gray-100 px-8 py-6 bg-gray-50/40">
                                    <div className="grid grid-cols-12 gap-6">
                                      {/* Left Side: Question, Diagrams, and Options */}
                                      <div className="col-span-8 space-y-4">
                                        <div className="flex gap-2 items-center flex-wrap">
                                          <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                            {q.chapter}
                                          </span>
                                          {q.topic.map((t: string, idx: number) => (
                                            <span key={idx} className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                              {t}
                                            </span>
                                          ))}
                                          {q.status === 'incorrect' && (mockRecommendations as any)[q.questionId] && (
                                            <button
                                              onClick={() => {
                                                setPracticeModalData((mockRecommendations as any)[q.questionId]);
                                                setPracticeModalAnswers({});
                                              }}
                                              className="ml-2 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-full font-bold text-xs transition-colors flex items-center gap-1.5 border border-amber-300 shadow-sm"
                                            >
                                              💡 View Recommended Practice
                                            </button>
                                          )}
                                        </div>

                                        <div className="text-gray-900 leading-relaxed font-semibold">
                                          <LatexText text={q.questionText} />
                                        </div>

                                        {/* Render diagram if exists */}
                                        {q.diagramSvg && (
                                          <div className="p-4 bg-white rounded-xl border border-gray-200 inline-block max-w-full overflow-hidden">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Diagram</p>
                                            <div className="max-w-[400px]" dangerouslySetInnerHTML={{ __html: q.diagramSvg }} />
                                          </div>
                                        )}

                                        {/* Render options */}
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                          {q.options.map((opt: string, i: number) => {
                                            const letter = String.fromCharCode(65 + i);
                                            const isCorrect = q.correctOption === letter;
                                            const isStudentSelected = q.studentChoice === letter;

                                            let optionStyle = 'bg-white border-gray-200 text-gray-700';
                                            if (isCorrect) {
                                              optionStyle = 'bg-green-50 border-green-300 text-green-800 font-bold';
                                            } else if (isStudentSelected && !isCorrect) {
                                              optionStyle = 'bg-red-50 border-red-300 text-red-800 font-bold';
                                            }

                                            return (
                                              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${optionStyle}`}>
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-600 text-white' : (isStudentSelected ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 border')
                                                  }`}>
                                                  {letter}
                                                </span>
                                                <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pb-1">
                                                  <LatexText text={opt} />
                                                </div>
                                                {isCorrect && (
                                                  <span className="material-symbols-outlined text-green-600 text-[18px] flex-shrink-0 mt-0.5">check_circle</span>
                                                )}
                                                {isStudentSelected && !isCorrect && (
                                                  <span className="material-symbols-outlined text-red-500 text-[18px] flex-shrink-0 mt-0.5">cancel</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Right Side: Explanation / Solution */}
                                      <div className="col-span-4 space-y-4">
                                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm overflow-hidden flex flex-col h-full">
                                          <div className="flex-1">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                              <span className="material-symbols-outlined text-[16px] text-blue-600">psychology</span>
                                              Step-by-Step Solution
                                            </h4>
                                            <div className="text-sm text-gray-700 leading-relaxed overflow-x-auto pb-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                              {q.solutionText ? <LatexText text={q.solutionText} /> : 'No solution explanation available.'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Practice Modal Overlay */}
          {practiceModalData && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative custom-scrollbar">

                <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-500">psychology</span>
                      Recommended Practice
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">Practice these targeted questions to improve your weak areas.</p>
                  </div>
                  <button
                    onClick={() => {
                      setPracticeModalData(null);
                      setPracticeModalAnswers({});
                    }}
                    className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors shadow-sm border border-gray-200"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {practiceModalData.map((mq, idx) => (
                    <div key={idx} className="bg-gray-50/50 rounded-xl border border-gray-200 p-6 shadow-sm">
                      <h4 className="font-bold text-gray-900 mb-5 flex items-start gap-3">
                        <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-sm font-black">Q{idx + 1}</span>
                        <div className="leading-relaxed"><LatexText text={mq.questionText} /></div>
                      </h4>

                      <div className="space-y-3 pl-10">
                        {mq.options.map((opt: string, optIdx: number) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isSelected = practiceModalAnswers[idx] === letter;
                          const isAnswered = !!practiceModalAnswers[idx];
                          const isCorrectOption = mq.correctOption === letter;

                          let style = "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 cursor-pointer shadow-sm";
                          let icon = null;

                          if (isAnswered) {
                            style = "bg-white border-gray-200 text-gray-400 opacity-60 cursor-default shadow-none";
                            if (isCorrectOption) {
                              style = "bg-green-50 border-green-400 text-green-900 font-bold opacity-100 shadow-sm ring-1 ring-green-400";
                              icon = <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>;
                            } else if (isSelected && !isCorrectOption) {
                              style = "bg-red-50 border-red-400 text-red-900 font-bold opacity-100 shadow-sm ring-1 ring-red-400";
                              icon = <span className="material-symbols-outlined text-red-500 text-[18px]">cancel</span>;
                            }
                          }

                          return (
                            <div
                              key={optIdx}
                              onClick={() => {
                                if (!isAnswered) {
                                  setPracticeModalAnswers(prev => ({ ...prev, [idx]: letter }));
                                }
                              }}
                              className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${style}`}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shadow-sm ${isAnswered && isCorrectOption ? 'bg-green-500 text-white border-green-600' : isAnswered && isSelected ? 'bg-red-500 text-white border-red-600' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                {letter}
                              </div>
                              <div className="flex-1 text-sm"><LatexText text={opt} /></div>
                              {icon}
                            </div>
                          );
                        })}
                      </div>

                      {practiceModalAnswers[idx] && (
                        <div className="mt-6 ml-10 bg-blue-50/70 rounded-xl p-5 border border-blue-100 shadow-sm">
                          <h5 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">lightbulb</span> Step-by-Step Solution
                          </h5>
                          <div className="text-sm text-gray-800 leading-relaxed font-medium">
                            <LatexText text={mq.solutionText} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STUDENT VIEW: MAIN REPORTS LIST ---
  if (!isAdmin) {
    return (
      <div className="flex flex-col min-w-0 w-full p-8 bg-gray-50/50 min-h-screen">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">My Reports</h2>
          <p className="text-gray-500 mt-1">Access all your diagnostic test attempts and structured analytics reports.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-white">
            <h3 className="text-lg font-bold text-gray-800">Evaluated Mock Tests</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No reports published yet. Check back later!</div>
            ) : (
              reports.map((report) => {
                const scorePercentage = Math.round((report.score / report.totalMarks) * 100);
                return (
                  <div key={report._id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">analytics</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{report.testId?.title || 'Diagnostic Test'}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Conducted On: {new Date(report.createdAt).toLocaleDateString()} &bull; Type: {report.testId?.examType || 'NEET'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      {/* Score Badge */}
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Your Score</p>
                        <p className="font-extrabold text-blue-600 text-xl">
                          {report.score} <span className="text-xs text-gray-400 font-medium">/ {report.totalMarks} ({scorePercentage}%)</span>
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchReviewDetails(report._id)}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Review Answers
                        </button>
                        <button
                          onClick={() => {
                            window.open(window.location.origin + '/student/reports?printReportId=' + report._id + '&closeAfterPrint=true', '_blank');
                          }}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW: CUMULATIVE TEST ANALYTICS VIEW ---
  if (isAdmin && viewingAnalyticsTest) {
    const theme = SUBJECT_THEMES[selectedSubject];
    const SUBJECT_CATEGORIES = {
      Physics: ['Mechanics', 'Thermodynamics', 'Electrodynamics', 'Optics', 'Modern Physics'],
      Chemistry: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
      Biology: ['Cell Biology', 'Genetics', 'Human Physiology', 'Plant Physiology', 'Ecology']
    };
    const categories = SUBJECT_CATEGORIES[selectedSubject];

    // Compute category accuracies
    const categoryAccuracies = categories.map(cat => {
      const matchingEntries = (viewingAnalyticsTest.chapterMastery?.[selectedSubject] || []).filter((cm: any) => {
        return getCategory(cm.chapter, selectedSubject) === cat;
      });

      if (matchingEntries.length === 0) {
        return { category: cat, accuracy: 50, count: 0 };
      }

      let sumCorrect = 0;
      let sumTotal = 0;
      for (const cm of matchingEntries) {
        sumCorrect += (cm.accuracyPercentage / 100) * cm.totalAttempted;
        sumTotal += cm.totalAttempted;
      }

      const accuracy = sumTotal > 0 ? Math.round((sumCorrect / sumTotal) * 100) : 50;
      return { category: cat, accuracy, count: sumTotal };
    });

    const filteredChapterMastery = viewingAnalyticsTest.chapterMastery?.[selectedSubject] || [];
    const filteredStrengths = viewingAnalyticsTest.swotProfile?.[selectedSubject]?.strengths || [];
    const filteredWeaknesses = viewingAnalyticsTest.swotProfile?.[selectedSubject]?.criticalWeaknesses || [];

    // SVG Radar calculations
    const cx = 150;
    const cy = 135;
    const radius = 80;
    const numPoints = categoryAccuracies.length;
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const gridPaths = gridLevels.map(level => {
      return Array.from({ length: numPoints }).map((_, i) => {
        const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
        const x = cx + radius * level * Math.cos(angle);
        const y = cy + radius * level * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
    });

    const getPoints = (accuracies: typeof categoryAccuracies) => {
      return accuracies.map((item, i) => {
        const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
        const scoreFraction = Math.min(Math.max(item.accuracy, 10), 100) / 100;
        const x = cx + radius * scoreFraction * Math.cos(angle);
        const y = cy + radius * scoreFraction * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
    };

    return (
      <div className="flex flex-col min-w-0 w-full p-8 bg-gray-50 min-h-screen">
        {/* Back header */}
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 opacity-10 pointer-events-none rounded-xl" style={{ "WebkitMask": "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", "WebkitMaskComposite": "xor", "maskComposite": "exclude", "padding": "2px" }}></div>
          <div className="flex items-center gap-4 z-10">
            <button
              onClick={() => setViewingAnalyticsTest(null)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex items-center justify-center transition-colors border border-gray-200 bg-white"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{viewingAnalyticsTest.testTitle}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-0.5 rounded-full text-xs font-semibold border border-indigo-100">Batch Type: {viewingAnalyticsTest.examType}</span>
                <span className="text-xs font-medium text-gray-400">Class Performance Overview</span>
              </div>
            </div>
          </div>
        </header>

        {/* Top Summary Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <span className="material-symbols-outlined text-[28px]">assessment</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Class Average</p>
              <h4 className="text-xl font-black text-gray-900 mt-1">
                {viewingAnalyticsTest.averageScore} <span className="text-xs text-gray-400 font-medium">/ {viewingAnalyticsTest.totalMarks}</span>
              </h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
              <span className="material-symbols-outlined text-[28px]">arrow_upward</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Highest Score</p>
              <h4 className="text-xl font-black text-green-700 mt-1">{viewingAnalyticsTest.highestScore}</h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <span className="material-symbols-outlined text-[28px]">arrow_downward</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lowest Score</p>
              <h4 className="text-xl font-black text-red-700 mt-1">{viewingAnalyticsTest.lowestScore}</h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <span className="material-symbols-outlined text-[28px]">group</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Graded Students</p>
              <h4 className="text-xl font-black text-purple-700 mt-1">{viewingAnalyticsTest.totalReports} Student(s)</h4>
            </div>
          </div>
        </div>

        {/* Subject Filter Dropdown */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <span className={`material-symbols-outlined ${theme.text}`}>analytics</span>
            Subject Analytics View
          </span>
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as any)}
              className={`px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 outline-none transition-colors bg-white cursor-pointer ${theme.border} focus:border-${selectedSubject === 'Physics' ? 'blue-400' : (selectedSubject === 'Chemistry' ? 'emerald-400' : 'amber-400')}`}
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Area */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Radar Chart */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[420px] flex flex-col relative">
                <h3 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider">Topic Accuracy Breakdown</h3>
                <div className="flex-1 flex items-center justify-center relative">
                  <svg width="300" height="270" className="overflow-visible">
                    {gridPaths.map((path, idx) => (
                      <polygon key={idx} points={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />
                    ))}

                    {categoryAccuracies.map((_, i) => {
                      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
                      const x2 = cx + radius * Math.cos(angle);
                      const y2 = cy + radius * Math.sin(angle);
                      return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" />;
                    })}

                    <polygon
                      points={getPoints(categoryAccuracies)}
                      fill="none"
                      className={`${theme.fill} transition-all duration-500`}
                      strokeWidth="0"
                    />
                    <polygon
                      points={getPoints(categoryAccuracies)}
                      fill="none"
                      className={`${theme.stroke} transition-all duration-500`}
                      strokeWidth="2.5"
                    />

                    {categoryAccuracies.map((item, i) => {
                      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
                      const scoreFraction = Math.min(Math.max(item.accuracy, 10), 100) / 100;
                      const x = cx + radius * scoreFraction * Math.cos(angle);
                      const y = cy + radius * scoreFraction * Math.sin(angle);
                      const isHovered = hoveredCategory === item.category;

                      return (
                        <g key={i} className="cursor-pointer">
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 4}
                            className={`${isHovered ? theme.bg : 'fill-white'} ${theme.stroke} transition-all duration-150`}
                            strokeWidth="2"
                            onMouseEnter={(e) => {
                              setHoveredCategory(item.category);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipPos({ x: rect.left + window.scrollX - 70, y: rect.top + window.scrollY - 85 });
                              setTooltipContent(item);
                            }}
                            onMouseLeave={() => {
                              setHoveredCategory(null);
                              setTooltipPos(null);
                              setTooltipContent(null);
                            }}
                          />
                        </g>
                      );
                    })}

                    {categoryAccuracies.map((item, i) => {
                      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
                      const labelOffset = 18;
                      const lx = cx + (radius + labelOffset) * Math.cos(angle);
                      const ly = cy + (radius + labelOffset) * Math.sin(angle);

                      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                      if (Math.cos(angle) > 0.1) textAnchor = 'start';
                      else if (Math.cos(angle) < -0.1) textAnchor = 'end';

                      const isHovered = hoveredCategory === item.category;

                      return (
                        <text
                          key={i}
                          x={lx}
                          y={ly + 4}
                          textAnchor={textAnchor}
                          className={`text-[10px] font-black tracking-wide uppercase transition-colors duration-150 ${isHovered ? `${theme.color} scale-105` : 'fill-gray-500'}`}
                          onMouseEnter={(e) => {
                            setHoveredCategory(item.category);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({ x: rect.left + window.scrollX - 45, y: rect.top + window.scrollY - 70 });
                            setTooltipContent(item);
                          }}
                          onMouseLeave={() => {
                            setHoveredCategory(null);
                            setTooltipPos(null);
                            setTooltipContent(null);
                          }}
                        >
                          {item.category}
                        </text>
                      );
                    })}
                  </svg>

                  {tooltipPos && tooltipContent && (
                    <div
                      className="absolute z-20 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs flex flex-col gap-1 border border-gray-800"
                      style={{ left: tooltipPos.x - 30, top: tooltipPos.y - 120 }}
                    >
                      <span className="font-black uppercase tracking-wider text-[10px] text-gray-400">{tooltipContent.category}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-black text-white">{tooltipContent.accuracy}%</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{tooltipContent.count} questions attempts</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Class SWOT Analysis */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[420px] flex flex-col">
                <h3 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider">Class SWOT Analysis</h3>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

                  {/* Strengths */}
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                    <h4 className="text-green-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">thumb_up</span> Class Strengths (&gt;=70%)
                    </h4>
                    {filteredStrengths.length === 0 ? (
                      <p className="text-xs text-gray-400">No chapters met strength accuracy thresholds.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filteredStrengths.map((str: string, idx: number) => (
                          <span key={idx} className="bg-green-100 text-green-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-green-200">
                            {str}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                    <h4 className="text-red-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">warning</span> Critical Weaknesses (&lt;50%)
                    </h4>
                    {filteredWeaknesses.length === 0 ? (
                      <p className="text-xs text-gray-400">No chapters require urgent focus.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {filteredWeaknesses.map((weak: string, idx: number) => (
                          <span key={idx} className="bg-red-100 text-red-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-red-200">
                            {weak}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Chapter Mastery Progress bars */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-wider">Chapter Mastery Performance</h3>
              {filteredChapterMastery.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-medium">No chapter metrics logged for this subject.</div>
              ) : (
                <div className="space-y-5">
                  {filteredChapterMastery.map((cm: any, i: number) => {
                    const isHovered = hoveredCategory === getCategory(cm.chapter, selectedSubject);
                    return (
                      <div
                        key={i}
                        className={`transition-all duration-300 p-2.5 rounded-lg border border-transparent ${isHovered ? `${theme.lightBorder} ${theme.hover} scale-[1.01] shadow-sm` : ''}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-bold transition-colors ${isHovered ? theme.color : 'text-gray-700'}`}>
                            {cm.chapter}
                          </span>
                          <span className={`text-xs font-black transition-colors ${isHovered ? theme.color : 'text-gray-500'}`}>
                            {cm.accuracyPercentage}% ({cm.totalAttempted} Qs)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${isHovered ? theme.bg : 'bg-gray-400'}`}
                            style={{ width: `${cm.accuracyPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: High Risk Chapters / Action Panel */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Teaching Interventions</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Based on overall test results, these are the chapters where the class scored the lowest. Prioritize revisits or remedial assignments for these topics.
              </p>

              <div className="space-y-4">
                {filteredChapterMastery.slice(-3).reverse().map((cm: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">assignment_late</span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{cm.chapter}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Average Accuracy: <span className="font-bold text-red-600">{cm.accuracyPercentage}%</span></p>
                    </div>
                  </div>
                ))}
                {filteredChapterMastery.length === 0 && (
                  <div className="text-center p-4 text-xs text-gray-400 font-medium">All chapter topics are performing optimally.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW: PUBLISH STATUS PANEL ---
  const filteredTests = tests.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="flex flex-col min-w-0 w-full p-8 print:hidden">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Publish Reports</h2>
            <p className="text-gray-500 mt-1">Publish evaluated test results to the Student Portal so students can pull their PDFs on-demand.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search reports..."
              className="px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">Results Publishing Status</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Report Name</th>
                <th className="p-4">Target Batch</th>
                <th className="p-4">Evaluation Date</th>
                <th className="p-4">Publish Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No test batches found.</td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{test.title}</td>
                    <td className="p-4">{test.examType}</td>
                    <td className="p-4">{new Date(test.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      {test.isPublished ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Unpublished
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleViewAnalytics(test._id)}
                          disabled={analyticsLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">analytics</span>
                          {analyticsLoading ? 'Loading...' : 'View Analytics'}
                        </button>

                        {test.isPublished ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleViewSamplePdf(test._id)}
                              disabled={samplePdfLoading === test._id}
                              title="Print the question paper with answer key"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#fff] hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">article</span>
                              {samplePdfLoading === test._id ? 'Loading...' : 'Question Paper'}
                            </button>
                            <button
                              onClick={() => handlePrintAnalytics(test._id)}
                              disabled={printAnalyticsLoading === test._id}
                              title="Print the class analytics report"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 transition-colors disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">analytics</span>
                              {printAnalyticsLoading === test._id ? 'Loading...' : 'Analytics PDF'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePublish(test._id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">cloud_upload</span> Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== ADMIN SAMPLE PDF MODAL ===== */}
      {samplePdfData && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto print:static print:inset-auto print:overflow-visible print:w-full print:h-auto print:p-0">
          {/* UI Controls (hidden in print) */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm print:hidden">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Sample PDF Preview</h2>
              <p className="text-sm text-gray-500">{samplePdfData.test.title} — {samplePdfData.questions.length} Questions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Download / Print PDF
              </button>
              <button
                onClick={() => setSamplePdfData(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Close
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div className="max-w-4xl mx-auto px-10 py-10 text-black print:max-w-none print:px-0 print:py-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
              <div>
                {institute?.logoUrl ? (
                  <img src={(institute.logoUrl?.startsWith("data:") ? institute.logoUrl : `${import.meta.env.VITE_API_URL || ''}${institute.logoUrl}`)} alt={institute?.name || 'Logo'} className="max-h-16 object-contain mb-4" />
                ) : (
                  <h1 className="text-3xl font-black text-gray-900 mb-2">{institute?.name || 'CogniTest'}</h1>
                )}
                <h2 className="text-2xl font-bold text-gray-800">{samplePdfData.test.title}</h2>
                <p className="text-gray-500 mt-1 text-sm">Exam Type: {samplePdfData.test.examType} &bull; Date: {new Date(samplePdfData.test.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Test Instructions</div>
                <p className="text-gray-700">Total Questions: <strong>{samplePdfData.test.totalQuestions}</strong></p>
                <p className="text-gray-700">Marks per Question: <strong>+{samplePdfData.test.marksPerQuestion}</strong></p>
                <p className="text-gray-700">Negative Marking: <strong>-{samplePdfData.test.negativeMarking}</strong></p>
                <p className="text-gray-700">Total Marks: <strong>{samplePdfData.test.totalQuestions * samplePdfData.test.marksPerQuestion}</strong></p>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-8">
              {samplePdfData.questions.map((q: any) => (
                <div key={q.questionId} className="page-break-inside-avoid">
                  <div className="flex items-start gap-4 mb-3">
                    <span className="bg-gray-900 text-white min-w-[2rem] h-8 rounded flex items-center justify-center font-bold text-sm flex-shrink-0">Q{q.questionNo}</span>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">{q.subject}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">{q.chapter}</span>
                      </div>
                      <div className="font-semibold text-gray-900 leading-relaxed">
                        <LatexText text={q.questionText} />
                      </div>
                    </div>
                  </div>

                  {q.diagramSvg && (
                    <div className="mb-4 pl-12">
                      <div className="max-w-[400px] border border-gray-200 p-2 rounded bg-white inline-block" dangerouslySetInnerHTML={{ __html: q.diagramSvg }} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pl-12">
                    {q.options.map((opt: string, i: number) => {
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                          <span className="font-bold text-gray-700 flex-shrink-0">{letter}.</span>
                          <div className="flex-1 text-gray-800">
                            <LatexText text={opt} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Answer Key */}
            <div className="mt-12 border-t-2 border-gray-900 pt-8 page-break-inside-avoid">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Answer Key</h3>
              <div className="grid grid-cols-5 gap-3">
                {samplePdfData.questions.map((q: any) => (
                  <div key={q.questionId} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-gray-500">Q{q.questionNo}</span>
                    <span className="text-sm font-black text-green-700">{q.correctOption}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
              Powered by CogniTest &bull; {institute?.name} &bull; Generated on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* ===== ADMIN ANALYTICS PRINT MODAL ===== */}
      {printAnalyticsData && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto print:static print:inset-auto print:overflow-visible print:w-full print:h-auto print:p-0">
          {/* UI Controls (hidden in print) */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm print:hidden">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Analytics Report Preview</h2>
              <p className="text-sm text-gray-500">{printAnalyticsData.testTitle} — {printAnalyticsData.totalReports} Students</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Download / Print PDF
              </button>
              <button
                onClick={() => setPrintAnalyticsData(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Close
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div className="max-w-4xl mx-auto px-10 py-10 text-black print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
              <div>
                {institute?.logoUrl ? (
                  <img src={(institute.logoUrl?.startsWith("data:") ? institute.logoUrl : `${import.meta.env.VITE_API_URL || ''}${institute.logoUrl}`)} alt={institute?.name || 'Logo'} className="max-h-16 object-contain mb-4" />
                ) : (
                  <div className="text-3xl font-black text-gray-900 mb-2">{institute?.name || 'CogniTest'}</div>
                )}
                <div className="text-2xl font-bold text-gray-800">{printAnalyticsData.testTitle}</div>
                <div className="text-gray-500 mt-1 text-sm">Exam Type: {printAnalyticsData.examType} &bull; Analytics Report</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Report Date</div>
                <div className="text-gray-700 font-medium">{new Date().toLocaleDateString()}</div>
                <div className="text-gray-700 mt-1">Total Students: <strong>{printAnalyticsData.totalReports}</strong></div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-10 page-break-inside-avoid">
              {[
                { label: 'Average Score', val: `${printAnalyticsData.averageScore} / ${printAnalyticsData.totalMarks}`, sub: `${Math.round((printAnalyticsData.averageScore / printAnalyticsData.totalMarks) * 100)}%`, color: 'border-blue-300 bg-blue-50' },
                { label: 'Highest Score', val: printAnalyticsData.highestScore, sub: 'Topper', color: 'border-green-300 bg-green-50' },
                { label: 'Lowest Score', val: printAnalyticsData.lowestScore, sub: 'Lowest', color: 'border-red-300 bg-red-50' },
                { label: 'Pass Rate', val: `${printAnalyticsData.passRate}%`, sub: `${Math.round(printAnalyticsData.totalReports * printAnalyticsData.passRate / 100)} Students`, color: 'border-purple-300 bg-purple-50' },
              ].map((s, i) => (
                <div key={i} className={`border-2 ${s.color} rounded-xl p-4 text-center`}>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{s.label}</div>
                  <div className="text-2xl font-black text-gray-900">{s.val}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Chapter Mastery Tables — one per subject */}
            {(['Physics', 'Chemistry', 'Biology'] as const).map(subj => {
              const chapters: any[] = printAnalyticsData.chapterMastery?.[subj] || [];
              const swot = printAnalyticsData.swotProfile?.[subj];
              if (!chapters.length) return null;
              return (
                <div key={subj} className="mb-10 page-break-inside-avoid">
                  <div className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full inline-block ${subj === 'Physics' ? 'bg-blue-500' : subj === 'Chemistry' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {subj}
                  </div>
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-2 px-3 font-bold text-gray-700 border border-gray-200">Chapter</th>
                        <th className="text-center py-2 px-3 font-bold text-gray-700 border border-gray-200">Attempted</th>
                        <th className="text-center py-2 px-3 font-bold text-gray-700 border border-gray-200">Accuracy</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-700 border border-gray-200">Performance Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.map((ch: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-3 border border-gray-200 font-medium text-gray-800">{ch.chapter}</td>
                          <td className="py-2 px-3 border border-gray-200 text-center text-gray-600">{ch.totalAttempted}</td>
                          <td className={`py-2 px-3 border border-gray-200 text-center font-bold ${ch.accuracyPercentage >= 70 ? 'text-green-700' : ch.accuracyPercentage >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
                            {ch.accuracyPercentage}%
                          </td>
                          <td className="py-2 px-3 border border-gray-200">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${ch.accuracyPercentage >= 70 ? 'bg-green-500' : ch.accuracyPercentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${ch.accuracyPercentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {swot && (swot.strengths.length > 0 || swot.criticalWeaknesses.length > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      {swot.strengths.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-bold uppercase text-green-700 mb-2">&#9650; Strengths</div>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {swot.strengths.map((s: string, i: number) => <li key={i}>&bull; {s}</li>)}
                          </ul>
                        </div>
                      )}
                      {swot.criticalWeaknesses.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-bold uppercase text-red-700 mb-2">&#9660; Critical Weaknesses</div>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {swot.criticalWeaknesses.map((s: string, i: number) => <li key={i}>&bull; {s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
              Powered by CogniTest &bull; {institute?.name} &bull; Analytics Report generated on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;
