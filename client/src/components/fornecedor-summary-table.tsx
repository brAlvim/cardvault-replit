import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fornecedor, GiftCard } from "@shared/schema";

interface FornecedorSummaryItem {
  fornecedor: Fornecedor;
  quantidade: number;
  disponivel: number;
  mediaDesconto: string;
  valorMedio: number;
  maiorValor: number;
  menorValor: number;
}

interface FornecedorSummaryTableProps {
  giftCards: GiftCard[];
  fornecedores: Fornecedor[];
}

export default function FornecedorSummaryTable({ giftCards, fornecedores }: FornecedorSummaryTableProps) {
  // Garantir que os arrays existem
  const giftCardsArray = Array.isArray(giftCards) ? giftCards : [];
  const fornecedoresArray = Array.isArray(fornecedores) ? fornecedores : [];

  // Filtrar apenas fornecedores ativos
  const fornecedoresAtivos = fornecedoresArray.filter(f => f.status === "ativo");
  
  // Calcular as estatísticas para cada fornecedor
  const fornecedorSummaries: FornecedorSummaryItem[] = fornecedoresAtivos.map(fornecedor => {
    // Filtrar gift cards deste fornecedor
    const fornecedorGiftCards = giftCardsArray.filter(gc => gc.fornecedorId === fornecedor.id);
    
    // Calcular soma total disponível
    const disponivel = fornecedorGiftCards.reduce((sum, gc) => sum + gc.saldoAtual, 0);
    
    // Calcular média de desconto (percentual de desconto médio)
    // Buscando o valor de percentualDesconto de cada gift card
    const mediaDescontoValue = fornecedorGiftCards.length > 0 
      ? fornecedorGiftCards.reduce((sum, gc) => {
          // Usar o percentualDesconto diretamente, ou calcular com base nos valores
          const desconto = gc.percentualDesconto || 0;
          return sum + desconto;
        }, 0) / fornecedorGiftCards.length
      : 0;
    
    // Formatar como percentual
    const mediaDesconto = `${mediaDescontoValue.toFixed(1)}%`;
    
    // Calcular valor médio
    const valorMedio = fornecedorGiftCards.length > 0 
      ? disponivel / fornecedorGiftCards.length 
      : 0;
    
    // Encontrar maior e menor valor (saldoAtual)
    const maiorValor = fornecedorGiftCards.length > 0 
      ? Math.max(...fornecedorGiftCards.map(gc => gc.saldoAtual)) 
      : 0;
    
    const menorValor = fornecedorGiftCards.length > 0 
      ? Math.min(...fornecedorGiftCards.map(gc => gc.saldoAtual)) 
      : 0;
    
    return {
      fornecedor,
      quantidade: fornecedorGiftCards.length,
      disponivel,
      mediaDesconto,
      valorMedio,
      maiorValor,
      menorValor
    };
  });

  // Calcular o total disponível
  const totalDisponivel = fornecedorSummaries.reduce((sum, item) => sum + item.disponivel, 0);

  // Ordenar por valor disponível (maior para menor)
  const sortedSummaries = [...fornecedorSummaries].sort((a, b) => b.disponivel - a.disponivel);

  // Formatar valor para R$
  const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-semibold bg-primary/10">FORNECEDOR</TableHead>
            <TableHead className="font-semibold text-center bg-primary/10">TEM</TableHead>
            <TableHead className="font-semibold text-center bg-primary/10">DISPONÍVEL</TableHead>
            <TableHead className="font-semibold text-center bg-primary/10">MÉDIA</TableHead>
            <TableHead className="font-semibold text-center bg-primary/10">MAIOR</TableHead>
            <TableHead className="font-semibold text-center bg-primary/10">MENOR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSummaries.map((item) => {
            // Define apenas texto em negrito para descontos
            const descontoValue = parseFloat(item.mediaDesconto.replace('%', ''));
            const mediaClassName = descontoValue > 0 ? "font-bold" : "";
            
            return (
              <TableRow key={item.fornecedor.id} className={item.disponivel === 0 ? "opacity-60" : ""}>
                <TableCell className="font-medium">{item.fornecedor.nome}</TableCell>
                <TableCell className="text-center">{item.quantidade}</TableCell>
                <TableCell className={`text-center ${item.disponivel > 1000 ? "font-bold text-green-700" : ""}`}>
                  {formatCurrency(item.disponivel)}
                </TableCell>
                <TableCell className={`text-center ${mediaClassName}`}>
                  {item.mediaDesconto}
                </TableCell>
                <TableCell className="text-center">{formatCurrency(item.maiorValor)}</TableCell>
                <TableCell className="text-center">
                  {item.menorValor === 0 && item.quantidade > 0 ? "R$ 0.00" : 
                  item.quantidade === 0 ? "N/A" : formatCurrency(item.menorValor)}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-primary/20 font-semibold border-t-2 border-primary/30">
            <TableCell>TOTAL DISPONÍVEL</TableCell>
            <TableCell className="text-center">{sortedSummaries.reduce((sum, item) => sum + item.quantidade, 0)}</TableCell>
            <TableCell className="text-center font-bold">{formatCurrency(totalDisponivel)}</TableCell>
            <TableCell colSpan={3}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}