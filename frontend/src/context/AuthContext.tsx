import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  studentId: string | null;
  instituteId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  studentId: null,
  instituteId: null,
  loading: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For MVP, we mock authentication by fetching the first available student and institute.
    // In a real app, this would be a JWT decode or /api/me endpoint.
    const fetchMockSession = async () => {
      try {
        const [studentRes, instituteRes] = await Promise.all([
          axios.get('/api/v1/students'),
          axios.get('/api/v1/institute')
        ]);

        if (studentRes.data && studentRes.data.length > 0) {
          setStudentId(studentRes.data[0]._id);
        }
        if (instituteRes.data && instituteRes.data._id) {
          setInstituteId(instituteRes.data._id);
        }
      } catch (error) {
        console.error('Failed to mock session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMockSession();
  }, []);

  return (
    <AuthContext.Provider value={{ studentId, instituteId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
