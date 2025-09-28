import { redirect } from 'next/navigation';
import TTSTester from '../components/TTSTester';

export default function DashboardPage() {
  // This is the main dashboard wrapper, set the background for the main area
  return (
    <main className="flex-1 overflow-auto p-4 min-h-screen" style={{ background: '#080808' }}>
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div>
            <TTSTester />
          </div>
          
          {/* Right column - can be used for other features */}
          <div>
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Recent Shorts</h2>
              <p className="text-gray-600">
                This is a placeholder for recent shorts you've created.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}