import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Cog, Menu } from 'lucide-react';
import { Link } from 'wouter';

interface TopNavigationProps {
  onMenuClick: () => void;
  onSearch: (term: string) => void;
}

export default function TopNavigation({ onMenuClick, onSearch }: TopNavigationProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Search bar */}
        <form className="flex-1 mx-4" onSubmit={handleSearch}>
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search your collection..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
          </div>
        </form>
        
        {/* Right navigation items */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="h-5 w-5 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" title="Acessar Dashboard" onClick={() => {
              // Abre o webview para visualizar a aplicação
              window.open('https://replit.com/@lalvim1/workspace?v=1', '_blank');
            }}>
              <Cog className="h-5 w-5 text-slate-600" />
            </Button>
          <Button variant="ghost" size="icon" className="md:hidden" title="Profile">
            <img src="https://i.pravatar.cc/40?img=68" alt="User avatar" className="w-8 h-8 rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
