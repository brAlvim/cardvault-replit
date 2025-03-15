import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/collection/:id" component={Collection} />
      <Route path="/gift-cards" component={GiftCards} />
      <Route path="/gift-cards/new" component={GiftCardNewFixed} />
      <Route path="/gift-cards/:id" component={GiftCardDetails} />
      <Route path="/fornecedores" component={Fornecedores} />
      <Route path="/calculadora" component={CalculadoraSimples} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
