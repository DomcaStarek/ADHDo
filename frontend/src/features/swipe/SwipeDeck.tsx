import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, Sparkles, Clock, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { FeedItem, MatchData } from '../../types';
import { triggerMatchConfetti, soundEffects } from '../../utils/celebration';

interface SwipeDeckProps {
  onOpenMatchChat: (matchId: string) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({ onOpenMatchChat }) => {
  const [deck, setDeck] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPopup, setMatchPopup] = useState<MatchData | null>(null);

  // Drag gesture states
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.getFeed();
      setDeck(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load cleaning challenges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleSwipe = async (action: 'like' | 'pass') => {
    if (deck.length === 0) return;
    const currentItem = deck[0];

    // Sound feedback
    if (action === 'like') {
      soundEffects.playLikeChime();
    } else {
      soundEffects.playPassWhoosh();
    }

    // Optimistically advance card deck
    setDeck((prev) => prev.slice(1));
    setDragOffset({ x: 0, y: 0 });

    try {
      const result = await api.swipe(currentItem.task_id, action);
      if (result.is_match && result.match_data) {
        soundEffects.playMatchFanfare();
        triggerMatchConfetti();
        setMatchPopup(result.match_data);
      }
    } catch (err) {
      // Swipes failure silently or log
      console.error('Swipe error', err);
    }
  };

  // Touch / pointer handlers for card swipe physics
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged sufficiently to the right (>120px) => LIKE
    if (dragOffset.x > 120) {
      handleSwipe('like');
    } else if (dragOffset.x < -120) {
      // If dragged sufficiently to the left (<-120px) => PASS
      handleSwipe('pass');
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center animate-spin mb-4">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-300">Finding messy rooms near you...</p>
        <p className="text-xs text-slate-500 mt-1">Filtering active body-doubling challenges</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <p className="text-sm font-semibold text-rose-300">{error}</p>
        <button
          onClick={loadFeed}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (deck.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-pink-400" />
        </div>
        <h3 className="text-lg font-bold text-white">You're All Caught Up!</h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          No more active cleaning challenges right now. Check back soon or upload your own room to get matched!
        </p>
        <button
          onClick={loadFeed}
          className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition active:scale-95 flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Deck
        </button>
      </div>
    );
  }

  const current = deck[0];
  const next = deck[1];

  // Rotation calculated from drag distance
  const rotateDeg = dragOffset.x * 0.08;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden select-none px-4 pb-20 pt-2">
      {/* Cards Deck Container */}
      <div className="relative flex-1 w-full max-w-sm mx-auto flex items-center justify-center min-h-[460px]">
        {/* Next card in background (preview) */}
        {next && (
          <div className="absolute inset-0 scale-95 opacity-50 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 pointer-events-none transform translate-y-3">
            <img
              src={next.photo_url}
              alt={next.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Top Active Card */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotateDeg}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            touchAction: 'none',
          }}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800 cursor-grab active:cursor-grabbing flex flex-col"
        >
          {/* Swipe indicator overlays */}
          {dragOffset.x > 30 && (
            <div
              style={{ opacity: Math.min(dragOffset.x / 100, 1) }}
              className="absolute top-6 left-6 z-20 px-4 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/30 text-emerald-300 font-black text-lg tracking-wider rotate-[-15deg]"
            >
              CLEAN TOGETHER 🧹
            </div>
          )}
          {dragOffset.x < -30 && (
            <div
              style={{ opacity: Math.min(-dragOffset.x / 100, 1) }}
              className="absolute top-6 right-6 z-20 px-4 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-500/30 text-rose-300 font-black text-lg tracking-wider rotate-[15deg]"
            >
              PASS 💨
            </div>
          )}

          {/* Photo */}
          <div className="relative h-[65%] w-full bg-slate-950">
            <img
              src={current.photo_url}
              alt={current.title}
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />

            {/* Duration Badge */}
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-full text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-md">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{current.estimated_duration_minutes}m Sprint</span>
            </div>
          </div>

          {/* Task & User Details */}
          <div className="flex-1 p-4 flex flex-col justify-between bg-slate-900">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {current.user.avatar_url ? (
                    <img src={current.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    current.user.display_name.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {current.user.display_name}
                  </h4>
                  <p className="text-[11px] text-slate-400">Needs a body-doubling partner</p>
                </div>
              </div>

              <h3 className="text-base font-extrabold text-white line-clamp-1 mt-1">
                {current.title}
              </h3>
              {current.description && (
                <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                  "{current.description}"
                </p>
              )}
            </div>

            {/* ADHD Preferences / Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {current.user.adhd_preferences?.tags?.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-medium"
                >
                  #{tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Swipe Action Buttons */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {/* Pass Button */}
        <button
          onClick={() => handleSwipe('pass')}
          className="w-14 h-14 rounded-full bg-slate-800/90 border border-slate-700 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 flex items-center justify-center shadow-lg transition active:scale-90"
          title="Pass"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Clean Together / Like Button */}
        <button
          onClick={() => handleSwipe('like')}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-pink-500/30 hover:opacity-95 transition active:scale-90 animate-bounce-subtle"
          title="Match & Clean Together"
        >
          <Heart className="w-8 h-8 fill-white" />
        </button>
      </div>

      {/* MUTUAL MATCH MODAL */}
      {matchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            {/* Background sparkle blur */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-500/20 text-pink-400 mb-3 animate-bounce">
              <Sparkles className="w-6 h-6 fill-pink-400" />
            </div>

            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">
              IT'S A MATCH! 🧹
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              You and <span className="font-bold text-white">{matchPopup.matched_with.display_name}</span> liked each other's cleaning challenges!
            </p>

            {/* Matched User Mini-card */}
            <div className="my-5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-700 shrink-0">
                {matchPopup.their_task?.photo_url ? (
                  <img src={matchPopup.their_task.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-indigo-400">
                    {matchPopup.matched_with.display_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {matchPopup.their_task?.title || "Cleaning Sprint"}
                </p>
                <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {matchPopup.their_task?.estimated_duration_minutes || 20}m Body Doubling Sprint
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const id = matchPopup.match_id;
                setMatchPopup(null);
                onOpenMatchChat(id);
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-95 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start Cleaning Chat Now</span>
            </button>

            <button
              onClick={() => setMatchPopup(null)}
              className="w-full mt-2.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
