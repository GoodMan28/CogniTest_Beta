import { Link } from 'react-router-dom';

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-[#020817] text-white flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4" style={{ background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(20,184,166,0.15)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]">
            <span className="text-white font-bold text-xl leading-none font-serif tracking-tighter italic">C</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CogniTest</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link to="/student/login" className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2">Student Login</Link>
          <Link to="/admin/login" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-[0_4px_14px_rgba(20,184,166,0.4)]">Admin Dashboard</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-2xl bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10 md:p-14 text-center z-10 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-6">
            <span className="material-symbols-outlined text-3xl">headset_mic</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400">
            Get in Touch
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
            Ready to upgrade your institute with enterprise-grade AI analytics? Contact our sales team to schedule a custom demo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a 
              href="mailto:ayushbokaro2611@gmail.com?subject=Sales Enquiry - CogniTest"
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-500/50 transition-all group w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-teal-400 group-hover:scale-110 transition-transform">mail</span>
              <div className="text-left">
                <div className="text-xs text-gray-400">Email Us</div>
                <div className="font-medium text-white">ayushbokaro2611@gmail.com</div>
              </div>
            </a>

            <a 
              href="tel:+917463921402"
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all group w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-cyan-400 group-hover:scale-110 transition-transform">call</span>
              <div className="text-left">
                <div className="text-xs text-gray-400">Call Us</div>
                <div className="font-medium text-white">+91 7463921402</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
