import React, { useState } from 'react';
import { LogOut, Clock, Sparkles, Edit2 } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../types';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

const ALL_TAGS = [
  'silent_body_doubling',
  'laundry_hater',
  'dish_hater',
  'desk_clutter',
  'gentle_encouragement',
  'music_vibes',
  '15min_burst',
  'plant_parent',
];

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio || '');
  const [preferredDuration, setPreferredDuration] = useState(
    user.adhd_preferences?.preferred_duration || 20
  );
  const [tags, setTags] = useState<string[]>(user.adhd_preferences?.tags || []);
  const [saving, setSaving] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateMe({
        display_name: displayName,
        bio,
        adhd_preferences: {
          cleaning_style: user.adhd_preferences?.cleaning_style || 'sprint',
          tags,
          preferred_duration: preferredDuration,
        },
      });
      onUpdateUser(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-black text-white mb-4">My ADHD Profile</h2>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg shadow-indigo-500/20">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user.display_name.charAt(0)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-white truncate">{user.display_name}</h3>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                <span>{user.adhd_preferences?.preferred_duration || 20}m Sprint Preference</span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {user.bio && (
            <p className="text-xs text-slate-300 italic mb-4 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              "{user.bio}"
            </p>
          )}

          {/* Tags */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-400 mb-2">My Cleaning Archetype & Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {user.adhd_preferences?.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-semibold"
                >
                  #{tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* EDIT PROFILE MODAL */}
        {isEditing && (
          <form
            onSubmit={handleSave}
            className="rounded-3xl bg-slate-900 border border-indigo-500/30 p-6 shadow-xl mb-4 space-y-4"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-400" />
              Edit Profile & ADHD Habits
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preferred Sprint Time (Minutes)
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

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                        active
                          ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 font-semibold'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      #{t.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2 px-3 rounded-xl bg-slate-800 text-slate-400 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
