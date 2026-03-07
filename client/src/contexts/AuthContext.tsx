import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "@/api/axios";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedAdmin = localStorage.getItem("admin");

    if (savedToken && savedAdmin) {
      setToken(savedToken);
      setAdmin(JSON.parse(savedAdmin));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { token: newToken, admin: adminData } = response.data.data;

    localStorage.setItem("token", newToken);
    localStorage.setItem("admin", JSON.stringify(adminData));

    setToken(newToken);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}