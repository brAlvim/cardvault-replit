import { useState, useEffect } from 'react';
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

export default function GiftCardNewPageFixed() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Form state - Campos básicos
  const [codigo, setCodigo] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [supplierId, setSupplierId] = useState('');
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
    
    // Garante que tanto valorInicial quanto valorPago são atualizados imediatamente
    if (newValue && valorPago) {
      const total = parseFloat(newValue);
      const pago = parseFloat(valorPago);
      
      if (total > 0 && pago >= 0 && pago < total) {
        // Calcula o percentual de desconto
        const descontoCalculado = ((total - pago) / total) * 100;
        setPercentualDesconto(descontoCalculado.toFixed(2));
        
        // Calcula o valor economizado
        const economizado = total - pago;
        setValorEconomizado(`R$ ${economizado.toFixed(2)}`);
      }
    }
  };
  
  const handleValorPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValorPago(newValue);
    
    // Garante que tanto valorInicial quanto valorPago são atualizados imediatamente
    if (valorInicial && newValue) {
      const total = parseFloat(valorInicial);
      const pago = parseFloat(newValue);
      
      if (total > 0 && pago >= 0 && pago < total) {
        // Calcula o percentual de desconto
        const descontoCalculado = ((total - pago) / total) * 100;
        setPercentualDesconto(descontoCalculado.toFixed(2));
        
        // Calcula o valor economizado
        const economizado = total - pago;
        setValorEconomizado(`R$ ${economizado.toFixed(2)}`);
      }
    }
  };
  
  // Dados do usuário logado
  const userId = 1; // Temporário - será obtido do contexto de autenticação
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
  });
  
  // Valores derivados
  const [percentualDesconto, setPercentualDesconto] = useState('0');
  const [valorEconomizado, setValorEconomizado] = useState('R$ 0.00');
  
  // Efeito para recalcular quando os valores mudarem
  useEffect(() => {
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
      } else {
        setPercentualDesconto('0');
        setValorEconomizado('R$ 0.00');
      }
    } else {
      setPercentualDesconto('0');
      setValorEconomizado('R$ 0.00');
    }
  }, [valorInicial, valorPago]);
  
  // Estado de submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Busca fornecedores
  const { data: fornecedores = [], isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => fetch('/api/fornecedores').then(res => res.json()),
  });
  
  // Busca fornecedores de gift cards (suppliers)
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: () => fetch('/api/suppliers').then(res => res.json()),
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
    
    if (!supplierId) {
      toast({
        title: "Fornecedor do Gift Card obrigatório",
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
    
    if (!isFormValid()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
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
          supplierId: parseInt(supplierId),
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
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          className="mr-4"
          onClick={() => navigate('/gift-cards')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Novo Gift Card</h1>
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
            {/* Primeiras informações: SKU e Fornecedor do Gift Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código/SKU do gift card</Label>
                <Input 
                  id="codigo" 
                  placeholder="Ex: AMZN-12345"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="border-2 border-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor do Gift Card *</Label>
                <Select value={supplierId} onValueChange={setSupplierId} required>
                  <SelectTrigger className="border-2 border-primary/20">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSuppliers ? (
                      <SelectItem value="loading" disabled>Carregando fornecedores...</SelectItem>
                    ) : suppliers && suppliers.length > 0 ? (
                      suppliers
                        .filter((supplier: any) => supplier.status === "ativo")
                        .map((supplier: any) => (
                          <SelectItem key={supplier.id} value={String(supplier.id)}>
                            {supplier.nome}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no_suppliers" disabled>Nenhum fornecedor de gift card disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Data da compra e Fornecedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                <p className="text-xs text-muted-foreground">Data atual por padrão</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId} required>
                  <SelectTrigger className="border-2 border-primary/20">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFornecedores ? (
                      <SelectItem value="loading" disabled>Carregando fornecedores...</SelectItem>
                    ) : fornecedores && fornecedores.length > 0 ? (
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
            </div>
            
            {/* Informações financeiras - Valor inicial e valor pago */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <span className="inline-block mr-2">💰</span> Informações de Valor e Desconto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="valorInicial">Valor do Gift Card *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input 
                      id="valorInicial" 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={valorInicial}
                      onChange={handleValorInicialChange}
                      className="pl-10 border-2 border-primary/20"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Valor nominal do gift card</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valorPago">Valor Pago *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input 
                      id="valorPago" 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={valorPago}
                      onChange={handleValorPagoChange}
                      className="pl-10 border-2 border-primary/20"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Valor efetivamente pago pelo gift card</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="percentualDesconto">Percentual de Desconto</Label>
                  <div className="relative">
                    <Input 
                      id="percentualDesconto" 
                      type="text"
                      value={percentualDesconto}
                      readOnly
                      className="pr-10 bg-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Calculado automaticamente com base no valor inicial e valor pago</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="economia">Economia Total</Label>
                  <Input 
                    id="economia" 
                    type="text"
                    value={valorEconomizado}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Valor total economizado na compra deste gift card</p>
                </div>
              </div>
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
                  <p className="text-xs text-muted-foreground">Usuário logado que está criando o gift card</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login">Login (email) da Compra</Label>
                  <Input 
                    id="login" 
                    placeholder="Ex: email@dominio.com"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Login (email) utilizado para comprar este gift card</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="ordemCompra">Ordem de Compra</Label>
                  <Input 
                    id="ordemCompra" 
                    placeholder="Ex: OC-12345"
                    value={ordemCompra}
                    onChange={(e) => setOrdemCompra(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ordemUsado">Ordem Interna</Label>
                  <Input 
                    id="ordemUsado" 
                    placeholder="Ex: OI-12345"
                    value={ordemUsado}
                    onChange={(e) => setOrdemUsado(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="gcNumber">Número do Gift Card</Label>
                  <Input 
                    id="gcNumber" 
                    placeholder="Ex: GC-123456789"
                    value={gcNumber}
                    onChange={(e) => setGcNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gcPass">Senha do Gift Card</Label>
                  <Input 
                    id="gcPass" 
                    type="password"
                    placeholder="Senha do gift card"
                    value={gcPass}
                    onChange={(e) => setGcPass(e.target.value)}
                  />
                </div>
              </div>
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
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/gift-cards')}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Gift Card'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}