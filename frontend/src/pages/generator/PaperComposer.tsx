import { useState } from 'react';
import { CheckCircle2, ArrowLeft, LayoutTemplate, Loader2 } from 'lucide-react';
import type { PaperTemplate } from '../PaperGenerator';
import QuestionPickerModal from './QuestionPickerModal';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  template: PaperTemplate;
  onBack: () => void;
}

export default function PaperComposer({ template, onBack }: Props) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string[]>>({});
  const [testName, setTestName] = useState(`${template.title} - Test 1`);
  const [isPublishing, setIsPublishing] = useState(false);
  const navigate = useNavigate();
  const { instituteId: authInstituteId } = useAuth();

  // Initialize selected questions record if empty
  if (Object.keys(selectedQuestions).length === 0 && template.sections.length > 0) {
    const initial: Record<string, string[]> = {};
    template.sections.forEach(sec => initial[sec.id] = []);
    setSelectedQuestions(initial);
  }

  const handleSaveQuestions = (sectionId: string, questionIds: string[]) => {
    setSelectedQuestions(prev => ({ ...prev, [sectionId]: questionIds }));
    setActiveSectionId(null);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      let templateId = (template as any)._id;
      
      const instituteId = authInstituteId || '654321098765432109876543'; // Fallback if missing

      // 1. Save Template if it's new
      if (!templateId) {
        const tplRes = await axios.post('/api/v1/templates', {
          ...template,
          instituteId
        });
        templateId = tplRes.data._id;
      }

      // 2. Prepare questions array
      const testQuestions: any[] = [];
      let qNo = 1;
      let totalQ = 0;

      template.sections.forEach(sec => {
        const ids = selectedQuestions[sec.id] || [];
        ids.forEach(qid => {
          testQuestions.push({
            questionNo: qNo++,
            questionId: qid,
            subject: sec.subject
          });
        });
        totalQ += sec.totalQuestions;
      });

      // 3. Save Test
      await axios.post('/api/v1/tests', {
        instituteId,
        templateId,
        title: testName,
        date: new Date(),
        examType: template.course,
        totalQuestions: totalQ,
        marksPerQuestion: template.sections[0]?.marksPerQuestion || 4,
        negativeMarking: 1, // standard default
        questions: testQuestions
      });

      alert('Test successfully created and published!');
      navigate('/admin/tests');
    } catch (error) {
      console.error(error);
      alert('Failed to publish test.');
    } finally {
      setIsPublishing(false);
    }
  };

  const isComplete = template.sections.every(
    sec => selectedQuestions[sec.id]?.length === sec.totalQuestions
  );

  return (
    <div>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <LayoutTemplate className="w-5 h-5 text-[#0070c0]" />
                <h2 className="text-xl font-bold text-gray-900">{template.title}</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {template.course} • {template.sections.length} Sections
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Final Test Name</label>
              <input 
                type="text"
                value={testName}
                onChange={e => setTestName(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-[#0070c0] focus:border-[#0070c0] w-64"
                placeholder="Name this test..."
              />
            </div>
            <button 
              disabled={!isComplete || isPublishing}
              onClick={handlePublish}
              className={`px-6 py-2.5 font-medium rounded-lg shadow-sm transition-all flex items-center mt-5 ${
                isComplete && !isPublishing
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-4 focus:ring-green-100' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isPublishing ? 'Publishing...' : 'Submit & Publish Paper'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Question Type</th>
                <th className="px-6 py-4 text-center">Required Count</th>
                <th className="px-6 py-4 text-center">Selected Count</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {template.sections.map((sec) => {
                const selectedCount = selectedQuestions[sec.id]?.length || 0;
                const isSectionComplete = selectedCount === sec.totalQuestions;

                return (
                  <tr key={sec.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{sec.subject}</td>
                    <td className="px-6 py-4 text-gray-500">{sec.questionType}</td>
                    <td className="px-6 py-4 text-center font-medium text-gray-900">{sec.totalQuestions}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isSectionComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedCount} / {sec.totalQuestions}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isSectionComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setActiveSectionId(sec.id)}
                        className="px-4 py-1.5 text-sm font-medium text-[#0070c0] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        {isSectionComplete ? 'Edit Selection' : 'Compose'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {activeSectionId && (
        <QuestionPickerModal 
          section={template.sections.find(s => s.id === activeSectionId)!}
          initialSelectedIds={selectedQuestions[activeSectionId] || []}
          onSave={(ids) => handleSaveQuestions(activeSectionId, ids)}
          onClose={() => setActiveSectionId(null)}
        />
      )}
    </div>
  );
}
