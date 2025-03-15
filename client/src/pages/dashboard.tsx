import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@shared/schema';
import { Button } from '@/components/ui/button';
import CardGrid from '@/components/card-grid';
import CardModal from '@/components/card-modal';
import { Layers, BookOpen, Gem, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToggle } from '@/hooks/use-toggle';

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCardModalOpen, toggleCardModal] = useToggle(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get all cards
  const { data: cards, isLoading } = useQuery<Card[]>({
    queryKey: ['/api/cards', { userId: 1, category: selectedCategory }],
    queryFn: () => {
      const url = selectedCategory 
        ? `/api/cards?userId=1&collectionId=${selectedCategory}`
        : '/api/cards?userId=1';
      return fetch(url).then(res => res.json());
    },
  });

  // Get collections
  const { data: collections } = useQuery({
    queryKey: ['/api/collections', { userId: 1 }],
    queryFn: () => fetch('/api/collections?userId=1').then(res => res.json()),
  });

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    toggleCardModal(true);
  };

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  // Calculate statistics
  const totalCards = cards?.length || 0;
  const totalCollections = collections?.length || 0;
  const rarestCard = cards?.reduce((rarest, card) => {
    if (!rarest) return card;
    if (card.rarity === 'Power Nine' || card.rarity === 'Mythic Rare') return card;
    if (card.price > rarest.price) return card;
    return rarest;
  }, null as Card | null);
  
  const totalValue = cards?.reduce((sum, card) => sum + card.price, 0) || 0;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Collection</h1>
        
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
      
      {/* Categories Filter */}
      <div className="mb-6 overflow-x-auto pb-3">
        <div className="flex space-x-2">
          <Button 
            variant={selectedCategory === null ? 'default' : 'outline'}
            className={selectedCategory === null ? "px-4 py-2 rounded-full" : "px-4 py-2 rounded-full border border-slate-300"}
            onClick={() => handleCategoryClick(null)}
          >
            All Cards
          </Button>
          
          {collections?.map((collection) => (
            <Button
              key={collection.id}
              variant={selectedCategory === collection.id.toString() ? 'default' : 'outline'}
              className={selectedCategory === collection.id.toString() 
                ? "px-4 py-2 rounded-full" 
                : "px-4 py-2 rounded-full border border-slate-300"
              }
              onClick={() => handleCategoryClick(collection.id.toString())}
            >
              {collection.name}
            </Button>
          ))}
          
          <Button variant="outline" className="px-4 py-2 rounded-full border border-slate-300">
            Rare
          </Button>
          <Button variant="outline" className="px-4 py-2 rounded-full border border-slate-300">
            Common
          </Button>
          <Button variant="outline" className="px-4 py-2 rounded-full border border-slate-300">
            Foil
          </Button>
        </div>
      </div>
      
      {/* Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <p className="text-sm text-slate-500">Collections</p>
              <p className="text-xl font-bold text-slate-800">{totalCollections}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <BookOpen className="h-5 w-5 text-indigo-600" />
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
          <div className="loader">Loading...</div>
        </div>
      ) : cards && cards.length > 0 ? (
        <CardGrid cards={cards} onCardClick={handleCardClick} />
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-500">No cards found.</p>
          <Button className="mt-4">Add Your First Card</Button>
        </div>
      )}
      
      {/* Pagination */}
      {cards && cards.length > 0 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-500">
              <i className="fas fa-chevron-left"></i>
            </Button>
            <Button variant="default" className="px-3 py-2 rounded-md">1</Button>
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-700">2</Button>
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-700">3</Button>
            <span className="px-3 py-2 text-slate-400">...</span>
            <Button variant="ghost" className="px-3 py-2 rounded-md text-slate-700">12</Button>
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
