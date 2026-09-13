import { useState, useEffect } from 'react';
import demoClient from '../api/demoClient';
import type { ReportSummaryDTO } from '../types/demoAnalysis';

export const useDemoReports = (skip = 0, limit = 10) => {
  const [reports, setReports] = useState<ReportSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await demoClient.get<ReportSummaryDTO[]>('/reports', {
          params: { skip, limit }
        });
        if (active) {
          setReports(res.data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.response?.data?.detail || err.message || 'Failed to fetch reports');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchReports();
    return () => { active = false; };
  }, [skip, limit]);

  return { reports, loading, error };
};
