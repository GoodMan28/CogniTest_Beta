import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Demo-mode "sign up": a student activates a precreated roster record with
// an operator-issued activation code, rather than creating a brand-new
// account (see CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md Section 10.1).
// This posts { enrollmentNo, code, password } to POST /auth/activate via
// AuthContext's demo signup() branch, then logs in immediately.
const DemoActivate = () => {
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await signup({ enrollmentNo: enrollmentNo.trim(), code: code.trim(), password });
      navigate('/student'); // demo index route redirects to /student/reports
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Activation failed. Check your enrollment number and code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <span className="material-symbols-outlined text-white text-3xl">verified_user</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Activate Your Account</h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter the enrollment number and activation code your institute shared with you.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleActivate} className="space-y-5">
          <div>
            <label htmlFor="enrollmentNo" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Enrollment Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">badge</span>
              <input
                id="enrollmentNo"
                type="text"
                required
                autoComplete="username"
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                placeholder="e.g. JEE-DEMO-001"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Activation Code
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">key</span>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste the code shared with you"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Choose a Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">lock</span>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">lock</span>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2 mt-2 disabled:bg-emerald-400"
          >
            {loading ? 'Activating...' : 'Activate Account'}
            {!loading && <span className="material-symbols-outlined text-[18px]">verified_user</span>}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8 font-medium">
          Already activated? <Link to="/student/login" className="text-emerald-600 hover:text-emerald-700 hover:underline">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default DemoActivate;
