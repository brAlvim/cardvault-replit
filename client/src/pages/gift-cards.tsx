import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { GiftCard, Fornecedor } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Search, Calendar, ChevronRight } from 'lucide-react';

export default function GiftCardsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);

  // Fetch gift cards
  const { data: giftCards, isLoading: isLoadingGiftCards } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards', { searchTerm, fornecedorId: selectedFornecedor }],
    queryFn: () => {
      let url = '/api/gift-cards';
      const params = [];
      
      if (searchTerm) {
        params.push(`search=${encodeURIComponent(searchTerm)}`);
      }
      
      if (selectedFornecedor) {
        params.push(`fornecedorId=${selectedFornecedor}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      return fetch(url).then(res => res.json());
    },
  });

  // Fetch fornecedores for filter
  const { data: fornecedores, isLoading: isLoadingFornecedores } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: () => fetch('/api/fornecedores').then(res => res.json()),
  });

  // Format date from ISO to local format
  const formatDate = (dateString: Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate days remaining for each gift card
  const calculateDaysRemaining = (dataValidade: Date | null): number | null => {
    if (!dataValidade) return null;
    
    const today = new Date();
    const validadeDate = new Date(dataValidade);
    const diffTime = validadeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already handled by the useQuery hook
  };

  return (
    <div className="container mx-auto py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Gift Cards</h1>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/gift-cards/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Gift Card
          </Button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex w-full gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código ou observações..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit">Buscar</Button>
              </form>
            </div>
            
            <div className="w-full md:w-[250px]">
              <Select 
                value={selectedFornecedor || ''} 
                onValueChange={(value) => setSelectedFornecedor(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os fornecedores</SelectItem>
                  {isLoadingFornecedores ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : fornecedores && fornecedores.length > 0 ? (
                    fornecedores.map(fornecedor => (
                      <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Gift Cards Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Lista de Gift Cards
            {!isLoadingGiftCards && giftCards && (
              <Badge variant="outline" className="ml-2">
                {giftCards.length} gift cards
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingGiftCards ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando gift cards...</p>
            </div>
          ) : giftCards && giftCards.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor Inicial</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftCards.map((giftCard) => {
                    const fornecedor = fornecedores?.find(f => f.id === giftCard.fornecedorId);
                    const daysRemaining = calculateDaysRemaining(giftCard.dataValidade);
                    const isExpired = daysRemaining !== null && daysRemaining <= 0;
                    const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
                    
                    return (
                      <TableRow 
                        key={giftCard.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/gift-cards/${giftCard.id}`)}
                      >
                        <TableCell className="font-medium">{giftCard.codigo}</TableCell>
                        <TableCell>{fornecedor?.nome || '...'}</TableCell>
                        <TableCell className="text-right">R$ {giftCard.valorInicial.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {giftCard.saldoAtual.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className={isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-500" : ""}>
                              {formatDate(giftCard.dataValidade)}
                              {daysRemaining !== null && daysRemaining <= 30 && (
                                <span className="ml-1 text-xs">
                                  {isExpired ? '(Expirado)' : `(${daysRemaining} dias)`}
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={giftCard.saldoAtual > 0 ? "default" : "secondary"}
                          >
                            {giftCard.saldoAtual > 0 ? "Ativo" : "Zerado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/gift-cards/${giftCard.id}`);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
              {searchTerm || selectedFornecedor ? (
                <>
                  <p className="text-muted-foreground mb-2">Nenhum gift card encontrado com os filtros atuais</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFornecedor(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">Nenhum gift card cadastrado</p>
                  <Button 
                    onClick={() => navigate('/gift-cards/new')}
                  >
                    Cadastrar primeiro gift card
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}