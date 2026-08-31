import { useState, useEffect } from 'react';
import axios from 'axios';


const StudentTests = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await axios.get('/api/v1/tests');
        // Only show published tests to students
        const publishedTests = response.data.filter((t: any) => t.isPublished);
        setTests(publishedTests);
      } catch (error) {
        console.error('Failed to fetch tests', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 w-full p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Mock Tests Library</h2>
        <p className="text-gray-500 mt-1">Browse and download available practice tests.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-white">
          <h3 className="text-lg font-bold text-gray-800">Available Tests</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {tests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No mock tests available yet.</div>
          ) : (
            tests.map((test) => (
              <div key={test._id} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-gray-50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{test.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {test.examType} &bull; Target: {test.targetYear} &bull; Created: {new Date(test.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      // Navigate to PDF view using the Reports page structure but in print mode
                      window.open(window.location.origin + '/student/reports?printTestId=' + test._id + '&closeAfterPrint=true', '_blank');
                    }}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    View Question Paper
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTests;
