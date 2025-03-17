import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  nome: string;
  email: string;
  empresaId: number;
  empresaNome: string;
  perfilId: number;
  perfilNome: string;
}

interface LoginData {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            return null;
          }
          throw new Error(`Request failed with status ${res.status}`);
        }

        const userData = await res.json();
        setIsAuthenticated(true);
        return userData;
      } catch (error) {
        setIsAuthenticated(false);
        console.error("Error checking authentication:", error);
        return null;
      }
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresh token every 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Falha ao fazer login");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Save token
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);
      
      // Fetch user data
      refetch();
      
      // Invalidate cached queries that might depend on authentication
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fornecedores'] });
      
      // Navigate to dashboard
      navigate("/");
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${data.username || 'Usuário'}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      setIsAuthenticated(false);
      toast({
        title: "Falha no login",
        description: error.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      if (!res.ok) {
        throw new Error("Falha ao fazer logout");
      }
    },
    onSuccess: () => {
      // Remove token
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      
      // Clear user from query cache
      queryClient.setQueryData(['/api/auth/me'], null);
      
      // Invalidate any authenticated queries
      queryClient.invalidateQueries();
      
      // Navigate to login
      navigate("/login");
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado com sucesso",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const checkAuth = async (): Promise<boolean> => {
    const result = await refetch();
    return !!result.data;
  };

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refetch();
    } else {
      setIsAuthenticated(false);
    }
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}