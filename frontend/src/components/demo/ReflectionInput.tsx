import { useState } from 'react';
import type { ReflectionItemDTO } from '../../types/demoAnalysis';

interface ReflectionInputProps {
  questionNo: number;
  buildId: string;
  contentHash: string;
  initialText: string;
  updateReflection: (
    questionNo: number,
    text: string,
    buildId: string,
    contentHash: string
  ) => Promise<ReflectionItemDTO | null | undefined>;
}

// Receives updateReflection as a prop rather than calling useDemoReport
// itself — see PracticePanel's comment for why (defect D13).
const ReflectionInput = ({ questionNo, buildId, contentHash, initialText, updateReflection }: ReflectionInputProps) => {
  const [text, setText] = useState(initialText || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (text.length > 1000) return;

    setSaving(true);
    setStatus('idle');
    try {
      await updateReflection(questionNo, text, buildId, contentHash);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <label htmlFor={`reflection-${questionNo}`} className="block text-sm font-medium text-gray-700 mb-2">
        My Reflection
      </label>
      <textarea
        id={`reflection-${questionNo}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        rows={3}
        maxLength={1000}
        placeholder="Why did you get this right/wrong? What will you do differently next time?"
      />
      <div className="mt-2 flex justify-between items-center flex-wrap gap-2">
        <span className={`text-xs ${text.length > 900 ? 'text-red-500' : 'text-gray-500'}`}>
          {text.length} / 1000
        </span>

        <div className="flex items-center space-x-3">
          {status === 'saved' && <span className="text-sm text-green-600" role="status">Saved!</span>}
          {status === 'error' && <span className="text-sm text-red-600" role="alert">{errorMsg}</span>}
          <button
            onClick={handleSave}
            disabled={saving || text.length > 1000}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionInput;
