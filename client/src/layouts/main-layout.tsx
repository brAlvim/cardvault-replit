import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Sidebar from '@/components/sidebar';
import TopNavigation from '@/components/top-navigation';
import MobileSidebar from '@/components/mobile-sidebar';
import SearchResults from '@/components/search-results';
import { Fornecedor } from '@shared/schema';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [location] = useLocation();
  
  // Verificar se estamos na página de login
  const isLoginPage = location === '/login';
  
  // Verificar se há um token no localStorage
  const isAuthenticated = !!localStorage.getItem('token');
  
  // Obter dados somente se autenticado
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: isAuthenticated && !isLoginPage,
  });
  
  // Get collections somente se autenticado
  const { data: collections } = useQuery<Fornecedor[]>({
    queryKey: ['/api/collections'],
    enabled: isAuthenticated && !isLoginPage,
  });

  const getUserData = () => {
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      try {
        return JSON.parse(userFromStorage);
      } catch (e) {
        return null;
      }
    }
    return userData;
  };

  const user = getUserData();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    // Apenas exibe o modal de pesquisa se o termo tiver pelo menos 3 caracteres
    if (term.length >= 3) {
      setIsSearchOpen(true);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  // Layout simplificado para a página de login
  if (isLoginPage) {
    return (
      <div className="h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // Layout completo para o restante da aplicação
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar (Desktop) */}
      <Sidebar 
        collections={collections || []} 
        user={user}
      />
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        collections={collections || []}
        user={user}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <TopNavigation 
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onSearch={handleSearch}
        />
        
        {/* Modal de resultados de pesquisa */}
        <SearchResults
          searchTerm={searchTerm}
          isOpen={isSearchOpen}
          onClose={closeSearch}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
