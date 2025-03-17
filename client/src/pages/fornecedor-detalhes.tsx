import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fornecedor, GiftCard, Transacao, User } from '@shared/schema';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Store, 
  ArrowLeft, 
  Info, 
  AlertCircle, 
  Calendar, 
  ShoppingCart, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Receipt, 
  Clock,
  DollarSign 
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface FornecedorDetalhesPageProps {
  params: {
    id: string;
  };
}

export default function FornecedorDetalhesPage({ params }: FornecedorDetalhesPageProps) {
  const fornecedorId = parseInt(params.id);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ativos");

  // Buscar usuário atual
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Dados do fornecedor
  const {
    data: fornecedor,
    isLoading: isLoadingFornecedor,
    error: fornecedorError,
  } = useQuery<Fornecedor>({
    queryKey: [`/api/fornecedores/${fornecedorId}`],
    enabled: !!fornecedorId,
  });

  // Gift cards deste fornecedor
  const {
    data: giftCards = [],
    isLoading: isLoadingGiftCards,
    error: giftCardsError,
  } = useQuery<GiftCard[]>({
    queryKey: [`/api/gift-cards?userId=${user?.id || 1}&fornecedorId=${fornecedorId}`],
    enabled: !!fornecedorId && !!user,
  });

  // Ordenar todos os gift cards por data de cadastro (mais recente primeiro)
  const sortByCreateDate = (a: GiftCard, b: GiftCard) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };
  
  // Ordenar todos os gift cards por data de cadastro
  const allGiftCardsSorted = [...giftCards].sort(sortByCreateDate);
  
  // Mantendo os filtros existentes para compatibilidade com o código existente
  const giftCardsAtivos = giftCards.filter(card => card.status?.toLowerCase() === 'ativo');
  const giftCardsInativos = giftCards.filter(card => card.status?.toLowerCase() !== 'ativo');
  const giftCardsAtivosSorted = [...giftCardsAtivos].sort(sortByCreateDate);
  const giftCardsInativosSorted = [...giftCardsInativos].sort(sortByCreateDate);

  // Buscar todas as transações
  const {
    data: todasTransacoes = [],
    isLoading: isLoadingTransacoes,
  } = useQuery<Transacao[]>({
    queryKey: ["/api/transacoes"],
    enabled: !!user,
  });

  // Filtrar transações que usam gift cards deste fornecedor
  const [transacoesFornecedor, setTransacoesFornecedor] = useState<Transacao[]>([]);

  useEffect(() => {
    if (giftCards.length > 0 && todasTransacoes.length > 0) {
      const giftCardIds = giftCards.map(gc => gc.id);
      
      // Filtrar transações que contêm gift cards deste fornecedor
      const transacoesFiltradas = todasTransacoes.filter(transacao => {
        // Verificar o giftCardId principal
        if (giftCardIds.includes(transacao.giftCardId)) {
          return true;
        }
        
        // Verificar nos giftCardIds (separados por vírgula)
        if (transacao.giftCardIds) {
          const ids = transacao.giftCardIds.split(',').map(id => parseInt(id.trim()));
          return ids.some(id => giftCardIds.includes(id));
        }
        
        return false;
      });
      
      // Ordenar por data mais recente primeiro
      const transacoesOrdenadas = transacoesFiltradas.sort(
        (a, b) => new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime()
      );
      
      setTransacoesFornecedor(transacoesOrdenadas);
    }
  }, [giftCards, todasTransacoes]);

  // Calcular estatísticas
  const totalGiftCards = giftCards.length;
  const totalAtivos = giftCardsAtivos.length;
  const totalInativos = giftCardsInativos.length;
  const saldoTotal = giftCardsAtivos.reduce((sum, card) => sum + card.saldoAtual, 0);
  const valorTotal = giftCards.reduce((sum, card) => sum + card.valorInicial, 0);
  const percentAtivos = totalGiftCards > 0 ? Math.round((totalAtivos / totalGiftCards) * 100) : 0;

  if (isLoadingFornecedor) {
    return (
      <div className="container flex justify-center items-center h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (fornecedorError || !fornecedor) {
    return (
      <div className="container p-4 mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-destructive mb-2">Fornecedor não encontrado</h2>
          <p className="text-slate-500 mb-6">O fornecedor solicitado não existe ou você não tem permissão para acessá-lo.</p>
          <Button onClick={() => setLocation('/fornecedores')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Fornecedores
          </Button>
        </div>
      </div>
    );
  }

  // Função para formatar moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
  };

  // Função para exibir status do gift card
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>;
      case 'expirado':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Expirado</Badge>;
      case 'zerado':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Zerado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Função para exibir status da transação
  const getTransacaoStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluida':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluída</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pendente</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Reembolso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container p-4 mx-auto">
      {/* Cabeçalho com botão de voltar */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 p-0 hover:bg-transparent" 
          onClick={() => setLocation('/fornecedores')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 
          <span>Voltar para a lista de fornecedores</span>
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {/* Logo do fornecedor ou ícone padrão */}
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {fornecedor.logo ? (
                <img 
                  src={fornecedor.logo} 
                  alt={`${fornecedor.nome} logo`} 
                  className="h-full w-full object-contain"
                />
              ) : (
                <Store className="h-8 w-8 text-primary" />
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">{fornecedor.nome}</h1>
              <p className="text-muted-foreground">
                {fornecedor.status === 'ativo' 
                  ? <span className="text-green-600 flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Fornecedor ativo</span>
                  : <span className="text-red-600 flex items-center"><XCircle className="h-3 w-3 mr-1" /> Fornecedor inativo</span>
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button onClick={() => setLocation('/gift-cards/new')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Gift Card
            </Button>
            <Button variant="outline" onClick={() => setLocation('/transacoes')}>
              <Receipt className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </div>
        </div>
      </div>

      {/* Descrição e informações adicionais */}
      {fornecedor.descricao && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">{fornecedor.descricao}</p>
            </div>
            
            {fornecedor.website && (
              <div className="mt-3 flex items-center gap-2">
                <a 
                  href={fornecedor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Visitar site do fornecedor
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gift Cards</p>
                <p className="text-2xl font-bold">{totalGiftCards}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {percentAtivos}% ativos
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-2xl font-bold">{formatCurrency(saldoTotal)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Em {totalAtivos} gift cards ativos
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold">{formatCurrency(valorTotal)}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Valor inicial de todos os gift cards
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Últimas Transações</p>
                <p className="text-2xl font-bold">{transacoesFornecedor.length}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {transacoesFornecedor.length > 0 
                ? `Última ${formatDate(transacoesFornecedor[0].dataTransacao)}` 
                : 'Nenhuma transação ainda'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs para GiftCards e Transações */}
      <Tabs defaultValue="ativos" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="flex border-b w-full justify-start rounded-none border-0 bg-transparent p-0 mb-4">
          <TabsTrigger
            value="ativos"
            className={`border-b-2 ${
              activeTab === "ativos"
                ? "border-primary font-medium"
                : "border-transparent"
            } px-4 py-2 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
          >
            Gift Cards Ativos ({totalAtivos})
          </TabsTrigger>
          <TabsTrigger
            value="inativos"
            className={`border-b-2 ${
              activeTab === "inativos"
                ? "border-primary font-medium"
                : "border-transparent"
            } px-4 py-2 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
          >
            Gift Cards Inativos ({totalInativos})
          </TabsTrigger>
          <TabsTrigger
            value="transacoes"
            className={`border-b-2 ${
              activeTab === "transacoes"
                ? "border-primary font-medium"
                : "border-transparent"
            } px-4 py-2 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
          >
            Transações ({transacoesFornecedor.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Conteúdo: Todos os Gift Cards */}
        <TabsContent value="ativos" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Todos os Gift Cards</CardTitle>
              <CardDescription>
                Gift cards ordenados por data de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGiftCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : giftCardsError ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Erro ao carregar gift cards</p>
                </div>
              ) : allGiftCardsSorted.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">Nenhum gift card cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione gift cards para este fornecedor
                  </p>
                  <Button onClick={() => setLocation('/gift-cards/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Gift Card
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Valor Inicial</TableHead>
                        <TableHead>Saldo Atual</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Cadastrado</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allGiftCardsSorted.map((giftCard) => (
                        <TableRow 
                          key={giftCard.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/gift-cards/${giftCard.id}`)}
                        >
                          <TableCell className="font-medium">{giftCard.codigo}</TableCell>
                          <TableCell>{formatCurrency(giftCard.valorInicial)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(giftCard.saldoAtual)}</TableCell>
                          <TableCell>
                            {giftCard.percentualDesconto 
                              ? <span className="font-medium">{giftCard.percentualDesconto}%</span>
                              : '-'}
                          </TableCell>
                          <TableCell>{formatDate(giftCard.createdAt)}</TableCell>
                          <TableCell>
                            {giftCard.dataValidade 
                              ? formatDate(giftCard.dataValidade)
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(giftCard.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conteúdo: Todos os Gift Cards (aba "inativos" mostra o mesmo conteúdo) */}
        <TabsContent value="inativos" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Todos os Gift Cards</CardTitle>
              <CardDescription>
                Gift cards ordenados por data de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGiftCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : giftCardsError ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Erro ao carregar gift cards</p>
                </div>
              ) : allGiftCardsSorted.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">Nenhum gift card cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione gift cards para este fornecedor
                  </p>
                  <Button onClick={() => setLocation('/gift-cards/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Gift Card
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Valor Inicial</TableHead>
                        <TableHead>Saldo Atual</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Cadastrado</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allGiftCardsSorted.map((giftCard) => (
                        <TableRow 
                          key={giftCard.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/gift-cards/${giftCard.id}`)}
                        >
                          <TableCell className="font-medium">{giftCard.codigo}</TableCell>
                          <TableCell>{formatCurrency(giftCard.valorInicial)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(giftCard.saldoAtual)}</TableCell>
                          <TableCell>
                            {giftCard.percentualDesconto 
                              ? <span className="font-medium">{giftCard.percentualDesconto}%</span>
                              : '-'}
                          </TableCell>
                          <TableCell>{formatDate(giftCard.createdAt)}</TableCell>
                          <TableCell>
                            {giftCard.dataValidade 
                              ? formatDate(giftCard.dataValidade)
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(giftCard.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conteúdo: Transações */}
        <TabsContent value="transacoes" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Transações</CardTitle>
              <CardDescription>
                Histórico de transações com gift cards deste fornecedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransacoes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : transacoesFornecedor.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10">
                  <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-lg font-medium">Nenhuma transação registrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Registre o uso dos gift cards para controlar o saldo
                  </p>
                  <Button onClick={() => setLocation('/transacoes')}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Transação
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Gift Card</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transacoesFornecedor.map((transacao) => (
                        <TableRow 
                          key={transacao.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/transacoes/${transacao.id}`)}
                        >
                          <TableCell>{new Date(transacao.dataTransacao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transacao.descricao}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(transacao.valor)}
                          </TableCell>
                          <TableCell>
                            {giftCards.find(gc => gc.id === transacao.giftCardId)?.codigo || 'Múltiplos'}
                          </TableCell>
                          <TableCell>
                            {transacao.ordemCompra || transacao.ordemInterna || '-'}
                          </TableCell>
                          <TableCell>
                            {getTransacaoStatusBadge(transacao.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}