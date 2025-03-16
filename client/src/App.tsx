import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import MainLayout from "@/layouts/main-layout";
import Dashboard from "@/pages/dashboard";
import Collection from "@/pages/collection";
import GiftCards from "@/pages/gift-cards";
import GiftCardDetails from "@/pages/gift-card-details";
import GiftCardNew from "@/pages/gift-card-new";
import GiftCardNewFixed from "@/pages/gift-card-new-fixed";
import CalculadoraSimples from "@/pages/CalculadoraSimples";
import Fornecedores from "@/pages/fornecedores";
import Transacoes from "@/pages/transacoes";
import Relatorios from "@/pages/relatorios";
import UserProfiles from "@/pages/user-profiles";
import Login from "@/pages/login";

// Componente de rota protegida que verifica autenticação
const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType, path: string }) => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  const [, setLocation] = useLocation();

  if (!isAuthenticated()) {
    // Redirecionar para o login se não estiver autenticado
    setLocation('/login');
    return null;
  }

  return <Route {...rest} component={Component} />;
};

function Router() {
  return (
    <Switch>
      {/* Rota de login - aberta para todos */}
      <Route path="/login" component={Login} />
      
      {/* Redirecionar a rota raiz para dashboard ou login dependendo da autenticação */}
      <Route path="/">
        {() => {
          const isAuthenticated = !!localStorage.getItem('token');
          return isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />;
        }}
      </Route>
      
      {/* Rotas protegidas */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/collection/:id" component={Collection} />
      <ProtectedRoute path="/gift-cards" component={GiftCards} />
      <ProtectedRoute path="/gift-cards/new" component={GiftCardNewFixed} />
      <ProtectedRoute path="/gift-cards/:id" component={GiftCardDetails} />
      <ProtectedRoute path="/fornecedores" component={Fornecedores} />
      <ProtectedRoute path="/calculadora" component={CalculadoraSimples} />
      <ProtectedRoute path="/transacoes" component={Transacoes} />
      <ProtectedRoute path="/transacoes/:id" component={Transacoes} />
      <ProtectedRoute path="/relatorios" component={Relatorios} />
      <ProtectedRoute path="/user-profiles" component={UserProfiles} />
      <ProtectedRoute path="/admin" component={UserProfiles} />
      
      {/* Rota 404 - página não encontrada */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Verificar token ao iniciar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Se não houver token, garantir que queryClient não tenha dados em cache
      queryClient.clear();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
