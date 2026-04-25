import React from 'react';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-6">Mon Profil</h1>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {/* Avatar ou initiales */}
              A
            </div>
            <div>
              <div className="text-xl font-semibold text-white">Nom Prénom</div>
              <div className="text-slate-400">admin@email.com</div>
              <div className="text-slate-400 text-sm mt-1">Rôle : Administrateur</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <div className="text-slate-500 text-xs">Date de création</div>
              <div className="text-white font-medium">01/01/2024</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Dernière connexion</div>
              <div className="text-white font-medium">25/04/2026</div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">Modifier le profil</button>
          </div>
        </div>
      </div>
    </div>
  );
}
