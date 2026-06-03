import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 
  | 'Super_Admin' 
  | 'Ketua' 
  | 'Wakil_Ketua_I'
  | 'Wakil_Ketua_II'
  | 'Wakil_Ketua_III'
  | 'Wakil_Ketua_IV'
  | 'Kabag_Administrasi' 
  | 'Kabag_Pelaporan'
  | 'Kabag_Pengumpulan'
  | 'Kabag_Pendistribusian'
  | 'Kabag_Pendayagunaan'
  | 'Kepala_Pelaksana' 
  | 'Staf_Administrasi' 
  | 'Staf_Distribusi' 
  | 'Staf_Keuangan'
  | 'Staf_Pengumpulan'
  | 'Staf_Pelaporan'
  | 'Relawan'
  | 'Relawan_Sementara'
  | 'Tim_Monev';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved auth state on mount
    const savedToken = localStorage.getItem('baznas_token');
    const savedUser = localStorage.getItem('baznas_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user from local storage');
        localStorage.removeItem('baznas_token');
        localStorage.removeItem('baznas_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('baznas_token', newToken);
    localStorage.setItem('baznas_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('baznas_token');
    localStorage.removeItem('baznas_user');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
