import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  instituteId: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  token: null
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('adminToken');
      if (savedToken) {
        try {
          const res = await axios.get('/api/v1/auth/admin/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setAdmin(res.data);
          setToken(savedToken);
        } catch (error) {
          console.error('Admin session expired', error);
          localStorage.removeItem('adminToken');
          setAdmin(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/v1/auth/admin/login', { email, password });
    const { token: newToken, admin: user } = res.data;
    
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
    setAdmin(user);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{
      admin,
      loading,
      login,
      logout,
      isAuthenticated: !!admin,
      token
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
