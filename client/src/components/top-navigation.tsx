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
              placeholder="Buscar gift cards, fornecedores ou transações..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e);
                }
              }}
            />
            <div className="absolute left-3 top-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </div>
          </div>
        </form>
        
        {/* Right navigation items */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="h-5 w-5 text-slate-600" />
          </Button>
          <Link to="/user-profiles">
            <Button variant="ghost" size="icon" title="Perfis e Usuários">
              <Cog className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" title="Profile">
            <img src="https://i.pravatar.cc/40?img=68" alt="User avatar" className="w-8 h-8 rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
