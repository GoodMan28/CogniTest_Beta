import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import adminApi from '../api/adminApi';
import { useAuth } from '../context/AuthContext';

const StudentAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studentId: authStudentId, loading: authLoading } = useAuth();
  // If 'id' exists in URL params, we're in admin view (/admin/students/:id)
  const isAdminView = !!id;
  const [student, setStudent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<'Physics' | 'Chemistry' | 'Mathematics'>('Physics');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const SUBJECT_THEMES = {
    Physics: {
      text: 'text-blue-600',
      textDark: 'text-blue-800',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      activeBg: 'bg-blue-600',
      activeText: 'text-white',
      progress: 'bg-blue-600',
      lightBorder: 'border-blue-100',
      hover: 'hover:bg-blue-50',
      fill: 'fill-blue-500/20',
      stroke: 'stroke-blue-600'
    },
    Chemistry: {
      text: 'text-emerald-600',
      textDark: 'text-emerald-800',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      activeBg: 'bg-emerald-600',
      activeText: 'text-white',
      progress: 'bg-emerald-500',
      lightBorder: 'border-emerald-100',
      hover: 'hover:bg-emerald-50',
      fill: 'fill-emerald-500/20',
      stroke: 'stroke-emerald-600'
    },
    Mathematics: {
      text: 'text-orange-600',
      textDark: 'text-orange-800',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      activeBg: 'bg-orange-600',
      activeText: 'text-white',
      progress: 'bg-orange-500',
      lightBorder: 'border-orange-100',
      hover: 'hover:bg-orange-50',
      fill: 'fill-orange-500/20',
      stroke: 'stroke-orange-600'
    }
  };

  const theme = SUBJECT_THEMES[selectedSubject];



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
    return 'Modern Physics'; // default for Modern / Semiconductor / Atoms / Nuclei
  };

  const getChemistryCategory = (chapter: string): string => {
    const ch = chapter.toLowerCase();
    if (ch.includes('organic') || ch.includes('hydrocarbon') || ch.includes('haloalkane') || ch.includes('alcohol') || ch.includes('aldehyde') || ch.includes('amine') || ch.includes('ether')) {
      return 'Organic Chemistry';
    }
    if (ch.includes('inorganic') || ch.includes('bonding') || ch.includes('p-block') || ch.includes('d-block') || ch.includes('coordination') || ch.includes('periodic') || ch.includes('metallurgy') || ch.includes('block')) {
      return 'Inorganic Chemistry';
    }
    return 'Physical Chemistry'; // default
  };

  const getMathematicsCategory = (chapter: string): string => {
    const ch = chapter.toLowerCase();
    if (ch.includes('algebra') || ch.includes('complex') || ch.includes('quadratic') || ch.includes('sequence') || ch.includes('series') || ch.includes('binomial') || ch.includes('permutation') || ch.includes('combination') || ch.includes('probability') || ch.includes('matrix') || ch.includes('determinant')) {
      return 'Algebra';
    }
    if (ch.includes('calculus') || ch.includes('function') || ch.includes('limit') || ch.includes('continuity') || ch.includes('differentiability') || ch.includes('derivative') || ch.includes('integration') || ch.includes('area') || ch.includes('differential')) {
      return 'Calculus';
    }
    if (ch.includes('trigonometry') || ch.includes('triangle') || ch.includes('inverse')) {
      return 'Trigonometry';
    }
    if (ch.includes('coordinate') || ch.includes('straight line') || ch.includes('circle') || ch.includes('conic') || ch.includes('parabola') || ch.includes('ellipse') || ch.includes('hyperbola')) {
      return 'Coordinate Geometry';
    }
    return 'Vector & 3D Geometry';
  };

  const getCategory = (chapter: string, subject: 'Physics' | 'Chemistry' | 'Mathematics'): string => {
    if (subject === 'Physics') return getPhysicsCategory(chapter);
    if (subject === 'Chemistry') return getChemistryCategory(chapter);
    return getMathematicsCategory(chapter);
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        let studentId = id || authStudentId;
        
        if (studentId) {
          const api = isAdminView ? adminApi : axios;
          const [studentRes, analyticsRes, reportsRes, testsRes] = await Promise.all([
            api.get(`/api/v1/students/${studentId}`),
            api.get(`/api/v1/analytics/student/${studentId}`).catch(() => ({ data: null })),
            api.get(`/api/v1/reports/student/${studentId}`),
            api.get('/api/v1/tests')
          ]);

          setStudent(studentRes.data);
          setAnalytics(analyticsRes.data);
          setReports(reportsRes.data);
          setAvailableTests(testsRes.data.filter((t: any) => t.isPublished));
        }
      } catch (error) {
        console.error('Failed to fetch student profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, authStudentId, authLoading]);

  if (loading) return <div className="p-8 text-gray-500">Loading student profile...</div>;
  if (!student) return <div className="p-8 text-red-500">Student not found.</div>;

  const SUBJECT_CATEGORIES = {
    Physics: ['Mechanics', 'Thermodynamics', 'Electrodynamics', 'Optics', 'Modern Physics'],
    Chemistry: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
    Mathematics: ['Algebra', 'Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vector & 3D Geometry']
  };
  const categories = SUBJECT_CATEGORIES[selectedSubject];

  const categoryAccuracies = categories.map(cat => {
    const matchingEntries = (analytics?.chapterMastery?.[selectedSubject] || []).filter((cm: any) => {
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

  // SVG Radar Settings
  const cx = 150;
  const cy = 135;
  const radius = 80;
  const numPoints = categoryAccuracies.length;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map(level => {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPoints;
      const x = cx + radius * level * Math.cos(angle);
      const y = cy + radius * level * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  });

  const axisLines = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPoints;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    axisLines.push({ x1: cx, y1: cy, x2: x, y2: y });
  }

  const labelCoords = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPoints;
    const extend = radius + 15;
    const x = cx + extend * Math.cos(angle);
    const y = cy + extend * Math.sin(angle);
    
    let textAnchor: 'start' | 'end' | 'middle' = 'middle';
    if (Math.cos(angle) > 0.1) textAnchor = 'start';
    else if (Math.cos(angle) < -0.1) textAnchor = 'end';

    let dy = '0.35em';
    if (Math.sin(angle) < -0.8) dy = '-0.5em';
    else if (Math.sin(angle) > 0.8) dy = '1em';

    labelCoords.push({ x, y, textAnchor, dy, label: categoryAccuracies[i].category });
  }

  const performancePoints = categoryAccuracies.map((item, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPoints;
    const scoreFraction = item.accuracy / 100;
    const x = cx + radius * scoreFraction * Math.cos(angle);
    const y = cy + radius * scoreFraction * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const filteredChapterMastery = analytics?.chapterMastery?.[selectedSubject] || [];

  const filteredStrengths = analytics?.swotProfile?.[selectedSubject]?.strengths || [];

  const filteredWeaknesses = analytics?.swotProfile?.[selectedSubject]?.criticalWeaknesses || [];

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-blue-500 to-indigo-500 opacity-10 pointer-events-none rounded-xl" style={{"WebkitMask":"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)","WebkitMaskComposite":"xor","maskComposite":"exclude","padding":"2px"}}></div>
        <div className="flex items-center gap-6 z-10">
          {student.profilePictureUrl ? (
            <img src={(student.profilePictureUrl?.startsWith("data:") ? student.profilePictureUrl : `${import.meta.env.VITE_API_URL || ''}${student.profilePictureUrl}`)} alt={student.name} className="w-20 h-20 rounded-full border-4 border-white shadow-sm object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl border-4 border-white shadow-sm">
              {student.name.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{student.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">Batch: {student.batch}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <span className="material-symbols-outlined text-[16px]">pin</span> {student.enrollmentNo}
              </span>
            </div>
          </div>
        </div>
      </header>

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
            className={`px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 outline-none transition-colors bg-white cursor-pointer ${theme.border} focus:border-${selectedSubject === 'Physics' ? 'blue-400' : (selectedSubject === 'Chemistry' ? 'emerald-400' : 'orange-400')}`}
          >
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Interactive SVG Radar Chart */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[420px] flex flex-col relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Topic-Wise Balance</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${theme.bg} ${theme.text}`}>Radar View</span>
              </div>
              
              {/* Dynamic Interactive Tooltip */}
              {hoveredCategory ? (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md border border-gray-800 backdrop-blur-sm z-20 flex items-center gap-1.5 transition-all duration-200">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedSubject === 'Physics' ? 'bg-blue-400' : (selectedSubject === 'Chemistry' ? 'bg-emerald-400' : 'bg-orange-400')
                  }`}></span>
                  <span>{hoveredCategory}: {categoryAccuracies.find(c => c.category === hoveredCategory)?.accuracy}% ({categoryAccuracies.find(c => c.category === hoveredCategory)?.count} Qs)</span>
                </div>
              ) : (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  Hover vertex for details
                </div>
              )}

              <div className="flex-1 flex items-center justify-center bg-gray-50/50 rounded-lg border border-gray-100 relative overflow-hidden">
                <svg className="w-full h-full max-w-[280px] max-h-[250px]" viewBox="0 0 300 270">
                  {/* Grid Lines */}
                  {gridPaths.map((path, i) => (
                    <polygon key={i} points={path} className="fill-none stroke-gray-200 stroke-[1]" />
                  ))}
                  
                  {/* Axis lines */}
                  {axisLines.map((line, i) => (
                    <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="stroke-gray-200 stroke-[1]" />
                  ))}

                  {/* Performance shape */}
                  {performancePoints && (
                    <polygon 
                      points={performancePoints} 
                      className={`transition-all duration-500 ease-in-out ${theme.fill} ${theme.stroke} stroke-[2.5]`} 
                    />
                  )}

                  {/* Corner Label Texts (Interactive on hover) */}
                  {labelCoords.map((coord, i) => {
                    const isLabelHovered = hoveredCategory === coord.label;
                    return (
                      <text 
                        key={i} 
                        x={coord.x} 
                        y={coord.y} 
                        textAnchor={coord.textAnchor} 
                        dy={coord.dy} 
                        onMouseEnter={() => setHoveredCategory(coord.label)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`text-[10px] font-extrabold cursor-pointer transition-colors duration-200 ${
                          isLabelHovered ? (selectedSubject === 'Physics' ? 'fill-blue-600' : (selectedSubject === 'Chemistry' ? 'fill-emerald-600' : 'fill-orange-600')) : 'fill-gray-400'
                        }`}
                      >
                        {coord.label}
                      </text>
                    );
                  })}

                  {/* Vertex circles (Interactive dots) */}
                  {categoryAccuracies.map((item, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPoints;
                    const scoreFraction = item.accuracy / 100;
                    const x = cx + radius * scoreFraction * Math.cos(angle);
                    const y = cy + radius * scoreFraction * Math.sin(angle);
                    const isDotHovered = hoveredCategory === item.category;

                    return (
                      <g key={i} className="cursor-pointer">
                        {/* Invisible larger hover trigger */}
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={12} 
                          className="fill-transparent stroke-none" 
                          onMouseEnter={() => setHoveredCategory(item.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                        {/* Visible circle */}
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={isDotHovered ? 6 : 4} 
                          onMouseEnter={() => setHoveredCategory(item.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          className={`transition-all duration-200 ${
                            isDotHovered 
                              ? (selectedSubject === 'Physics' ? 'fill-blue-600 stroke-blue-200 stroke-2' : (selectedSubject === 'Chemistry' ? 'fill-emerald-600 stroke-emerald-200 stroke-2' : 'fill-orange-600 stroke-orange-200 stroke-2'))
                              : (selectedSubject === 'Physics' ? 'fill-white stroke-blue-600 stroke-2' : (selectedSubject === 'Chemistry' ? 'fill-white stroke-emerald-600 stroke-2' : 'fill-white stroke-orange-600 stroke-2'))
                          }`}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>

            {/* Card 2: Chapter Mastery List */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[420px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Chapter Mastery</h3>
                <span className="text-xs font-semibold text-gray-400">Chapters ({filteredChapterMastery.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {filteredChapterMastery.length > 0 ? (
                  filteredChapterMastery.map((cm: any, idx: number) => {
                    const isStrength = cm.accuracyPercentage >= 80;
                    const isWeakness = cm.accuracyPercentage < 50;
                    const barColor = isStrength ? 'bg-green-500' : (isWeakness ? 'bg-red-500' : theme.progress);
                    const bgColor = isStrength ? 'bg-green-50' : (isWeakness ? 'bg-red-50' : theme.bg);
                    const textColor = isStrength ? 'text-green-700' : (isWeakness ? 'text-red-700' : theme.text);
                    
                    // Highlight mastery list item if its broad category is hovered on the radar
                    const isCategoryHovered = hoveredCategory === getCategory(cm.chapter, selectedSubject);
                    const wrapperClass = isCategoryHovered 
                      ? `p-2 rounded-lg border ${theme.border} ${theme.bg} shadow-sm scale-[1.02] transition-all duration-300` 
                      : 'p-2 rounded-lg border border-transparent transition-all duration-300';

                    return (
                      <div key={idx} className={wrapperClass}>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-gray-700">
                            <span className="truncate max-w-[70%]">{cm.chapter}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${bgColor} ${textColor}`}>{cm.accuracyPercentage}% ({cm.totalAttempted} Qs)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${cm.accuracyPercentage}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">bar_chart</span>
                    <p className="text-sm font-medium text-gray-700">No {selectedSubject} Data</p>
                    <p className="text-xs text-gray-500 mt-1">Complete your first mock test evaluation to begin mapping chapter-wise mastery progress.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {analytics && (
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">psychology</span> Semantic SWOT Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-green-50/50 rounded-lg p-5 border border-green-200/50">
                  <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified</span> Dominant Strengths
                  </h4>
                  <ul className="space-y-3">
                    {filteredStrengths.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No dominant strengths identified yet for {selectedSubject}.</p>
                    )}
                    {filteredStrengths.map((strength: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                        <span className="text-sm font-medium text-gray-900">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50/50 rounded-lg p-5 border border-red-200/50">
                  <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span> Critical Weaknesses
                  </h4>
                  <ul className="space-y-3">
                    {filteredWeaknesses.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No critical weaknesses identified for {selectedSubject}. Excellent work!</p>
                    )}
                    {filteredWeaknesses.map((weakness: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span className="text-sm font-medium text-gray-900">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {!isAdminView && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Target Remediation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              AI-powered practice tests targeting your critical weaknesses using semantic similarity search.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Mode</span>
                <span className="text-sm font-bold text-gray-900">AI Dynamic</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Questions</span>
                <span className="text-sm font-bold text-gray-900">10 / 15 / 20</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Timed Option</span>
                <span className="text-sm font-bold text-gray-900">20 / 30 / 40 mins</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/student/custom-tests')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span> Generate Custom Practice Test
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-4">
              *Test generated from your SWOT weakness profile via vector similarity.
            </p>
          </section>
          )}

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-lg font-bold text-gray-800">Recent Reports</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Download official diagnostic PDF reports below.
            </p>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-gray-500">No reports published yet.</p>
              ) : (
                reports.map((report) => (
                  <div key={report._id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded">
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{report.testId?.title || 'Unknown Test'}</p>
                        <p className="text-xs text-gray-500">Score: {Math.round((report.score / report.totalMarks) * 100)}%</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open(window.location.origin + '/student/reports?printReportId=' + report._id + '&closeAfterPrint=true', '_blank')}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-blue-600 hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span> PDF
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-lg font-bold text-gray-800">Available Practice Tests</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Browse and take upcoming mock tests.
            </p>
            <div className="space-y-3">
              {availableTests.length === 0 ? (
                <p className="text-sm text-gray-500">No mock tests available yet.</p>
              ) : (
                availableTests.map((test) => {
                  const isAttempted = reports.some(r => r.testId?._id === test._id);
                  return (
                  <div key={test._id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{test.title}</p>
                        <p className="text-xs text-gray-500">Type: {test.examType}</p>
                      </div>
                    </div>
                    {isAttempted ? (
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Completed
                      </span>
                    ) : (
                      <button 
                        onClick={() => navigate('/student/tests')}
                        className="px-3 py-1.5 bg-blue-600 text-white border border-blue-700 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span> View
                      </button>
                    )}
                  </div>
                )})
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;
