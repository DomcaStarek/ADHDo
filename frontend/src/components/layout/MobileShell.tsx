import React from 'react';
import { Flame, Camera, MessageSquare, User as UserIcon, Sparkles } from 'lucide-react';

interface MobileShellProps {
  currentTab: 'swipe' | 'task' | 'chat' | 'profile';
  onTabChange: (tab: 'swipe' | 'task' | 'chat' | 'profile') => void;
  unreadCount?: number;
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  currentTab,
  onTabChange,
  unreadCount = 0,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center sm:py-6">
      {/* Mobile Frame Container */}
      <div className="w-full sm:max-w-md h-screen sm:h-[860px] bg-slate-950 sm:rounded-[40px] sm:border sm:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative sm:ring-1 sm:ring-slate-700/50">
        {/* Top App Header */}
        <header className="px-5 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-tight flex items-center gap-1.5">
                ADHDo <span className="text-[10px] font-semibold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full border border-pink-500/20">Clean Match</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-400">Live Body Doubling</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>

        {/* Bottom Tab Bar */}
        <nav className="absolute bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-6 py-2.5 flex items-center justify-around z-30">
          {/* Swipe Tab */}
          <button
            onClick={() => onTabChange('swipe')}
            className={`flex flex-col items-center gap-1 transition ${
              currentTab === 'swipe' ? 'text-pink-500 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${currentTab === 'swipe' ? 'bg-pink-500/15' : ''}`}>
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Swipe</span>
          </button>

          {/* My Task Tab */}
          <button
            onClick={() => onTabChange('task')}
            className={`flex flex-col items-center gap-1 transition ${
              currentTab === 'task' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${currentTab === 'task' ? 'bg-indigo-500/15' : ''}`}>
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px]">My Room</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => onTabChange('chat')}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentTab === 'chat' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${currentTab === 'chat' ? 'bg-indigo-500/15' : ''}`}>
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-slate-900" />
              )}
            </div>
            <span className="text-[10px]">Matches</span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => onTabChange('profile')}
            className={`flex flex-col items-center gap-1 transition ${
              currentTab === 'profile' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition ${currentTab === 'profile' ? 'bg-indigo-500/15' : ''}`}>
              <UserIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
