import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { GiftCard, Fornecedor, Transacao, User, Perfil } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { 
  CreditCard, 
  Store, 
  Receipt, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Users, 
  ShieldCheck, 
  Settings,
  ChevronRight,
  ExternalLink,
  CircleUser,
  UserCog,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FornecedorSummaryTable from '@/components/fornecedor-summary-table';
import ConfettiCelebration, { confettiAnimations } from '@/components/confetti-celebration';
import { useMilestoneDetector } from '@/hooks/use-milestone-detector';

export default function Dashboard() {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const [showTestMilestone, setShowTestMilestone] = useState(false);
  const [activeTab, setActiveTab] = useState("giftcards");
  
  // Get gift cards
  const { data: giftCards, isLoading: isLoadingGiftCards } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards', { fornecedor: selectedFornecedor }],
    queryFn: () => {
      const url = selectedFornecedor 
        ? `/api/gift-cards?fornecedorId=${selectedFornecedor}`
        : '/api/gift-cards';
      
      // Adicionar token de autenticação ao cabeçalho
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      return fetch(url, { headers }).then(res => {
        if (!res.ok) {
          throw new Error('Falha ao carregar gift cards');
        }
        return res.json();
      });
    },
  });

  // Get fornecedores
  const { data: fornecedores, isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => {
      // Adicionar token de autenticação ao cabeçalho
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      return fetch('/api/fornecedores', { headers }).then(res => {
        if (!res.ok) {
          throw new Error('Falha ao carregar fornecedores');
        }
        return res.json();
      });
    },
  });

  // Get perfis (roles)
  const { data: perfis, isLoading: isLoadingPerfis } = useQuery<Perfil[]>({
    queryKey: ['/api/perfis'],
    queryFn: () => fetch('/api/perfis').then(res => res.json()),
  });

  // Get users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });

  // Get transactions for the dashboard
  const { data: recentTransacoes, isLoading: isLoadingTransacoes } = useQuery<Transacao[]>({
    queryKey: ['/api/transacoes/recentes', { limit: 10 }],
    queryFn: () => {
      // Buscar todas as transações e ordená-las por data mais recente
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      return fetch('/api/transacoes', { headers })
        .then(res => {
          if (!res.ok) throw new Error('Falha ao carregar transações');
          return res.json();
        })
        .then(data => {
          // Ordenar por data mais recente e limitar a 10 transações
          return data.sort((a: Transacao, b: Transacao) => 
            new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime()
          ).slice(0, 10);
        });
    },
  });

  // Get upcoming expirations
  const { data: expiracoes, isLoading: isLoadingExpiracoes } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards/vencimento/30/1'], // Cards expiring in 30 days
    queryFn: () => {
      // Adicionar token de autenticação ao cabeçalho
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      return fetch('/api/gift-cards/vencimento/30/1', { headers }).then(res => {
        if (!res.ok) {
          throw new Error('Falha ao carregar expiracoes');
        }
        return res.json();
      });
    },
  });

  // Calculate statistics
  const totalGiftCards = giftCards?.length || 0;
  
  // Contar apenas fornecedores ativos
  const fornecedoresAtivos = fornecedores?.filter(f => f.status === "ativo") || [];
  const totalFornecedores = fornecedoresAtivos.length || 0;
  
  const totalTransacoes = Array.isArray(giftCards) ? giftCards.reduce((sum, giftCard) => {
    // Count how many transactions across all gift cards
    // In a real implementation, we'd have a proper endpoint for this count
    return sum + 2; // Placeholder count
  }, 0) : 0;
  
  const saldoTotal = Array.isArray(giftCards) ? giftCards.reduce((sum, giftCard) => sum + giftCard.saldoAtual, 0) : 0;

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

  // Verificar status e tipo de usuário (admin da empresa ou usuário comum)
  const isAdmin = Array.isArray(users) && users.find(u => u.id === 1)?.perfilId === 1; // Assumindo 1 = admin
  
  // Usuários da mesma empresa (para administradores mostrarem)
  const empresaId = 1; // Placeholder, precisaria vir da autenticação real
  const usuariosMesmaEmpresa = Array.isArray(users) ? users.filter(u => u.empresaId === empresaId) : [];
  
  // Cálculo estatísticas de usuários
  const totalUsuarios = usuariosMesmaEmpresa.length || 0;
  const totalPerfis = perfis?.length || 0;

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

      {/* Dashboard Tabs */}
      <Tabs 
        defaultValue={activeTab} 
        className="mb-6"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="giftcards" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Gift Cards</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="administracao" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Administração</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
        </TabsList>

        {/* Gift Cards Content - Conteúdo padrão do dashboard */}
        <TabsContent value="giftcards" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
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

          {/* Gift Cards Por Fornecedor */}
          <Card>
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
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

            {/* Atividades Recentes */}
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle className="text-lg">Atividades Recentes</CardTitle>
                <CardDescription>
                  Últimas 10 transações e atividades no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransacoes || isLoadingGiftCards ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground">Carregando atividades recentes...</p>
                  </div>
                ) : (recentTransacoes && recentTransacoes.length > 0) ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Gift Card</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Mostrar transações recentes */}
                        {recentTransacoes && recentTransacoes.map((transacao) => {
                          // Encontrar detalhes do giftCard
                          const giftCard = giftCards?.find(gc => gc.id === transacao.giftCardId);
                          const fornecedor = giftCard ? 
                            fornecedores?.find(f => f.id === giftCard.fornecedorId) : null;
                            
                          // Determinar tipo de transação para mostrar badge apropriado
                          let statusColor = "bg-gray-100 text-gray-800";
                          let statusText = "Transação";
                          
                          if (transacao.status === 'refund') {
                            statusColor = "bg-green-100 text-green-800";
                            statusText = "Reembolso";
                          } else if (transacao.status === 'concluida') {
                            statusColor = "bg-blue-100 text-blue-800";
                            statusText = "Utilização";
                          } else if (transacao.status === 'cancelada') {
                            statusColor = "bg-red-100 text-red-800";
                            statusText = "Cancelada";
                          }
                          
                          return (
                            <TableRow key={`transaction-${transacao.id}`}>
                              <TableCell className="whitespace-nowrap">{formatDate(transacao.dataTransacao)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{transacao.descricao}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {transacao.nomeUsuario || "Usuário Sistema"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className={`px-2 py-1 rounded-full text-xs inline-block ${statusColor}`}>
                                  {statusText}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {giftCard ? (
                                      <span className="text-blue-700">
                                        {giftCard.gcNumber || giftCard.codigo}
                                      </span>
                                    ) : (
                                      `#${transacao.giftCardId}`
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {fornecedor?.nome || ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${transacao.status === 'refund' ? 'text-green-600' : ''}`}>
                                {transacao.status === 'refund' ? '+ ' : ''}
                                R$ {transacao.valor.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* Mostrar gift cards cadastrados recentemente */}
                        {giftCards && giftCards.slice(0, 2).map((giftCard) => {
                          const fornecedor = fornecedores?.find(f => f.id === giftCard.fornecedorId);
                          // Verificar se o gift card não é antigo demais (só mostrar se for recente)
                          const createdDate = new Date(giftCard.createdAt);
                          const isRecent = (new Date().getTime() - createdDate.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 dias
                          
                          if (!isRecent) return null;
                          
                          return (
                            <TableRow key={`giftcard-${giftCard.id}`}>
                              <TableCell className="whitespace-nowrap">{formatDate(giftCard.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">Novo Gift Card</span>
                                  <span className="text-xs text-muted-foreground">
                                    {giftCard.comprador || "Sistema"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="px-2 py-1 rounded-full text-xs inline-block bg-purple-100 text-purple-800">
                                  Cadastro
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-blue-700">
                                    {giftCard.gcNumber || giftCard.codigo}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {fornecedor?.nome || 'Desconhecido'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R$ {giftCard.valorInicial.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">Nenhuma atividade recente</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/gift-cards/new")}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Adicionar Gift Card
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Administração Content - Gerenciamento de usuários e perfis */}
        <TabsContent value="administracao" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsuarios}</div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingUsers ? 'Carregando...' : 'Usuários da empresa'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Perfis</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPerfis}</div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingPerfis ? 'Carregando...' : 'Perfis disponíveis'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usuários da Empresa */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Usuários da Empresa</CardTitle>
                <CardDescription>Gerencie os usuários com acesso ao sistema</CardDescription>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/user-profiles")}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : usuariosMesmaEmpresa && usuariosMesmaEmpresa.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosMesmaEmpresa.slice(0, 5).map((user) => {
                      const perfilUsuario = perfis?.find(p => p.id === user.perfilId);
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{perfilUsuario?.nome || '...'}</TableCell>
                          <TableCell>
                            {user.status === 'ativo' ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary"
                onClick={() => navigate("/user-profiles")}
              >
                Ver todos os usuários
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Perfis do Sistema */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Perfis do Sistema</CardTitle>
                <CardDescription>Perfis e permissões disponíveis</CardDescription>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/user-profiles")}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPerfis ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">Carregando perfis...</p>
                </div>
              ) : perfis && perfis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Permissões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfis.map((perfil) => (
                      <TableRow key={perfil.id}>
                        <TableCell className="font-medium">{perfil.nome}</TableCell>
                        <TableCell>{perfil.descricao}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {perfil.permissoes.slice(0, 3).map((perm, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs py-0">
                                {perm}
                              </Badge>
                            ))}
                            {perfil.permissoes.length > 3 && (
                              <Badge variant="outline" className="text-xs py-0">
                                +{perfil.permissoes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">Nenhum perfil encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empresa Content - Informações da empresa */}
        <TabsContent value="empresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
              <CardDescription>Detalhes sobre sua conta corporativa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Nome da Empresa</h3>
                  <p className="text-base font-semibold">Empresa Demonstração Ltda.</p>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Plano</h3>
                  <div className="flex items-center">
                    <Badge variant="default" className="mr-2">Empresarial</Badge>
                    <p className="text-sm">Renovação: 12/12/2023</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Administrador</h3>
                  <div className="flex items-center">
                    <CircleUser className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="text-base font-semibold">admin@empresa.com</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Limites</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <p className="text-base font-semibold">{totalUsuarios} / 10</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gift Cards</p>
                      <p className="text-base font-semibold">{totalGiftCards} / Ilimitado</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full">
                <UserCog className="mr-2 h-4 w-4" />
                Atualizar Informações da Empresa
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
