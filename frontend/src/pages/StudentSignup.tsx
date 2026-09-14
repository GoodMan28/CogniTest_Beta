import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StudentSignup = () => {
  const [name, setName] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [batch, setBatch] = useState('');
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signup } = useAuth();

  useEffect(() => {
    axios.get('/api/v1/institute/public')
      .then(res => {
        const batches: string[] = res.data.batches || [];
        setAvailableBatches(batches);
        if (batches.length > 0) setBatch(batches[0]);
      })
      .catch(() => {
        // If the institute has no batches configured yet, leave the dropdown
        // empty rather than steering students toward a batch that may not exist.
        setAvailableBatches([]);
      });
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signup({ name, enrollmentNo, batch, email, password });
      navigate('/student'); // Redirect to dashboard on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Back to Home */}
      <Link to="/" className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-20">
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <div className="max-w-md w-full bg-[#0f172a]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8 z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl shadow-[0_0_15px_rgba(20,184,166,0.5)] mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-3xl">person_add</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Student Account</h2>
          <p className="text-sm text-slate-400 mt-2">Join CogniTest to access mock tests and analytics</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <span className="material-symbols-outlined text-red-400 text-[20px]">error</span>
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">person</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Enrollment Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">badge</span>
              <input
                type="text"
                required
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                placeholder="e.g. STU-2027-002"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Batch</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">groups</span>
              <select
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                data-testid="student-signup-batch-select"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all text-sm font-medium appearance-none"
              >
                {availableBatches.length === 0 && <option value="" className="text-gray-900">No batches available</option>}
                {availableBatches.map(b => <option key={b} value={b} className="text-gray-900">{b}</option>)}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email (Optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">lock</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-2.5 rounded-lg shadow-[0_4px_14px_rgba(20,184,166,0.4)] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
            {!loading && <span className="material-symbols-outlined text-[18px]">person_add</span>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-8 font-medium">
          Already have an account? <Link to="/student/login" className="text-teal-400 hover:text-teal-300 hover:underline">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default StudentSignup;
