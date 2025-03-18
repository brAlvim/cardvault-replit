import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CreditCard, 
  Wallet, 
  Info, 
  Check, 
  X,
  ShoppingCart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type GiftCard = {
  id: number;
  codigo: string;
  valorInicial: number;
  saldoAtual: number;
  fornecedorId: number;
  status: string;
  gcNumber?: string;
  gcPass?: string;
};

type Fornecedor = {
  id: number;
  nome: string;
};

interface SelectedGiftCard {
  id: number;
  codigo: string;
  saldoAtual: number;
  fornecedorNome?: string;
}

interface GiftCardSelectorProps {
  onGiftCardSelected: (selectedCards: SelectedGiftCard[]) => void;
  initialSelectedCard?: number; 
}

// Formatador de moeda
function formatMoney(value: number | null | undefined): string {
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

export default function GiftCardSelector({ onGiftCardSelected, initialSelectedCard }: GiftCardSelectorProps) {
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [selectedGiftCards, setSelectedGiftCards] = useState<SelectedGiftCard[]>([]);
  const { toast } = useToast(); // Para mensagens de feedback ao usuário

  // Carregar fornecedores
  const { data: fornecedores = [], isError: isFornecedoresError } = useQuery<Fornecedor[]>({
    queryKey: ['/api/fornecedores'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/fornecedores', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!res.ok) {
          console.error("Falha ao buscar fornecedores:", res.status, res.statusText);
          return [];
        }
        
        const data = await res.json();
        // Verificar explicitamente se é array e retornar array vazio caso não seja
        if (!Array.isArray(data)) {
          console.error("Dados de fornecedores não é um array:", data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Erro ao buscar fornecedores:", error);
        return [];
      }
    },
  });

  // Carregar gift cards
  const { data: giftCards = [], isError: isGiftCardsError } = useQuery<GiftCard[]>({
    queryKey: ['/api/gift-cards'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/gift-cards', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!res.ok) {
          console.error("Falha ao buscar gift cards:", res.status, res.statusText);
          return [];
        }
        
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erro ao buscar gift cards:", error);
        return [];
      }
    },
  });
  
  // Limite de gift cards que podem ser selecionados
  const MAX_GIFT_CARDS = 5;

  // Quando um fornecedor é selecionado, filtrar os gift cards
  useEffect(() => {
    // Se houver uma seleção inicial e ainda não selecionamos nada
    if (initialSelectedCard && selectedGiftCards.length === 0) {
      const card = giftCards.find(gc => gc.id === initialSelectedCard);
      if (card) {
        // Define o fornecedor deste card como selecionado
        setSelectedFornecedorId(card.fornecedorId);
        
        // Seleciona o card
        const fornecedor = fornecedores.find(f => f.id === card.fornecedorId);
        const newGiftCard: SelectedGiftCard = {
          id: card.id,
          codigo: card.codigo,
          saldoAtual: card.saldoAtual,
          fornecedorNome: fornecedor?.nome
        };
        
        setSelectedGiftCards([newGiftCard]);
        onGiftCardSelected([newGiftCard]);
      }
    }
  }, [initialSelectedCard, giftCards, fornecedores, selectedGiftCards, onGiftCardSelected]);

  // Filtrar cards pelo fornecedor selecionado
  const filteredGiftCards = selectedFornecedorId
    ? giftCards.filter(
        card => card.fornecedorId === selectedFornecedorId && 
        (card.status?.toLowerCase() === 'ativo' || card.status?.toUpperCase() === 'ATIVO' || card.status === 'Ativo') && 
        card.saldoAtual > 0
      )
    : [];
    
  // Verificação de debugging
  useEffect(() => {
    if (selectedFornecedorId && giftCards.length > 0) {
      const cardsFromSelectedFornecedor = giftCards.filter(card => card.fornecedorId === selectedFornecedorId);
      console.log(`Encontrados ${cardsFromSelectedFornecedor.length} cards do fornecedor ${selectedFornecedorId}`);
      console.log(`Status dos cards: ${cardsFromSelectedFornecedor.map(c => c.status).join(', ')}`);
      console.log(`Filtrados para exibição: ${filteredGiftCards.length} cards`);
    }
  }, [selectedFornecedorId, giftCards, filteredGiftCards]);
  
  return (
    <div className="space-y-4">
      {/* Seleção de fornecedor */}
      <div>
        <Label htmlFor="fornecedor" className="block text-sm font-medium mb-1">
          Fornecedor
        </Label>
        <Select
          onValueChange={(value) => {
            const fornecedorId = parseInt(value);
            setSelectedFornecedorId(fornecedorId);
            // Limpa a seleção quando troca de fornecedor
            if (selectedGiftCards.length > 0) {
              setSelectedGiftCards([]);
              onGiftCardSelected([]);
            }
          }}
          value={selectedFornecedorId?.toString() || ''}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um fornecedor" />
          </SelectTrigger>
          <SelectContent>
            {fornecedores.map((fornecedor) => (
              <SelectItem key={fornecedor.id} value={fornecedor.id.toString()}>
                {fornecedor.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gift cards selecionados */}
      {selectedGiftCards.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <CreditCard size={16} />
              <span className="text-sm font-medium">Gift Cards Selecionados</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {selectedGiftCards.length} de {MAX_GIFT_CARDS}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">
                Total: {formatMoney(selectedGiftCards.reduce((sum, card) => sum + card.saldoAtual, 0))}
              </span>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="h-6 text-red-500 text-xs flex items-center gap-1"
                onClick={() => {
                  setSelectedGiftCards([]);
                  onGiftCardSelected([]);
                }}
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            </div>
          </div>
          
          {selectedGiftCards.map((card) => {
            // Buscar o gift card completo para obter gcNumber e gcPass
            const fullCard = giftCards.find(gc => gc.id === card.id);
            
            return (
              <div key={card.id} className="bg-white border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{card.codigo}</span>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o clique propague
                      // Remove apenas este card
                      const updatedCards = selectedGiftCards.filter(gc => gc.id !== card.id);
                      setSelectedGiftCards(updatedCards);
                      onGiftCardSelected(updatedCards);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="ml-1 font-medium">{card.fornecedorNome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Saldo:</span>
                    <span className="ml-1 font-medium text-green-600">{formatMoney(card.saldoAtual)}</span>
                  </div>
                </div>
                
                {/* Informações para compra */}
                {fullCard && (
                  <div className="mt-2 pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      Informações para compra:
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {fullCard.gcNumber && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Número do cartão:</p>
                          <div className="bg-slate-50 rounded p-1 font-mono text-xs overflow-x-auto">
                            {fullCard.gcNumber}
                          </div>
                        </div>
                      )}
                      
                      {fullCard.gcPass && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Senha:</p>
                          <div className="bg-slate-50 rounded p-1 font-mono text-xs overflow-x-auto">
                            {fullCard.gcPass}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Lista de gift cards disponíveis */}
      {selectedFornecedorId && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Wallet size={16} />
            Gift Cards Disponíveis
          </h3>
          
          {filteredGiftCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {filteredGiftCards.map((card) => {
                const isSelected = selectedGiftCards.some(sc => sc.id === card.id);
                
                return (
                  <div
                    key={card.id}
                    className={`border rounded p-2 cursor-pointer transition ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        // Remove apenas este card da seleção
                        const updatedCards = selectedGiftCards.filter(sc => sc.id !== card.id);
                        setSelectedGiftCards(updatedCards);
                        onGiftCardSelected(updatedCards);
                      } else {
                        // Verifica se já atingiu o limite de cards selecionados
                        if (selectedGiftCards.length >= MAX_GIFT_CARDS) {
                          toast({
                            title: "Limite de seleção",
                            description: `Você pode selecionar no máximo ${MAX_GIFT_CARDS} gift cards por vez.`,
                            variant: "destructive"
                          });
                          return;
                        }

                        // Adiciona à seleção (junto com os já selecionados)
                        const fornecedor = fornecedores.find(f => f.id === card.fornecedorId);
                        const newCard: SelectedGiftCard = {
                          id: card.id,
                          codigo: card.codigo,
                          saldoAtual: card.saldoAtual,
                          fornecedorNome: fornecedor?.nome
                        };
                        
                        const updatedCards = [...selectedGiftCards, newCard];
                        setSelectedGiftCards(updatedCards);
                        onGiftCardSelected(updatedCards);
                      }
                    }}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{card.codigo}</div>
                        <div className="text-xs text-muted-foreground">
                          Saldo: {formatMoney(card.saldoAtual)}
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center bg-gray-50 rounded-md">
              <Info className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum gift card disponível para este fornecedor
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}