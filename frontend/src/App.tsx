
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  useEffect(() => {
    // Fetch institute settings once on load to dynamically update the title and favicon
    axios.get('/api/v1/institute')
      .then(res => {
        if (res.data.name) {
          document.title = `${res.data.name} | CogniTest`;
        }
        if (res.data.logoUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = (res.data.logoUrl?.startsWith("data:") ? res.data.logoUrl : `${import.meta.env.VITE_API_URL || ''}${res.data.logoUrl}`);
        }
      })
      .catch(err => console.error('Failed to load branding for head', err));
  }, []);
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<StudentDirectory />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="tests" element={<Tests />} />
            <Route path="generator" element={<PaperGenerator />} />
            <Route path="reports" element={<Reports />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Student Auth Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/signup" element={<StudentSignup />} />

          {/* Student Protected Routes */}
          <Route path="/student" element={<ProtectedRoute />}>
            <Route element={<StudentLayout />}>
              <Route index element={<StudentProfile />} />
              <Route path="custom-tests" element={<CustomTests />} />
              <Route path="tests" element={<StudentTests />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<StudentSettings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
