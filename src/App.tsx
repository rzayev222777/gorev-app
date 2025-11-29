import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { NoteDetail } from './pages/NoteDetail';
import { SharedNotes } from './pages/SharedNotes';
import { CreateNote } from './pages/CreateNote';
import { Settings } from './pages/Settings';

type View =
  | { type: 'dashboard' }
  | { type: 'note'; noteId: string }
  | { type: 'shared' }
  | { type: 'create' }
  | { type: 'settings' };

function AppContent() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [view, setView] = useState<View>({ type: 'dashboard' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <Login onToggle={() => setShowLogin(false)} />
    ) : (
      <Register onToggle={() => setShowLogin(true)} />
    );
  }

  switch (view.type) {
    case 'dashboard':
      return (
        <Dashboard
          onSelectNote={(noteId) => setView({ type: 'note', noteId })}
          onCreateNote={() => setView({ type: 'create' })}
          onViewShared={() => setView({ type: 'shared' })}
          onSettings={() => setView({ type: 'settings' })}
        />
      );
    case 'note':
      return (
        <NoteDetail
          noteId={view.noteId}
          onBack={() => setView({ type: 'dashboard' })}
        />
      );
    case 'shared':
      return (
        <SharedNotes
          onBack={() => setView({ type: 'dashboard' })}
          onSelectNote={(noteId) => setView({ type: 'note', noteId })}
        />
      );
    case 'create':
      return (
        <CreateNote
          onBack={() => setView({ type: 'dashboard' })}
          onCreated={(noteId) => setView({ type: 'note', noteId })}
        />
      );
    case 'settings':
      return (
        <Settings
          onBack={() => setView({ type: 'dashboard' })}
        />
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
