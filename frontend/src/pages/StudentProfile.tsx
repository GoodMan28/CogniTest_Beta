import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StudentAnalytics = () => {
  const { id } = useParams();
  const { studentId: authStudentId, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        let studentId = id || authStudentId;
        
        if (studentId) {
          const [studentRes, analyticsRes, reportsRes] = await Promise.all([
            axios.get(`/api/v1/students/${studentId}`),
            axios.get(`/api/v1/analytics/student/${studentId}`).catch(() => ({ data: null })),
            axios.get(`/api/v1/reports/student/${studentId}`)
          ]);

          setStudent(studentRes.data);
          setAnalytics(analyticsRes.data);
          setReports(reportsRes.data);
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

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-blue-500 to-indigo-500 opacity-10 pointer-events-none rounded-xl" style={{"WebkitMask":"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)","WebkitMaskComposite":"xor","maskComposite":"exclude","padding":"2px"}}></div>
        <div className="flex items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl border-4 border-white shadow-sm">
            {student.name.charAt(0)}
          </div>
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
        <div className="flex items-center gap-4 z-10">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Overall Predictability Score</p>
            <div className="flex items-end justify-end gap-2">
              <span className="text-[48px] leading-none font-bold text-blue-600">74%</span>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> +3%
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Topic-Wise Balance</h3>
              <button className="text-xs font-medium text-blue-600 flex items-center gap-1 hover:underline">
                View Detailed Breakdown <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="absolute inset-0 opacity-5" style={{"backgroundImage":"radial-gradient(circle at center, #004ac6 1px, transparent 1px)","backgroundSize":"20px 20px"}}></div>
              <div className="text-center z-10 p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 max-w-sm">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">radar</span>
                <p className="text-sm font-medium text-gray-700">Interactive Radar Chart Placeholder</p>
                <p className="text-xs text-gray-500 mt-2">Visualizing performance across Physics, Chemistry, and Biology.</p>
              </div>
            </div>
          </section>

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
                    {analytics.swotProfile?.strengths?.map((strength: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="bg-green-100 text-green-600 p-1 rounded mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">science</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{strength}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Consistent performance across recent mocks.</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50/50 rounded-lg p-5 border border-red-200/50">
                  <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span> Critical Weaknesses
                  </h4>
                  <ul className="space-y-3">
                    {analytics.swotProfile?.criticalWeaknesses?.map((weakness: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="bg-red-100 text-red-600 p-1 rounded mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">calculate</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{weakness}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Significant error rate. Target for remediation.</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Target Remediation</h3>
              <span className="bg-blue-50 text-blue-600 p-1.5 rounded-full">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              The AI suggests a targeted 45-minute practice session focusing on addressing immediate critical weaknesses.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Est. Time</span>
                <span className="text-sm font-bold text-gray-900">45 mins</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Questions</span>
                <span className="text-sm font-bold text-gray-900">30 (Hard/Med)</span>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">play_arrow</span> Generate Custom Practice Test
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-4">
              *Test generated based on last 30 days of analytics.
            </p>
          </section>

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
                    <a 
                      href={`/api/v1/reports/download/${student._id}/${report.testId?._id}`} 
                      download 
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-blue-600 hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span> PDF
                    </a>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;
