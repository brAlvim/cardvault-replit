import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Fornecedor } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export default function GiftCardNewPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Form state
  const [codigo, setCodigo] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataValidade, setDataValidade] = useState<Date | undefined>(undefined);
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch fornecedores for dropdown
  const { data: fornecedores, isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => fetch('/api/fornecedores').then(res => res.json()),
  });

  // Validate form
  const isFormValid = (): boolean => {
    if (!codigo.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Por favor, informe o código do gift card.",
        variant: "destructive",
      });
      return false;
    }

    const valor = parseFloat(valorInicial);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, informe um valor válido para o gift card.",
        variant: "destructive",
      });
      return false;
    }

    if (!fornecedorId) {
      toast({
        title: "Fornecedor obrigatório",
        description: "Por favor, selecione o fornecedor do gift card.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      // Get user ID (temporary solution - in a real app, this would come from auth context)
      const userId = 1;

      const response = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo,
          valorInicial: parseFloat(valorInicial),
          saldoAtual: parseFloat(valorInicial), // Initially, saldo is the same as valor inicial
          fornecedorId: parseInt(fornecedorId),
          userId,
          dataValidade: dataValidade || null,
          observacoes: observacoes.trim() || null,
          status: 'Ativo',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar gift card');
      }

      const giftCard = await response.json();

      toast({
        title: "Gift Card criado",
        description: "O gift card foi criado com sucesso.",
      });

      // Navigate to gift card details page
      navigate(`/gift-cards/${giftCard.id}`);
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o gift card.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
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
        <h1 className="text-2xl font-bold">Novo Gift Card</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Informações do Gift Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input 
                  id="codigo" 
                  placeholder="Código do gift card"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valor">Valor Inicial *</Label>
                <Input 
                  id="valor" 
                  placeholder="0.00"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  required
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingFornecedores ? (
                    <SelectItem value="loading" disabled>Carregando fornecedores...</SelectItem>
                  ) : fornecedores && fornecedores.length > 0 ? (
                    fornecedores.map(fornecedor => (
                      <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nenhum fornecedor disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validade">Data de Validade</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataValidade ? format(dataValidade, 'dd/MM/yyyy') : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataValidade}
                    onSelect={setDataValidade}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea 
                id="observacoes" 
                placeholder="Informações adicionais sobre o gift card"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => navigate('/dashboard')}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}