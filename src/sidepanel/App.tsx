import { useState } from 'react';
import { Dashboard } from './routes/Dashboard';
import { Record } from './routes/Record';
import { Upload } from './routes/Upload';
import { Meeting } from './routes/Meeting';
import { Settings } from './routes/Settings';
import { Nav } from './components/Nav';

export type RouteKey = 'dashboard' | 'record' | 'upload' | 'meeting' | 'settings';

export function App() {
  const [route, setRoute] = useState<RouteKey>('dashboard');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

  const openMeeting = (id: string) => {
    setActiveMeetingId(id);
    setRoute('meeting');
  };

  return (
    <div className="app-shell">
      <Nav active={route} onNavigate={setRoute} />
      <main className="app-main">
        {route === 'dashboard' && <Dashboard onOpenMeeting={openMeeting} />}
        {route === 'record' && <Record onMeetingCreated={openMeeting} />}
        {route === 'upload' && <Upload onMeetingCreated={openMeeting} />}
        {route === 'meeting' && (
          <Meeting meetingId={activeMeetingId} onBack={() => setRoute('dashboard')} />
        )}
        {route === 'settings' && <Settings />}
      </main>
    </div>
  );
}
