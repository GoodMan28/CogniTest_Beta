import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CustomTests = () => {
  const { studentId } = useAuth();
  const [subject, setSubject] = useState('Physics');
  const [mode, setMode] = useState<'dynamic' | 'static'>('dynamic');
  const [numQuestions, setNumQuestions] = useState(20);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!studentId) return alert('No student active in session');
    setLoading(true);
    try {
      const res = await axios.post('/api/v1/custom-test/generate', {
        studentId,
        mode,
        filters: { subject }
      });
      setQuestions(res.data);
    } catch (error) {
      console.error('Failed to generate test:', error);
      alert('Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Generate Custom Test</h2>
          <p className="text-gray-500 mt-1">Create a personalized test targeting your weak topics using AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Configuration</h3>
            <div className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Subject</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Biology</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMode('dynamic')}
                    className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'dynamic' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
                  >
                    Dynamic AI
                  </button>
                  <button 
                    onClick={() => setMode('static')}
                    className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'static' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
                  >
                    Static Filter
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                <input 
                  type="number" 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">magic_button</span> 
              {loading ? 'Generating...' : 'Generate Preview'}
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-bold text-gray-800">Generated Preview</h3>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                {questions.length > 0 ? `${questions.length} Questions Ready` : 'Awaiting Generation'}
              </span>
            </div>
            
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 flex-col gap-2">
                  <span className="material-symbols-outlined text-4xl">inventory_2</span>
                  <p>Configure parameters and click Generate</p>
                </div>
              ) : (
                questions.map((q, i) => (
                  <div key={q._id || i} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-gray-400 hover:text-blue-600" title="Swap Question">
                        <span className="material-symbols-outlined text-[20px]">autorenew</span>
                      </button>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="font-bold text-gray-400 w-6">Q{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{q.subject}</span>
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">{q.difficulty || 'Med'}</span>
                        </div>
                        <p className="text-gray-800 font-medium mb-3">{q.questionText}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                          {['A', 'B', 'C', 'D'].map((opt, index) => (
                            <div key={opt} className={`flex gap-2 items-center p-2 rounded ${q.correctOption === opt ? 'bg-green-50 text-green-700 font-medium border border-green-200' : 'border border-transparent'}`}>
                              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${q.correctOption === opt ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>
                                {opt}
                              </span> 
                              {q.options?.[index] || `Option ${opt}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {questions.length > 0 && (
                <div className="mt-8 flex justify-end">
                  <button className="px-8 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                    Start Test Now <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTests;
