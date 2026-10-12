import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ArrowLeft,
  Send,
  MoreVertical,
  ShieldAlert,
  UserX,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type { MatchSummary, MatchDetail, Message } from '../../types';
import { soundEffects, triggerSprintCompleteConfetti } from '../../utils/celebration';

interface MatchesAndChatProps {
  initialMatchId?: string | null;
  onClearInitialMatchId?: () => void;
}

const QUICK_PROMPTS = [
  '⏱️ Starting my sprint now!',
  '🧺 Done with pile 1!',
  '💧 2m water & dopamine break',
  '🎉 Finished everything!',
];

export const MatchesAndChat: React.FC<MatchesAndChatProps> = ({
  initialMatchId,
  onClearInitialMatchId,
}) => {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);

  // Synchronized Sprint Timer State
  const [timerSeconds, setTimerSeconds] = useState(20 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load matches
  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getMatches();
      setMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (initialMatchId) {
      setActiveMatchId(initialMatchId);
    }
  }, [initialMatchId]);

  // Load active match detail & messages
  useEffect(() => {
    if (!activeMatchId) return;

    let isMounted = true;

    const fetchDetailAndMessages = async () => {
      try {
        const detail = await api.getMatchDetail(activeMatchId);
        if (isMounted) {
          setMatchDetail(detail);
          const sprintMinutes = detail.other_user_task?.estimated_duration_minutes || 20;
          setTimerSeconds(sprintMinutes * 60);
        }

        const msgRes = await api.getMessages(activeMatchId);
        if (isMounted) {
          setMessages(msgRes.items);
          scrollToBottom();
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchDetailAndMessages();

    // Setup WebSocket connection
    const token = localStorage.getItem('adhdo_access_token');
    if (token) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${token}&match_id=${activeMatchId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message') {
            setMessages((prev) => [...prev, payload.data]);
            scrollToBottom();
          } else if (payload.type === 'sprint_started') {
            const mins = payload.duration_minutes || 20;
            setTimerSeconds(mins * 60);
            setIsTimerRunning(true);
            soundEffects.playSprintBell();
          } else if (payload.type === 'unmatch') {
            alert('Your partner has unmatched from this session.');
            setActiveMatchId(null);
            loadMatches();
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onerror = (e) => console.error('WebSocket error:', e);
    }

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(timerIntervalRef.current);
    };
  }, [activeMatchId]);

  // Sprint Timer ticking logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            soundEffects.playSprintBell();
            triggerSprintCompleteConfetti();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeMatchId) return;

    if (!textToSend) setInputText('');

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            content: text,
          })
        );
      } else {
        // Fallback to REST
        const newMsg = await api.sendMessage(activeMatchId, text);
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const handleStartSprint = (durationMins: number = 20) => {
    setTimerSeconds(durationMins * 60);
    setIsTimerRunning(true);
    soundEffects.playSprintBell();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'start_sprint',
          duration_minutes: durationMins,
        })
      );
    }
  };

  const handleUnmatch = async () => {
    if (!activeMatchId) return;
    if (confirm('Are you sure you want to unmatch? This chat will be removed.')) {
      try {
        await api.unmatch(activeMatchId);
        setActiveMatchId(null);
        if (onClearInitialMatchId) onClearInitialMatchId();
        loadMatches();
      } catch (err: any) {
        alert(err.message || 'Error unmatching');
      }
    }
  };

  const handleBlock = async () => {
    if (!matchDetail) return;
    if (confirm(`Block ${matchDetail.other_user.display_name}? You will no longer see each other.`)) {
      try {
        await api.blockUser(matchDetail.other_user.id);
        setActiveMatchId(null);
        if (onClearInitialMatchId) onClearInitialMatchId();
        loadMatches();
      } catch (err: any) {
        alert(err.message || 'Error blocking user');
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- MATCHES LIST VIEW ---
  if (!activeMatchId) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-black text-white mb-1">Body Doubling Matches</h2>
          <p className="text-xs text-slate-400 mb-4">
            Mutual likes unlock direct chat to clean together in real time
          </p>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading your matches...</div>
          ) : matches.length === 0 ? (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center mt-6">
              <div className="w-12 h-12 rounded-full bg-pink-500/10 text-pink-400 mx-auto flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No Matches Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Head over to the swipe deck and like some cleaning challenges to get matched!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => (
                <div
                  key={m.match_id}
                  onClick={() => setActiveMatchId(m.match_id)}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center gap-3.5 group"
                >
                  {/* Avatar / Task thumbnail */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-indigo-600 shrink-0">
                    {m.matched_user_task?.photo_url ? (
                      <img
                        src={m.matched_user_task.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : m.matched_user.avatar_url ? (
                      <img
                        src={m.matched_user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white">
                        {m.matched_user.display_name.charAt(0)}
                      </div>
                    )}
                    {m.unread_count > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-slate-900" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition truncate">
                        {m.matched_user.display_name}
                      </h4>
                      <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.matched_user_task?.estimated_duration_minutes || 20}m
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {m.last_message ? m.last_message.content : m.matched_user_task?.title || 'Matched! Ready to clean'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 1-ON-1 ACTIVE CHAT VIEW ---
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 pb-16">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveMatchId(null);
              if (onClearInitialMatchId) onClearInitialMatchId();
              loadMatches();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-600 shrink-0">
            {matchDetail?.other_user_task?.photo_url ? (
              <img
                src={matchDetail.other_user_task.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                {matchDetail?.other_user.display_name.charAt(0) || 'P'}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {matchDetail?.other_user.display_name || 'Body Double'}
            </h3>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
              {matchDetail?.other_user_task?.title || 'Cleaning Challenge'}
            </p>
          </div>
        </div>

        {/* Safety Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSafetyMenu(!showSafetyMenu)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {showSafetyMenu && (
            <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1 text-xs">
              <button
                onClick={() => { setShowSafetyMenu(false); handleUnmatch(); }}
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <UserX className="w-4 h-4 text-slate-400" />
                <span>Unmatch</span>
              </button>
              <button
                onClick={() => { setShowSafetyMenu(false); handleBlock(); }}
                className="w-full px-3 py-2 text-left text-rose-400 hover:bg-slate-700 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Block & Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SYNCHRONIZED SPRINT TIMER BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Shared Sprint Timer
            </div>
            <div className="text-base font-black font-mono text-white tracking-wider">
              {formatTimer(timerSeconds)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {timerSeconds === 0 ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Sprint Complete!
            </span>
          ) : isTimerRunning ? (
            <button
              onClick={() => setIsTimerRunning(false)}
              className="py-1 px-3 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => handleStartSprint(20)}
              className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start 20m</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsTimerRunning(false);
              setTimerSeconds(20 * 60);
            }}
            title="Reset Timer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce-subtle" />
            <p className="text-xs font-semibold text-slate-300">You matched! 🧹</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Say hi, kick off a 20m sprint timer, and clean your rooms together!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id !== matchDetail?.other_user.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-none shadow-md shadow-indigo-600/10'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/80'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition active:scale-95 shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Type a message or cheer..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
