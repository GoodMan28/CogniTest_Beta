// Force HMR reload
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
// import katex from 'katex';

import LatexText from '../components/LatexText';

// ── Subject color themes ──
const SUBJECT_THEMES: Record<string, { bg: string; activeBg: string; text: string; border: string; ring: string; gradient: string }> = {
  Physics: {
    bg: 'bg-blue-50', activeBg: 'bg-blue-600', text: 'text-blue-600',
    border: 'border-blue-200', ring: 'ring-blue-500/30', gradient: 'from-blue-600 to-indigo-600'
  },
  Chemistry: {
    bg: 'bg-emerald-50', activeBg: 'bg-emerald-600', text: 'text-emerald-600',
    border: 'border-emerald-200', ring: 'ring-emerald-500/30', gradient: 'from-emerald-600 to-teal-600'
  },
  Biology: {
    bg: 'bg-amber-50', activeBg: 'bg-amber-600', text: 'text-amber-600',
    border: 'border-amber-200', ring: 'ring-amber-500/30', gradient: 'from-amber-600 to-orange-600'
  },
};

// ── Loading messages ──
const LOADING_MESSAGES = [
  'Analyzing your weakness profile...',
  'Querying vector database for similar questions...',
  'Building your personalized test...',
  'Selecting optimal difficulty mix...',
  'Almost ready...',
];

type TestPhase = 'config' | 'loading' | 'test' | 'results';

const CustomTests = () => {
  const { studentId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Config state - URL is the single source of truth for subject
  const subjParam = searchParams.get('subject');
  const subject: 'Physics' | 'Chemistry' | 'Biology' = 
    (subjParam === 'Chemistry' || subjParam === 'Biology') ? subjParam : 'Physics';

  const setSubject = (newSubject: 'Physics' | 'Chemistry' | 'Biology') => {
    setSearchParams({ subject: newSubject }, { replace: true });
  };

  const [numQuestions, setNumQuestions] = useState<10 | 15 | 20>(10);
  const [timed, setTimed] = useState(false);

  // Phase state
  const [phase, setPhase] = useState<TestPhase>('config');
  const [loadingMsg, setLoadingMsg] = useState(0);

  // Test state
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results state
  const [results, setResults] = useState<{ correct: number; incorrect: number; unanswered: number } | null>(null);

  const theme = SUBJECT_THEMES[subject];
  const timedDurations: Record<number, number> = { 10: 20, 15: 30, 20: 40 };

  // ── Loading animation cycling ──
  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Timer countdown ──
  useEffect(() => {
    if (phase !== 'test' || !timed || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timed]);

  // ── Generate test ──
  const handleGenerate = async () => {
    if (!studentId) return alert('No student active in session');
    setPhase('loading');
    setLoadingMsg(0);
    try {
      const res = await axios.post('/api/v1/custom-test/generate', {
        studentId,
        subject,
        numQuestions,
        timed
      });
      setQuestions(res.data);
      setAnswers({});
      setCurrentIndex(0);
      if (timed) {
        setTimeLeft(timedDurations[numQuestions] * 60);
      }
      setPhase('test');
    } catch (error) {
      console.error('Failed to generate test:', error);
      alert('Failed to generate test. Please try again.');
      setPhase('config');
    }
  };

  // ── Submit test ──
  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAnswer = answers[i];
      if (!studentAnswer) {
        unanswered++;
      } else if (studentAnswer === q.correctOption) {
        correct++;
      } else {
        incorrect++;
      }
    }

    setResults({ correct, incorrect, unanswered });
    setPhase('results');
  }, [questions, answers]);

  // ── Reset ──
  const handleReset = () => {
    setPhase('config');
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(0);
  };

  // ── Timer display helper ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerColor = timeLeft > 300 ? 'text-green-600 bg-green-50 border-green-200'
    : timeLeft > 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200 animate-pulse';

  const answeredCount = Object.keys(answers).length;

  // ════════════════════════════════════════════════════════════════
  //  RENDER: CONFIG PHASE
  // ════════════════════════════════════════════════════════════════
  if (phase === 'config') {
    return (
      <div className="flex flex-col min-w-0 w-full p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">AI Practice Test</h2>
          <p className="text-gray-500 mt-1">Generate a personalized test targeting your weak areas using vector similarity search.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Config Panel */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">tune</span>
                Test Configuration
              </h3>

              {/* Subject Selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Subject</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Physics', 'Chemistry', 'Biology'] as const).map(s => {
                    const isActive = subject === s;
                    let activeClasses = '';
                    if (s === 'Physics') activeClasses = 'bg-blue-500 text-white border-transparent shadow-md scale-[1.02]';
                    else if (s === 'Chemistry') activeClasses = 'bg-emerald-600 text-white border-transparent shadow-md scale-[1.02]';
                    else activeClasses = 'bg-amber-600 text-white border-transparent shadow-md scale-[1.02]';

                    return (
                      <button
                        key={s}
                        onClick={() => setSubject(s)}
                        className={`py-3 rounded-lg text-sm font-bold transition-all duration-200 border ${
                          isActive
                            ? activeClasses
                            : `bg-white ${SUBJECT_THEMES[s].text} ${SUBJECT_THEMES[s].border} hover:${SUBJECT_THEMES[s].bg}`
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Questions</label>
                <div className="grid grid-cols-3 gap-2">
                  {([10, 15, 20] as const).map(n => {
                    let activeClasses = '';
                    if (subject === 'Physics') activeClasses = 'bg-blue-500 text-white border-transparent shadow-md';
                    else if (subject === 'Chemistry') activeClasses = 'bg-emerald-600 text-white border-transparent shadow-md';
                    else activeClasses = 'bg-amber-600 text-white border-transparent shadow-md';

                    return (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(n)}
                        className={`py-3 rounded-lg text-sm font-bold transition-all duration-200 border ${
                          numQuestions === n
                            ? activeClasses
                            : `bg-white text-gray-600 border-gray-200 hover:bg-gray-50`
                        }`}
                      >
                        {n} Qs
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timed Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-bold text-gray-700">Timed Mode</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {timed ? `${timedDurations[numQuestions]} minutes` : 'No time limit'}
                    </p>
                  </div>
                  <button
                    onClick={() => setTimed(!timed)}
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 flex items-center p-0.5 ${
                      timed 
                        ? (subject === 'Physics' ? 'bg-blue-500' : subject === 'Chemistry' ? 'bg-emerald-600' : 'bg-amber-600') 
                        : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block w-4 h-4 bg-[#ffffff] rounded-full shadow transition-transform duration-200 ${timed ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className={`w-full py-3.5 bg-gradient-to-r ${theme.gradient} text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md`}
              >

                Generate AI Test
              </button>
            </div>
          </div>

          {/* Right side — Info panel */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                {/* Abstract Glowing Orbs */}
                <div className={`absolute top-0 right-2 w-20 h-20 bg-gradient-to-br ${theme.gradient} rounded-full mix-blend-multiply opacity-70 animate-pulse`} style={{ animationDuration: '4s' }}></div>
                <div className={`absolute bottom-0 left-2 w-24 h-24 bg-gradient-to-tr ${theme.gradient} rounded-full mix-blend-multiply opacity-60 animate-pulse`} style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
                <div className="absolute inset-0 backdrop-blur-[2px] rounded-full"></div>
                {/* Clean geometric center */}
                <div className="relative z-10 w-12 h-12 bg-white rounded-xl shadow-md border border-gray-100 rotate-12 flex items-center justify-center transition-transform hover:rotate-0 duration-500">
                  <div className={`w-4 h-4 rounded-sm bg-gradient-to-br ${theme.gradient}`}></div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-4">How It Works</h3>
              <div className="max-w-md space-y-4 text-left">
                <div className="flex gap-3 items-start">
                  <span className={`w-7 h-7 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>1</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">SWOT Analysis</p>
                    <p className="text-xs text-gray-500">Your critical weaknesses are identified from past test evaluations.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className={`w-7 h-7 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>2</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Vector Similarity Search</p>
                    <p className="text-xs text-gray-500">Questions similar to what you got wrong are found using AI embeddings in Pinecone.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className={`w-7 h-7 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>3</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Smart Filtering</p>
                    <p className="text-xs text-gray-500">Already-seen questions are excluded. Only unseen questions from weak chapters are selected.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER: LOADING PHASE
  // ════════════════════════════════════════════════════════════════
  if (phase === 'loading') {
    return (
      <div className="flex flex-col min-w-0 w-full p-8 items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center">
          {/* Pulsing orb animation */}
          <div className="relative mb-10">
            <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${theme.gradient} opacity-20 animate-ping absolute inset-0`} />
            <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${theme.gradient} opacity-30 animate-pulse absolute inset-0`} style={{ animationDelay: '0.5s' }} />
            <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-2xl`}>

            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-3">Generating Your Test</h3>
          <p className="text-sm text-gray-500 h-6 transition-all duration-500">
            {LOADING_MESSAGES[loadingMsg]}
          </p>

          <div className="mt-8 flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${theme.activeBg} animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER: RESULTS PHASE
  // ════════════════════════════════════════════════════════════════
  if (phase === 'results' && results) {
    const percentage = Math.round((results.correct / questions.length) * 100);
    const grade = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Needs Work' : 'Critical';
    const gradeColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-blue-600' : percentage >= 40 ? 'text-amber-600' : 'text-red-600';
    const gradeBg = percentage >= 80 ? 'bg-green-50 border-green-200' : percentage >= 60 ? 'bg-blue-50 border-blue-200' : percentage >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

    return (
      <div className="flex flex-col min-w-0 w-full p-8 items-center justify-center min-h-[80vh]">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-lg w-full text-center">
          {/* Score circle */}
          <div className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center border-4 ${gradeBg}`}>
            <div>
              <p className={`text-3xl font-black ${gradeColor}`}>{percentage}%</p>
              <p className={`text-xs font-bold ${gradeColor}`}>{grade}</p>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">Test Complete</h3>
          <p className="text-sm text-gray-500 mb-8">{subject} · {questions.length} Questions{timed ? ` · Timed` : ''}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-2xl font-black text-green-600">{results.correct}</p>
              <p className="text-xs font-bold text-green-700 mt-1">Correct</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-2xl font-black text-red-600">{results.incorrect}</p>
              <p className="text-xs font-bold text-red-700 mt-1">Incorrect</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-2xl font-black text-gray-600">{results.unanswered}</p>
              <p className="text-xs font-bold text-gray-700 mt-1">Unanswered</p>
            </div>
          </div>

          {/* Review + Retry */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span> New Test
            </button>
            <button
              onClick={() => { setPhase('test'); setCurrentIndex(0); }}
              className={`flex-1 py-3 bg-gradient-to-r ${theme.gradient} text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2`}
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span> Review Answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER: TEST-TAKING PHASE
  // ════════════════════════════════════════════════════════════════
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const isReviewMode = results !== null;
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme.bg} ${theme.text} border ${theme.border}`}>
            {subject}
          </span>
          <span className="text-sm font-bold text-gray-700">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Answered counter */}
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
            {answeredCount}/{questions.length} answered
          </span>
          {/* Timer */}
          {timed && !isReviewMode && (
            <span className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold border ${timerColor}`}>
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">timer</span>
              {formatTime(timeLeft)}
            </span>
          )}
          {isReviewMode && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
              Review Mode
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Question Card */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {/* Question metadata */}
            <div className="flex flex-wrap gap-2 mb-4">
              {isReviewMode && !answers[currentIndex] && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">
                  Unanswered
                </span>
              )}
              {currentQuestion.chapter && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">
                  {currentQuestion.chapter}
                </span>
              )}
              {currentQuestion.difficulty && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  currentQuestion.difficulty === 'Hard' ? 'text-red-600 bg-red-50 border-red-200' :
                  currentQuestion.difficulty === 'Easy' ? 'text-green-600 bg-green-50 border-green-200' :
                  'text-amber-600 bg-amber-50 border-amber-200'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              )}
            </div>

            {/* Question Text */}
            <div className="mb-4">
              <p className="text-base font-medium text-gray-800 leading-relaxed">
                <span className="font-bold text-gray-400 mr-2">Q{currentIndex + 1}.</span>
                <LatexText text={currentQuestion.questionText} />
              </p>
            </div>

            {/* Chapter and Topic explicitly shown for demo purposes */}
            <div className="mb-6 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-semibold border border-gray-200">
                Chapter: {currentQuestion.chapter || 'N/A'}
              </span>
              {currentQuestion.topic && currentQuestion.topic.length > 0 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-semibold border border-gray-200">
                  Topic: {currentQuestion.topic.join(', ')}
                </span>
              )}
            </div>

            {/* Conditionally render SVG diagram */}
            {currentQuestion.diagramSvg && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 inline-block max-w-full overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Diagram</p>
                <div
                  className="max-w-[400px]"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.diagramSvg }}
                />
              </div>
            )}

            {/* Conditionally render SMILES */}
            {currentQuestion.smilesNotation && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 inline-block max-w-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Molecular Structure</p>
                <div className="flex flex-col gap-2 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <img 
                    src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(currentQuestion.smilesNotation)}/image`} 
                    alt="Molecular Structure" 
                    className="max-h-[160px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <code className="text-xs text-gray-500 font-mono break-all">{currentQuestion.smilesNotation}</code>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options?.map((option: string, idx: number) => {
                const label = optionLabels[idx];
                const isSelected = answers[currentIndex] === label;
                const isCorrect = label === currentQuestion.correctOption;

                let optionStyle = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
                if (isReviewMode) {
                  if (isCorrect) {
                    optionStyle = 'border-green-400 bg-green-50';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'border-red-400 bg-red-50';
                  }
                } else if (isSelected) {
                  let activeBorder = 'border-blue-500 bg-blue-50';
                  if (subject === 'Chemistry') activeBorder = 'border-emerald-600 bg-emerald-50';
                  if (subject === 'Biology') activeBorder = 'border-amber-600 bg-amber-50';
                  optionStyle = activeBorder;
                }

                let bubbleStyle = 'border-gray-300 text-gray-400';
                if (isReviewMode) {
                  if (isCorrect) bubbleStyle = 'border-green-500 bg-green-500 text-white';
                  else if (isSelected && !isCorrect) bubbleStyle = 'border-red-500 bg-red-500 text-white';
                } else if (isSelected) {
                  if (subject === 'Physics') bubbleStyle = 'border-transparent bg-blue-500 text-white';
                  else if (subject === 'Chemistry') bubbleStyle = 'border-transparent bg-emerald-600 text-white';
                  else bubbleStyle = 'border-transparent bg-amber-600 text-white';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isReviewMode) {
                        setAnswers(prev => ({ ...prev, [currentIndex]: label }));
                      }
                    }}
                    disabled={isReviewMode}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 text-left ${optionStyle} ${isReviewMode ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all ${bubbleStyle}`}>
                      {isReviewMode && isCorrect ? '✓' : isReviewMode && isSelected && !isCorrect ? '✗' : label}
                    </span>
                    <span className="text-sm text-gray-700 flex-1">
                      <LatexText text={option} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Conditionally render option media */}
            {currentQuestion.optionsMedia && currentQuestion.optionsMedia.some((m: any) => m !== null) && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Option Media</p>
                <div className="grid grid-cols-2 gap-2">
                  {currentQuestion.optionsMedia.map((media: any, idx: number) => {
                    if (!media) return (
                      <div key={idx} className="p-2 border border-gray-100 rounded-md bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                        Option {optionLabels[idx]} - No media
                      </div>
                    );
                    return (
                      <div key={idx} className="p-2 border border-gray-200 rounded-md bg-white">
                        <p className="text-xs font-bold text-gray-500 mb-2 border-b border-gray-100 pb-1">Option {optionLabels[idx]}</p>
                        {media.type === 'svg' && (
                          <div dangerouslySetInnerHTML={{ __html: media.content }} className="max-w-[150px]" />
                        )}
                        {media.type === 'smiles' && (
                          <div className="flex flex-col items-center">
                            <img 
                              src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(media.content)}/image`} 
                              alt={`Option ${optionLabels[idx]}`}
                              className="max-h-[100px] object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <code className="text-[10px] text-gray-500 font-mono mt-1">{media.content}</code>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Solution (review mode only) */}
            {isReviewMode && currentQuestion.solutionText && (
              <div className="mt-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-200/50">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lightbulb</span> Solution
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <LatexText text={currentQuestion.solutionText} />
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span> Previous
                </button>
                
                {!isReviewMode && answers[currentIndex] && (
                  <button
                    onClick={() => {
                      setAnswers(prev => {
                        const newAns = { ...prev };
                        delete newAns[currentIndex];
                        return newAns;
                      });
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">clear</span> Clear
                  </button>
                )}
              </div>

              {currentIndex === questions.length - 1 && !isReviewMode ? (
                <button
                  onClick={() => {
                    if (window.confirm(`Submit test with ${answeredCount} of ${questions.length} answered?`)) {
                      handleSubmit();
                    }
                  }}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${theme.gradient} hover:shadow-lg transition-all flex items-center gap-2`}
                >
                  Submit Test <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              ) : isReviewMode && currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleReset}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${theme.gradient} hover:shadow-lg transition-all flex items-center gap-2`}
                >
                  New Test <span className="material-symbols-outlined text-[18px]">replay</span>
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold text-white ${theme.activeBg} hover:opacity-90 transition-colors flex items-center gap-1`}
                >
                  Next <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Grid (right sidebar) */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Question Navigator</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = idx === currentIndex;

                let cellStyle = 'bg-gray-50 text-gray-400 border-gray-200';
                if (isReviewMode) {
                  const ans = answers[idx];
                  const correctOpt = questions[idx]?.correctOption;
                  if (ans === correctOpt) cellStyle = 'bg-green-100 text-green-700 border-green-300';
                  else if (ans && ans !== correctOpt) cellStyle = 'bg-red-100 text-red-700 border-red-300';
                  else cellStyle = 'bg-gray-100 text-gray-400 border-gray-200';
                } else if (isAnswered) {
                  cellStyle = `${theme.bg} ${theme.text} ${theme.border}`;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full aspect-square rounded-lg border text-xs font-bold transition-all duration-150 ${cellStyle} ${
                      isCurrent ? 'ring-2 ring-offset-1 ' + theme.ring + ' scale-110' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
              {isReviewMode ? (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                    <span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Correct
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                    <span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Incorrect
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                    <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Unanswered
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                    <span className={`w-3 h-3 rounded ${theme.bg} border ${theme.border}`} /> Answered
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                    <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" /> Unanswered
                  </div>
                </>
              )}
            </div>

            {/* Submit button in sidebar too */}
            {!isReviewMode && (
              <button
                onClick={() => {
                  if (window.confirm(`Submit test with ${answeredCount} of ${questions.length} answered?`)) {
                    handleSubmit();
                  }
                }}
                className={`w-full mt-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${theme.gradient} hover:shadow-md transition-all flex items-center justify-center gap-1.5`}
              >
                <span className="material-symbols-outlined text-[16px]">send</span> Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTests;
