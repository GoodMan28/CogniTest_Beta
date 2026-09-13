import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import type { StudentMeDTO } from '../types/demoAnalysis';

interface Student {
  _id: string;
  instituteId: string;
  name: string;
  enrollmentNo: string;
  batch: string;
  email?: string;
  profilePictureUrl?: string;
}

// Maps the demo backend's StudentMeDTO (id/instituteId/enrollmentNo/name/batch)
// onto the existing Student shape ProtectedRoute/StudentLayout etc. expect
// (_id, not id; email/profilePictureUrl are simply absent in demo mode).
const mapStudentMeDTO = (dto: StudentMeDTO): Student => ({
  _id: dto.id,
  instituteId: dto.instituteId,
  name: dto.name,
  enrollmentNo: dto.enrollmentNo,
  batch: dto.batch,
});

interface AuthContextType {
  studentId: string | null;
  instituteId: string | null;
  student: Student | null;
  loading: boolean;
  login: (enrollmentNo: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  studentId: null,
  instituteId: null,
  student: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  isAuthenticated: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemo = import.meta.env.VITE_USE_DEMO === 'true';

  useEffect(() => {
    const checkAuth = async () => {
      if (isDemo) {
        try {
          // Use demo client to hydrate via HttpOnly cookie
          const { default: demoClient } = await import('../api/demoClient');
          const res = await demoClient.get<StudentMeDTO>('/auth/me');
          setStudent(mapStudentMeDTO(res.data));
        } catch (error) {
          console.error('Demo session expired or invalid', error);
          setStudent(null);
        }
      } else {
        const token = localStorage.getItem('token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          try {
            const res = await axios.get('/api/v1/auth/student/me');
            setStudent(res.data);
          } catch (error) {
            console.error('Session expired or invalid', error);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setStudent(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [isDemo]);

  const login = async (enrollmentNo: string, password: string) => {
    if (isDemo) {
      const { default: demoClient } = await import('../api/demoClient');
      await demoClient.post('/auth/login', { enrollmentNo, password });
      const res = await demoClient.get<StudentMeDTO>('/auth/me');
      setStudent(mapStudentMeDTO(res.data));
    } else {
      const res = await axios.post('/api/v1/auth/student/login', { enrollmentNo, password });
      const { token, student: user } = res.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setStudent(user);
    }
  };

  const signup = async (data: any) => {
    if (isDemo) {
      const { default: demoClient } = await import('../api/demoClient');
      await demoClient.post('/auth/activate', data);
      await login(data.enrollmentNo, data.password);
    } else {
      const res = await axios.post('/api/v1/auth/student/signup', data);
      const { token, student: user } = res.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setStudent(user);
    }
  };

  const logout = async () => {
    if (isDemo) {
      const { default: demoClient } = await import('../api/demoClient');
      try {
        await demoClient.post('/auth/logout');
      } catch (e) {
        console.error(e);
      }
      setStudent(null);
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setStudent(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      studentId: student?._id || null, 
      instituteId: student?.instituteId || null,
      student, 
      loading, 
      login, 
      signup, 
      logout,
      isAuthenticated: !!student
    }}>
      {children}
    </AuthContext.Provider>
  );
};
