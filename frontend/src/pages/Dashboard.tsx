import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const mockPerformanceData = [
  { name: 'Week 1', score: 65 },
  { name: 'Week 2', score: 72 },
  { name: 'Week 3', score: 68 },
  { name: 'Week 4', score: 85 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeStudents: 0,
    testsConducted: 0,
    averageScore: 0,
    needsAttention: [] as any[],
    performanceData: [] as any[]
  });
  const [recentTests, setRecentTests] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await axios.get('/api/v1/analytics/dashboard');
        setStats(statsRes.data);

        const testsRes = await axios.get('/api/v1/tests?limit=4');
        setRecentTests(testsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Overview</h2>
          <p className="text-gray-500 mt-1">Welcome back. Here's what's happening today.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeStudents.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span> +12% from last month
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Tests Conducted</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.testsConducted.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <span className="material-symbols-outlined">description</span>
            </div>
          </div>
          <p className="text-sm text-green-600 mt-4 flex items-center font-medium">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span> +3 this week
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Batch Score</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.averageScore}%</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <span className="material-symbols-outlined">monitoring</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 flex items-center font-medium">
            <span className="material-symbols-outlined text-sm mr-1">trending_flat</span> Stable trajectory
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Batch Performance Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                />
                <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Needs Attention Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Needs Attention</h3>
          <div className="space-y-4">
            {stats.needsAttention.length === 0 ? (
              <p className="text-sm text-gray-500">No students found.</p>
            ) : (
              <>
                {stats.needsAttention.map((student, i) => (
                  <div key={i} className="flex items-start justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.batch}</p>
                      <p className="text-xs text-red-600 mt-1 font-medium">{student.issue}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/students/${student.studentId}`)}
                      className="text-blue-600 text-xs font-medium hover:underline"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/admin/students')}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    View All Students
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Recent Mock Tests</h3>
          <button
            onClick={() => navigate('/admin/reports')}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Test Name</th>
                <th className="px-6 py-4 font-medium">Batch</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTests.map((test) => (
                <tr key={test._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{test.title}</td>
                  <td className="px-6 py-4">{test.examType}</td>
                  <td className="px-6 py-4">{new Date(test.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {test.isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Evaluated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate('/admin/reports', { state: { openTestAnalyticsId: test._id } })}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Review Reports
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
