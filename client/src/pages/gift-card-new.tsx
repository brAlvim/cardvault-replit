import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Fornecedor, User } from '@shared/schema';
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
  
  // Form state - Campos básicos
  const [codigo, setCodigo] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataValidade, setDataValidade] = useState<Date | undefined>(undefined);
  const [observacoes, setObservacoes] = useState('');
  
  // Form state - Novos campos detalhados
  const [login, setLogin] = useState('');
  const [dataCompra, setDataCompra] = useState<Date>(new Date()); // Data atual como padrão
  const [ordemCompra, setOrdemCompra] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [valorPendente, setValorPendente] = useState('');
  const [gcNumber, setGcNumber] = useState('');
  const [gcPass, setGcPass] = useState('');
  const [ordemUsado, setOrdemUsado] = useState('');
  
  // Manipuladores personalizados para atualização de valores
  const handleValorInicialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValorInicial(newValue);
  };
  
  const handleValorPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValorPago(newValue);
  };
  
  // Dados do usuário logado
  const { data: userData, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['/api/users/1'], // Na aplicação final, seria o ID do usuário logado
    queryFn: () => fetch('/api/users/1').then(res => res.json()),
  });
  
  // State para calculos automáticos
  const [percentualDesconto, setPercentualDesconto] = useState('0');
  const [valorEconomizado, setValorEconomizado] = useState('R$ 0.00');
  
  // Efeito para recalcular quando os valores mudarem
  useEffect(() => {
    console.log('Recalculando com:', valorInicial, valorPago);
    if (valorInicial && valorPago) {
      const total = parseFloat(valorInicial);
      const pago = parseFloat(valorPago);
      
      if (total > 0 && pago >= 0 && pago < total) {
        // Calcula o percentual de desconto
        const descontoCalculado = ((total - pago) / total) * 100;
        setPercentualDesconto(descontoCalculado.toFixed(2));
        
        // Calcula o valor economizado
        const economizado = total - pago;
        setValorEconomizado(`R$ ${economizado.toFixed(2)}`);
        console.log('Valores calculados:', descontoCalculado.toFixed(2), economizado.toFixed(2));
      } else {
        setPercentualDesconto('0');
        setValorEconomizado('R$ 0.00');
      }
    } else {
      setPercentualDesconto('0');
      setValorEconomizado('R$ 0.00');
    }
  }, [valorInicial, valorPago]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch fornecedores for dropdown - filtrando apenas os ativos
  const { data: todosFornecedores, isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => fetch('/api/fornecedores').then(res => res.json()),
  });
  
  // Filtra apenas fornecedores ativos
  const fornecedores = useMemo(() => {
    if (!todosFornecedores) return [];
    
    console.log('Status dos fornecedores:', todosFornecedores.map(f => f.status));
    return todosFornecedores.filter((f: Fornecedor) => f.status === "Ativo" || f.status === "ativo");
  }, [todosFornecedores]);

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
          
          // Novos campos
          comprador: userData?.username || null, // Nome do usuário logado
          login: login.trim() || null,
          dataCompra: dataCompra || null,
          ordemCompra: ordemCompra.trim() || null,
          percentualDesconto: parseFloat(percentualDesconto),
          valorPago: valorPago ? parseFloat(valorPago) : null,
          valorPendente: valorPendente ? parseFloat(valorPendente) : null,
          gcNumber: gcNumber.trim() || null,
          gcPass: gcPass.trim() || null,
          ordemUsado: ordemUsado.trim() || null,
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
                  onChange={handleValorInicialChange}
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
                    // Lista apenas fornecedores ativos (já filtrados no useMemo)
                    fornecedores.map((fornecedor: Fornecedor) => (
                      <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_fornecedores" disabled>Nenhum fornecedor ativo disponível</SelectItem>
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
            
            {/* Seção de dados detalhados do gift card */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-4">Informações Detalhadas da Compra</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="comprador">Comprador</Label>
                  <Input 
                    id="comprador" 
                    value={userData?.username || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Preenchido automaticamente com o usuário logado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input 
                    id="login" 
                    placeholder="Login utilizado"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="dataCompra">Data da Compra</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataCompra ? format(dataCompra, 'dd/MM/yyyy') : 'Selecione uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataCompra}
                        onSelect={(date) => date && setDataCompra(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Data atual por padrão
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="ordemCompra">Ordem de Compra</Label>
                  <Input 
                    id="ordemCompra" 
                    placeholder="Nº da ordem"
                    value={ordemCompra}
                    onChange={(e) => setOrdemCompra(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="percentualDesconto">% Desconto</Label>
                  <div className="relative">
                    <Input 
                      id="percentualDesconto" 
                      value={percentualDesconto}
                      readOnly
                      className={`text-base font-medium ${parseFloat(percentualDesconto) > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted'}`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className={`text-sm ${parseFloat(percentualDesconto) > 0 ? 'text-green-500' : 'text-gray-500'}`}>%</span>
                    </div>
                  </div>
                  {parseFloat(percentualDesconto) > 0 ? (
                    <p className="text-xs text-green-600">
                      Calculado: {parseFloat(valorInicial || '0').toFixed(2)} - {parseFloat(valorPago || '0').toFixed(2)} = {parseFloat(percentualDesconto)}% de desconto
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Atualiza automaticamente com base no valor inicial e valor pago
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ordemUsado">Ordem Usado</Label>
                  <Input 
                    id="ordemUsado" 
                    placeholder="Ordem de uso"
                    value={ordemUsado}
                    onChange={(e) => setOrdemUsado(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="valorPago">Valor Pago</Label>
                  <Input 
                    id="valorPago" 
                    placeholder="0.00"
                    value={valorPago}
                    onChange={handleValorPagoChange}
                    type="number"
                    step="0.01"
                    min="0"
                    className={parseFloat(valorPago) > 0 ? 'border-blue-200' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valorPendente">Valor Pendente</Label>
                  <Input 
                    id="valorPendente" 
                    placeholder="0.00"
                    value={valorPendente}
                    onChange={(e) => setValorPendente(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valorEconomizado" className="text-green-600 font-medium">Valor Economizado</Label>
                  <Input 
                    id="valorEconomizado" 
                    value={valorEconomizado}
                    readOnly
                    className="bg-green-50 text-green-700 border-green-200"
                  />
                  <p className="text-xs text-green-600">
                    Economia total na compra deste gift card
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gcNumber">GC Number</Label>
                  <Input 
                    id="gcNumber" 
                    placeholder="Número do gift card"
                    value={gcNumber}
                    onChange={(e) => setGcNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gcPass">GC Pass</Label>
                  <Input 
                    id="gcPass" 
                    placeholder="Senha do gift card"
                    value={gcPass}
                    onChange={(e) => setGcPass(e.target.value)}
                    type="password"
                  />
                </div>
              </div>
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