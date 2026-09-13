import { Outlet, Navigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DemoStudentLayout = () => {
  const { student, logout, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/student/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">CogniTest Demo</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-700">
                    {student?.name?.charAt(0) || 'S'}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-700">{student?.name}</p>
                  <p className="text-gray-500">{student?.enrollmentNo}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-500"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DemoStudentLayout;
