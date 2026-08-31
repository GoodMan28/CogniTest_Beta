import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TemplateBuilder from './generator/TemplateBuilder';
import PaperComposer from './generator/PaperComposer';
import axios from 'axios';

export type TemplateSection = {
  id: string;
  subject: string;
  questionType: string;
  totalQuestions: number;
  marksPerQuestion: number;
};

export type PaperTemplate = {
  title: string;
  course: string;
  sections: TemplateSection[];
  _id?: string;
};

export default function PaperGenerator() {
  const location = useLocation();
  const existingTemplate = location.state?.existingTemplate;

  const [step, setStep] = useState<1 | 2>(existingTemplate ? 2 : 1);
  const [template, setTemplate] = useState<PaperTemplate | null>(existingTemplate || null);

  // If navigated with a different template state, update it
  useEffect(() => {
    if (location.state?.existingTemplate) {
      setTemplate(location.state.existingTemplate);
      setStep(2);
    }
  }, [location.state?.existingTemplate]);

  const handleTemplateSaved = async (newTemplate: PaperTemplate) => {
    try {
      await axios.post('/api/v1/templates', {
        ...newTemplate,
        instituteId: '654321098765432109876543' // Fallback or use Auth context if available
      });
      alert('Template successfully saved!');
      window.location.href = '/admin/tests';
    } catch (error) {
      console.error(error);
      alert('Failed to save template');
    }
  };

  const handleTemplateCreated = (newTemplate: PaperTemplate) => {
    setTemplate(newTemplate);
    setStep(2);
  };

  return (
    <div className="flex-1 bg-[#FAFAFA] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? 'Template Creation' : 'Compose Question Paper'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 
              ? 'Define the blueprint for your test by adding sections and criteria.' 
              : 'Select questions from the database to fulfill the template requirements.'}
          </p>
        </div>

        {step === 1 && (
        <TemplateBuilder 
          onComplete={handleTemplateCreated} 
          onSaveOnly={handleTemplateSaved}
        />
      )}
        
        {step === 2 && template && (
          <PaperComposer template={template} onBack={() => setStep(1)} />
        )}
      </div>
    </div>
  );
}
