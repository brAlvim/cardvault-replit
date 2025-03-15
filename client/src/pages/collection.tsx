import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Collection } from '@shared/schema';
import { Button } from '@/components/ui/button';
import CardGrid from '@/components/card-grid';
import CardModal from '@/components/card-modal';
import { useToggle } from '@/hooks/use-toggle';
import { useLocation } from 'wouter';
import { Layers, BookOpen, Gem, DollarSign } from 'lucide-react';

interface CollectionPageProps {
  params: {
    id: string;
  };
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const collectionId = parseInt(params.id);
  const [_, setLocation] = useLocation();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCardModalOpen, toggleCardModal] = useToggle(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get collection details
  const { data: collection, isLoading: isLoadingCollection } = useQuery<Collection>({
    queryKey: [`/api/collections/${collectionId}`],
    queryFn: () => fetch(`/api/collections/${collectionId}`).then(res => res.json()),
  });

  // Get cards in this collection
  const { data: cards, isLoading } = useQuery<Card[]>({
    queryKey: ['/api/cards', { userId: 1, collectionId }],
    queryFn: () => fetch(`/api/cards?userId=1&collectionId=${collectionId}`).then(res => res.json()),
    enabled: !!collectionId,
  });

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    toggleCardModal(true);
  };

  // Calculate statistics
  const totalCards = cards?.length || 0;
  const rarestCard = cards?.reduce((rarest, card) => {
    if (!rarest) return card;
    if (card.rarity === 'Power Nine' || card.rarity === 'Mythic Rare') return card;
    if (card.price > rarest.price) return card;
    return rarest;
  }, null as Card | null);
  
  const totalValue = cards?.reduce((sum, card) => sum + card.price, 0) || 0;

  if (isLoadingCollection) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="loader">Loading collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Collection Not Found</h2>
        <p className="text-slate-500 mb-6">The collection you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => setLocation('/')}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{collection.name}</h1>
        
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center justify-center p-1 bg-slate-200 rounded-lg">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm"
              className={viewMode === 'grid' ? 'px-3 py-1 rounded-md bg-white shadow-sm text-slate-800' : 'px-3 py-1 rounded-md text-slate-600'}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <i className="fas fa-th-large"></i>
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm"
              className={viewMode === 'list' ? 'px-3 py-1 rounded-md bg-white shadow-sm text-slate-800' : 'px-3 py-1 rounded-md text-slate-600'}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <i className="fas fa-list"></i>
            </Button>
          </div>
          
          {/* Filters dropdown */}
          <Button variant="outline" className="inline-flex items-center space-x-2">
            <i className="fas fa-filter text-slate-600"></i>
            <span>Filters</span>
          </Button>
          
          {/* Sort dropdown */}
          <Button variant="outline" className="inline-flex items-center space-x-2">
            <i className="fas fa-sort text-slate-600"></i>
            <span>Sort</span>
          </Button>
          
          {/* Add Card Button */}
          <Button className="inline-flex items-center space-x-2">
            <i className="fas fa-plus"></i>
            <span>Add Card</span>
          </Button>
        </div>
      </div>
      
      {collection.description && (
        <div className="mb-6">
          <p className="text-slate-600">{collection.description}</p>
        </div>
      )}
      
      {/* Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Cards</p>
              <p className="text-xl font-bold text-slate-800">{totalCards}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Layers className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Rarest Card</p>
              <p className="text-xl font-bold text-slate-800 truncate max-w-[180px]">
                {rarestCard?.name || 'None'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Gem className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Est. Value</p>
              <p className="text-xl font-bold text-slate-800">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="loader">Loading cards...</div>
        </div>
      ) : cards && cards.length > 0 ? (
        <CardGrid cards={cards} onCardClick={handleCardClick} />
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500">No cards found in this collection.</p>
          <Button className="mt-4">Add Your First Card</Button>
        </div>
      )}
      
      {/* Pagination */}
      {cards && cards.length > 6 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-500">
              <i className="fas fa-chevron-left"></i>
            </Button>
            <Button variant="default" className="px-3 py-2 rounded-md">1</Button>
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-700">2</Button>
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-500">
              <i className="fas fa-chevron-right"></i>
            </Button>
          </nav>
        </div>
      )}
      
      {/* Card Modal */}
      <CardModal
        card={selectedCard}
        isOpen={isCardModalOpen}
        onClose={() => toggleCardModal(false)}
      />
    </div>
  );
}
