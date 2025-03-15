import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/sidebar';
import TopNavigation from '@/components/top-navigation';
import MobileSidebar from '@/components/mobile-sidebar';
import { Collection } from '@shared/schema';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get user
  const { data: user } = useQuery({
    queryKey: ['/api/users/1'], // Hardcoded for now, would normally be the logged-in user
  });

  // Get collections
  const { data: collections } = useQuery<Collection[]>({
    queryKey: ['/api/collections', { userId: 1 }], // Hardcoded for now
    queryFn: () => fetch('/api/collections?userId=1').then(res => res.json()),
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Search functionality would be implemented in the specific page components
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar (Desktop) */}
      <Sidebar 
        collections={collections || []} 
        user={user || { username: 'Mark Johnson', email: 'mark@example.com', avatarUrl: 'https://i.pravatar.cc/40?img=68' }}
      />
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        collections={collections || []}
        user={user || { username: 'Mark Johnson', email: 'mark@example.com', avatarUrl: 'https://i.pravatar.cc/40?img=68' }}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <TopNavigation 
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onSearch={handleSearch}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
