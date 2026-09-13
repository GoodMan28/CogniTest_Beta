import { useState, useEffect, useCallback } from 'react';
import demoClient from '../api/demoClient';
import type { ReflectionItemDTO, ReportDetailDTO, PracticeQuestionDTO } from '../types/demoAnalysis';

// Fetches one report's full detail. Called exactly once per report page
// (DemoReportDetail); PracticePanel and ReflectionInput receive
// getPracticeQuestions/updateReflection as props instead of calling this
// hook themselves, so a 75-question report doesn't trigger ~150 redundant
// GET /reports/{id} calls (defect D13).
export const useDemoReport = (reportId: string | undefined) => {
  const [report, setReport] = useState<ReportDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (active = true) => {
    if (!reportId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await demoClient.get<ReportDetailDTO>(`/reports/${reportId}`);
      if (active) {
        setReport(res.data);
      }
    } catch (err: any) {
      if (active) {
        setError(err.response?.data?.detail || 'Failed to load report');
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }, [reportId]);

  useEffect(() => {
    let active = true;
    fetchReport(active);
    return () => { active = false; };
  }, [fetchReport]);

  // Saves (or, with empty text, clears) a reflection and patches local
  // state directly from the response instead of re-fetching the whole
  // report — the server already returns exactly what changed.
  const updateReflection = async (questionNo: number, text: string, buildId: string, contentHash: string) => {
    if (!reportId) return;

    try {
      const res = await demoClient.put<ReflectionItemDTO | null>(
        `/reports/${reportId}/questions/${questionNo}/reflection`,
        { text, buildId, questionContentHash: contentHash }
      );

      setReport(prev => {
        if (!prev) return prev;
        const nextReflections = { ...prev.reflections };
        if (res.data === null) {
          delete nextReflections[String(questionNo)];
        } else {
          nextReflections[String(questionNo)] = res.data;
        }
        return { ...prev, reflections: nextReflections };
      });

      return res.data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        throw new Error('This test has been updated since you started reviewing it. Please refresh the page.');
      }
      throw new Error(err.response?.data?.detail || 'Failed to save reflection');
    }
  };

  const getPracticeQuestions = async (questionNo: number): Promise<PracticeQuestionDTO[]> => {
    if (!reportId) return [];

    try {
      const res = await demoClient.get<PracticeQuestionDTO[]>(`/reports/${reportId}/questions/${questionNo}/practice`);
      return res.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return { report, loading, error, updateReflection, getPracticeQuestions };
};
