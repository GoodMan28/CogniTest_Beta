import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

const StudentDirectory = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('All Batches');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get('/api/v1/students', {
          params: { search, batch: batchFilter }
        });
        setStudents(res.data);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };
    
    // Add a small debounce for typing
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, batchFilter]);

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Student Directory</h2>
          <p className="text-gray-500 mt-1">Manage and view analytics for all registered students.</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 bg-white"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <option value="All Batches">All Batches</option>
            <option value="NEET-2027 Alpha">NEET-2027 Alpha</option>
            <option value="JEE-2027 Beta">JEE-2027 Beta</option>
            <option value="Foundation Class 10">Foundation Class 10</option>
          </select>
          <input 
            type="text" 
            placeholder="Search students..." 
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Enrollment No</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No students found matching your criteria.</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-blue-600">{student.enrollmentNo}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {student.profilePictureUrl ? (
                        <img src={(student.profilePictureUrl?.startsWith("data:") ? student.profilePictureUrl : `${import.meta.env.VITE_API_URL || ''}${student.profilePictureUrl}`)} alt={student.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">{student.batch}</span>
                  </td>
                  <td className="p-4 text-right">
                    <Link to={`/admin/students/${student._id}`} className="text-blue-600 hover:underline text-sm font-medium">
                      View Profile
                    </Link>
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

export default StudentDirectory;
