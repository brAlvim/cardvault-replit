import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transacao, GiftCard, Fornecedor } from '@shared/schema';

import {
  ArrowLeft,
  Plus,
  RefreshCcw,
  Edit,
  Trash2,
  Receipt,
  Check,
  X,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Ban,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Formatação de data e moeda
function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Schema de validação do formulário
const transacaoFormSchema = z.object({
  valor: z.coerce.number().positive('O valor deve ser maior que zero'),
  descricao: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
  status: z.string().default('concluida'),
  giftCardId: z.coerce.number(),
  userId: z.coerce.number().default(1), // Temporário - seria o usuário logado
  dataTransacao: z.date().default(() => new Date()),
  comprovante: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  ordemInterna: z.string().optional(), // Número da ordem interna (Amazon)
  ordemCompra: z.string().optional(), // Número da ordem do fornecedor
  nomeUsuario: z.string().optional(), // Nome do usuário que realizou a transação
});

// Para lidar com a tipagem no form.reset
type TransacaoFormReset = {
  valor: number;
  descricao: string;
  status: string;
  giftCardId: number;
  userId?: number;
  dataTransacao: Date;
  comprovante?: string;
  motivoCancelamento?: string;
  ordemInterna?: string;
  ordemCompra?: string;
  nomeUsuario?: string;
};

type TransacaoFormValues = z.infer<typeof transacaoFormSchema>;

export default function TransacoesPage() {
  const [, params] = useRoute('/transacoes/:id');
  const giftCardId = parseInt(params?.id || '0');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isTransacaoDialogOpen, setIsTransacaoDialogOpen] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  
  // Query para buscar gift card
  const { data: giftCard, isLoading: isLoadingGiftCard } = useQuery<GiftCard>({
    queryKey: ['/api/gift-cards', giftCardId],
    queryFn: () => fetch(`/api/gift-cards/${giftCardId}`).then(res => res.json()),
    enabled: giftCardId > 0,
  });
  
  // Query para buscar fornecedor
  const { data: fornecedor, isLoading: isLoadingFornecedor } = useQuery<Fornecedor>({
    queryKey: ['/api/fornecedores', giftCard?.fornecedorId],
    queryFn: () => fetch(`/api/fornecedores/${giftCard?.fornecedorId}`).then(res => res.json()),
    enabled: !!giftCard?.fornecedorId,
  });
  
  // Query para buscar transações
  const { data: transacoes, isLoading: isLoadingTransacoes, refetch: refetchTransacoes } = useQuery<Transacao[]>({
    queryKey: ['/api/transacoes', giftCardId],
    queryFn: () => fetch(`/api/transacoes/${giftCardId}`).then(res => res.json()),
    enabled: giftCardId > 0,
  });
  
  // Formulário de transação
  const form = useForm<TransacaoFormValues>({
    resolver: zodResolver(transacaoFormSchema),
    defaultValues: {
      giftCardId,
      valor: 0,
      descricao: '',
      status: 'concluida',
      dataTransacao: new Date(),
    },
  });
  
  // Reset form when opening the dialog
  useEffect(() => {
    if (isTransacaoDialogOpen) {
      if (selectedTransacao) {
        // Convertendo transacao para o formato esperado pelo form
        const formData: TransacaoFormReset = {
          valor: selectedTransacao.valor,
          descricao: selectedTransacao.descricao,
          status: selectedTransacao.status,
          giftCardId: selectedTransacao.giftCardId,
          userId: selectedTransacao.userId,
          dataTransacao: new Date(selectedTransacao.dataTransacao),
          comprovante: selectedTransacao.comprovante || undefined,
          motivoCancelamento: selectedTransacao.motivoCancelamento || undefined,
          ordemInterna: selectedTransacao.ordemInterna || undefined,
          ordemCompra: selectedTransacao.ordemCompra || undefined,
          nomeUsuario: selectedTransacao.nomeUsuario || undefined,
        };
        form.reset(formData);
      } else {
        form.reset({
          giftCardId,
          valor: 0,
          descricao: '',
          status: 'concluida',
          dataTransacao: new Date(),
        });
      }
    }
  }, [isTransacaoDialogOpen, selectedTransacao, form, giftCardId]);
  
  // Mutation para criar transação
  const createTransacao = useMutation({
    mutationFn: (data: TransacaoFormValues) => {
      return fetch('/api/transacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Falha ao criar transação');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transacoes', giftCardId] });
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards', giftCardId] });
      toast({
        title: "Transação criada",
        description: "A transação foi criada com sucesso.",
      });
      setIsTransacaoDialogOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao criar transação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a transação.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atualizar transação
  const updateTransacao = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<TransacaoFormValues> }) => {
      return fetch(`/api/transacoes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error('Falha ao atualizar transação');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transacoes', giftCardId] });
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards', giftCardId] });
      toast({
        title: "Transação atualizada",
        description: "A transação foi atualizada com sucesso.",
      });
      setIsTransacaoDialogOpen(false);
      setSelectedTransacao(null);
    },
    onError: (error) => {
      console.error("Erro ao atualizar transação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar a transação.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para excluir transação
  const deleteTransacao = useMutation({
    mutationFn: (id: number) => {
      return fetch(`/api/transacoes/${id}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Falha ao excluir transação');
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transacoes', giftCardId] });
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards', giftCardId] });
      toast({
        title: "Transação excluída",
        description: "A transação foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir transação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a transação.",
        variant: "destructive",
      });
    }
  });
  
  // Handler para enviar o formulário
  const onSubmit = (data: TransacaoFormValues) => {
    console.log("Enviando formulário:", data);
    
    // Se estiver editando, atualiza a transação
    if (selectedTransacao) {
      updateTransacao.mutate({
        id: selectedTransacao.id,
        data,
      });
    } else {
      // Senão, cria uma nova
      createTransacao.mutate(data);
    }
  };
  
  // Manipulador para abrir diálogo de edição
  const handleEditTransacao = (transacao: Transacao) => {
    setSelectedTransacao(transacao);
    setIsTransacaoDialogOpen(true);
  };
  
  // Manipulador para cancelar uma transação
  const handleCancelTransacao = (transacao: Transacao) => {
    updateTransacao.mutate({
      id: transacao.id,
      data: {
        status: 'cancelada',
        motivoCancelamento: 'Cancelado pelo usuário',
      },
    });
  };
  
  // Manipulador para concluir uma transação
  const handleCompleteTransacao = (transacao: Transacao) => {
    updateTransacao.mutate({
      id: transacao.id,
      data: {
        status: 'concluida',
      },
    });
  };
  
  return (
    <div className="container mx-auto py-6">
      {/* Header com detalhes do Gift Card */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Transações do Gift Card</h1>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchTransacoes()}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            
            <Dialog open={isTransacaoDialogOpen} onOpenChange={setIsTransacaoDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTransacao ? 'Editar Transação' : 'Nova Transação'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedTransacao 
                      ? 'Edite os detalhes da transação selecionada.' 
                      : 'Crie uma nova transação para este gift card.'}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="0.00" 
                                {...field} 
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="pl-8"
                              />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <span className="text-green-600 font-medium">R$</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Valor da transação (obrigatório)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrição da transação" 
                              {...field} 
                              rows={2}
                            />
                          </FormControl>
                          <FormDescription>
                            Descreva o motivo ou detalhes desta transação
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dataTransacao"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data da Transação</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Data em que a transação foi realizada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="concluida">Concluída</SelectItem>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Status atual da transação
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.getValues('status') === 'cancelada' && (
                      <FormField
                        control={form.control}
                        name="motivoCancelamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivo do Cancelamento</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Motivo do cancelamento" 
                                {...field} 
                                value={field.value || ''}
                                rows={2}
                              />
                            </FormControl>
                            <FormDescription>
                              Informe o motivo do cancelamento
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ordemInterna"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordem Interna</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Número da ordem interna (Amazon)" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Número da ordem Amazon
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ordemCompra"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordem de Compra</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Número da ordem do fornecedor" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Número da ordem do fornecedor
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="nomeUsuario"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Usuário</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome de quem está realizando a transação" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Nome da pessoa responsável pela transação
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" type="button">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button 
                        type="submit" 
                        disabled={createTransacao.isPending || updateTransacao.isPending}
                      >
                        {createTransacao.isPending || updateTransacao.isPending 
                          ? 'Salvando...' 
                          : selectedTransacao ? 'Atualizar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Cartão com detalhes do gift card */}
        {isLoadingGiftCard ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-4">
                <p className="text-muted-foreground">Carregando detalhes do gift card...</p>
              </div>
            </CardContent>
          </Card>
        ) : giftCard ? (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Gift Card</h3>
                  <p className="text-lg font-semibold mt-1">{giftCard.codigo}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fornecedor?.nome}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Valores</h3>
                  <div className="flex gap-4 mt-1">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Inicial:</p>
                      <p className="text-base font-medium">{formatMoney(giftCard.valorInicial)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Atual:</p>
                      <p className={`text-base font-semibold ${giftCard.saldoAtual > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(giftCard.saldoAtual)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1 flex items-center">
                    <Badge 
                      variant={giftCard.status === 'Ativo' ? 'default' : 'secondary'}
                      className="uppercase"
                    >
                      {giftCard.status}
                    </Badge>
                    
                    {giftCard.dataValidade && (
                      <p className="text-xs text-muted-foreground ml-2">
                        Expira em: {formatDate(giftCard.dataValidade)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-4">
                <p className="text-muted-foreground">Gift card não encontrado</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tabela de transações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Histórico de Transações
            </CardTitle>
            <CardDescription>
              Todas as transações registradas para este gift card
            </CardDescription>
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
                    <TableHead>Ordem</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map((transacao) => (
                    <TableRow key={transacao.id}>
                      <TableCell>{formatDate(transacao.dataTransacao)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{transacao.descricao}</div>
                        {transacao.status === 'cancelada' && transacao.motivoCancelamento && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Motivo: {transacao.motivoCancelamento}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(transacao.ordemInterna || transacao.ordemCompra) ? (
                          <div>
                            {transacao.ordemInterna && (
                              <div className="text-xs">
                                <span className="font-medium">Amazon:</span> {transacao.ordemInterna}
                              </div>
                            )}
                            {transacao.ordemCompra && (
                              <div className="text-xs">
                                <span className="font-medium">Fornecedor:</span> {transacao.ordemCompra}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transacao.nomeUsuario ? (
                          <span className="text-sm">{transacao.nomeUsuario}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(transacao.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            transacao.status === 'concluida' ? 'default' : 
                            transacao.status === 'pendente' ? 'outline' : 'secondary'
                          }
                          className={
                            transacao.status === 'concluida' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                            transacao.status === 'pendente' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 
                            'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                        >
                          {transacao.status === 'concluida' ? 'Concluída' : 
                           transacao.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {/* Status change buttons */}
                          {transacao.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleCompleteTransacao(transacao)}
                              title="Concluir transação"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {transacao.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleCancelTransacao(transacao)}
                              title="Cancelar transação"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Edit button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditTransacao(transacao)}
                            title="Editar transação"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {/* Delete button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                title="Excluir transação"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isto irá excluir permanentemente
                                  esta transação {transacao.status === 'concluida' && "e ajustar o saldo do gift card"}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteTransacao.mutate(transacao.id)}
                                >
                                  {deleteTransacao.isPending ? 'Excluindo...' : 'Excluir'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">Nenhuma transação registrada</p>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Este gift card ainda não possui nenhuma transação. 
                  Clique no botão abaixo para registrar a primeira.
                </p>
                <Button onClick={() => setIsTransacaoDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Transação
                </Button>
              </div>
            )}
          </CardContent>
          
          {/* Summary footer */}
          {transacoes && transacoes.length > 0 && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div>
                <p className="text-sm font-medium">Total de Transações: {transacoes.length}</p>
                <p className="text-xs text-muted-foreground">
                  Concluídas: {transacoes.filter(t => t.status === 'concluida').length} | 
                  Pendentes: {transacoes.filter(t => t.status === 'pendente').length} | 
                  Canceladas: {transacoes.filter(t => t.status === 'cancelada').length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Valor Total Transacionado:</p>
                <p className="text-base font-bold text-green-600">
                  {formatMoney(
                    transacoes
                      .filter(t => t.status === 'concluida')
                      .reduce((sum, t) => sum + t.valor, 0)
                  )}
                </p>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}