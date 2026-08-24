import React from 'react';
import { createPortal } from 'react-dom';
import { Target, X } from 'lucide-react';
import { ClientDemand } from '@/types';

interface AddDemandModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  demandForm: Partial<ClientDemand>;
  setDemandForm: React.Dispatch<React.SetStateAction<Partial<ClientDemand>>>;
  demandErrors: Record<string, string>;
  setDemandErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const AddDemandModal: React.FC<AddDemandModalProps> = ({
  show,
  onClose,
  onSubmit,
  demandForm,
  setDemandForm,
  demandErrors,
  setDemandErrors
}) => {
  if (!show) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-brand-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all duration-300 border border-gray-100/50 scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-orange-50/50 flex-shrink-0">
          <h3 className="text-lg font-serif font-bold text-brand-dark flex items-center">
            <Target className="mr-2 text-orange-500 animate-bounce" size={22} />
            Nouvelle Demande Client
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demand-client-name" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Nom Client *
                </label>
                <input
                  id="demand-client-name"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="name"
                  value={demandForm.clientName || ''}
                  onChange={(e) => {
                    const formatted = e.target.value.replace(/(?:^|\s)\S/g, (match) => match.toUpperCase());
                    setDemandForm({ ...demandForm, clientName: formatted });
                    if (formatted.trim().length >= 2)
                      setDemandErrors((prev) => ({ ...prev, clientName: '' }));
                  }}
                  placeholder="Nom du client"
                  className={`w-full px-4 py-2.5 border rounded-2xl focus:ring-2 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm ${
                    demandErrors.clientName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                />
                {demandErrors.clientName && <p className="text-red-500 text-xs mt-1 font-medium">{demandErrors.clientName}</p>}
              </div>
              <div>
                <label htmlFor="demand-phone" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Téléphone
                </label>
                <input
                  id="demand-phone"
                  type="text"
                  value={demandForm.phone || ''}
                  onChange={(e) => setDemandForm({ ...demandForm, phone: e.target.value })}
                  placeholder="Téléphone"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="demand-description" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Description / Recherche *
              </label>
              <textarea
                id="demand-description"
                value={demandForm.description || ''}
                onChange={(e) => {
                  setDemandForm({ ...demandForm, description: e.target.value });
                  if (e.target.value.trim().length > 0) setDemandErrors((prev) => ({ ...prev, description: '' }));
                }}
                rows={2}
                placeholder="Ex: Cherche villa avec piscine..."
                className={`w-full px-4 py-2.5 border rounded-2xl focus:ring-2 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm ${
                  demandErrors.description
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                }`}
              />
              {demandErrors.description && <p className="text-red-500 text-xs mt-1 font-medium">{demandErrors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demand-location" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Localisation *
                </label>
                <input
                  id="demand-location"
                  type="text"
                  value={demandForm.location || ''}
                  onChange={(e) => {
                    setDemandForm({ ...demandForm, location: e.target.value });
                    if (e.target.value.trim().length > 0) setDemandErrors((prev) => ({ ...prev, location: '' }));
                  }}
                  placeholder="Ex: La Marsa, Tunis..."
                  className={`w-full px-4 py-2.5 border rounded-2xl focus:ring-2 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm ${
                    demandErrors.location
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                />
                {demandErrors.location && <p className="text-red-500 text-xs mt-1 font-medium">{demandErrors.location}</p>}
              </div>
              <div>
                <label htmlFor="demand-budget" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Budget Max (DT)
                </label>
                <input
                  id="demand-budget"
                  type="text"
                  value={demandForm.budget ? demandForm.budget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\s/g, '');
                    if (/^\d*$/.test(raw)) {
                      setDemandForm({ ...demandForm, budget: raw ? parseFloat(raw) : 0 });
                    }
                  }}
                  placeholder="Ex: 500 000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Type de transaction *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: 'sale',
                      label: '🔑 Achat',
                      active: 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm shadow-orange-100',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-orange-200 hover:bg-orange-50/50'
                    },
                    {
                      value: 'rent',
                      label: '🏠 Location',
                      active: 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm shadow-orange-100',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-orange-200 hover:bg-orange-50/50'
                    }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDemandForm({ ...demandForm, contractType: opt.value })}
                    className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition-all duration-200 text-center ${
                      demandForm.contractType === opt.value ? opt.active : opt.inactive
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Type de bien *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(
                  [
                    { value: 'appartement', label: 'Appartement', emoji: '🏢' },
                    { value: 'villa', label: 'Villa', emoji: '🏡' },
                    { value: 'terrain', label: 'Terrain', emoji: '🌿' },
                    { value: 'bureau', label: 'Bureau', emoji: '💼' },
                    { value: 'commerce', label: 'Commerce', emoji: '🏪' }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDemandForm({ ...demandForm, type: opt.value })}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl border-2 text-xs font-bold transition-all duration-200 ${
                      demandForm.type === opt.value
                        ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm shadow-orange-100'
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <span className="text-lg leading-none">{opt.emoji}</span>
                    <span className="leading-none mt-0.5">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Priorité</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: 'high',
                      label: '🔴 Haute',
                      active: 'bg-red-50 border-red-400 text-red-700 shadow-sm shadow-red-100',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50'
                    },
                    {
                      value: 'medium',
                      label: '🟡 Moyenne',
                      active: 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm shadow-amber-100',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-amber-50/50'
                    },
                    {
                      value: 'low',
                      label: '🟢 Basse',
                      active: 'bg-green-50 border-green-400 text-green-700 shadow-sm shadow-green-100',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50'
                    }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDemandForm({ ...demandForm, priority: opt.value })}
                    className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition-all duration-200 text-center ${
                      demandForm.priority === opt.value ? opt.active : opt.inactive
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-orange-500/10 text-sm"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
