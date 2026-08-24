
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import Dashboard from './pages/Dashboard';
import CustomTests from './pages/CustomTests';
import StudentProfile from './pages/StudentProfile';
import StudentDirectory from './pages/StudentDirectory';
import Tests from './pages/Tests';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';
import StudentSettings from './pages/StudentSettings';
import QuestionBank from './pages/QuestionBank';

const Analytics = () => <h2 className="text-3xl font-bold text-gray-800 tracking-tight p-8">Analytics</h2>;

function App() {
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
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentProfile />} />
            <Route path="custom-tests" element={<CustomTests />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<StudentSettings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
