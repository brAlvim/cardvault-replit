import { useState } from 'react';
import { Card } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export default function CardGrid({ cards, onCardClick }: CardGridProps) {
  const [loadingFavorites, setLoadingFavorites] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const getBadgeVariant = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'default';
      case 'rare':
        return 'green';
      case 'ultra rare':
        return 'purple';
      case 'mythic rare':
        return 'blue';
      case 'power nine':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const toggleFavorite = async (card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (loadingFavorites.has(card.id)) return;
    
    try {
      setLoadingFavorites(prev => new Set(prev).add(card.id));
      
      await apiRequest('PUT', `/api/cards/${card.id}`, {
        isFavorite: !card.isFavorite
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards/favorites'] });
      
      toast({
        title: card.isFavorite ? 'Removed from favorites' : 'Added to favorites',
        description: `${card.name} has been ${card.isFavorite ? 'removed from' : 'added to'} your favorites.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    } finally {
      setLoadingFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.id);
        return newSet;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md transform hover:-translate-y-1 cursor-pointer"
          onClick={() => onCardClick(card)}
        >
          <div className="relative pb-3">
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-60 object-contain p-3 bg-slate-50"
            />
            <button
              className={`absolute top-2 right-2 w-8 h-8 bg-white bg-opacity-70 rounded-full flex items-center justify-center transition-colors ${
                card.isFavorite ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
              } ${loadingFavorites.has(card.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => toggleFavorite(card, e)}
              disabled={loadingFavorites.has(card.id)}
            >
              <Heart className={card.isFavorite ? 'fill-current' : ''} size={16} />
            </button>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-slate-800 truncate">{card.name}</h3>
              <Badge variant={getBadgeVariant(card.rarity)} className="ml-2 whitespace-nowrap">
                {card.rarity}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-slate-500 mb-3">
              <span className="truncate">{card.setName}</span>
              <span className="mx-2">•</span>
              <span>{card.setNumber}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-900">${card.price.toFixed(2)}</span>
              <div className="flex space-x-1">
                <button className="p-2 text-slate-500 hover:text-primary">
                  <i className="fas fa-edit"></i>
                </button>
                <button className="p-2 text-slate-500 hover:text-primary">
                  <i className="fas fa-search-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
