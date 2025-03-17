import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { GiftCard, Fornecedor, Transacao } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CreditCard, Calendar, Receipt, Edit, Share2, ArrowLeft, Plus, Lock as LockIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function GiftCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [newTransactionValue, setNewTransactionValue] = useState('');
  const [newTransactionDescription, setNewTransactionDescription] = useState('');

  // Fetch gift card details
  const { data: giftCardData, isLoading: isLoadingGiftCard } = useQuery<GiftCard>({
    queryKey: [`/api/gift-cards/${id}`],
    queryFn: async () => {
      console.log("Buscando detalhes do gift card:", id);
      const res = await fetch(`/api/gift-cards/${id}`);
      if (!res.ok) {
        console.error(`Erro ao buscar gift card ${id}:`, res.status, res.statusText);
        throw new Error('Falha ao carregar gift card');
      }
      const data = await res.json();
      console.log(`Gift card ${id} carregado:`, data);
      return data;
    },
    staleTime: 0, // Não mantenha cache
    refetchOnMount: true, // Refaz a query quando o componente é montado
    refetchOnWindowFocus: true, // Refaz a query quando a janela recebe foco
  });

  // Add default values for missing fields and handle type safety
  const giftCard = useMemo(() => {
    if (!giftCardData) return null;
    
    // Use type assertion to access extended properties safely
    const typedData = giftCardData as GiftCard & {
      valorPago?: number | null;
      valorPendente?: number | null;
    };
    
    return {
      ...typedData,
      valorPago: typedData.valorPago ?? null,
      valorPendente: typedData.valorPendente ?? typedData.valorInicial,
    };
  }, [giftCardData]);

  // Fetch fornecedor details
  const fornecedorId = giftCard?.fornecedorId;
  const { data: fornecedor, isLoading: isLoadingFornecedor } = useQuery<Fornecedor>({
    queryKey: ['/api/fornecedores', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return null;
      try {
        const res = await fetch(`/api/fornecedores/${fornecedorId}`);
        if (!res.ok) throw new Error('Fornecedor not found');
        return await res.json();
      } catch (error) {
        console.error('Error fetching fornecedor:', error);
        return null;
      }
    },
    enabled: !!fornecedorId,
  });
  
  // Fetch supplier details
  const supplierId = giftCard?.supplierId;
  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ['/api/suppliers', supplierId],
    queryFn: async () => {
      if (!supplierId) return null;
      try {
        const res = await fetch(`/api/suppliers/${supplierId}`);
        if (!res.ok) throw new Error('Supplier not found');
        return await res.json();
      } catch (error) {
        console.error('Error fetching supplier:', error);
        return null;
      }
    },
    enabled: !!supplierId,
  });

  // Fetch transações
  const { data: transacoes, isLoading: isLoadingTransacoes } = useQuery<Transacao[]>({
    queryKey: [`/api/transacoes/${id}`],
    queryFn: async () => {
      console.log("Buscando transações para o gift card:", id);
      const res = await fetch(`/api/transacoes/${id}`);
      if (!res.ok) {
        console.error(`Erro ao buscar transações do gift card ${id}:`, res.status, res.statusText);
        return [];
      }
      const data = await res.json();
      console.log(`Transações do gift card ${id} carregadas:`, data.length);
      return data;
    },
    enabled: !!id,
    staleTime: 0, // Não mantenha cache
    refetchOnMount: true, // Refaz a query quando o componente é montado
    refetchOnWindowFocus: true, // Refaz a query quando a janela recebe foco
  });
  
  // Fetch user data para verificação de permissões
  interface UserAuthData {
    id: number;
    username: string;
    nome: string;
    email: string;
    empresaId: number;
    empresaNome: string;
    perfilId: number;
    perfilNome: string;
  }
  
  const { data: userData } = useQuery<UserAuthData>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Format date from ISO to local format
  const formatDate = (dateString: Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle new transaction creation
  const handleCreateTransaction = async () => {
    if (!giftCard) return;

    // Validate value
    const valorTransacao = parseFloat(newTransactionValue);
    if (isNaN(valorTransacao) || valorTransacao <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, informe um valor válido para a transação.",
        variant: "destructive",
      });
      return;
    }

    // Validate description
    if (!newTransactionDescription.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, informe uma descrição para a transação.",
        variant: "destructive",
      });
      return;
    }

    // Check if value is higher than available balance
    if (valorTransacao > giftCard.saldoAtual) {
      toast({
        title: "Saldo insuficiente",
        description: "O valor da transação não pode ser maior que o saldo disponível.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create proper payload for the transaction
      const transactionData = {
        giftCardId: giftCard.id,
        giftCardIds: giftCard.id.toString(), // Required field as per schema
        userId: giftCard.userId,
        valor: valorTransacao,
        descricao: newTransactionDescription,
        dataTransacao: new Date(),
        status: "concluida", // Must match the status types defined in the schema
        empresaId: giftCard.empresaId,
      };

      const response = await apiRequest('POST', '/api/transacoes', transactionData);

      if (!response.ok) {
        throw new Error('Erro ao registrar transação');
      }

      toast({
        title: "Transação registrada",
        description: "A transação foi registrada com sucesso.",
      });

      // Reset form and close dialog
      setNewTransactionValue('');
      setNewTransactionDescription('');
      setShowTransactionDialog(false);

      // Invalidate queries to reload data
      queryClient.invalidateQueries({ queryKey: [`/api/gift-cards/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transacoes/${id}`] });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao registrar a transação.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingGiftCard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando detalhes do gift card...</p>
      </div>
    );
  }

  if (!giftCard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold mb-2">Gift Card não encontrado</h2>
        <p className="text-muted-foreground mb-4">O gift card solicitado não foi encontrado.</p>
        <Button onClick={() => navigate('/dashboard')}>Voltar para o Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Detalhes do Gift Card</h1>
      </div>
      
      {/* Gift card details card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Informações do Gift Card</CardTitle>
            <Badge 
              variant={giftCard.saldoAtual > 0 ? "default" : "destructive"}
              className="ml-2"
            >
              {giftCard.saldoAtual > 0 ? "Ativo" : "Zerado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Código</span>
                  <span className="font-medium">{giftCard.codigo}</span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Fornecedor</span>
                  <span className="font-medium">
                    {isLoadingFornecedor || isLoadingSupplier 
                      ? "Carregando..." 
                      : supplier?.nome || fornecedor?.nome || "Não definido"}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Valor Inicial</span>
                  <span className="font-medium">R$ {(giftCard.valorInicial || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Valor Pago</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {giftCard.valorPago !== null && giftCard.valorPago !== undefined 
                        ? `R$ ${Number(giftCard.valorPago).toFixed(2)}` 
                        : 'N/A'}
                    </span>
                    {giftCard.valorPago !== null && 
                     giftCard.valorPago !== undefined && 
                     giftCard.valorInicial > 0 && 
                     giftCard.valorPago < giftCard.valorInicial && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {((1 - (giftCard.valorPago / giftCard.valorInicial)) * 100).toFixed(2)}% de desconto
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* GC Number e GC Pass - Visíveis apenas para admin e gerente */}
                {(giftCard.gcNumber || giftCard.gcPass || giftCard.comprador || giftCard.login) && (
                  <div className="flex flex-col space-y-2 mt-2 p-2 bg-primary-50 rounded-md border border-primary-100">
                    {/* Informações de compra */}
                    {giftCard.comprador && (
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Comprador</span>
                        <span className="font-medium">{giftCard.comprador}</span>
                      </div>
                    )}
                    
                    {giftCard.login && (
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Login de Compra</span>
                        <span className="font-medium">{giftCard.login}</span>
                      </div>
                    )}
                    
                    {/* Dados sensíveis - visíveis apenas para admin e gerente */}
                    {userData && userData.perfilNome && ['admin', 'gerente'].includes(userData.perfilNome) ? (
                      <>
                        {giftCard.gcNumber && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">GC Number</span>
                            <span className="font-medium">{giftCard.gcNumber}</span>
                          </div>
                        )}
                        
                        {giftCard.gcPass && (
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">GC Pass</span>
                            <span className="font-medium">{giftCard.gcPass}</span>
                          </div>
                        )}
                      </>
                    ) : (giftCard.gcNumber || giftCard.gcPass) && (
                      <div className="flex items-center text-amber-600 mt-1">
                        <LockIcon className="h-4 w-4 mr-1" />
                        <span className="text-xs">Dados de acesso disponíveis apenas para administradores e gerentes</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Saldo Atual</span>
                  <span className="font-medium text-lg text-primary">
                    R$ {(giftCard.saldoAtual || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Valor Economizado</span>
                  <span className="font-medium text-green-600">
                    {giftCard.valorPago !== null && 
                     giftCard.valorPago !== undefined && 
                     giftCard.valorInicial > giftCard.valorPago
                      ? `R$ ${(giftCard.valorInicial - giftCard.valorPago).toFixed(2)}`
                      : `R$ 0,00`
                    }
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Valor Pendente</span>
                  <span className="font-medium text-lg text-blue-600">
                    R$ {(giftCard.valorPendente !== null && giftCard.valorPendente !== undefined 
                      ? Number(giftCard.valorPendente)
                      : giftCard.valorInicial).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Calculado automaticamente com base nas transações
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Data de Cadastro</span>
                  <span className="font-medium">{formatDate(giftCard.createdAt)}</span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Validade</span>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="font-medium">{formatDate(giftCard.dataValidade)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {giftCard.observacoes && (
            <>
              <Separator className="my-4" />
              <div>
                <span className="text-sm text-muted-foreground">Observações</span>
                <p className="mt-1">{giftCard.observacoes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Transaction history card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Histórico de Transações</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/transacoes/${id}`)} variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-1" />
                Ver Detalhes
              </Button>
              <Button onClick={() => setShowTransactionDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova Transação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTransacoes ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando transações...</p>
            </div>
          ) : transacoes && transacoes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell>{formatDate(transacao.dataTransacao)}</TableCell>
                    <TableCell>{transacao.descricao}</TableCell>
                    <TableCell className="text-right">R$ {transacao.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={transacao.status === 'Concluída' ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {transacao.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma transação registrada para este gift card</p>
              <Button 
                onClick={() => setShowTransactionDialog(true)} 
                variant="outline" 
                className="mt-4"
              >
                Registrar primeira transação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Action buttons */}
      <div className="flex justify-end mt-6 space-x-2">
        <Button 
          variant="outline"
          onClick={() => navigate(`/gift-cards/edit/${id}`)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar Gift Card
        </Button>
        
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-1" />
          Compartilhar
        </Button>
      </div>
      
      {/* New Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>
              Registre uma nova transação para este gift card. O saldo será atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gift-card">Gift Card</Label>
              <Input 
                id="gift-card" 
                value={`${giftCard.codigo} - ${supplier?.nome || fornecedor?.nome || "..."}`} 
                disabled 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="saldo">Saldo Disponível</Label>
              <Input 
                id="saldo" 
                value={`R$ ${(giftCard.saldoAtual || 0).toFixed(2)}`} 
                disabled 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="value">Valor da Transação</Label>
              <Input 
                id="value" 
                placeholder="0.00" 
                value={newTransactionValue}
                onChange={(e) => setNewTransactionValue(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                placeholder="Descreva a transação" 
                value={newTransactionDescription}
                onChange={(e) => setNewTransactionDescription(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTransaction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}