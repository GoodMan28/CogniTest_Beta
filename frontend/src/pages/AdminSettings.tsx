import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'batches' | 'grading' | 'billing' | 'ingestion'>('profile');
  
  // Ingestion State
  const [ingestionStatus, setIngestionStatus] = useState<any>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [uploadSubject, setUploadSubject] = useState('Physics');
  const [qFile, setQFile] = useState<File | null>(null);
  const [sFile, setSFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Branding State
  const [themeColor, setThemeColor] = useState('#2563EB');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile State
  const [instituteName, setInstituteName] = useState('Allen Career Institute');
  const [supportEmail, setSupportEmail] = useState('support@allen.ac.in');
  const [supportPhone, setSupportPhone] = useState('+91 9876543210');

  useEffect(() => {
    const fetchInstitute = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/institute');
        if (res.data.themeColor) setThemeColor(res.data.themeColor);
        if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
        if (res.data.name) setInstituteName(res.data.name);
        if (res.data.supportEmail) setSupportEmail(res.data.supportEmail);
        if (res.data.supportPhone) setSupportPhone(res.data.supportPhone);
      } catch (e) {
        console.error('Failed to fetch institute', e);
      }
    };
    fetchInstitute();
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'ingestion') {
      const fetchStatus = async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/v1/ingestion/status');
          setIngestionStatus(res.data);
          if (res.data.processing || res.data.pending > 0) {
            setIsIngesting(true);
          } else {
            setIsIngesting(false);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const startIngestion = async () => {
    try {
      await axios.post('http://localhost:5000/api/v1/ingestion/start');
      setIsIngesting(true);
    } catch (e) {
      alert('Failed to start ingestion. Check console.');
      console.error(e);
    }
  };

  const clearQueue = async () => {
    try {
      await axios.delete('http://localhost:5000/api/v1/ingestion/clear');
      setIngestionStatus(null);
      setIsIngesting(false);
      alert('Queue cleared completely.');
    } catch (e) {
      alert('Failed to clear queue.');
      console.error(e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qFile || !sFile) {
      alert('Please select both Question PDF and Solution PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('subject', uploadSubject);
    formData.append('questionPdf', qFile);
    formData.append('solutionPdf', sFile);

    try {
      setIsUploading(true);
      await axios.post('http://localhost:5000/api/v1/ingestion/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Files successfully uploaded and queued for processing!');
      setQFile(null);
      setSFile(null);
      // Let the polling pick up the new pending job
    } catch (e: any) {
      alert(e.response?.data?.message || 'Upload failed');
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGlobalSave = async () => {
    if (activeTab === 'profile') {
      try {
        await axios.put('http://localhost:5000/api/v1/institute/settings', {
          name: instituteName,
          supportEmail,
          supportPhone
        });
        alert('Profile settings saved successfully!');
      } catch (e) {
        alert('Failed to save profile settings');
        console.error(e);
      }
    } else if (activeTab === 'branding') {
      try {
        const formData = new FormData();
        formData.append('themeColor', themeColor);
        if (logoFile) {
          formData.append('logoFile', logoFile);
        }
        await axios.put('http://localhost:5000/api/v1/institute/branding', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Branding settings saved successfully!');
        // Re-fetch to get updated URL
        const res = await axios.get('http://localhost:5000/api/v1/institute');
        if (res.data.logoUrl) setLogoUrl(res.data.logoUrl);
      } catch (e) {
        alert('Failed to save branding settings');
        console.error(e);
      }
    } else {
      alert('Save for this tab is not implemented yet.');
    }
  };

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Institute Settings</h2>
          <p className="text-gray-500 mt-1">Configure your coaching portal, branding, batches, and subscription.</p>
        </div>
        <button 
          onClick={handleGlobalSave}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 border-r border-gray-200 bg-gray-50 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">domain</span> Institute Profile
          </button>
          <button 
            onClick={() => setActiveTab('branding')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'branding' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">palette</span> Report Branding
          </button>
          <button 
            onClick={() => setActiveTab('batches')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'batches' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">groups</span> Batch Management
          </button>
          <button 
            onClick={() => setActiveTab('grading')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'grading' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">grading</span> Default Grading
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">credit_card</span> Usage & Billing
          </button>
          <button 
            onClick={() => setActiveTab('ingestion')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ingestion' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined text-[20px]">smart_toy</span> AI Ingestion Engine
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-8">
          
          {activeTab === 'profile' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Institute Profile</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                  <input type="text" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                  <input type="tel" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Report Card Branding</h3>
              <p className="text-sm text-gray-500 mb-6">Customize how your generated Diagnostic PDFs look when sent to parents.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Institute Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 overflow-hidden">
                      {logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : logoUrl ? (
                        <img src={(logoUrl?.startsWith("data:") ? logoUrl : `http://localhost:5000${logoUrl}`)} alt="Institute Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl">image</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setLogoFile(e.target.files[0]);
                        }
                      }} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Upload New Logo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={themeColor} 
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0" 
                    />
                    <input 
                      type="text" 
                      value={themeColor.toUpperCase()} 
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm uppercase" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Signature (Digital Stamp)</label>
                  <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
                    <span className="material-symbols-outlined text-gray-400 mb-1">draw</span>
                    <p className="text-sm text-gray-500">Upload a transparent PNG signature</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-2">
                <h3 className="text-xl font-bold text-gray-800">Batch Management</h3>
                <button className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add Batch
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Manage the cohorts and batches operating at your institute. These will appear in filtering dropdowns across the portal.</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="font-medium text-gray-800">NEET-2027 Alpha</span>
                  </div>
                  <div className="text-sm text-gray-500">450 Students</div>
                  <button className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="font-medium text-gray-800">JEE-2027 Beta</span>
                  </div>
                  <div className="text-sm text-gray-500">320 Students</div>
                  <button className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="font-medium text-gray-800">Foundation Class 10</span>
                  </div>
                  <div className="text-sm text-gray-500">890 Students</div>
                  <button className="text-gray-400 hover:text-red-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Default Grading Schema</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Global Default Scheme</label>
                  <p className="text-xs text-gray-500 mb-4">This will be applied to all new tests unless overridden during test creation.</p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-xs text-gray-500">Correct Answer Marks</span>
                      <input type="number" defaultValue="4" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Incorrect Answer Penalty</span>
                      <input type="number" defaultValue="-1" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-red-500 focus:border-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2">Usage & Billing</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-5 border border-blue-200 bg-blue-50 rounded-xl">
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Current Plan</h4>
                  <div className="text-2xl font-black text-blue-700 mb-2">Enterprise Plus</div>
                  <p className="text-xs text-blue-600">Renews on Oct 1st, 2024</p>
                </div>
                <div className="p-5 border border-gray-200 rounded-xl flex flex-col justify-center items-center">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50">
                    Contact Sales to Upgrade
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-gray-700">OMR Sheets Processed (This Month)</span>
                    <span className="text-sm font-medium text-gray-500">8,450 / 10,000</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '84.5%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-gray-700">Storage Used (Test Papers & Encodings)</span>
                    <span className="text-sm font-medium text-gray-500">2.1 GB / 50 GB</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '4.2%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ingestion' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-2 border-b border-gray-200 pb-2">AI Material Ingestion Engine</h3>
              <p className="text-sm text-gray-500 mb-8">
                Asynchronously process the thousands of pages in your Sample_material folder using the Vision LLM Queue.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Upload New Materials</h4>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select 
                      value={uploadSubject} 
                      onChange={(e) => setUploadSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Questions PDF</label>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => setQFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solutions PDF</label>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={(e) => setSFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'}`}
                    >
                      {isUploading ? <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> Uploading...</> : <><span className="material-symbols-outlined text-[18px]">cloud_upload</span> Upload & Queue</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="font-bold text-gray-800">Global Processing Queue</h4>
                    <p className="text-sm text-gray-500 mt-1">Start the pipeline to ingest PDFs into MongoDB and Pinecone.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={clearQueue}
                      className="px-4 py-2 rounded-lg font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all border border-red-200 shadow-sm"
                    >
                      Clear Queue
                    </button>
                    <button 
                      onClick={startIngestion}
                      disabled={isIngesting}
                      className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${isIngesting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                      {isIngesting ? <><span className="material-symbols-outlined animate-spin text-[20px]">sync</span> Ingestion Running...</> : <><span className="material-symbols-outlined text-[20px]">play_arrow</span> Start Engine</>}
                    </button>
                  </div>
                </div>

                {ingestionStatus && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                        <div className="text-3xl font-black text-gray-800">{ingestionStatus.total}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Total PDFs</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                        <div className="text-3xl font-black text-blue-600">{ingestionStatus.pending}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">In Queue</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                        <div className="text-3xl font-black text-green-600">{ingestionStatus.completed}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Completed</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center shadow-sm">
                        <div className="text-3xl font-black text-red-600">{ingestionStatus.failed}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Failed</div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-gray-700">Overall Progress</span>
                        <span className="text-sm font-black text-purple-600">{ingestionStatus.percentage}%</span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${ingestionStatus.percentage}%` }}></div>
                      </div>
                      
                      {ingestionStatus.processing && (
                        <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-blue-500 animate-pulse">document_scanner</span>
                            <div>
                              <div className="text-sm font-bold text-blue-900">Extracting: {ingestionStatus.processing.pdfName}</div>
                              <div className="text-xs text-blue-700">
                                Pages Processed: {ingestionStatus.processing.processedPages} / {ingestionStatus.processing.totalPages || '?'}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 bg-blue-200 text-blue-800 rounded uppercase">Processing</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
