import React from 'react';

export default function PreferencesPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6">Préférences</h1>
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-slate-400 mb-2">Thème</label>
            <select className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700">
              <option>Système</option>
              <option>Clair</option>
              <option>Sombre</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-2">Langue</label>
            <select className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700">
              <option>Français</option>
              <option>English</option>
            </select>
          </div>
          <div className="mt-8 flex justify-end">
            <button className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
