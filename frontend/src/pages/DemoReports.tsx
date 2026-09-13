import { useNavigate } from 'react-router-dom';
import { useDemoReports } from '../hooks/useDemoReports';
import { Clock, CheckCircle } from 'lucide-react';

const DemoReports = () => {
  const { reports, loading, error } = useDemoReports();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p className="font-medium">Error loading reports</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">Your analysis is not published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.reportId}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/student/reports/${report.reportId}`)}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {report.testTitle}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {report.score} <span className="text-sm text-gray-500">/ {report.maximumMarks}</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-500">
                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                <time dateTime={report.testDate}>
                  {new Date(report.testDate).toLocaleDateString()}
                </time>
              </div>
              <span className="text-indigo-600 hover:text-indigo-900 font-medium">
                View detail &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemoReports;
