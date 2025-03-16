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
  const isAdmin = users?.find(u => u.id === 1)?.perfilId === 1; // Assumindo 1 = admin
  
  // Usuários da mesma empresa (para administradores mostrarem)
  const empresaId = 1; // Placeholder, precisaria vir da autenticação real
  const usuariosMesmaEmpresa = users?.filter(u => u.empresaId === empresaId) || [];
  
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
