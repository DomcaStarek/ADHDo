import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../types';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

const AVAILABLE_TAGS = [
  { id: 'silent_body_doubling', label: '🤫 Silent Doubling' },
  { id: 'laundry_hater', label: '🧺 Laundry Hater' },
  { id: 'dish_hater', label: '🍽️ Dishes Nemesis' },
  { id: 'desk_clutter', label: '🖥️ Desk Disaster' },
  { id: 'gentle_encouragement', label: '💛 Gentle Encourager' },
  { id: 'music_vibes', label: '🎵 Music & Vibing' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [preferredDuration, setPreferredDuration] = useState(20);
  const [selectedTags, setSelectedTags] = useState<string[]>(['silent_body_doubling', 'laundry_hater']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        onSuccess(res.user);
      } else {
        const res = await api.register({
          email,
          password,
          display_name: displayName,
          bio,
          adhd_preferences: {
            cleaning_style: 'sprint',
            tags: selectedTags,
            preferred_duration: preferredDuration,
          },
        });
        setInfoMessage(res.message);
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // One-click demo login helper
  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        email: 'test@adhdo.app',
        password: 'Password123!',
      });
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 mb-3">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            ADHDo <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-medium">Body Doubling</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isLogin
              ? 'Swipe, match, and conquer your messy room together.'
              : 'Join the community of ADHD body doublers!'}
          </p>
        </div>

        {/* Quick Demo Banner */}
        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="w-full mb-5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600/30 to-pink-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white hover:border-indigo-400 font-semibold text-xs flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Quick Demo Login (Alex • 20m Sprint)</span>
        </button>

        {/* Tab switch */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sam ☕"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Short Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What cleaning task gives you executive dysfunction?"
                  rows={2}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Sprint Duration Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Preferred Sprint Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 20, 25, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setPreferredDuration(mins)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        preferredDuration === mins
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* ADHD Tags Chips */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your ADHD Habits & Styles</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                          active
                            ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 font-semibold'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@adhd-focus.org"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log In & Start Cleaning' : 'Create Free Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
