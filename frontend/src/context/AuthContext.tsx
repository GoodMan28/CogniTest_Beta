import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface Student {
  _id: string;
  instituteId: string;
  name: string;
  enrollmentNo: string;
  batch: string;
  email?: string;
  profilePictureUrl?: string;
}

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

  useEffect(() => {
    const checkAuth = async () => {
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
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (enrollmentNo: string, password: string) => {
    const res = await axios.post('/api/v1/auth/student/login', { enrollmentNo, password });
    const { token, student: user } = res.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setStudent(user);
  };

  const signup = async (data: any) => {
    const res = await axios.post('/api/v1/auth/student/signup', data);
    const { token, student: user } = res.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setStudent(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setStudent(null);
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
