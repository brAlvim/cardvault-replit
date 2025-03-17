import { useEffect, useState } from "react";
import { Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const [, navigate] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isAuthed = await checkAuth();
        if (!isAuthed) {
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/login");
      } finally {
        setIsChecking(false);
      }
    };

    if (!isLoading) {
      if (!isAuthenticated) {
        verifyAuth();
      } else {
        setIsChecking(false);
      }
    }
  }, [isAuthenticated, isLoading, checkAuth, navigate]);

  if (isLoading || isChecking) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Verificando autenticação...</span>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}