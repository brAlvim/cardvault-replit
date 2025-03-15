import { Fornecedor } from '@shared/schema';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Store, Tag, Receipt, BarChart3, Home } from 'lucide-react';

interface SidebarProps {
  collections: any[]; // Temporário - será atualizado para Fornecedor[]
  user: { username: string; email: string; avatarUrl: string } | null;
}

export default function Sidebar({ collections, user }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 transition-all duration-300">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <img src="/logo.svg" alt="CardVault Logo" className="w-10 h-10 rounded" />
          <h1 className="text-xl font-bold text-slate-800">CardVault</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto sidebar-scroll p-4">
        <ul className="space-y-2">
          <li>
            <a 
              href="/"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a 
              href="/gift-cards"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/gift-cards') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Gift Cards</span>
            </a>
          </li>
          <li>
            <a 
              href="/fornecedores"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/fornecedores') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <Store className="h-4 w-4" />
              <span>Fornecedores</span>
            </a>
          </li>
          <li>
            <a 
              href="/transacoes"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/transacoes') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <Receipt className="h-4 w-4" />
              <span>Transações</span>
            </a>
          </li>
          <li>
            <a 
              href="/tags"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/tags') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <Tag className="h-4 w-4" />
              <span>Tags</span>
            </a>
          </li>
          <li>
            <a 
              href="/relatorios"
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/relatorios') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Relatórios</span>
            </a>
          </li>
        </ul>
        
        {collections && collections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Fornecedores</h3>
            <ul className="space-y-1">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <a 
                    href={`/fornecedores/${collection.id}`} 
                    className={`flex items-center justify-between p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${
                      location === `/fornecedores/${collection.id}` ? 'bg-slate-100' : ''
                    }`}
                  >
                    <span>{collection.name || collection.nome || 'Fornecedor'}</span>
                    <Badge variant="default" className="text-xs rounded-full px-2 py-1 bg-blue-100 text-primary">
                      {/* Quantidade de gift cards por fornecedor - implementação futura */}
                      {collection.id % 2 === 0 ? '2' : '3'}
                    </Badge>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
      
      {user && (
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 text-slate-600">
            <img src={user.avatarUrl} alt="User avatar" className="w-8 h-8 rounded-full" />
            <div>
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
