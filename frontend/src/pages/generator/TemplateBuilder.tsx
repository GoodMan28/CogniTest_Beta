import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PaperTemplate, TemplateSection } from '../PaperGenerator';

interface Props {
  onComplete: (template: PaperTemplate) => void;
  onSaveOnly?: (template: PaperTemplate) => void;
}

export default function TemplateBuilder({ onComplete, onSaveOnly }: Props) {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('IIT-JEE');
  const [sections, setSections] = useState<TemplateSection[]>([
    { id: '1', subject: 'Physics', questionType: 'Multiple Choice', totalQuestions: 10, marksPerQuestion: 4 },
  ]);

  const addSection = () => {
    setSections([...sections, {
      id: Math.random().toString(36).substr(2, 9),
      subject: 'Chemistry',
      questionType: 'Multiple Choice',
      totalQuestions: 10,
      marksPerQuestion: 4
    }]);
  };

  const updateSection = (id: string, field: keyof TemplateSection, value: string | number) => {
    setSections(sections.map(sec => sec.id === id ? { ...sec, [field]: value } : sec));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(sec => sec.id !== id));
  };

  const totalQuestions = sections.reduce((acc, curr) => acc + (Number(curr.totalQuestions) || 0), 0);
  const totalMarks = sections.reduce((acc, curr) => acc + ((Number(curr.totalQuestions) || 0) * (Number(curr.marksPerQuestion) || 0)), 0);

  const handleAction = (action: 'compose' | 'save') => {
    if (!title.trim()) return alert('Please enter a Template Name');
    if (sections.length === 0) return alert('Please add at least one section');

    if (action === 'compose') {
      onComplete({ title, course, sections });
    } else if (action === 'save' && onSaveOnly) {
      onSaveOnly({ title, course, sections });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. IIT JEE Mock Test"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0070c0] focus:border-[#0070c0]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-red-500">*</span></label>
              <select
                value={course}
                onChange={e => setCourse(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0070c0] focus:border-[#0070c0]"
              >
                <option value="IIT-JEE">IIT-JEE</option>
                <option value="NEET">NEET</option>
                <option value="Foundation">Foundation</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sections</h3>
              <button
                type="button"
                onClick={addSection}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#0070c0] hover:bg-[#005a9e] rounded-md transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Section
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">S.No.</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Question Type</th>
                    <th className="px-4 py-3">Total Questions</th>
                    <th className="px-4 py-3">Each Question Marks</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec, index) => (
                    <tr key={sec.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3">
                        <select
                          value={sec.subject}
                          onChange={e => updateSection(sec.id, 'subject', e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0070c0] focus:border-[#0070c0] py-1.5 px-3 text-sm"
                        >
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Biology">Biology</option>
                          <option value="Mathematics">Mathematics</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={sec.questionType}
                          onChange={e => updateSection(sec.id, 'questionType', e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0070c0] focus:border-[#0070c0] py-1.5 px-3 text-sm"
                        >
                          <option value="Multiple Choice">Multiple Choice</option>
                          <option value="Numerical">Numerical</option>
                          <option value="Subjective">Subjective</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={sec.totalQuestions}
                          onChange={e => updateSection(sec.id, 'totalQuestions', parseInt(e.target.value))}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0070c0] focus:border-[#0070c0] py-1.5 px-3 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={sec.marksPerQuestion}
                          onChange={e => updateSection(sec.id, 'marksPerQuestion', parseInt(e.target.value))}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#0070c0] focus:border-[#0070c0] py-1.5 px-3 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeSection(sec.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sections.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">No sections added yet.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <span className="block text-sm font-medium text-gray-500">Total Questions</span>
              <span className="text-2xl font-bold text-gray-900">{totalQuestions}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-500">Total Marks</span>
              <span className="text-2xl font-bold text-gray-900">{totalMarks}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
            {onSaveOnly && (
              <button
                type="button"
                onClick={() => handleAction('save')}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-all focus:ring-4 focus:ring-gray-100"
              >
                Save Template Only
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAction('compose')}
              className="px-6 py-2.5 bg-[#0070c0] text-white font-medium rounded-lg hover:bg-[#005a9e] shadow-sm transition-all focus:ring-4 focus:ring-blue-100"
            >
              Compose Paper Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
