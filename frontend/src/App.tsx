
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import Dashboard from './pages/Dashboard';
import CustomTests from './pages/CustomTests';
import StudentProfile from './pages/StudentProfile';
import StudentDirectory from './pages/StudentDirectory';
import Tests from './pages/Tests';
import Reports from './pages/Reports';
import StudentTests from './pages/StudentTests';
import AdminSettings from './pages/AdminSettings';
import StudentSettings from './pages/StudentSettings';
import QuestionBank from './pages/QuestionBank';
import PaperGenerator from './pages/PaperGenerator';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLogin from './pages/AdminLogin';

import DemoStudentLayout from './components/demo/DemoStudentLayout';
import DemoReports from './pages/DemoReports';
import DemoReportDetail from './pages/DemoReportDetail';
import DemoActivate from './pages/DemoActivate';

const isDemo = import.meta.env.VITE_USE_DEMO === 'true';

function App() {
  useEffect(() => {
    if (isDemo) {
      document.title = 'CogniTest Demo';
      return;
    }
    // Branding is now behind admin auth, so we set a static title
    // The sidebar and layout will show the institute name after login
    document.title = 'CogniTest';
  }, []);
  return (
    <AdminAuthProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Admin Login (public) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Protected Routes */}
            <Route path="/admin" element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<StudentDirectory />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="tests" element={<Tests />} />
                <Route path="generator" element={<PaperGenerator />} />
                <Route path="reports" element={<Reports />} />
                <Route path="questions" element={<QuestionBank />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            {/* Student Auth Routes */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/signup" element={isDemo ? <DemoActivate /> : <StudentSignup />} />

            {/* Student Protected Routes */}
            <Route path="/student" element={<ProtectedRoute />}>
              {isDemo ? (
                <Route element={<DemoStudentLayout />}>
                  <Route path="reports" element={<DemoReports />} />
                  <Route path="reports/:id" element={<DemoReportDetail />} />
                  <Route index element={<Navigate to="/student/reports" replace />} />
                </Route>
              ) : (
                <Route element={<StudentLayout />}>
                  <Route index element={<StudentProfile />} />
                  <Route path="custom-tests" element={<CustomTests />} />
                  <Route path="tests" element={<StudentTests />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<StudentSettings />} />
                </Route>
              )}
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </AdminAuthProvider>
  );
}

export default App;

