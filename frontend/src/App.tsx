import React, { useState, useEffect } from 'react';
import { MobileShell } from './components/layout/MobileShell';
import { AuthModal } from './features/auth/AuthModal';
import { SwipeDeck } from './features/swipe/SwipeDeck';
import { ActiveTaskView } from './features/tasks/ActiveTaskView';
import { MatchesAndChat } from './features/chat/MatchesAndChat';
import { ProfileView } from './features/profile/ProfileView';
import type { User } from './types';
import { api } from './services/api';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<'swipe' | 'task' | 'chat' | 'profile'>('swipe');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [loadingInitialUser, setLoadingInitialUser] = useState(true);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Restore user session
  useEffect(() => {
    const savedUser = localStorage.getItem('adhdo_current_user');
    const token = localStorage.getItem('adhdo_access_token');

    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        // Refresh profile in background
        api.getMe()
          .then((u) => {
            setCurrentUser(u);
            localStorage.setItem('adhdo_current_user', JSON.stringify(u));
          })
          .catch(() => {
            // keep stored or let interceptor handle
          });
      } catch {
        api.clearTokens();
      }
    }
    setLoadingInitialUser(false);

    // Listen to session expiry
    const onAuthExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('adhdo:auth_expired', onAuthExpired);
    return () => window.removeEventListener('adhdo:auth_expired', onAuthExpired);
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('adhdo_current_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('swipe');
  };

  const handleOpenMatchChat = (matchId: string) => {
    setActiveMatchId(matchId);
    setCurrentTab('chat');
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;
    setResendingVerification(true);
    setVerificationFeedback(null);
    try {
      await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      setVerificationFeedback('Verification link sent! Check your email / backend console.');
    } catch {
      setVerificationFeedback('Failed to resend. Please try again.');
    } finally {
      setResendingVerification(false);
    }
  };

  if (loadingInitialUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <MobileShell
      currentTab={currentTab}
      onTabChange={(tab) => {
        if (tab !== 'chat') {
          setActiveMatchId(null);
        }
        setCurrentTab(tab);
      }}
    >
      {/* Unverified Email Alert Banner (if needed) */}
      {!currentUser.is_verified && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-[11px] text-amber-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Please verify your email to unlock all features</span>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendingVerification}
            className="font-bold underline text-amber-300 hover:text-white shrink-0 ml-2"
          >
            {resendingVerification ? 'Sending...' : 'Resend'}
          </button>
        </div>
      )}

      {verificationFeedback && (
        <div className="bg-indigo-500/20 px-4 py-1.5 text-[11px] text-indigo-300 text-center shrink-0">
          {verificationFeedback}
        </div>
      )}

      {/* Tabs */}
      {currentTab === 'swipe' && (
        <SwipeDeck onOpenMatchChat={handleOpenMatchChat} />
      )}

      {currentTab === 'task' && (
        <ActiveTaskView />
      )}

      {currentTab === 'chat' && (
        <MatchesAndChat
          initialMatchId={activeMatchId}
          onClearInitialMatchId={() => setActiveMatchId(null)}
        />
      )}

      {currentTab === 'profile' && (
        <ProfileView
          user={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem('adhdo_current_user', JSON.stringify(updated));
          }}
          onLogout={handleLogout}
        />
      )}
    </MobileShell>
  );
};

export default App;
