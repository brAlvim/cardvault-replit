import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Fornecedor, GiftCard, Transacao } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, LineChart, Line 
} from "recharts";
import { 
  Download, FileBarChart, FileText, Wallet, WalletCards, 
  ArrowUpRightSquare, ArrowDownRightSquare, Calendar, Building2
} from "lucide-react";
import { useEffect, useState } from "react";

// Criar uma declaração de módulo para o file-saver
declare module 'file-saver';

// Estender os tipos existentes
interface GiftCardExtended extends GiftCard {
  fornecedorNome?: string;  // Nome do fornecedor para exibição
}

interface TransacaoExtended extends Transacao {
  giftCardCodigo?: string;  // Código do gift card para exibição
}

// Tipos para estatísticas
interface EstatisticasFornecedor {
  id: number;
  nome: string;
  saldoTotal: number;
  count: number;
  valorMedio: number;
}

interface EstatisticasFornecedorMes {
  nome: string;
  count: number;
  valor: number;
}

interface EstatisticasMes {
  mes: string;
  count: number;
  valor: number;
  valorEconomizado: number;
  fornecedores: Record<number, EstatisticasFornecedorMes>;
}

interface EstatisticasGerais {
  totalGiftCards: number;
  totalFornecedores: number;
  saldoTotal: number;
  valorTotalInicial: number;
}

interface Estatisticas {
  estatisticasPorFornecedor: EstatisticasFornecedor[];
  estatisticasPorMes: EstatisticasMes[];
  estatisticasGerais: EstatisticasGerais;
}

// Função para formatar valores monetários
const formatMoney = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Função auxiliar para criar o conteúdo CSV
const createCsv = (data: any[], columns: {key: string, header: string}[]): string => {
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(item => 
    columns.map(col => {
      let value = item[col.key];
      
      // Formatar datas
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      // Verificar se é uma string e contem vírgulas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      
      return value;
    }).join(',')
  ).join('\\n');
  
  return `${headers}\\n${rows}`;
};

export default function RelatoriosPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("estatisticas");
  
  // Buscar estatísticas
  const { data: estatisticas, isLoading: isLoadingEstatisticas } = useQuery<Estatisticas>({
    queryKey: ["/api/relatorios/estatisticas"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Estado para filtro de fornecedor na evolução mensal
  const [fornecedorFiltro, setFornecedorFiltro] = useState<number | null>(null);
  
  // Lazy loading para os outros dados
  const [loadGiftCards, setLoadGiftCards] = useState(false);
  const [loadTransacoes, setLoadTransacoes] = useState(false);
  
  const { data: giftCards, isLoading: isLoadingGiftCards } = useQuery<GiftCardExtended[]>({
    queryKey: ["/api/relatorios/gift-cards/export"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: loadGiftCards,
  });
  
  const { data: transacoes, isLoading: isLoadingTransacoes } = useQuery<TransacaoExtended[]>({
    queryKey: ["/api/relatorios/transacoes/export"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: loadTransacoes,
  });
  
  // Cores para os gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF', '#E24D8A'];
  
  // Quando a tab muda, carregar os dados apropriados
  useEffect(() => {
    if (activeTab === "gift-cards" && !loadGiftCards) {
      setLoadGiftCards(true);
    } else if (activeTab === "transacoes" && !loadTransacoes) {
      setLoadTransacoes(true);
    }
  }, [activeTab]);
  
  // Exportar gift cards para CSV
  const exportGiftCardsCSV = () => {
    if (!giftCards || giftCards.length === 0) {
      toast({
        title: "Nenhum Gift Card disponível",
        description: "Não há dados para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'codigo', header: 'Código' },
      { key: 'valorInicial', header: 'Valor Inicial' },
      { key: 'saldoAtual', header: 'Saldo Atual' },
      { key: 'fornecedorNome', header: 'Fornecedor' },
      { key: 'dataCompra', header: 'Data Compra' },
      { key: 'dataValidade', header: 'Data Validade' },
      { key: 'observacoes', header: 'Observações' },
      { key: 'status', header: 'Status' }
    ];
    
    const csv = createCsv(giftCards, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'gift_cards_export.csv');
    
    toast({
      title: "Exportação concluída",
      description: `${giftCards.length} gift cards exportados com sucesso.`,
    });
  };
  
  // Exportar transações para CSV
  const exportTransacoesCSV = () => {
    if (!transacoes || transacoes.length === 0) {
      toast({
        title: "Nenhuma transação disponível",
        description: "Não há dados para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'valor', header: 'Valor' },
      { key: 'descricao', header: 'Descrição' },
      { key: 'dataTransacao', header: 'Data' },
      { key: 'status', header: 'Status' },
      { key: 'giftCardCodigo', header: 'Gift Card' },
      { key: 'ordemCompra', header: 'Ordem de Compra' },
      { key: 'ordemInterna', header: 'Ordem Interna' },
      { key: 'nomeUsuario', header: 'Usuário' }
    ];
    
    const csv = createCsv(transacoes, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'transacoes_export.csv');
    
    toast({
      title: "Exportação concluída",
      description: `${transacoes.length} transações exportadas com sucesso.`,
    });
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Relatórios</h1>
      
      <Tabs defaultValue="estatisticas" onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="estatisticas">
            <FileBarChart className="h-4 w-4 mr-2" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="gift-cards">
            <WalletCards className="h-4 w-4 mr-2" />
            Gift Cards
          </TabsTrigger>
          <TabsTrigger value="transacoes">
            <ArrowUpRightSquare className="h-4 w-4 mr-2" />
            Transações
          </TabsTrigger>
        </TabsList>
        
        {/* Tab Estatísticas */}
        <TabsContent value="estatisticas">
          {isLoadingEstatisticas ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : estatisticas ? (
            <div className="space-y-6">
              {/* Cards de Estatísticas Gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total de Gift Cards</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="flex items-center">
                      <WalletCards className="h-5 w-5 mr-2 text-primary" />
                      <div className="text-2xl font-bold">{estatisticas.estatisticasGerais.totalGiftCards}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Fornecedores Ativos</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-primary" />
                      <div className="text-2xl font-bold">{estatisticas.estatisticasGerais.totalFornecedores}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Saldo Disponível</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="flex items-center">
                      <Wallet className="h-5 w-5 mr-2 text-primary" />
                      <div className="text-2xl font-bold">{formatMoney(estatisticas.estatisticasGerais.saldoTotal)}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Valor Inicial Total</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="flex items-center">
                      <ArrowDownRightSquare className="h-5 w-5 mr-2 text-primary" />
                      <div className="text-2xl font-bold">{formatMoney(estatisticas.estatisticasGerais.valorTotalInicial)}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Pizza: Distribuição por Fornecedor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Fornecedor</CardTitle>
                    <CardDescription>Quantidade de Gift Cards por fornecedor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={estatisticas.estatisticasPorFornecedor}
                            dataKey="count"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={isMobile ? 80 : 100}
                            label={(entry) => entry.nome}
                          >
                            {estatisticas.estatisticasPorFornecedor.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => ['Quantidade', value]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Gráfico de Barras: Saldo por Fornecedor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Saldo por Fornecedor</CardTitle>
                    <CardDescription>Saldo total disponível por fornecedor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={estatisticas.estatisticasPorFornecedor}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="nome" 
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                            interval={0}
                          />
                          <YAxis tickFormatter={(value) => `R$${value}`} />
                          <Tooltip formatter={(value) => [formatMoney(value as number), 'Saldo']} />
                          <Bar dataKey="saldoTotal" fill="#0088FE" name="Saldo Total" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Gráfico de Linha: Evolução por Mês */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div>
                        <CardTitle>Evolução por Mês</CardTitle>
                        <CardDescription>Novos gift cards adicionados e valor total por mês</CardDescription>
                      </div>
                      
                      {/* Filtro de fornecedor */}
                      <div className="mt-4 sm:mt-0">
                        <select 
                          className="w-full sm:w-auto px-3 py-2 border border-input rounded-md text-sm"
                          value={fornecedorFiltro ? fornecedorFiltro : ""}
                          onChange={(e) => setFornecedorFiltro(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Todos os fornecedores</option>
                          {estatisticas.estatisticasPorFornecedor.map((f) => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={estatisticas.estatisticasPorMes.map(mes => {
                            if (fornecedorFiltro) {
                              // Se tiver filtro de fornecedor e o fornecedor tem dados no mês
                              if (mes.fornecedores[fornecedorFiltro]) {
                                const fornData = mes.fornecedores[fornecedorFiltro];
                                return {
                                  ...mes,
                                  count: fornData.count,
                                  valor: fornData.valor
                                };
                              } else {
                                // Se o fornecedor não tem dados no mês, retornar zeros
                                return {
                                  ...mes,
                                  count: 0,
                                  valor: 0
                                };
                              }
                            }
                            // Se não tiver filtro, retornar o mês normalmente
                            return mes;
                          })}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `R$${value}`} />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === "valor") return [formatMoney(value as number), "Valor"];
                              if (name === "valorEconomizado") return [formatMoney(value as number), "Economia"];
                              return [value, "Quantidade"];
                            }} 
                          />
                          <Legend />
                          <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8884d8" 
                            name="Quantidade" 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="valor" 
                            stroke="#82ca9d" 
                            name="Valor" 
                          />
                          <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="valorEconomizado" 
                            stroke="#ff8042" 
                            name="Economia" 
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma estatística disponível</p>
            </div>
          )}
        </TabsContent>
        
        {/* Tab Gift Cards */}
        <TabsContent value="gift-cards">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Exportar Gift Cards</CardTitle>
                <Button onClick={exportGiftCardsCSV} disabled={isLoadingGiftCards}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
              <CardDescription>
                Exporta todos os gift cards do sistema para um arquivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGiftCards ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : giftCards && giftCards.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left">Código</th>
                        <th className="py-2 px-4 text-left">Fornecedor</th>
                        <th className="py-2 px-4 text-right">Valor Inicial</th>
                        <th className="py-2 px-4 text-right">Saldo Atual</th>
                        <th className="py-2 px-4 text-left">Data de Validade</th>
                        <th className="py-2 px-4 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCards.slice(0, 10).map((card) => (
                        <tr key={card.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{card.codigo}</td>
                          <td className="py-2 px-4">{card.fornecedorNome}</td>
                          <td className="py-2 px-4 text-right">{formatMoney(card.valorInicial)}</td>
                          <td className="py-2 px-4 text-right">{formatMoney(card.saldoAtual)}</td>
                          <td className="py-2 px-4">
                            {card.dataValidade 
                              ? new Date(card.dataValidade).toLocaleDateString() 
                              : 'N/A'}
                          </td>
                          <td className="py-2 px-4">
                            <span 
                              className={`inline-block px-2 py-1 rounded-full text-xs ${
                                card.status === 'ativo' 
                                  ? 'bg-green-100 text-green-800' 
                                  : card.status === 'usado' 
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {card.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {giftCards.length > 10 && (
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      Mostrando 10 de {giftCards.length} gift cards. 
                      Exporte para CSV para ver todos os registros.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum gift card disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab Transações */}
        <TabsContent value="transacoes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Exportar Transações</CardTitle>
                <Button onClick={exportTransacoesCSV} disabled={isLoadingTransacoes}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
              <CardDescription>
                Exporta todas as transações do sistema para um arquivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransacoes ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : transacoes && transacoes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left">Data</th>
                        <th className="py-2 px-4 text-left">Gift Card</th>
                        <th className="py-2 px-4 text-left">Descrição</th>
                        <th className="py-2 px-4 text-right">Valor</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Ordem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacoes.slice(0, 10).map((transacao) => (
                        <tr key={transacao.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">
                            {new Date(transacao.dataTransacao).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-4">{transacao.giftCardCodigo}</td>
                          <td className="py-2 px-4">{transacao.descricao}</td>
                          <td className="py-2 px-4 text-right">
                            <span className={transacao.valor > 0 ? "text-green-600" : "text-red-600"}>
                              {formatMoney(transacao.valor)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <span 
                              className={`inline-block px-2 py-1 rounded-full text-xs ${
                                transacao.status === 'concluido' 
                                  ? 'bg-green-100 text-green-800' 
                                  : transacao.status === 'pendente' 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transacao.status}
                            </span>
                          </td>
                          <td className="py-2 px-4">{transacao.ordemCompra || transacao.ordemInterna || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transacoes.length > 10 && (
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      Mostrando 10 de {transacoes.length} transações. 
                      Exporte para CSV para ver todos os registros.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma transação disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}