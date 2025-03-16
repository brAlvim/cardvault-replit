import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { GiftCard, Fornecedor, Transacao } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Store, Receipt, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FornecedorSummaryTable from '@/components/fornecedor-summary-table';
import ConfettiCelebration, { confettiAnimations } from '@/components/confetti-celebration';
import { useMilestoneDetector } from '@/hooks/use-milestone-detector';

export default function Dashboard() {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [showTestMilestone, setShowTestMilestone] = useState(false);
  
  // Get gift cards
  const { data: giftCards, isLoading: isLoadingGiftCards } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards', { userId: 1, fornecedor: selectedFornecedor }],
    queryFn: () => {
      const url = selectedFornecedor 
        ? `/api/gift-cards?userId=1&fornecedorId=${selectedFornecedor}`
        : '/api/gift-cards?userId=1';
      return fetch(url).then(res => res.json());
    },
  });

  // Get fornecedores
  const { data: fornecedores, isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores', { userId: 1 }],
    queryFn: () => fetch('/api/fornecedores?userId=1').then(res => res.json()),
  });

  // Get transactions for the dashboard
  const { data: recentTransacoes, isLoading: isLoadingTransacoes } = useQuery<Transacao[]>({
    queryKey: ['/api/transacoes/recentes', { limit: 5 }],
    queryFn: () => {
      // This is a placeholder since we don't have an endpoint for recent transactions yet
      // In a real implementation, we'd have a proper endpoint for this
      const giftCardId = giftCards && giftCards.length > 0 ? giftCards[0].id : 0;
      return fetch(`/api/transacoes/${giftCardId}`).then(res => res.json());
    },
    enabled: !!giftCards && giftCards.length > 0,
  });

  // Get upcoming expirations
  const { data: expiracoes, isLoading: isLoadingExpiracoes } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards/vencimento/30/1'], // Cards expiring in 30 days
    queryFn: () => fetch('/api/gift-cards/vencimento/30/1').then(res => res.json()),
  });

  // Calculate statistics
  const totalGiftCards = giftCards?.length || 0;
  
  // Contar apenas fornecedores ativos
  const fornecedoresAtivos = fornecedores?.filter(f => f.status === "ativo") || [];
  const totalFornecedores = fornecedoresAtivos.length || 0;
  
  const totalTransacoes = giftCards?.reduce((sum, giftCard) => {
    // Count how many transactions across all gift cards
    // In a real implementation, we'd have a proper endpoint for this count
    return sum + 2; // Placeholder count
  }, 0) || 0;
  
  const saldoTotal = giftCards?.reduce((sum, giftCard) => sum + giftCard.saldoAtual, 0) || 0;

  // Format date from ISO to local format
  const formatDate = (dateString: Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Configurar o detector de marcos
  const { 
    activeMilestone, 
    clearActiveMilestone, 
    resetCompletedMilestones 
  } = useMilestoneDetector({
    giftCards: giftCards || [],
  });

  return (
    <div>
      {/* Componente de celebração de marcos */}
      {activeMilestone && (
        <ConfettiCelebration 
          active={true}
          message={activeMilestone.title}
          options={confettiAnimations[activeMilestone.animationType]}
          duration={6000}
          onComplete={clearActiveMilestone}
        />
      )}
      
      {/* Para testes - botão de ativar confete */}
      {showTestMilestone && (
        <ConfettiCelebration 
          active={true}
          message="Celebração de Teste!"
          options={confettiAnimations.fireWorks}
          duration={6000}
          onComplete={() => setShowTestMilestone(false)}
        />
      )}
      
      {/* Botões de teste escondidos no canto inferior direito da tela */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline"
          className="opacity-50 hover:opacity-100"
          onClick={() => setShowTestMilestone(true)}
        >
          Testar Confete
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="opacity-50 hover:opacity-100"
          onClick={resetCompletedMilestones}
        >
          Reiniciar Marcos
        </Button>
      </div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => navigate("/gift-cards/new")}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Novo Gift Card
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/transacoes/new")}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Gift Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGiftCards}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingGiftCards ? 'Carregando...' : 'Gift cards cadastrados'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFornecedores}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingFornecedores ? 'Carregando...' : 'Fornecedores cadastrados'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Transações</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransacoes}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingTransacoes ? 'Carregando...' : 'Transações registradas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Gift Cards Por Fornecedor */}
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle className="text-lg">Gift Cards por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingGiftCards || isLoadingFornecedores ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            ) : giftCards && fornecedores ? (
              <FornecedorSummaryTable 
                giftCards={giftCards} 
                fornecedores={fornecedores} 
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldo Disponível */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Saldo Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center">
                <DollarSign className="h-10 w-10 mx-auto text-primary mb-2" />
                <div className="text-3xl font-bold">R$ {saldoTotal.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-2">Saldo total em Gift Cards ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gift Cards com Vencimento Próximo */}
        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg">Vencimentos Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExpiracoes ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : expiracoes && expiracoes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiracoes.slice(0, 4).map((giftCard) => {
                    const fornecedor = fornecedores?.find(f => f.id === giftCard.fornecedorId);
                    return (
                      <TableRow key={giftCard.id}>
                        <TableCell>{giftCard.codigo}</TableCell>
                        <TableCell>{fornecedor?.nome || '...'}</TableCell>
                        <TableCell>R$ {giftCard.saldoAtual.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            {formatDate(giftCard.dataValidade)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum Gift Card com vencimento próximo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transações Recentes */}
        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransacoes ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : recentTransacoes && recentTransacoes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransacoes.slice(0, 4).map((transacao) => (
                    <TableRow key={transacao.id}>
                      <TableCell>{formatDate(transacao.dataTransacao)}</TableCell>
                      <TableCell>{transacao.descricao}</TableCell>
                      <TableCell>R$ {transacao.valor.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhuma transação recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
