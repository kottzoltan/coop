import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { RequireBelso } from '../components/RequireBelso';

export function AppLayout() {
  return (
    <RequireBelso>
      <div className="flex min-h-screen bg-cream">
        <Sidebar />
        <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </RequireBelso>
  );
}
