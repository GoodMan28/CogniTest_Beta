import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Question {
  _id: string;
  subject: string;
  chapter: string;
  topic: string[];
  questionIntent: string;
  questionText: string;
  options: string[];
  correctOption: string;
  solutionText: string;
  diagramSvg?: string;
  smilesNotation?: string;
  optionsMedia?: Array<{ type: 'svg' | 'smiles'; content: string } | null>;
  createdAt: string;
}

interface Stats {
  counts: { Physics: number; Chemistry: number; Biology: number; total: number };
  chapters: Record<string, Array<{ chapter: string; count: number }>>;
}

const SUBJECTS = ['Physics', 'Chemistry', 'Biology'] as const;
type Subject = typeof SUBJECTS[number];

const SUBJECT_COLORS: Record<Subject, { bg: string; text: string; border: string; activeBadgeBg: string; activeBadgeText: string; icon: string }> = {
  Physics:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    activeBadgeBg: 'bg-blue-600',    activeBadgeText: 'text-white', icon: 'bolt' },
  Chemistry: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBadgeBg: 'bg-emerald-600', activeBadgeText: 'text-white', icon: 'science' },
  Biology:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   activeBadgeBg: 'bg-amber-600',   activeBadgeText: 'text-white', icon: 'eco' },
};

const ITEMS_PER_PAGE = 15;

/** Strips LaTeX commands like $...$ and \text{} for plain-text display */
const stripLatex = (text: string): string => {
  return text
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const LatexText = ({ text }: { text: string }) => {
  if (!text) return null;
  // Handle literal '\\n' which might be stored in the DB as string '\n'
  const normalizedText = text.replace(/\\n/g, '\n');
  const parts = normalizedText.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const latexString = part.slice(1, -1);
          try {
            const html = katex.renderToString(latexString, { throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        
        // Handle newlines in normal text
        return (
          <span key={index}>
            {part.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
};

const QuestionBank = () => {
  const [activeSubject, setActiveSubject] = useState<Subject>('Physics');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/v1/questions/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  useEffect(() => {
    setChapterFilter('');
    setTopicFilter('');
    setPage(1);
    setExpandedId(null);
    axios.get('/api/v1/questions/chapters', { params: { subject: activeSubject } })
      .then(res => setChapters(res.data))
      .catch(err => console.error('Failed to fetch chapters:', err));
  }, [activeSubject]);

  useEffect(() => {
    setTopicFilter('');
    setPage(1);
    if (chapterFilter) {
      axios.get('/api/v1/questions/topics', { params: { subject: activeSubject, chapter: chapterFilter } })
        .then(res => setTopics(res.data))
        .catch(err => console.error('Failed to fetch topics:', err));
    } else {
      setTopics([]);
    }
  }, [activeSubject, chapterFilter]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/questions', {
        params: {
          subject: activeSubject,
          page,
          limit: ITEMS_PER_PAGE,
          search: search || undefined,
          chapter: chapterFilter || undefined,
          topic: topicFilter || undefined,
        }
      });
      setQuestions(res.data.questions);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSubject, page, search, chapterFilter, topicFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuestions(), 300);
    return () => clearTimeout(timer);
  }, [fetchQuestions]);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [search, chapterFilter, topicFilter]);

  const colors = SUBJECT_COLORS[activeSubject];

  return (
    <div className="flex flex-col min-w-0 w-full p-8 overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Question Bank</h2>
        <p className="text-gray-500 mt-1">
          Browse and search across {stats?.counts.total?.toLocaleString() || '—'} questions in the repository.
        </p>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-3 mb-6">
        {SUBJECTS.map(sub => {
          const sc = SUBJECT_COLORS[sub];
          const count = stats?.counts[sub] || 0;
          const isActive = activeSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg font-medium text-sm transition-all border ${
                isActive
                  ? `${sc.bg} ${sc.text} ${sc.border} shadow-sm`
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{sc.icon}</span>
              <span>{sub}</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive ? `${sc.activeBadgeBg} ${sc.activeBadgeText}` : 'bg-gray-100 text-gray-500'
              }`}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex gap-3 mb-5 items-center">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-${colors.text.split('-')[1]}-400 transition-colors w-64 appearance-none cursor-pointer`}
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
        >
          <option value="">All Chapters</option>
          {chapters.map(ch => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>
        {chapterFilter && (
          <select
            className={`px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-${colors.text.split('-')[1]}-400 transition-colors w-64 appearance-none cursor-pointer`}
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            <option value="">All Topics</option>
            {topics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <div className="flex items-center text-sm text-gray-500 ml-auto whitespace-nowrap">
          <span className="material-symbols-outlined text-[18px] mr-1">filter_list</span>
          {total.toLocaleString()} result{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Questions Table — only 3 columns: #, Question, Topics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0">
        <div className="overflow-auto max-h-[calc(100vh-340px)]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50/95 border-b border-gray-200 backdrop-blur-sm">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">#</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Question</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-64">Topics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
                      <span>Loading questions...</span>
                    </div>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl">inventory_2</span>
                      <span>No questions found matching your criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                questions.map((q, idx) => {
                  const isExpanded = expandedId === q._id;
                  const qNum = (page - 1) * ITEMS_PER_PAGE + idx + 1;
                  const cleanText = stripLatex(q.questionText);
                  const truncatedText = cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;

                  return (
                    <tr key={q._id} className="group">
                      <td colSpan={3} className="p-0">
                        {/* Summary Row */}
                        <div
                          className={`flex items-center cursor-pointer transition-colors ${isExpanded ? colors.bg : 'hover:bg-gray-50'}`}
                          onClick={() => setExpandedId(isExpanded ? null : q._id)}
                        >
                          {/* # */}
                          <div className="p-4 w-16 text-gray-400 font-medium text-xs flex-shrink-0">{qNum}</div>
                          {/* Question text */}
                          <div className="p-4 flex-1 min-w-0 overflow-hidden">
                            <p className="text-gray-800 truncate">{truncatedText}</p>
                          </div>
                          {/* Topics — truncated, hover to see all */}
                          <div className="p-4 w-64 flex-shrink-0 relative group/topics">
                            <div className="flex gap-1 overflow-hidden max-h-[28px]">
                              {q.topic.slice(0, 2).map((t, i) => (
                                <span key={i} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded whitespace-nowrap ${colors.bg} ${colors.text} border ${colors.border}`}>
                                  {t.length > 18 ? t.substring(0, 18) + '…' : t}
                                </span>
                              ))}
                              {q.topic.length > 2 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                                  +{q.topic.length - 2}
                                </span>
                              )}
                            </div>
                            {/* Full topics on hover */}
                            {q.topic.length > 2 && (
                              <div className="absolute right-4 top-full mt-1 hidden group-hover/topics:block z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">All Topics</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {q.topic.map((t, i) => (
                                    <span key={i} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <div className={`border-t ${colors.border} px-6 py-5 ${colors.bg}`}>
                            <div className="grid grid-cols-12 gap-6">
                              {/* Left: Question + Options */}
                              <div className="col-span-8">
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-200 text-gray-600 border border-gray-300">
                                    {q.chapter}
                                  </span>
                                  {q.topic.map((t, i) => (
                                    <span key={i} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-line break-words">
                                  <LatexText text={q.questionText} />
                                </p>

                                {/* Conditionally render SVG diagram */}
                                {q.diagramSvg && (
                                  <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 inline-block max-w-full overflow-hidden">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Diagram</p>
                                    <div
                                      className="max-w-[400px]"
                                      dangerouslySetInnerHTML={{ __html: q.diagramSvg }}
                                    />
                                  </div>
                                )}

                                {/* Conditionally render SMILES */}
                                {q.smilesNotation && (
                                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Molecular Structure (SMILES)</p>
                                    <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded font-mono break-all">{q.smilesNotation}</code>
                                  </div>
                                )}

                                {/* Options */}
                                <div className="grid grid-cols-2 gap-2">
                                  {q.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isCorrect = q.correctOption === letter || q.correctOption === opt;
                                    return (
                                      <div
                                        key={i}
                                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                                          isCorrect
                                            ? 'bg-green-50 border-green-300 text-green-800'
                                            : 'bg-white border-gray-200 text-gray-700'
                                        }`}
                                      >
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                          isCorrect ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 border border-gray-300'
                                        }`}>
                                          {letter}
                                        </span>
                                        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pb-1">
                                          <LatexText text={opt} />
                                        </div>
                                        {isCorrect && (
                                          <span className="material-symbols-outlined text-green-600 text-[18px] flex-shrink-0 mt-0.5">check_circle</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Conditionally render option media */}
                                {q.optionsMedia && q.optionsMedia.some(m => m !== null) && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Option Media</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {q.optionsMedia.map((m, i) => m && (
                                        <div key={i} className="p-2 border border-gray-100 rounded">
                                          <p className="text-[10px] text-gray-400 mb-1">Option {String.fromCharCode(65 + i)}</p>
                                          {m.type === 'svg' ? (
                                            <div className="max-w-[200px]" dangerouslySetInnerHTML={{ __html: m.content }} />
                                          ) : (
                                            <code className="text-xs font-mono text-gray-600 break-all">{m.content}</code>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Solution + Metadata */}
                              <div className="col-span-4 space-y-4">
                                <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-hidden">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Solution</h4>
                                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words overflow-x-auto pb-2">
                                    {q.solutionText ? <LatexText text={q.solutionText} /> : 'No solution available.'}
                                  </div>
                                </div>

                                {q.questionIntent && (
                                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Intent</h4>
                                    <p className="text-sm text-gray-600 break-words">{q.questionIntent}</p>
                                  </div>
                                )}

                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Details</h4>
                                  <div className="space-y-2 text-xs text-gray-500">
                                    <div className="flex justify-between">
                                      <span>Chapter</span>
                                      <span className="font-medium text-gray-700 text-right max-w-[60%] break-words">{q.chapter}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="flex-shrink-0">Correct Answer</span>
                                      <span className={`font-bold ${colors.text} text-right break-words min-w-0`}>
                                        <LatexText text={q.correctOption} />
                                      </span>
                                    </div>
                                    {q.diagramSvg && (
                                      <div className="flex justify-between">
                                        <span>Has Diagram</span>
                                        <span className="font-medium text-violet-600">Yes</span>
                                      </div>
                                    )}
                                    {q.smilesNotation && (
                                      <div className="flex justify-between">
                                        <span>Has SMILES</span>
                                        <span className="font-medium text-violet-600">Yes</span>
                                      </div>
                                    )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-2">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <span className="material-symbols-outlined text-[16px]">first_page</span>
            </button>
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>

            {/* Page numbers */}
            {(() => {
              const pages: (number | '...')[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (page > 3) pages.push('...');
                const start = Math.max(2, page - 1);
                const end = Math.min(totalPages - 1, page + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                if (page < totalPages - 2) pages.push('...');
                pages.push(totalPages);
              }
              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? `${colors.activeBadgeBg} text-white shadow-sm`
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              );
            })()}

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <span className="material-symbols-outlined text-[16px]">last_page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
