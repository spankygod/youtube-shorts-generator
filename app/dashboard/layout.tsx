'use client';

import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <div className="w-64 bg-[#18181b] text-white p-4 hidden md:block">
        <div className="mb-8">
          <h1 className="text-xl font-bold">Lily Shorts</h1>
        </div>
        
        <nav className="space-y-1">
          <Link 
            href="/dashboard/shorts" 
            className={`flex items-center px-4 py-2 rounded-md ${
              pathname === '/dashboard/shorts' ? 'bg-[#27272a]' : 'hover:bg-[#232326]'
            }`}
          >
            <span>Shorts</span>
          </Link>
          
          <Link 
            href="/dashboard/assets" 
            className={`flex items-center px-4 py-2 rounded-md ${
              pathname === '/dashboard/assets' ? 'bg-[#27272a]' : 'hover:bg-[#232326]'
            }`}
          >
            <span>Add Assets</span>
          </Link>
        </nav>
      </div>

      {/* Mobile sidebar toggle - would be implemented with state */}
      <div className="md:hidden fixed bottom-4 right-4 z-10">
        <button className="bg-[#27272a] text-white p-3 rounded-full shadow-lg">
          Menu
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}