import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Tests = () => {
  const { instituteId } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'upload'>('create');
  const [tests, setTests] = useState<any[]>([]);

  // Create Test Metadata State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [examType, setExamType] = useState('NEET');
  const [sourceExam, setSourceExam] = useState('');
  const [marksPerQuestion, setMarksPerQuestion] = useState('4');
  const [negativeMarking, setNegativeMarking] = useState('1');

  // Animation States
  const [ingestionPhase, setIngestionPhase] = useState<'idle' | 'uploading' | 'ocr' | 'diagrams' | 'saving' | 'success'>('idle');
  
  // Upload OMR State
  const [selectedTestId, setSelectedTestId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref for Question PDF and Solution PDF mock selection
  const qPdfRef = useRef<HTMLInputElement>(null);
  const solPdfRef = useRef<HTMLInputElement>(null);
  const [qPdf, setQPdf] = useState<File | null>(null);
  const [solPdf, setSolPdf] = useState<File | null>(null);

  const fetchTests = async () => {
    try {
      const res = await axios.get('/api/v1/tests');
      setTests(res.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleIngestTest = async () => {
    if (!title || !date || !marksPerQuestion || !negativeMarking) {
      alert("Please fill in all required metadata fields.");
      return;
    }
    if (!qPdf || !solPdf) {
      alert("Please select both the Question Paper PDF and Answer Key PDF.");
      return;
    }

    // Start Simulation
    setIngestionPhase('uploading');
    
    // Phase 1: Uploading PDFs (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIngestionPhase('ocr');
    
    // Phase 2: OCR Extraction (2.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIngestionPhase('diagrams');
    
    // Phase 3: Processing Diagrams and Molecular Structures (2.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIngestionPhase('saving');

    // Phase 4: Fetch JSON and POST to Backend
    try {
      const response = await fetch('/test.json');
      if (!response.ok) {
        throw new Error("Failed to load test.json from public folder");
      }
      const questionsData = await response.json();

      const payload = {
        testMeta: {
          title,
          date,
          examType,
          sourceExam,
          marksPerQuestion: parseInt(marksPerQuestion),
          negativeMarking: parseInt(negativeMarking)
        },
        questions: questionsData
      };

      await axios.post('/api/v1/ingestion/ingest-test', payload);
      
      setIngestionPhase('success');
      fetchTests(); // Refresh the list with the real test!
      
      setTimeout(() => {
        setIngestionPhase('idle');
        setTitle('');
        setDate('');
        setSourceExam('');
        setQPdf(null);
        setSolPdf(null);
        if (qPdfRef.current) qPdfRef.current.value = '';
        if (solPdfRef.current) solPdfRef.current.value = '';
        setActiveTab('upload');
      }, 3000);

    } catch (error) {
      console.error(error);
      alert('Error during test ingestion. Check the console.');
      setIngestionPhase('idle');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadBatch = async () => {
    if (!selectedTestId) {
      alert("Please select a Question Paper first.");
      return;
    }
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('testId', selectedTestId);
      formData.append('file', file);

      await axios.post('/api/v1/evaluation/upload-batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('OMR Batch uploaded and evaluated successfully!');
      setFile(null);
      setSelectedTestId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      alert('Error evaluating OMR batch. Make sure Python ML service is running.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-w-0 w-full p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Test Management</h2>
          <p className="text-gray-500 mt-1">Ingest new test papers and evaluate OMR batches.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          1. Upload & Ingest Question Paper
        </button>
        <button 
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          2. Evaluate OMR Batch
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl relative overflow-hidden">
          {ingestionPhase !== 'idle' && (
            <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="w-64">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>AI Ingestion Progress</span>
                  <span>
                    {ingestionPhase === 'uploading' && '15%'}
                    {ingestionPhase === 'ocr' && '45%'}
                    {ingestionPhase === 'diagrams' && '75%'}
                    {ingestionPhase === 'saving' && '90%'}
                    {ingestionPhase === 'success' && '100%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                    style={{ 
                      width: 
                        ingestionPhase === 'uploading' ? '15%' :
                        ingestionPhase === 'ocr' ? '45%' :
                        ingestionPhase === 'diagrams' ? '75%' :
                        ingestionPhase === 'saving' ? '90%' :
                        ingestionPhase === 'success' ? '100%' : '0%'
                    }}
                  ></div>
                </div>
                
                <div className="mt-6 flex flex-col gap-3">
                  {/* Step 1: Uploading */}
                  <div className={`flex items-center gap-3 ${ingestionPhase === 'uploading' ? 'text-blue-600 font-bold' : ingestionPhase !== 'idle' ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="material-symbols-outlined">
                      {ingestionPhase === 'uploading' ? 'sync' : ingestionPhase !== 'idle' ? 'check_circle' : 'pending'}
                    </span>
                    <span className="text-sm">Uploading Source PDFs...</span>
                  </div>
                  
                  {/* Step 2: OCR */}
                  <div className={`flex items-center gap-3 ${(ingestionPhase === 'ocr' || ingestionPhase === 'diagrams' || ingestionPhase === 'saving' || ingestionPhase === 'success') ? (ingestionPhase === 'ocr' ? 'text-blue-600 font-bold' : 'text-green-600') : 'text-gray-400'}`}>
                    <span className="material-symbols-outlined">
                      {ingestionPhase === 'ocr' ? 'sync' : (ingestionPhase === 'diagrams' || ingestionPhase === 'saving' || ingestionPhase === 'success') ? 'check_circle' : 'pending'}
                    </span>
                    <span className="text-sm">Extracting Text via OCR...</span>
                  </div>
                  
                  {/* Step 3: Diagrams */}
                  <div className={`flex items-center gap-3 ${(ingestionPhase === 'diagrams' || ingestionPhase === 'saving' || ingestionPhase === 'success') ? (ingestionPhase === 'diagrams' ? 'text-blue-600 font-bold' : 'text-green-600') : 'text-gray-400'}`}>
                    <span className="material-symbols-outlined">
                      {ingestionPhase === 'diagrams' ? 'sync' : (ingestionPhase === 'saving' || ingestionPhase === 'success') ? 'check_circle' : 'pending'}
                    </span>
                    <span className="text-sm">Processing Diagrams and Molecular Structures...</span>
                  </div>

                  {/* Step 4: Saving */}
                  <div className={`flex items-center gap-3 ${(ingestionPhase === 'saving' || ingestionPhase === 'success') ? (ingestionPhase === 'saving' ? 'text-blue-600 font-bold' : 'text-green-600') : 'text-gray-400'}`}>
                    <span className="material-symbols-outlined">
                      {ingestionPhase === 'saving' ? 'sync' : ingestionPhase === 'success' ? 'check_circle' : 'pending'}
                    </span>
                    <span className="text-sm">Saving to Database...</span>
                  </div>
                </div>
                
                {ingestionPhase === 'success' && (
                  <div className="mt-8 text-center text-green-700 font-bold bg-green-50 py-3 rounded-lg border border-green-200">
                    Successfully ingested 180 questions!
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-800 mb-4">Ingest New Test Paper</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">description</span>
              <p className="text-sm font-medium text-gray-700 mb-1">Question Paper PDF</p>
              <p className="text-xs text-gray-500 mb-3">{qPdf ? qPdf.name : 'Not selected'}</p>
              <button onClick={() => qPdfRef.current?.click()} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-100">Browse</button>
              <input type="file" ref={qPdfRef} onChange={(e) => e.target.files && setQPdf(e.target.files[0])} className="hidden" accept=".pdf" />
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">key</span>
              <p className="text-sm font-medium text-gray-700 mb-1">Answer Key / Solutions PDF</p>
              <p className="text-xs text-gray-500 mb-3">{solPdf ? solPdf.name : 'Not selected'}</p>
              <button onClick={() => solPdfRef.current?.click()} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-100">Browse</button>
              <input type="file" ref={solPdfRef} onChange={(e) => e.target.files && setSolPdf(e.target.files[0])} className="hidden" accept=".pdf" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Title *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                placeholder="e.g. NEET 2027 Mock Test 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <option value="NEET">NEET</option>
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Advanced">JEE Advanced</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Exam</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. NEET 2024"
                  value={sourceExam}
                  onChange={(e) => setSourceExam(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marks / Q *</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marking *</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="pt-6 mt-4">
              <button 
                className={`w-full px-6 py-3 bg-blue-600 text-white rounded font-medium shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2`}
                onClick={handleIngestTest}
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                AI Ingest Test PDFs
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
           <h3 className="text-xl font-bold text-gray-800 mb-4">Evaluate OMR Sheets</h3>
           <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Question Paper</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                >
                  <option value="">Select a test...</option>
                  {tests.map(test => (
                    <option key={test._id} value={test._id}>{test.title} ({new Date(test.date).toLocaleDateString()})</option>
                  ))}
                </select>
             </div>

             <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 flex flex-col items-center">
               <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
               <h4 className="text-gray-700 font-medium mb-1">Upload PDF Batch</h4>
               <p className="text-gray-500 text-sm mb-4">{file ? `Selected: ${file.name}` : 'Upload scanned OMR sheets (PDF or image)'}</p>
               
               <input 
                 type="file" 
                 accept=".pdf,.png,.jpg,.jpeg" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 className="hidden" 
               />
               <div className="flex gap-3">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded shadow-sm text-sm font-medium hover:bg-gray-50"
                 >
                   Browse Files
                 </button>
                 {file && (
                   <button 
                     onClick={handleUploadBatch}
                     disabled={isUploading}
                     className={`px-4 py-2 bg-blue-600 text-white rounded shadow-sm text-sm font-medium hover:bg-blue-700 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     {isUploading ? 'Evaluating...' : 'Start Evaluation'}
                   </button>
                 )}
               </div>
             </div>

             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
               <span className="material-symbols-outlined text-blue-600">info</span>
               <div className="text-sm text-blue-800">
                 <strong>How it works:</strong> The system will process the uploaded PDFs, extract the Enrollment Numbers using OCR, evaluate the answers against the selected Question Paper's answer key, and generate analytical reports for each student.
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Tests;
