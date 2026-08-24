import { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      // Fetching tests to show as report batches
      const res = await axios.get('/api/v1/tests');
      setTests(res.data);
    } catch (error) {
      console.error('Failed to fetch tests for reports:', error);
    }
  };

  const handlePublish = async (testId: string) => {
    try {
      await axios.post(`/api/v1/reports/publish/${testId}`);
      // Refresh the list to show updated publish status
      fetchTests();
    } catch (error) {
      console.error('Failed to publish test reports:', error);
    }
  };

  const filteredTests = tests.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Publish Reports</h2>
          <p className="text-gray-500 mt-1">Publish evaluated test results to the Student Portal so students can pull their PDFs on-demand.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
           <h3 className="text-lg font-bold text-gray-800">Results Publishing Status</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="p-4">Report Name</th>
              <th className="p-4">Target Batch</th>
              <th className="p-4">Evaluation Date</th>
              <th className="p-4">Publish Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No test batches found.</td>
              </tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{test.title}</td>
                  <td className="p-4">{test.examType}</td>
                  <td className="p-4">{new Date(test.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    {test.isPublished ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Unpublished
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {test.isPublished ? (
                      <button className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1 justify-end ml-auto">
                        <span className="material-symbols-outlined text-[16px]">visibility</span> View Sample PDF
                      </button>
                    ) : (
                      <button 
                        onClick={() => handlePublish(test._id)}
                        className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1 justify-end ml-auto bg-blue-50 px-3 py-1 rounded border border-blue-100"
                      >
                        <span className="material-symbols-outlined text-[16px]">cloud_upload</span> Publish to Portal
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
