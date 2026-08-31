import { useState, useEffect } from 'react';
import { X, Search, Filter, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import type { TemplateSection } from '../PaperGenerator';

interface Props {
  section: TemplateSection;
  initialSelectedIds: string[];
  onSave: (selectedIds: string[]) => void;
  onClose: () => void;
}

export default function QuestionPickerModal({ section, initialSelectedIds, onSave, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  
  const [chapters, setChapters] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  // Fetch chapters on mount
  useEffect(() => {
    axios.get(`http://localhost:5000/api/v1/questions/chapters?subject=${section.subject}`)
      .then(res => setChapters(res.data))
      .catch(err => console.error('Failed to fetch chapters', err));
  }, [section.subject]);

  // Fetch topics when chapter changes
  useEffect(() => {
    if (selectedChapter) {
      axios.get(`http://localhost:5000/api/v1/questions/topics?subject=${section.subject}&chapter=${selectedChapter}`)
        .then(res => setTopics(res.data))
        .catch(err => console.error('Failed to fetch topics', err));
    } else {
      setTopics([]);
      setSelectedTopic('');
    }
  }, [selectedChapter, section.subject]);

  // Fetch questions
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({
      subject: section.subject,
      limit: '50' // Just fetch first 50 for demo purposes
    });
    
    if (selectedChapter) params.append('chapter', selectedChapter);
    if (selectedTopic) params.append('topic', selectedTopic);
    if (searchQuery) params.append('search', searchQuery);

    axios.get(`http://localhost:5000/api/v1/questions?${params.toString()}`)
      .then(res => {
        setQuestions(res.data.questions);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch questions', err);
        setIsLoading(false);
      });
  }, [section.subject, selectedChapter, selectedTopic, searchQuery]);

  const remaining = section.totalQuestions - selectedIds.size;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (remaining === 0) {
        alert('Maximum questions limit reached. Please unselect a question to add a new one.');
        return;
      }
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pick Questions</h2>
            <p className="text-sm text-gray-500">{section.subject} • {section.questionType}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <div className="text-sm">
              <span className="text-gray-500">Required:</span> <span className="font-bold text-gray-900">{section.totalQuestions}</span>
            </div>
            <div className="text-gray-300">|</div>
            <div className="text-sm">
              <span className="text-gray-500">Selected:</span> <span className="font-bold text-[#0070c0]">{selectedIds.size}</span>
            </div>
            <div className="text-gray-300">|</div>
            <div className="text-sm">
              <span className="text-gray-500">Remaining:</span>{' '}
              <span className={`font-bold ${remaining === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                {remaining}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => onSave(Array.from(selectedIds))}
            className={`px-6 py-2.5 font-medium rounded-lg shadow-sm transition-all ${
              remaining === 0 
                ? 'bg-[#0070c0] hover:bg-[#005a9e] text-white' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Save Section
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center space-x-4 z-10">
        <Filter className="w-4 h-4 text-gray-400" />
        
        <select 
          disabled
          value={section.subject}
          className="border border-gray-300 rounded-md py-1.5 px-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        >
          <option>{section.subject}</option>
        </select>

        <select 
          value={selectedChapter}
          onChange={e => setSelectedChapter(e.target.value)}
          className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-[#0070c0] focus:border-[#0070c0] min-w-[200px]"
        >
          <option value="">All Chapters</option>
          {chapters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          disabled={!selectedChapter}
          className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-[#0070c0] focus:border-[#0070c0] min-w-[200px] disabled:bg-gray-50"
        >
          <option value="">All Topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search question text..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#0070c0] focus:border-[#0070c0]"
          />
        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
              No questions found matching your filters.
            </div>
          ) : (
            questions.map((q) => {
              const isSelected = selectedIds.has(q._id);
              const isDisabled = !isSelected && remaining === 0;

              return (
                <div 
                  key={q._id} 
                  className={`bg-white rounded-lg border p-4 transition-all ${
                    isSelected ? 'border-[#0070c0] ring-1 ring-[#0070c0] shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  } ${isDisabled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => toggleSelection(q._id)}
                        className="w-5 h-5 text-[#0070c0] border-gray-300 rounded focus:ring-[#0070c0] cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-xs font-medium text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{q.chapter || 'Unknown'}</span>
                          <span>•</span>
                          <span className="text-gray-400">{q.topic?.[0] || 'Unknown'}</span>
                        </div>
                        <span className="text-xs text-gray-400">ID: {q._id.slice(-6)}</span>
                      </div>
                      
                      <div className="text-gray-900 text-sm mb-4 leading-relaxed font-medium">
                        {q.questionText}
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {q.options.map((opt: string, i: number) => {
                            const labels = ['A', 'B', 'C', 'D'];
                            const isCorrect = q.correctOption === opt || q.correctOption === labels[i];
                            return (
                              <div key={i} className={`flex items-start p-2 rounded border text-sm ${
                                isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-gray-50 border-gray-100 text-gray-700'
                              }`}>
                                <span className="font-semibold mr-2">{labels[i]}.</span>
                                <span className="flex-1">{opt}</span>
                                {isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
