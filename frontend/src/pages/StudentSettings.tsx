import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StudentSettings = () => {
  const { studentId } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  
  const [name, setName] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (studentId) {
      axios.get(`/api/v1/students/${studentId}`)
        .then(res => {
          setName(res.data.name || '');
          setEnrollmentNo(res.data.enrollmentNo || '');
          setEmail(res.data.email || '');
          setProfilePictureUrl(res.data.profilePictureUrl || '');
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch student profile', err);
          setLoading(false);
        });
    }
  }, [studentId]);

  const handleSaveChanges = async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      await axios.put(`/api/v1/students/${studentId}/settings`, {
        name,
        email
      });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !studentId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('profilePic', file);
    
    try {
      const res = await axios.put(`/api/v1/students/${studentId}/profile-picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePictureUrl(res.data.profilePictureUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to upload picture');
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Account Settings</h2>
          <p className="text-gray-500 mt-1">Manage your profile, notifications, and security preferences.</p>
        </div>
        <button 
          onClick={activeTab === 'profile' ? handleSaveChanges : undefined}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden min-h-[500px]">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 border-r border-gray-200 bg-gray-50 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">person</span> Personal Profile
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span> Notifications
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">lock</span> Security
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-8">
          
          {activeTab === 'profile' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Personal Profile</h3>
              
              <div className="flex items-center gap-6 mb-8">
                <img 
                  src={profilePictureUrl ? (profilePictureUrl?.startsWith("data:") ? profilePictureUrl : `${import.meta.env.VITE_API_URL || ''}${profilePictureUrl}`) : "https://lh3.googleusercontent.com/aida-public/AB6AXuBvDFGGUUhte5Il16V8Pep99BbX8tDyQO8ttDhsPE8852MXFppyhtg1ePJEsP-p6-YIkJryaLKyAc3ZzdsXaoired0_-TKqqGoz89FIyQGHWSSfRRgU_TiCwn97wwN7U65IlHQMempnpO9H5dGaQOAZfkZ9-N175BxsteS7x1pR-GnPGT7r0vVtBEplTEnE0HQhIgIAsjdSstYCUO4SRHlJF3W34g1_NiGWlZkOQcEr04H0mE-TBkZcwEJuSkHmltqYFUW0n1F73Cxh"} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full border border-gray-200 object-cover" 
                />
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-300 rounded font-medium text-sm hover:bg-gray-50"
                  >
                    Change Picture
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Number</label>
                    <input 
                      type="text" 
                      value={enrollmentNo} 
                      disabled 
                      className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded text-gray-500 cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                  <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">New Test Results</h4>
                    <p className="text-xs text-gray-500 mt-1">Get notified when an OMR batch is evaluated and your report is ready.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                  <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Parent WhatsApp Broadcasts</h4>
                    <p className="text-xs text-gray-500 mt-1">Allow the institute to send your official PDF report cards to your parent's registered WhatsApp number.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Security</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" placeholder="Enter new password" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <button className="px-4 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded font-medium text-sm hover:bg-gray-100">
                  Update Password
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StudentSettings;
