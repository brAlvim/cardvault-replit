import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, X, RefreshCw } from 'lucide-react';

interface GiftCard {
  id: number;
  codigo: string;
  saldoAtual: number;
  fornecedorId: number;
  fornecedorNome?: string;
  gcNumber?: string;  // Número do gift card (principal identificador)
  gcPass?: string;    // Senha do gift card (quando aplicável)
}

interface GiftCardSearchProps {
  onGiftCardSelected: (giftCard: GiftCard | null) => void;
  empresaId: number;
}

const GiftCardSearch: React.FC<GiftCardSearchProps> = ({ onGiftCardSelected, empresaId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GiftCard[]>([]);
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [error, setError] = useState('');
  const [allGiftCards, setAllGiftCards] = useState<GiftCard[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Carregar todos os gift cards na inicialização
  useEffect(() => {
    loadAllGiftCards();
  }, [empresaId]);

  // Função para carregar todos os gift cards disponíveis
  const loadAllGiftCards = async () => {
    setLoadingAll(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      console.log("Carregando todos os gift cards para a empresa", empresaId);
      
      const response = await fetch(`/api/gift-cards?empresaId=${empresaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Falha ao carregar gift cards: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Gift cards carregados:", data.length, data);
      setAllGiftCards(data);
      
      // Se houver poucos gift cards (<10), já os exibe para facilitar a seleção
      if (data.length > 0 && data.length < 10) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Erro ao carregar gift cards:', error);
      setError('Erro ao carregar gift cards. Tente novamente.');
    } finally {
      setLoadingAll(false);
    }
  };

  // Procurar gift cards no cache local e no servidor
  const searchGiftCards = async () => {
    // Se não houver termo de busca, exibe todos os gift cards carregados (limitados a 10)
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults(allGiftCards.slice(0, 10));
      return;
    }

    if (searchTerm.length < 2) {
      setError('Digite pelo menos 2 dígitos para buscar');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // Primeiro tenta buscar nos gift cards já carregados em cache
      const normalizedSearchTerm = searchTerm.toLowerCase().replace(/[^a-z0-9]/gi, '');
      
      const filteredCards = allGiftCards.filter(card => {
        // Se ambos os campos estiverem vazios, não incluir
        if (!card.codigo && !card.gcNumber) return false;
        
        // Normaliza os códigos para busca (remove espaços, traços, etc.)
        const normalizedCardCode = (card.codigo || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        const normalizedGcNumber = (card.gcNumber || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        
        // Busca PRIORITÁRIA pelo gcNumber (número do gift card)
        if (normalizedGcNumber === normalizedSearchTerm) return true;
        if (normalizedGcNumber.includes(normalizedSearchTerm)) return true;
        if (normalizedGcNumber.endsWith(normalizedSearchTerm)) return true;
        
        // Busca secundária pelo código
        if (normalizedCardCode === normalizedSearchTerm) return true;
        if (normalizedCardCode.includes(normalizedSearchTerm)) return true;
        if (normalizedCardCode.endsWith(normalizedSearchTerm)) return true;
        
        return false;
      });
      
      if (filteredCards.length > 0) {
        console.log("Gift cards encontrados no cache:", filteredCards.length);
        setSearchResults(filteredCards);
        setIsSearching(false);
        return;
      }
      
      // Se não encontrou no cache, busca no servidor
      const token = localStorage.getItem('token');
      console.log("Fazendo requisição GET para /api/gift-cards/search/" + searchTerm + "/" + empresaId, token ? "Com token" : "Sem token");
      
      const response = await fetch(`/api/gift-cards/search/${searchTerm}/${empresaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Falha ao buscar gift cards: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Resposta OK GET /api/gift-cards/search/" + searchTerm + "/" + empresaId + ":", response.status);
      console.log("Gift cards encontrados na API:", data.length, data);
      
      if (data.length === 0) {
        // Recarrega todos os gift cards para garantir que temos os mais recentes
        await loadAllGiftCards();
        
        // Tenta novamente a busca local após recarregar
        const refreshedFilteredCards = allGiftCards.filter(card => {
          // Se ambos os campos estiverem vazios, não incluir
          if (!card.codigo && !card.gcNumber) return false;
          
          // Normaliza os códigos para busca (remove espaços, traços, etc.)
          const normalizedCardCode = (card.codigo || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
          const normalizedGcNumber = (card.gcNumber || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
          
          // Busca PRIORITÁRIA pelo gcNumber (número do gift card)
          if (normalizedGcNumber === normalizedSearchTerm) return true;
          if (normalizedGcNumber.includes(normalizedSearchTerm)) return true;
          if (normalizedGcNumber.endsWith(normalizedSearchTerm)) return true;
          
          // Busca secundária pelo código
          if (normalizedCardCode === normalizedSearchTerm) return true;
          if (normalizedCardCode.includes(normalizedSearchTerm)) return true;
          if (normalizedCardCode.endsWith(normalizedSearchTerm)) return true;
          
          return false;
        });
        
        if (refreshedFilteredCards.length > 0) {
          setSearchResults(refreshedFilteredCards);
        } else {
          setError('Nenhum gift card encontrado com este código');
        }
      } else {
        setSearchResults(data);
        
        // Atualiza o cache com os novos cards encontrados
        const newCards = data.filter((newCard: GiftCard) => 
          !allGiftCards.some(existingCard => existingCard.id === newCard.id)
        );
        
        if (newCards.length > 0) {
          setAllGiftCards(prev => [...prev, ...newCards]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar gift cards:', error);
      setError('Erro ao buscar gift cards. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Selecionar um gift card dos resultados
  const handleSelect = (giftCard: GiftCard) => {
    setSelectedGiftCard(giftCard);
    onGiftCardSelected(giftCard);
    // Limpar resultados da busca após selecionar
    setSearchResults([]);
  };

  // Limpar seleção
  const handleClear = () => {
    setSelectedGiftCard(null);
    onGiftCardSelected(null);
    setSearchTerm('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="gift-card-search">Buscar Gift Card por NÚMERO ou código</Label>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Input
                id="gift-card-search"
                placeholder="Digite o NÚMERO ou código do gift card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchGiftCards();
                  }
                }}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={handleClear}
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={searchGiftCards}
              disabled={isSearching}
            >
              <Search className="h-4 w-4 mr-1" />
              Buscar
            </Button>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchResults(allGiftCards.slice(0, 20))}
              className="text-xs"
              disabled={loadingAll || allGiftCards.length === 0}
            >
              Mostrar Todos ({allGiftCards.length})
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAllGiftCards}
              className="text-xs"
              disabled={loadingAll}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loadingAll ? 'animate-spin' : ''}`} />
              Atualizar Lista
            </Button>
          </div>
        </div>
        
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      
      {/* Resultados da busca */}
      {searchResults.length > 0 && (
        <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
          <h3 className="text-sm font-medium mb-2">Resultados da busca:</h3>
          <div className="space-y-2">
            {searchResults.map((giftCard) => (
              <div 
                key={giftCard.id}
                className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelect(giftCard)}
              >
                <div>
                  <p className="font-medium">
                    {giftCard.gcNumber ? (
                      <span className="text-blue-700">{giftCard.gcNumber}</span>
                    ) : (
                      giftCard.codigo
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {giftCard.fornecedorNome || `Fornecedor ID: ${giftCard.fornecedorId}`}
                    {giftCard.gcNumber && giftCard.codigo !== giftCard.gcNumber && (
                      <> • <span className="text-gray-400">Código: {giftCard.codigo}</span></>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-medium">R$ {giftCard.saldoAtual.toFixed(2)}</p>
                  <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">
                    Selecionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Gift card selecionado */}
      {selectedGiftCard && (
        <div className="border border-blue-200 bg-blue-50 rounded-md p-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium">Gift Card Selecionado:</h3>
              <p className="text-base font-bold">
                {selectedGiftCard.gcNumber ? (
                  <span className="text-blue-700">{selectedGiftCard.gcNumber}</span>
                ) : (
                  selectedGiftCard.codigo
                )}
              </p>
              <p className="text-sm">
                {selectedGiftCard.fornecedorNome || `Fornecedor ID: ${selectedGiftCard.fornecedorId}`}
                {selectedGiftCard.gcNumber && selectedGiftCard.codigo !== selectedGiftCard.gcNumber && (
                  <span className="block text-xs text-gray-500">Código: {selectedGiftCard.codigo}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Saldo Atual:</p>
              <p className="text-green-600 font-semibold">R$ {selectedGiftCard.saldoAtual.toFixed(2)}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-1 text-red-500 text-xs h-7"
                onClick={handleClear}
              >
                <X className="h-3 w-3 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftCardSearch;