import React, { useState, useEffect } from 'react';
import { Card, Tag } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { format } from 'date-fns';

interface CardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardModal({ card, isOpen, onClose }: CardModalProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  const { data: tags } = useQuery({
    queryKey: card ? [`/api/cards/${card.id}/tags`] : null,
    enabled: !!card
  });

  useEffect(() => {
    if (card) {
      setIsFavorite(card.isFavorite);
    }
  }, [card]);

  const toggleFavorite = async () => {
    if (!card) return;
    
    try {
      setIsFavorite(!isFavorite);
      
      await apiRequest('PUT', `/api/cards/${card.id}`, {
        isFavorite: !isFavorite
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards/favorites'] });
      
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites',
        description: `${card.name} has been ${isFavorite ? 'removed from' : 'added to'} your favorites.`,
      });
    } catch (error) {
      setIsFavorite(!isFavorite); // Revert on error
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    }
  };

  if (!card) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Card Details</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          <div className="w-full md:w-1/2">
            <img 
              src={card.imageUrl} 
              alt={card.name} 
              className="w-full rounded-lg shadow-md" 
            />
          </div>
          
          <div className="w-full md:w-1/2">
            <h4 className="text-2xl font-bold text-slate-800 mb-2">{card.name}</h4>
            <div className="flex items-center mb-4">
              <Badge variant={getBadgeVariant(card.rarity)} className="whitespace-nowrap">
                {card.rarity}
              </Badge>
              <span className="mx-2">•</span>
              <span className="text-sm text-slate-600">{card.setName}</span>
              <span className="mx-2">•</span>
              <span className="text-sm text-slate-600">{card.setNumber}</span>
            </div>
            
            <div className="space-y-4">
              {card.description && (
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-1">Description</h5>
                  <p className="text-slate-700">{card.description}</p>
                </div>
              )}
              
              <div>
                <h5 className="text-sm font-medium text-slate-500 mb-1">Collection Info</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500">Added</span>
                    <p className="text-slate-700">
                      {format(new Date(card.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Condition</span>
                    <p className="text-slate-700">{card.condition}</p>
                  </div>
                  {card.purchasePrice && (
                    <div>
                      <span className="text-xs text-slate-500">Purchase Price</span>
                      <p className="text-slate-700">${card.purchasePrice.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-slate-500">Current Value</span>
                    <p className="text-green-600 font-medium">${card.price.toFixed(2)}</p>
                  </div>
                  {card.purchaseDate && (
                    <div>
                      <span className="text-xs text-slate-500">Purchase Date</span>
                      <p className="text-slate-700">
                        {format(new Date(card.purchaseDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {tags && tags.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-1">Tags</h5>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: Tag) => (
                      <span 
                        key={tag.id} 
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {card.notes && (
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-1">Notes</h5>
                  <p className="text-slate-700">{card.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end gap-3 mt-6">
          <Button variant="outline">
            Edit Card
          </Button>
          <Button 
            onClick={toggleFavorite}
            className="inline-flex items-center gap-1"
          >
            <Heart className={isFavorite ? 'fill-white' : ''} size={16} />
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
