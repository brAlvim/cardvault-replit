import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transacao, GiftCard, Fornecedor } from '@shared/schema';
import GiftCardSelector from '@/components/gift-card-selector';
import RefundDialog from '@/components/refund-dialog';

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
  CreditCard,
  Wallet,
  Info,
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

function formatMoney(value: number | null | undefined): string {
  // Se o valor for null, undefined ou NaN, retorna R$ 0,00
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(0);
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Schema de validação do formulário
// Interface para gift cards selecionáveis
interface SelectedGiftCard {
  id: number;
  codigo: string;
  saldoAtual: number;
  fornecedorNome?: string;
}

const transacaoFormSchema = z.object({
  valor: z.coerce.number().positive('O valor deve ser maior que zero'),
  descricao: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
  status: z.string().default('concluida'),
  giftCardId: z.coerce.number(),
  giftCardIds: z.string().default(""), // IDs de gift cards separados por vírgula
  cardValores: z.string().optional(), // Valores por gift card - formato "cardId:valor,cardId:valor"
  selectedGiftCards: z.array(z.any()).optional(), // Array de gift cards selecionados
  userId: z.coerce.number(), // ID do usuário logado - vem do token JWT
  dataTransacao: z.date().default(() => new Date()),
  comprovante: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  valorRefund: z.coerce.number().optional(), // Valor do reembolso quando status="refund"
  motivoRefund: z.string().optional(), // Motivo do reembolso
  refundDe: z.coerce.number().optional(), // ID da transação original que está sendo reembolsada
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
  giftCardIds?: string;
  selectedGiftCards?: SelectedGiftCard[];
  userId?: number;
  dataTransacao: Date | string; // Pode ser Date ou string ISO
  comprovante?: string;
  motivoCancelamento?: string;
  valorRefund?: number; // Valor do reembolso
  motivoRefund?: string; // Motivo do reembolso
  refundDe?: number; // ID da transação original
  ordemInterna?: string;
  ordemCompra?: string;
  nomeUsuario?: string;
};

// Estende o tipo inferido do schema para permitir que dataTransacao seja string ou Date
type TransacaoFormValues = Omit<z.infer<typeof transacaoFormSchema>, 'dataTransacao'> & {
  dataTransacao?: Date | string;
  cardValores?: string; // Adiciona o campo cardValores para indicar valores por cartão
};

export default function TransacoesPage() {
  const [isRouteMatch, params] = useRoute('/transacoes/:id');
  const giftCardId = isRouteMatch ? parseInt(params?.id || '0') : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isTransacaoDialogOpen, setIsTransacaoDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [selectedGiftCards, setSelectedGiftCards] = useState<SelectedGiftCard[]>([]);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [cardValores, setCardValores] = useState<{[cardId: number]: number}>({}); // Valores para cada cartão
  
  // Query para buscar todas as transações (para a página principal)
  const { data: allTransacoes, isLoading: isLoadingAllTransacoes } = useQuery<Transacao[]>({
    queryKey: ['/api/transacoes'],
    queryFn: () => fetch('/api/transacoes').then(res => res.json()),
    enabled: !isRouteMatch || giftCardId === 0,
  });
  
  // Query para buscar gift card
  const { data: giftCard, isLoading: isLoadingGiftCard } = useQuery<GiftCard>({
    queryKey: ['/api/gift-cards', giftCardId],
    queryFn: () => fetch(`/api/gift-cards/${giftCardId}`).then(res => res.json()),
    enabled: isRouteMatch && giftCardId > 0,
  });
  
  // Query para buscar fornecedor
  const { data: fornecedor, isLoading: isLoadingFornecedor } = useQuery<Fornecedor>({
    queryKey: ['/api/fornecedores', giftCard?.fornecedorId],
    queryFn: () => fetch(`/api/fornecedores/${giftCard?.fornecedorId}`).then(res => res.json()),
    enabled: !!giftCard?.fornecedorId,
  });
  
  // Query para buscar transações - usa diferentes endpoints dependendo se estamos em uma rota específica de gift card
  const { data: transacoes, isLoading: isLoadingTransacoes, refetch: refetchTransacoes } = useQuery<Transacao[]>({
    queryKey: isRouteMatch ? [`/api/transacoes/${giftCardId}`] : ['/api/transacoes'],
    queryFn: () => {
      // Obter o token de autenticação do localStorage
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Se estamos em uma rota específica de gift card, busca apenas as transações daquele card
      if (isRouteMatch && giftCardId > 0) {
        console.log("Buscando transações para o gift card:", giftCardId);
        return fetch(`/api/transacoes/${giftCardId}`, { headers }).then(res => res.json());
      } 
      // Caso contrário, busca todas as transações
      console.log("Buscando todas as transações");
      return fetch('/api/transacoes', { headers }).then(res => res.json());
    },
    enabled: true, // Sempre ativa a query, mesmo sem ID
    staleTime: 0, // Não mantenha cache dos dados
    refetchOnMount: true, // Sempre refaz a query quando o componente é montado
    refetchOnWindowFocus: true, // Refaz a query quando a janela recebe foco
  });
  
  // Query para buscar todos os gift cards disponíveis (para seleção múltipla)
  const { data: allGiftCards = [] } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards'],
    queryFn: () => fetch('/api/gift-cards', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json()),
  });
  
  // Query para buscar todos os fornecedores (para mostrar informações dos gift cards)
  const { data: allFornecedores = [] } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => fetch('/api/fornecedores').then(res => res.json()),
  });
  
  // Função auxiliar para obter o nome do fornecedor a partir do gift card ID
  const getFornecedorNome = (giftCardId: number): string => {
    // Garantir que allGiftCards é um array antes de chamar find
    if (!Array.isArray(allGiftCards)) {
      return "Desconhecido";
    }
    
    const giftCard = allGiftCards.find(gc => gc.id === giftCardId);
    if (!giftCard) return "Desconhecido";
    
    const fornecedor = allFornecedores.find(f => f.id === giftCard.fornecedorId);
    return fornecedor?.nome || "Desconhecido";
  };
  
  // Função para preparar uma transação para o formulário
  const prepareTransacaoForForm = (transacao: Transacao): any => {
    if (!transacao.giftCardIds) {
      // Se não tiver o campo giftCardIds (transações antigas),
      // adiciona o campo com o valor do giftCardId
      return {
        ...transacao,
        giftCardIds: String(transacao.giftCardId)
      };
    }
    return transacao;
  };

  // Formulário de transação  
  const form = useForm<TransacaoFormValues>({
    resolver: zodResolver(transacaoFormSchema),
    defaultValues: {
      giftCardId,
      giftCardIds: '',
      valor: 0,
      descricao: '',
      status: 'concluida',
      dataTransacao: new Date(),
    },
  });
  
  // Get current user - usando o usuário autenticado
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch('/api/auth/me', { headers });
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
  });

  // Reset form when opening the dialog
  // Este useEffect controla o fluxo do formulário de transação
  // Controlado por flag para executar apenas uma vez quando o diálogo é aberto
  const [dialogInitialized, setDialogInitialized] = useState(false);
  
  useEffect(() => {
    // Este efeito é apenas para inicializar o formulário quando o diálogo é aberto
    // Quando o diálogo é fechado, resetamos o estado
    if (!isTransacaoDialogOpen) {
      setDialogInitialized(false);
      return;
    }
    
    // Se já inicializamos este diálogo, não fazemos nada
    if (dialogInitialized) {
      return;
    }
    
    // Se não temos dados de gift cards ou fornecedores ainda, não tenta processar
    if (!allGiftCards?.length || !allFornecedores?.length) {
      return;
    }
    
    // Marca como inicializado para evitar múltiplas execuções
    setDialogInitialized(true);
    
    try {
      if (selectedTransacao) {
        // Transação existente - preenche o formulário com dados da transação selecionada
        const formData: TransacaoFormReset = {
          valor: selectedTransacao.valor,
          descricao: selectedTransacao.descricao,
          status: selectedTransacao.status || 'concluida',
          giftCardId: selectedTransacao.giftCardId,
          userId: selectedTransacao.userId,
          dataTransacao: new Date(selectedTransacao.dataTransacao || new Date()),
          comprovante: selectedTransacao.comprovante || undefined,
          motivoCancelamento: selectedTransacao.motivoCancelamento || undefined,
          valorRefund: selectedTransacao.valorRefund || undefined,
          motivoRefund: selectedTransacao.motivoRefund || undefined,
          refundDe: selectedTransacao.refundDe || undefined,
          ordemInterna: selectedTransacao.ordemInterna || undefined,
          ordemCompra: selectedTransacao.ordemCompra || undefined,
          nomeUsuario: selectedTransacao.nomeUsuario || user?.username || undefined,
          giftCardIds: selectedTransacao.giftCardIds || String(selectedTransacao.giftCardId),
        };
        form.reset(formData);
        
        // Carregar os gift cards incluídos na transação
        let newSelectedCards: SelectedGiftCard[] = [];
        
        if (selectedTransacao.giftCardIds) {
          // Para transações com múltiplos gift cards
          const ids = selectedTransacao.giftCardIds.split(',').map(id => parseInt(id));
          
          newSelectedCards = ids.map(id => {
            const card = allGiftCards.find(g => g.id === id);
            if (!card) return null;
            
            const fornecedor = allFornecedores.find(f => f.id === card.fornecedorId);
            const ultimosDigitos = card.codigo.slice(-4);
            return {
              id: card.id,
              codigo: `${card.codigo} (${ultimosDigitos})`,
              saldoAtual: card.saldoAtual,
              fornecedorNome: fornecedor?.nome || 'Desconhecido'
            }
          }).filter(Boolean) as SelectedGiftCard[];
        } else if (selectedTransacao.giftCardId) {
          // Compatibilidade com transações antigas de gift card único
          const card = allGiftCards.find(g => g.id === selectedTransacao.giftCardId);
          if (card) {
            const fornecedor = allFornecedores.find(f => f.id === card.fornecedorId);
            const ultimosDigitos = card.codigo.slice(-4);
            newSelectedCards = [{
              id: card.id,
              codigo: `${card.codigo} (${ultimosDigitos})`,
              saldoAtual: card.saldoAtual,
              fornecedorNome: fornecedor?.nome || 'Desconhecido'
            }];
          }
        }
        
        setSelectedGiftCards(newSelectedCards);
      } else {
        // Nova transação - reseta o formulário
        form.reset({
          giftCardId: giftCardId || undefined,
          valor: 0,
          descricao: '',
          status: 'concluida',
          dataTransacao: new Date(),
          nomeUsuario: user?.username || '',
          giftCardIds: '',
        });
        
        // Se tiver um gift card específico (via URL), adiciona ele à lista
        if (giftCardId > 0 && giftCard) {
          const card = allGiftCards.find(g => g.id === giftCardId);
          if (card) {
            const fornecedor = allFornecedores.find(f => f.id === card.fornecedorId);
            const ultimosDigitos = card.codigo.slice(-4);
            const selectedCard: SelectedGiftCard = {
              id: card.id,
              codigo: `${card.codigo} (${ultimosDigitos})`,
              saldoAtual: card.saldoAtual,
              fornecedorNome: fornecedor?.nome || 'Desconhecido'
            };
            setSelectedGiftCards([selectedCard]);
            
            // Atualiza o campo de gift cards IDs sem disparar efeitos colaterais
            form.setValue('giftCardIds', String(selectedCard.id));
          } else {
            setSelectedGiftCards([]);
          }
        } else {
          setSelectedGiftCards([]);
        }
      }
    } catch (error) {
      console.error("Erro ao inicializar formulário:", error);
    }
  }, [isTransacaoDialogOpen, dialogInitialized, selectedTransacao, allGiftCards, allFornecedores, giftCardId, giftCard, user, form]);
  
  // Mutation para criar transação
  const createTransacao = useMutation({
    mutationFn: (data: TransacaoFormValues) => {
      console.log("Dados enviados para criação:", data);
      
      // Certifique-se de que giftCardId está definido para transações criadas através da page geral
      if (!data.giftCardId && data.giftCardIds) {
        const ids = data.giftCardIds.split(',');
        if (ids.length > 0) {
          data.giftCardId = parseInt(ids[0]);
        }
      }
      
      // Garantir que a dataTransacao é uma string ISO válida
      // Isso deve ser redundante com o tratamento no onSubmit, mas mantemos por segurança
      let dataTransacaoFormatada = data.dataTransacao;
      if (dataTransacaoFormatada) {
        if (dataTransacaoFormatada instanceof Date) {
          dataTransacaoFormatada = dataTransacaoFormatada.toISOString();
        } else if (typeof dataTransacaoFormatada === 'string') {
          try {
            const date = new Date(dataTransacaoFormatada);
            if (!isNaN(date.getTime())) {
              dataTransacaoFormatada = date.toISOString();
            } else {
              dataTransacaoFormatada = new Date().toISOString();
            }
          } catch (e) {
            dataTransacaoFormatada = new Date().toISOString();
          }
        } else {
          dataTransacaoFormatada = new Date().toISOString();
        }
      } else {
        dataTransacaoFormatada = new Date().toISOString();
      }
      
      // Garantir campos obrigatórios
      const dadosParaEnviar = {
        ...data,
        status: data.status || "concluida",
        // Formato ISO string para garantir serialização adequada
        dataTransacao: dataTransacaoFormatada,
        // Valores nulos para campos opcionais
        comprovante: data.comprovante || null,
        motivoCancelamento: data.motivoCancelamento || null,
        valorRefund: data.valorRefund || null,
        motivoRefund: data.motivoRefund || null,
        ordemInterna: data.ordemInterna || null,
        ordemCompra: data.ordemCompra || null,
        nomeUsuario: data.nomeUsuario || "Usuário"
      };
      
      console.log("Dados finais para envio:", dadosParaEnviar);
      
      // Usar apiRequest para garantir que o token JWT seja enviado
      return apiRequest('POST', '/api/transacoes', dadosParaEnviar)
        .then(res => {
          console.log("Resposta da API:", res.status);
          if (!res.ok) {
            return res.json().then(errorData => {
              console.error("Erro na resposta:", errorData);
              throw new Error(errorData.message || 'Falha ao criar transação');
            });
          }
          return res.json();
        }).catch(err => {
          console.error("Erro na chamada da API:", err);
          throw err;
        });
    },
    onSuccess: (data) => {
      console.log("Transação criada com sucesso:", data);
      // Invalidar as consultas relevantes
      if (isRouteMatch && giftCardId > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/transacoes', giftCardId] });
        queryClient.invalidateQueries({ queryKey: ['/api/gift-cards', giftCardId] });
      } else {
        // Invalidar todas as transações
        queryClient.invalidateQueries({ queryKey: ['/api/transacoes'] });
        // E atualizar os gift cards para refletir os novos saldos
        queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
      }
      
      toast({
        title: "Transação criada",
        description: "A transação foi criada com sucesso.",
      });
      
      // Limpar o formulário
      form.reset();
      setSelectedGiftCards([]);
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
      return apiRequest('PUT', `/api/transacoes/${id}`, data)
        .then(res => {
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
      return apiRequest('DELETE', `/api/transacoes/${id}`)
        .then(res => {
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
    
    // Verifica se há gift cards selecionados
    if (selectedGiftCards.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um gift card para a transação.",
        variant: "destructive",
      });
      return;
    }
    
    // Adiciona os IDs dos gift cards selecionados
    const giftCardIds = selectedGiftCards.map(g => g.id).join(',');
    data.giftCardIds = giftCardIds;
    
    // Verifica se o valor total informado é igual à soma dos valores distribuídos nos gift cards
    const valorTotal = data.valor;
    const valorDistribuido = Object.values(cardValores).reduce((sum, val) => sum + val, 0);
    
    if (Math.abs(valorTotal - valorDistribuido) > 0.01) {
      toast({
        title: "Aviso",
        description: `O valor total (${formatMoney(valorTotal)}) é diferente da soma dos valores distribuídos (${formatMoney(valorDistribuido)})`,
        variant: "destructive", // Usamos destructive ao invés de warning, que não está disponível
      });
      
      // Pergunta se deseja continuar
      if (!confirm("Deseja continuar mesmo com a diferença nos valores?")) {
        return;
      }
    }
    
    // Adiciona os valores usados de cada gift card como JSON string
    // Isso é mais fácil de processar no servidor do que o formato "cardId:valor"
    data.cardValores = JSON.stringify(cardValores);
    
    // Adiciona o ID do usuário logado e o nome
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para realizar essa operação.",
        variant: "destructive",
      });
      return;
    }
    
    // Garante que estamos usando o ID do usuário autenticado
    data.userId = user.id;
    data.nomeUsuario = user.username || data.nomeUsuario || 'Usuário';
    
    // Garantir que o status está definido
    if (!data.status) {
      data.status = 'concluida';
    }
    
    // Garantir que o giftCardId está definido
    if (!data.giftCardId && selectedGiftCards.length > 0) {
      data.giftCardId = selectedGiftCards[0].id;
    }
    
    // **SOLUÇÃO CRÍTICA**: Convertemos dataTransacao para string ISO
    const dataToSend = { ...data };
    
    // Sempre garantir que dataTransacao seja uma string ISO
    if (dataToSend.dataTransacao) {
      if (dataToSend.dataTransacao instanceof Date) {
        dataToSend.dataTransacao = dataToSend.dataTransacao.toISOString();
      } else if (typeof dataToSend.dataTransacao === 'string') {
        // Se já for string, garantir que é um formato ISO válido
        try {
          const date = new Date(dataToSend.dataTransacao);
          dataToSend.dataTransacao = date.toISOString();
        } catch (e) {
          // Se der erro, usar data atual
          dataToSend.dataTransacao = new Date().toISOString();
        }
      } else {
        // Se não for nem string nem Date, usar data atual
        dataToSend.dataTransacao = new Date().toISOString();
      }
    } else {
      // Se não tiver data, usar data atual
      dataToSend.dataTransacao = new Date().toISOString();
    }
    
    // Log detalhado dos dados antes de enviar
    console.log("Dados finais para envio:", {
      valor: dataToSend.valor,
      descricao: dataToSend.descricao,
      status: dataToSend.status,
      giftCardId: dataToSend.giftCardId,
      giftCardIds: dataToSend.giftCardIds,
      userId: dataToSend.userId,
      dataTransacao: dataToSend.dataTransacao, // Agora sempre será string ISO
      selectedGiftCards
    });
    
    // Se estiver editando, atualiza a transação
    if (selectedTransacao) {
      toast({
        title: "Atualizando transação",
        description: "Enviando dados para o servidor...",
      });
      updateTransacao.mutate({
        id: selectedTransacao.id,
        data: dataToSend,
      });
    } else {
      // Senão, cria uma nova
      toast({
        title: "Criando transação",
        description: "Enviando dados para o servidor...",
      });
      createTransacao.mutate(dataToSend);
    }
  };
  
  // Manipulador para abrir diálogo de edição
  const handleEditTransacao = (transacao: Transacao) => {
    // Usa a função de preparação para garantir que transação tenha o campo giftCardIds
    const preparedTransacao = prepareTransacaoForForm(transacao);
    setSelectedTransacao(preparedTransacao);
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
  
  // Manipulador para processar um reembolso
  const handleRefundTransacao = (transacao: Transacao) => {
    // Abrir formulário para reembolso
    const preparedTransacao = prepareTransacaoForForm(transacao);
    
    // Identifica os gift cards da transação original
    const giftCardIds = preparedTransacao.giftCardIds.split(',').map((idStr: string) => parseInt(idStr));
    
    // Recupera os gift cards originais da lista completa
    const originalGiftCards = giftCardIds.map((id: number) => {
      const gc = allGiftCards.find(g => g.id === id);
      if (!gc) return null;
      
      const fornecedor = allFornecedores.find(f => f.id === gc.fornecedorId);
      return {
        id: gc.id,
        codigo: `${gc.codigo} (${gc.codigo.slice(-4)})`,
        saldoAtual: gc.saldoAtual,
        fornecedorNome: fornecedor?.nome || 'Desconhecido'
      };
    }).filter(Boolean) as SelectedGiftCard[];
    
    // Define os gift cards originais como selecionados para restaurar o saldo
    setSelectedGiftCards(originalGiftCards);
    
    // Define o valor do fornecedor da transação original
    if (originalGiftCards.length > 0 && originalGiftCards[0]) {
      const firstGC = allGiftCards.find(g => g.id === originalGiftCards[0].id);
      if (firstGC) {
        setSelectedFornecedorId(firstGC.fornecedorId);
      }
    }
    
    // Abre o formulário com os dados pré-preenchidos
    setSelectedTransacao({
      ...preparedTransacao,
      status: 'refund',
      refundDe: transacao.id,
      valorRefund: transacao.valor, // Valor original, mas pode ser alterado
      motivoRefund: '',
      giftCardIds: preparedTransacao.giftCardIds, // Mantém os mesmos gift cards
    });
    
    setIsTransacaoDialogOpen(true);
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
            <h1 className="text-2xl font-bold">
              {isRouteMatch ? "Transações do Gift Card" : "Todas as Transações"}
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => isRouteMatch ? refetchTransacoes() : null}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            
            <Button 
              size="sm"
              variant="outline"
              className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
              onClick={() => setIsRefundDialogOpen(true)}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Processar Reembolso
            </Button>
            
            <Dialog open={isTransacaoDialogOpen} onOpenChange={setIsTransacaoDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
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
                    {/* Teste direto - botão para criar uma transação fixa de teste */}
                    
                  
                    {/* Seção de ordens - Topo do formulário */}
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-4 mb-2">
                      <FormField
                        control={form.control}
                        name="ordemCompra"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Ordem de Compra Fornecedor</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ordem de Compra Fornecedor" 
                                {...field} 
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* O campo de responsável e ordem interna Amazon foram removidos da interface, 
                      mas continuarão sendo enviados através do onSubmit */}
                    </div>
                    
                    {/* Novo componente para seleção de gift cards */}
                    <div className="p-4 border rounded-lg bg-blue-50 mb-4">
                      <h3 className="text-sm font-semibold mb-3 text-blue-800">Selecione Gift Card para Transação</h3>
                      
                      {/* Componente de seleção de gift cards */}
                      <GiftCardSelector 
                        initialSelectedCard={giftCardId > 0 ? giftCardId : undefined}
                        onGiftCardSelected={(cards) => {
                          // Atualiza os campos do formulário
                          setSelectedGiftCards(cards);
                          
                          if (cards.length > 0) {
                            // Usa o primeiro card como giftCardId principal (compatibilidade)
                            const firstCard = cards[0];
                            form.setValue('giftCardId', firstCard.id);
                            
                            // Converte todos os IDs em uma string separada por vírgulas
                            const cardIds = cards.map(card => card.id).join(',');
                            form.setValue('giftCardIds', cardIds);
                            
                            // Configura o valor sugerido como o saldo total dos cards
                            const saldoTotal = cards.reduce((sum, card) => sum + card.saldoAtual, 0);
                            if (form.getValues('valor') === 0) {
                              form.setValue('valor', saldoTotal);
                            }
                            
                            // Inicializa os valores dos cartões - distribui o valor igualmente
                            const valorTotal = form.getValues('valor');
                            const valorPorCard = valorTotal / cards.length;
                            const novosValores = {...cardValores};
                            
                            cards.forEach(card => {
                              novosValores[card.id] = valorPorCard;
                            });
                            
                            setCardValores(novosValores);
                          } else {
                            form.setValue('giftCardId', 0);
                            form.setValue('giftCardIds', '');
                            setCardValores({});
                          }
                        }}
                      />
                      
                      {/* Exibição dos gift cards selecionados com campo para valor utilizado */}
                      {selectedGiftCards.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-medium text-blue-800">Gift Cards Selecionados</h4>
                          <p className="text-xs text-blue-700 mb-2">
                            Defina quanto será gasto de cada gift card:
                          </p>
                          
                          <div className="space-y-2">
                            {selectedGiftCards.map((card) => (
                              <div key={card.id} className="flex items-center gap-2 p-3 border rounded-md bg-white">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">{card.codigo}</p>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">{card.fornecedorNome}</span>
                                    <span className="text-xs font-medium text-green-600">
                                      Saldo: {formatMoney(card.saldoAtual)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="w-32">
                                  <Label htmlFor={`card-valor-${card.id}`} className="sr-only">
                                    Valor a utilizar
                                  </Label>
                                  <div className="relative">
                                    <Input
                                      id={`card-valor-${card.id}`}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={card.saldoAtual}
                                      className="pl-7"
                                      value={cardValores[card.id] || 0}
                                      onChange={(e) => {
                                        const valor = parseFloat(e.target.value) || 0;
                                        const maxValor = Math.min(valor, card.saldoAtual);
                                        
                                        if (valor > card.saldoAtual) {
                                          toast({
                                            title: "Valor excede o saldo",
                                            description: `O valor não pode exceder o saldo disponível de ${formatMoney(card.saldoAtual)}`,
                                            variant: "destructive"
                                          });
                                        }
                                        
                                        // Atualiza valores do cartão
                                        const novosValores = {...cardValores};
                                        novosValores[card.id] = maxValor;
                                        setCardValores(novosValores);
                                        
                                        // Atualiza o valor total do formulário
                                        const valorTotal = Object.values(novosValores).reduce((sum, val) => sum + val, 0);
                                        form.setValue('valor', valorTotal);
                                        
                                        // Atualiza o campo cardValores do formulário (string JSON)
                                        form.setValue('cardValores', JSON.stringify(novosValores));
                                      }}
                                    />
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                                      <span className="text-xs text-green-600">R$</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2 flex justify-between items-center text-sm font-medium">
                            <span>Valor Total:</span>
                            <span className="text-green-600">{formatMoney(Object.values(cardValores).reduce((sum, val) => sum + val, 0))}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Campos ocultos para manter compatibilidade */}
                      <FormField
                        control={form.control}
                        name="giftCardIds"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} type="hidden" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="giftCardId"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input 
                                {...field} 
                                type="hidden" 
                                value={field.value || 0}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cardValores"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input 
                                {...field} 
                                type="hidden"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Detalhes da transação */}
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
                              placeholder="Descreva os detalhes da transação" 
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
                                selected={field.value instanceof Date ? field.value : new Date(field.value || '')}
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
                    
                    {form.getValues('status') === 'refund' && (
                      <div className="space-y-4 p-4 border rounded-lg border-orange-200 bg-orange-50">
                        <h3 className="text-sm font-medium text-orange-800">Detalhes do Reembolso</h3>
                        
                        <div className="bg-white p-3 rounded-md border border-orange-200">
                          <h4 className="text-sm font-semibold text-orange-800 mb-2">Gift Cards Originais</h4>
                          <p className="text-xs text-orange-700 mb-2">
                            Os seguintes gift cards da transação original terão seus saldos restaurados:
                          </p>
                          
                          {selectedGiftCards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {selectedGiftCards.map((gCard) => (
                                <div key={gCard.id} className="flex items-center p-2 border rounded bg-orange-50">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{gCard.codigo}</p>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">{gCard.fornecedorNome}</span>
                                      <span className="font-medium text-green-600">Saldo: {formatMoney(gCard.saldoAtual)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-orange-800 text-center py-2">
                              Não foi possível identificar os gift cards da transação original.
                            </p>
                          )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="valorRefund"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor do Reembolso *</FormLabel>
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
                                    <span className="text-orange-600 font-medium">R$</span>
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Valor a ser reembolsado (obrigatório)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="motivoRefund"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Motivo do Reembolso *</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Motivo do reembolso" 
                                  {...field} 
                                  value={field.value || ''}
                                  rows={2}
                                />
                              </FormControl>
                              <FormDescription>
                                Informe o motivo do reembolso (obrigatório)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="refundDe"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transação Original</FormLabel>
                              <FormControl>
                                <Input 
                                  value={field.value || ''}
                                  disabled
                                  className="bg-orange-100 text-orange-800"
                                />
                              </FormControl>
                              <FormDescription>
                                ID da transação que está sendo reembolsada
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
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
        
        {/* Cartão com detalhes do gift card - só exibe quando estamos em uma rota específica */}
        {isRouteMatch && giftCardId > 0 && (
          isLoadingGiftCard ? (
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
          )
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
                    <TableHead>Fornecedor</TableHead>
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
                        {transacao.status === 'refund' && (
                          <>
                            {transacao.motivoRefund && (
                              <div className="text-xs text-orange-700 mt-1">
                                Motivo do reembolso: {transacao.motivoRefund}
                              </div>
                            )}
                            {transacao.valorRefund && (
                              <div className="text-xs font-medium text-orange-700 mt-1">
                                Valor reembolsado: {formatMoney(transacao.valorRefund)}
                              </div>
                            )}
                            {transacao.refundDe && (
                              <div className="text-xs text-orange-700 mt-1">
                                Transação original: #{transacao.refundDe}
                              </div>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {getFornecedorNome(transacao.giftCardId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gift Card ID: {transacao.giftCardId}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(transacao.ordemInterna || transacao.ordemCompra) ? (
                          <div>
                            {transacao.ordemInterna && (
                              <div className="text-xs">
                                <span className="font-medium">Ordem Interna Amazon:</span> {transacao.ordemInterna}
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
                            transacao.status === 'pendente' ? 'outline' : 
                            transacao.status === 'refund' ? 'outline' : 'secondary'
                          }
                          className={
                            transacao.status === 'concluida' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                            transacao.status === 'pendente' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 
                            transacao.status === 'refund' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100' : 
                            'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                        >
                          {transacao.status === 'concluida' ? 'Concluída' : 
                           transacao.status === 'pendente' ? 'Pendente' : 
                           transacao.status === 'refund' ? 'Reembolso' : 'Cancelada'}
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
                          
                          {transacao.status === 'concluida' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-600"
                              onClick={() => handleRefundTransacao(transacao)}
                              title="Processar reembolso"
                            >
                              <RefreshCcw className="h-4 w-4" />
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
                  Canceladas: {transacoes.filter(t => t.status === 'cancelada').length} |
                  Reembolsos: {transacoes.filter(t => t.status === 'refund').length}
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

      {/* Diálogo de Reembolso */}
      <RefundDialog 
        isOpen={isRefundDialogOpen}
        onClose={() => setIsRefundDialogOpen(false)}
        onRefundComplete={(data) => {
          // Atualizar as listas após o reembolso ser processado
          queryClient.invalidateQueries({ queryKey: ['/api/transacoes'] });
          queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
          toast({
            title: "Reembolso processado",
            description: `Reembolso de ${formatMoney(data.valor)} processado com sucesso.`,
          });
        }}
        user={user}
      />
    </div>
  );
}