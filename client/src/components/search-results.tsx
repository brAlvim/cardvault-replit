import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { GiftCard, Fornecedor, Transacao } from '@shared/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Store,
  CreditCard,
  Receipt,
  AlertCircle,
  SearchIcon,
  Loader2
} from 'lucide-react';

interface SearchResultsProps {
  searchTerm: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  fornecedores: Fornecedor[];
  giftCards: GiftCard[];
  transacoes: Transacao[];
  count: {
    fornecedores: number;
    giftCards: number;
    transacoes: number;
    total: number;
  };
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchTerm, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState('all');

  // Executar a pesquisa apenas se o searchTerm tiver pelo menos 3 caracteres
  const { data, isLoading, error } = useQuery<SearchResults>({
    queryKey: ['/api/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) {
        return {
          fornecedores: [],
          giftCards: [],
          transacoes: [],
          count: { fornecedores: 0, giftCards: 0, transacoes: 0, total: 0 }
        };
      }
      
      // Obter o token de autenticação do localStorage
      const token = localStorage.getItem('token');
      
      // Incluir o token no cabeçalho de autorização
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, { headers });
      if (!res.ok) {
        throw new Error('Erro ao realizar a busca');
      }
      return res.json();
    },
    enabled: isOpen && searchTerm.length >= 3,
  });

  if (!isOpen) return null;

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const renderNoResults = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Não encontramos resultados para "{searchTerm}". Tente outros termos ou verifique a ortografia.
      </p>
    </div>
  );

  // Renderizar o status de carregamento
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl">Resultados da busca</CardTitle>
              <CardDescription>Pesquisando por "{searchTerm}"</CardDescription>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              &times;
            </button>
          </CardHeader>
          <CardContent className="p-6 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Buscando resultados...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar o erro
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl">Resultados da busca</CardTitle>
              <CardDescription>Pesquisando por "{searchTerm}"</CardDescription>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              &times;
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na busca</AlertTitle>
              <AlertDescription>
                Ocorreu um erro ao processar sua busca. Por favor tente novamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se não há resultados
  const hasResults = data && (
    data.count.fornecedores > 0 ||
    data.count.giftCards > 0 ||
    data.count.transacoes > 0
  );

  // Renderizar o modal de resultados
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">Resultados da busca</CardTitle>
            <CardDescription>
              {hasResults 
                ? `${data.count.total} resultados para "${searchTerm}"`
                : `Nenhum resultado para "${searchTerm}"`}
            </CardDescription>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">
            &times;
          </button>
        </CardHeader>

        {!hasResults ? (
          <CardContent className="p-6">
            {renderNoResults()}
          </CardContent>
        ) : (
          <>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">
                    Todos ({data.count.total})
                  </TabsTrigger>
                  <TabsTrigger value="fornecedores">
                    Fornecedores ({data.count.fornecedores})
                  </TabsTrigger>
                  <TabsTrigger value="giftCards">
                    Gift Cards ({data.count.giftCards})
                  </TabsTrigger>
                  <TabsTrigger value="transacoes">
                    Transações ({data.count.transacoes})
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
                <TabsContent value="all" className="space-y-6">
                  {data.count.fornecedores > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <Store className="mr-2 h-5 w-5" /> Fornecedores
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.fornecedores.slice(0, 3).map((fornecedor) => (
                            <TableRow key={fornecedor.id}>
                              <TableCell className="font-medium">
                                <Link to={`/fornecedores/${fornecedor.id}`} className="text-primary hover:underline">
                                  {fornecedor.nome}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {fornecedor.descricao
                                  ? fornecedor.descricao.length > 80
                                    ? `${fornecedor.descricao.substring(0, 80)}...`
                                    : fornecedor.descricao
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={fornecedor.status === 'ativo' ? 'default' : 'secondary'}>
                                  {fornecedor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {data.count.fornecedores > 3 && (
                        <div className="text-right mt-2">
                          <Link 
                            to="/fornecedores" 
                            className="text-sm text-primary hover:underline"
                            onClick={onClose}
                          >
                            Ver todos os {data.count.fornecedores} fornecedores
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {data.count.giftCards > 0 && (
                    <div>
                      {data.count.fornecedores > 0 && <Separator className="my-4" />}
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <CreditCard className="mr-2 h-5 w-5" /> Gift Cards
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.giftCards.slice(0, 3).map((giftCard) => (
                            <TableRow key={giftCard.id}>
                              <TableCell className="font-medium">
                                <Link to={`/gift-cards/${giftCard.id}`} className="text-primary hover:underline" onClick={onClose}>
                                  {giftCard.codigo}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link to={`/fornecedores/${giftCard.fornecedorId}`} className="hover:underline" onClick={onClose}>
                                  {(() => {
                                    const fornecedor = data.fornecedores.find(f => f.id === giftCard.fornecedorId);
                                    return fornecedor ? fornecedor.nome : 'Desconhecido';
                                  })()}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(giftCard.saldoAtual)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={giftCard.status === 'ativo' ? 'default' : 'secondary'}
                                  className={
                                    giftCard.status === 'ativo' 
                                      ? 'bg-green-100 text-green-800' 
                                      : giftCard.status === 'expirado'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {giftCard.status.charAt(0).toUpperCase() + giftCard.status.slice(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {data.count.giftCards > 3 && (
                        <div className="text-right mt-2">
                          <Link 
                            to="/gift-cards" 
                            className="text-sm text-primary hover:underline"
                            onClick={onClose}
                          >
                            Ver todos os {data.count.giftCards} gift cards
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {data.count.transacoes > 0 && (
                    <div>
                      {(data.count.fornecedores > 0 || data.count.giftCards > 0) && <Separator className="my-4" />}
                      <h3 className="text-lg font-medium mb-3 flex items-center">
                        <Receipt className="mr-2 h-5 w-5" /> Transações
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.transacoes.slice(0, 3).map((transacao) => (
                            <TableRow key={transacao.id}>
                              <TableCell>
                                {formatDate(transacao.dataTransacao)}
                              </TableCell>
                              <TableCell className="font-medium">
                                <Link to={`/transacoes/${transacao.id}`} className="text-primary hover:underline" onClick={onClose}>
                                  {transacao.descricao.length > 50 
                                    ? `${transacao.descricao.substring(0, 50)}...` 
                                    : transacao.descricao}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(transacao.valor)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    transacao.status === 'concluida' 
                                      ? 'default' 
                                      : transacao.status === 'pendente'
                                        ? 'outline'
                                        : 'secondary'
                                  }
                                  className={
                                    transacao.status === 'concluida' 
                                      ? 'bg-green-100 text-green-800' 
                                      : transacao.status === 'pendente'
                                        ? 'bg-amber-100 text-amber-800'
                                        : transacao.status === 'cancelada'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-blue-100 text-blue-800'
                                  }
                                >
                                  {transacao.status.charAt(0).toUpperCase() + transacao.status.slice(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {data.count.transacoes > 3 && (
                        <div className="text-right mt-2">
                          <Link 
                            to="/transacoes" 
                            className="text-sm text-primary hover:underline"
                            onClick={onClose}
                          >
                            Ver todas as {data.count.transacoes} transações
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fornecedores">
                  {data.count.fornecedores === 0 ? (
                    renderNoResults()
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.fornecedores.map((fornecedor) => (
                          <TableRow key={fornecedor.id}>
                            <TableCell className="font-medium">
                              <Link to={`/fornecedores/${fornecedor.id}`} className="text-primary hover:underline" onClick={onClose}>
                                {fornecedor.nome}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {fornecedor.descricao
                                ? fornecedor.descricao.length > 80
                                  ? `${fornecedor.descricao.substring(0, 80)}...`
                                  : fornecedor.descricao
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {fornecedor.website ? (
                                <a 
                                  href={fornecedor.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {(() => {
                                    try {
                                      return new URL(fornecedor.website).hostname;
                                    } catch (e) {
                                      return fornecedor.website;
                                    }
                                  })()}
                                </a>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={fornecedor.status === 'ativo' ? 'default' : 'secondary'}
                                className={
                                  fornecedor.status === 'ativo' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {fornecedor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="giftCards">
                  {data.count.giftCards === 0 ? (
                    renderNoResults()
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Valor Inicial</TableHead>
                          <TableHead>Saldo Atual</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.giftCards.map((giftCard) => (
                          <TableRow key={giftCard.id}>
                            <TableCell className="font-medium">
                              <Link to={`/gift-cards/${giftCard.id}`} className="text-primary hover:underline" onClick={onClose}>
                                {giftCard.codigo}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link to={`/fornecedores/${giftCard.fornecedorId}`} className="hover:underline" onClick={onClose}>
                                {(() => {
                                  const fornecedor = data.fornecedores.find(f => f.id === giftCard.fornecedorId);
                                  return fornecedor ? fornecedor.nome : 'Desconhecido';
                                })()}
                              </Link>
                            </TableCell>
                            <TableCell>{formatCurrency(giftCard.valorInicial)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(giftCard.saldoAtual)}</TableCell>
                            <TableCell>
                              {giftCard.dataValidade ? formatDate(giftCard.dataValidade) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={giftCard.status === 'ativo' ? 'default' : 'secondary'}
                                className={
                                  giftCard.status === 'ativo' 
                                    ? 'bg-green-100 text-green-800' 
                                    : giftCard.status === 'expirado'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {giftCard.status.charAt(0).toUpperCase() + giftCard.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="transacoes">
                  {data.count.transacoes === 0 ? (
                    renderNoResults()
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Gift Card</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transacoes.map((transacao) => (
                          <TableRow key={transacao.id}>
                            <TableCell>
                              {formatDate(transacao.dataTransacao)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Link to={`/transacoes/${transacao.id}`} className="text-primary hover:underline" onClick={onClose}>
                                {transacao.descricao}
                              </Link>
                            </TableCell>
                            <TableCell>{formatCurrency(transacao.valor)}</TableCell>
                            <TableCell>
                              <Link to={`/gift-cards/${transacao.giftCardId}`} className="hover:underline" onClick={onClose}>
                                {(() => {
                                  const giftCard = data.giftCards.find(gc => gc.id === transacao.giftCardId);
                                  return giftCard ? giftCard.codigo : 'Múltiplos';
                                })()}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  transacao.status === 'concluida' 
                                    ? 'default' 
                                    : transacao.status === 'pendente'
                                      ? 'outline'
                                      : 'secondary'
                                }
                                className={
                                  transacao.status === 'concluida' 
                                    ? 'bg-green-100 text-green-800' 
                                    : transacao.status === 'pendente'
                                      ? 'bg-amber-100 text-amber-800'
                                      : transacao.status === 'cancelada'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                }
                              >
                                {transacao.status.charAt(0).toUpperCase() + transacao.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </>
        )}
      </Card>
    </div>
  );
};

export default SearchResults;