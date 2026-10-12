import React, { useState, useEffect } from 'react';
import { Camera, Clock, CheckCircle2, Plus, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { CleaningTask } from '../../types';

const TITLE_SUGGESTIONS = [
  '🧺 The Mt. Everest of Laundry',
  '☕ Desk Mug & Paper Cemetery',
  '🍽️ Kitchen Sink Armageddon',
  '🛏️ Clothes Covered Bed Reset',
  '📦 Unopened Boxes & Mail Chaos',
];

export const ActiveTaskView: React.FC = () => {
  const [activeTask, setActiveTask] = useState<CleaningTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(20);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = async () => {
    setLoading(true);
    try {
      const task = await api.getMyActiveTask();
      setActiveTask(task);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      setError('Please upload a photo of your messy room or cleaning project.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('estimated_duration_minutes', duration.toString());
    formData.append('photo', photoFile);

    try {
      const newTask = await api.createCleaningTask(formData);
      setActiveTask(newTask);
      setIsCreating(false);
      // Reset form
      setTitle('');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cleaning challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!activeTask) return;
    try {
      await api.updateTask(activeTask.id, { status: 'completed' });
      setActiveTask(null);
    } catch (err: any) {
      alert(err.message || 'Error completing task');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              My Cleaning Challenge
            </h2>
            <p className="text-xs text-slate-400">
              Your active photo shown to potential body-doubling matches
            </p>
          </div>
          {activeTask && (
            <button
              onClick={() => setIsCreating(true)}
              className="p-2 rounded-xl bg-slate-800 text-indigo-400 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          )}
        </div>

        {activeTask ? (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {/* Task Image */}
            <div className="relative h-64 bg-slate-950">
              <img
                src={activeTask.photo_url}
                alt={activeTask.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{activeTask.estimated_duration_minutes}m Sprint</span>
              </div>
              <div className="absolute top-3 left-3 bg-emerald-500/90 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                Active in Feed
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1">{activeTask.title}</h3>
              {activeTask.description && (
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  "{activeTask.description}"
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleMarkComplete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Done & Celebrate 🎉</span>
                </button>
                <button
                  onClick={() => setIsCreating(true)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Replace Photo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Active Challenge</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              Snap a picture of the space you want to clean today. Other users will swipe on it to clean alongside you!
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Messy Space</span>
            </button>
          </div>
        )}

        {/* CREATE / UPLOAD MODAL */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Post Cleaning Challenge
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold p-1"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Photo Upload Area */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Messy Room Photo
                  </label>
                  <label className="relative flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/50 cursor-pointer overflow-hidden transition">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-center p-4">
                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-indigo-400">
                          Click to upload room picture
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">PNG, JPG or WebP (max 10MB)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Folding the laundry mountain"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {/* Suggestions Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {TITLE_SUGGESTIONS.map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTitle(sugg)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition"
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Estimated Sprint Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 20, 25, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(mins)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                          duration === mins
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Optional Motivation / Notes</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Looking for a silent body double to fold along with me!"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {submitting ? 'Uploading Challenge...' : 'Enter the Swipe Pool 🚀'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
