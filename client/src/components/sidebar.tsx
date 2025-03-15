import { Collection } from '@shared/schema';
import { Link, useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  collections: Collection[];
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
            <Link href="/">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-home w-5 text-center"></i>
                <span>Dashboard</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location.includes('/collection') ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-layer-group w-5 text-center"></i>
                <span>My Collection</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/favorites">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/favorites' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-star w-5 text-center"></i>
                <span>Favorites</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/categories">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/categories' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-tag w-5 text-center"></i>
                <span>Categories</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/trades">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/trades' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-exchange-alt w-5 text-center"></i>
                <span>Trades</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/statistics">
              <a className={`flex items-center space-x-3 p-2 rounded-lg ${
                location === '/statistics' ? 'bg-blue-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'
              } transition-colors`}>
                <i className="fas fa-chart-line w-5 text-center"></i>
                <span>Statistics</span>
              </a>
            </Link>
          </li>
        </ul>
        
        {collections && collections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Collections</h3>
            <ul className="space-y-1">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <Link href={`/collection/${collection.id}`}>
                    <a className={`flex items-center justify-between p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors ${
                      location === `/collection/${collection.id}` ? 'bg-slate-100' : ''
                    }`}>
                      <span>{collection.name}</span>
                      <Badge variant="default" className="text-xs rounded-full px-2 py-1 bg-blue-100 text-primary">
                        {/* We'd compute this from actual card count */}
                        {collection.id === 1 ? '145' : collection.id === 2 ? '87' : '63'}
                      </Badge>
                    </a>
                  </Link>
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
