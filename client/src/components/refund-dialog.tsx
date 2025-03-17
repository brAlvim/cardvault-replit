import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import GiftCardSearch from './gift-card-search';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Esquema de validação para o formulário de reembolso
const refundFormSchema = z.object({
  valorRefund: z.coerce.number().positive('O valor deve ser maior que zero'),
  motivoRefund: z.string().min(3, 'Descreva o motivo do reembolso'),
  dataTransacao: z.string().optional(),
  giftCardId: z.number().min(1, 'Selecione um gift card'),
});

type RefundFormValues = z.infer<typeof refundFormSchema>;

interface GiftCard {
  id: number;
  codigo: string;
  saldoAtual: number;
  fornecedorId: number;
  fornecedorNome?: string;
}

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRefundComplete: (data: any) => void;
  user?: any; // Usuário atual do sistema
}

const RefundDialog = ({ isOpen, onClose, onRefundComplete, user }: RefundDialogProps) => {
  // Extrair dados do usuário
  const userId = user?.id || 1;
  const userName = user?.nome || user?.username || 'Usuário';
  const empresaId = user?.empresaId || 1;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);

  // Configuração do formulário
  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      valorRefund: 0,
      motivoRefund: '',
      dataTransacao: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      giftCardId: 0,
    }
  });

  // Atualiza o formulário quando um gift card é selecionado
  useEffect(() => {
    if (selectedGiftCard) {
      form.setValue('giftCardId', selectedGiftCard.id);
    } else {
      form.setValue('giftCardId', 0);
    }
  }, [selectedGiftCard, form]);

  // Mutation para criar a transação de reembolso
  const createRefundMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest('POST', '/api/transacoes', data)
        .then(res => {
          if (!res.ok) throw new Error('Falha ao criar reembolso');
          return res.json();
        });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
      
      toast({
        title: "Reembolso processado",
        description: "O reembolso foi processado com sucesso e o saldo do gift card foi atualizado.",
      });
      
      // Resetar formulário e fechar
      form.reset();
      setSelectedGiftCard(null);
      
      // Notificar componente pai
      onRefundComplete(data);
    },
    onError: (error) => {
      console.error("Erro ao processar reembolso:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o reembolso.",
        variant: "destructive",
      });
    }
  });

  // Manipulador para enviar o formulário
  const onSubmit = (data: RefundFormValues) => {
    if (!selectedGiftCard) {
      toast({
        title: "Erro",
        description: "Selecione um gift card para o reembolso.",
        variant: "destructive",
      });
      return;
    }

    const refundData = {
      valor: data.valorRefund,
      descricao: `REEMBOLSO: ${data.motivoRefund}`,
      status: 'refund',
      giftCardId: data.giftCardId,
      giftCardIds: `${data.giftCardId}`,
      cardValores: JSON.stringify({ [data.giftCardId]: data.valorRefund }),
      userId: userId,
      nomeUsuario: userName,
      dataTransacao: new Date().toISOString(),
      valorRefund: data.valorRefund,
      motivoRefund: data.motivoRefund,
    };

    console.log("Enviando reembolso:", refundData);
    createRefundMutation.mutate(refundData);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="text-xl font-bold">Processar Reembolso</span>
          </DialogTitle>
          <DialogDescription>
            Busque o gift card pelo código (completo ou últimos 4 dígitos) e preencha os detalhes do reembolso.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 mb-6">
          <GiftCardSearch 
            onGiftCardSelected={setSelectedGiftCard}
            empresaId={empresaId}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="valorRefund"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Reembolso *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="pl-8"
                        {...field}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-green-600 font-medium">R$</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Valor a ser reembolsado e adicionado ao saldo do gift card
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
                      placeholder="Descreva o motivo do reembolso" 
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Informe o motivo detalhado para este reembolso
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => onClose()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRefundMutation.isPending || !selectedGiftCard}
              >
                {createRefundMutation.isPending ? 'Processando...' : 'Processar Reembolso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;