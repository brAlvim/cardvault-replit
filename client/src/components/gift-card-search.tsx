import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

interface GiftCard {
  id: number;
  codigo: string;
  saldoAtual: number;
  fornecedorId: number;
  fornecedorNome?: string;
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

  // Procurar gift cards por código (completo ou últimos 4 dígitos)
  const searchGiftCards = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setError('Digite pelo menos 2 dígitos para buscar');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // Obter token do localStorage - corrigido para usar o token correto
      const token = localStorage.getItem('token');
      console.log("Fazendo requisição GET para /api/gift-cards/search/" + searchTerm + "/" + empresaId, token ? "Com token" : "Sem token");
      
      // Usar a API do navegador fetch diretamente para ter mais controle
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
      console.log("Gift cards encontrados:", data.length, data);
      
      if (data.length === 0) {
        setError('Nenhum gift card encontrado com este código');
      }
      
      setSearchResults(data);
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
        <Label htmlFor="gift-card-search">Buscar Gift Card por código (completo ou últimos 4 dígitos)</Label>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Input
              id="gift-card-search"
              placeholder="Digite o código completo ou últimos 4 dígitos"
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
            disabled={isSearching || searchTerm.length < 2}
          >
            <Search className="h-4 w-4 mr-1" />
            Buscar
          </Button>
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
                  <p className="font-medium">{giftCard.codigo}</p>
                  <p className="text-xs text-gray-500">{giftCard.fornecedorNome || `Fornecedor ID: ${giftCard.fornecedorId}`}</p>
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
              <p className="text-base font-bold">{selectedGiftCard.codigo}</p>
              <p className="text-sm">{selectedGiftCard.fornecedorNome || `Fornecedor ID: ${selectedGiftCard.fornecedorId}`}</p>
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