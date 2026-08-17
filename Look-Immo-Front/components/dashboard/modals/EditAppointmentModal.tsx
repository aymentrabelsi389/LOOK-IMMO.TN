import React from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';
import { Appointment, Property, User } from '@/types';
import { CustomDatePicker, CustomTimePicker } from '@/components/ui/DateTimePicker';
import { getImageSrc, getLQIP } from '@/utils/imageUtils';

interface EditAppointmentModalProps {
  editingAppointment: Appointment | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  user: User;
  editForm: {
    date: string;
    time: string;
    message: string;
    propertyId: string;
    status: string;
    clientName: string;
    clientPhone: string;
  };
  setEditForm: React.Dispatch<
    React.SetStateAction<{
      date: string;
      time: string;
      message: string;
      propertyId: string;
      status: string;
      clientName: string;
      clientPhone: string;
    }>
  >;
  editErrors: Record<string, string>;
  setEditErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  properties: Property[];
  editAdditionalProps: string[];
  setEditAdditionalProps: React.Dispatch<React.SetStateAction<string[]>>;
}

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  editingAppointment,
  onClose,
  onSubmit,
  user,
  editForm,
  setEditForm,
  editErrors,
  setEditErrors,
  properties,
  editAdditionalProps,
  setEditAdditionalProps
}) => {
  if (!editingAppointment) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-brand-dark/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all duration-300 border border-gray-100/50 scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="text-lg font-serif font-bold text-brand-dark">Modifier le rendez-vous</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer la fenêtre"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-apt-client-name" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Nom Client *
                </label>
                <input
                  id="edit-apt-client-name"
                  type="text"
                  value={editForm.clientName || ''}
                  onChange={(e) => {
                    setEditForm({ ...editForm, clientName: e.target.value });
                    if (e.target.value.trim().length >= 2) setEditErrors((prev) => ({ ...prev, clientName: '' }));
                  }}
                  placeholder="Nom du client"
                  className={`w-full px-4 py-2.5 border rounded-2xl focus:ring-2 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm ${
                    editErrors.clientName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:ring-brand-teal/20 focus:border-brand-teal'
                  }`}
                />
                {editErrors.clientName && <p className="text-red-500 text-xs mt-1 font-medium">{editErrors.clientName}</p>}
              </div>
              <div>
                <label htmlFor="edit-apt-client-phone" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Téléphone *
                </label>
                <input
                  id="edit-apt-client-phone"
                  type="tel"
                  inputMode="tel"
                  value={editForm.clientPhone || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\s\-().]/g, '');
                    setEditForm({ ...editForm, clientPhone: val });
                    if (val.replace(/\D/g, '').length >= 8) setEditErrors((prev) => ({ ...prev, clientPhone: '' }));
                  }}
                  placeholder="Ex: 21 234 567"
                  maxLength={20}
                  className={`w-full px-4 py-2.5 border rounded-2xl focus:ring-2 focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm ${
                    editErrors.clientPhone
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:ring-brand-teal/20 focus:border-brand-teal'
                  }`}
                />
                {editErrors.clientPhone && <p className="text-red-500 text-xs mt-1 font-medium">{editErrors.clientPhone}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-apt-date" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Date *
                </label>
                <CustomDatePicker
                  value={editForm.date}
                  onChange={(val) => {
                    setEditForm({ ...editForm, date: val });
                    if (val) setEditErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  error={!!editErrors.date}
                  required
                />
                {editErrors.date && <p className="text-red-500 text-xs mt-1 font-medium">{editErrors.date}</p>}
              </div>

              <div>
                <label htmlFor="edit-apt-time" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Heure <span className="font-normal normal-case text-gray-400">(optionnel)</span>
                </label>
                <CustomTimePicker
                  value={editForm.time}
                  onChange={(val) => {
                    setEditForm({ ...editForm, time: val });
                    if (val) setEditErrors((prev) => ({ ...prev, time: '' }));
                  }}
                  error={!!editErrors.time}
                />
                {editErrors.time && <p className="text-red-500 text-xs mt-1 font-medium">{editErrors.time}</p>}
              </div>
            </div>

            {/* Propriétés à visiter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Propriétés à visiter</label>
              {(editForm.propertyId || editAdditionalProps.some(Boolean)) && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.propertyId && (() => {
                    const prop = properties.find((p) => p.id === editForm.propertyId);
                    const priceStr = prop?.price ? prop.price.toLocaleString('fr-TN') + ' DT' : null;
                    return (
                      <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full border border-brand-teal/20 max-w-full min-w-0 overflow-hidden">
                        {prop?.images?.[0] ? (
                          <img
                            src={getImageSrc(prop.images[0], 'thumb')}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 border-2 border-brand-teal/30"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-brand-teal/20 flex items-center justify-center text-xs flex-shrink-0">
                            🏠
                          </span>
                        )}
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="truncate max-w-[110px]">{prop?.title || 'Propriété'}</span>
                          {priceStr && <span className="text-[10px] font-semibold text-brand-teal/70 truncate">{priceStr}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, propertyId: '' })}
                          className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5 transition flex-shrink-0"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })()}
                  {editAdditionalProps.filter(Boolean).map((pid, i) => {
                    const prop = properties.find((p) => p.id === pid);
                    const priceStr = prop?.price ? prop.price.toLocaleString('fr-TN') + ' DT' : null;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200 max-w-full min-w-0 overflow-hidden"
                      >
                        {prop?.images?.[0] ? (
                          <img
                            src={getImageSrc(prop.images[0], 'thumb')}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 border-2 border-gray-300"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs flex-shrink-0">
                            🏠
                          </span>
                        )}
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="truncate max-w-[110px]">{prop?.title || 'Propriété'}</span>
                          {priceStr && <span className="text-[10px] font-semibold text-gray-400 truncate">{priceStr}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditAdditionalProps((prev) => prev.filter((_, idx) => idx !== i))}
                          className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition flex-shrink-0"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 bg-white">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une propriété..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-teal transition-all"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        const els = document.querySelectorAll('.edit-prop-picker-item');
                        els.forEach((el: Element) => {
                          const text = el.getAttribute('data-title') || '';
                          (el as HTMLElement).style.display = text.includes(q) ? '' : 'none';
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <button
                    type="button"
                    className={`edit-prop-picker-item w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all ${
                      !editForm.propertyId ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-500 hover:bg-white'
                    }`}
                    data-title="aucune"
                    onClick={() => setEditForm({ ...editForm, propertyId: '' })}
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        !editForm.propertyId ? 'border-brand-teal bg-brand-teal' : 'border-gray-300'
                      }`}
                    >
                      {!editForm.propertyId && <Check size={10} className="text-white" />}
                    </span>
                    Aucune
                  </button>
                  {properties.map((p) => {
                    const isMain = editForm.propertyId === p.id;
                    const isExtra = editAdditionalProps.includes(p.id);
                    const isSelected = isMain || isExtra;
                    const priceStr = p.price ? p.price.toLocaleString('fr-TN') + ' DT' : '';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`edit-prop-picker-item w-full flex items-center gap-3 px-4 py-2 text-left text-xs font-semibold transition-all border-t border-gray-50 ${
                          isSelected ? 'bg-brand-teal/5 text-brand-teal' : 'text-gray-600 hover:bg-white'
                        }`}
                        data-title={`${p.title.toLowerCase()} ${p.price ?? ''}`}
                        onClick={() => {
                          if (isMain) {
                            setEditForm({ ...editForm, propertyId: '' });
                          } else if (isExtra) {
                            setEditAdditionalProps((prev) => prev.filter((id) => id !== p.id));
                          } else if (!editForm.propertyId) {
                            setEditForm({ ...editForm, propertyId: p.id });
                          } else {
                            setEditAdditionalProps((prev) => [...prev.filter(Boolean), p.id]);
                          }
                        }}
                      >
                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? 'border-brand-teal bg-brand-teal' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-white" />}
                        </span>

                        <div
                          className="w-9 h-7 rounded-md overflow-hidden flex-shrink-0 relative bg-gray-100 border border-gray-100/70 shadow-sm"
                          style={{
                            backgroundImage:
                              p.images && p.images[0] && getLQIP(p.images[0]) ? `url(${getLQIP(p.images[0])})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {p.images && p.images[0] ? (
                            <img src={getImageSrc(p.images[0], 'thumb')} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">🏠</div>
                          )}
                        </div>

                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{p.title}</span>
                          {priceStr && (
                            <span className={`block text-[10px] font-bold mt-0.5 ${isSelected ? 'text-brand-teal/70' : 'text-gray-400'}`}>
                              {priceStr}
                            </span>
                          )}
                        </span>
                        {isMain && (
                          <span className="text-[9px] font-black text-brand-teal uppercase tracking-wider bg-brand-teal/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Principal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {(user.role === 'admin' || user.role === 'agent') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Statut</label>
                <div className="flex gap-2">
                  {[
                    {
                      value: 'pending',
                      label: '⏳ En attente',
                      active: 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-amber-200 hover:bg-amber-50/50'
                    },
                    {
                      value: 'accepted',
                      label: '✅ Confirmé',
                      active: 'bg-green-50 border-green-400 text-green-700 shadow-sm',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50/50'
                    },
                    {
                      value: 'rejected',
                      label: '❌ Annulé',
                      active: 'bg-red-50 border-red-400 text-red-700 shadow-sm',
                      inactive: 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200 hover:bg-red-50/50'
                    }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: opt.value })}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-200 ${
                        editForm.status === opt.value ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Message (optionnel)</label>
              <textarea
                value={editForm.message}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:outline-none bg-gray-50/50 focus:bg-white transition-all text-sm"
                rows={3}
                placeholder="Ajouter une note..."
                aria-label="Message du rendez-vous"
              ></textarea>
            </div>
          </div>

          <div className="px-6 py-4 flex gap-3 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-teal to-cyan-500 hover:from-cyan-500 hover:to-brand-teal text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-brand-teal/10 text-sm"
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
