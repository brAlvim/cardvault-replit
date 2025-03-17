import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import FornecedorDetalhes from "@/pages/fornecedor-detalhes";
import Suppliers from "@/pages/suppliers";
import Transacoes from "@/pages/transacoes";
import Relatorios from "@/pages/relatorios";
import UserProfiles from "@/pages/user-profiles";
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/login";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      {/* Rota de autenticação - aberta para todos */}
      <Route path="/login" component={LoginPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Redirecionar a rota raiz para dashboard */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Rotas protegidas */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/collection/:id" component={Collection} />
      <ProtectedRoute path="/gift-cards" component={GiftCards} />
      <ProtectedRoute path="/gift-cards/new" component={GiftCardNewFixed} />
      <ProtectedRoute path="/gift-cards/:id" component={GiftCardDetails} />
      <ProtectedRoute path="/fornecedores" component={Fornecedores} />
      <ProtectedRoute path="/fornecedores/:id" component={FornecedorDetalhes} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainLayout>
          <Router />
        </MainLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
