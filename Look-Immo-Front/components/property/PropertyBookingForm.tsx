import React, { useState } from 'react';
import { MessageSquare, Calendar, User as UserIcon, Send, Check } from 'lucide-react';
import { Property, User } from '@/types';
import { CustomDatePicker, CustomTimePicker } from '@/components/ui/DateTimePicker';

interface PropertyBookingFormProps {
  property: Property;
  user: User | null;
  onOpenAuth: () => void;
  onSendMessage: (data: { fullName: string; email: string; phone: string; subject: string; message: string }) => Promise<void>;
  onBookAppointment: (data: { propertyId: string; propertyTitle: string; date: string; time: string; message?: string }) => Promise<void>;
}

export const PropertyBookingForm: React.FC<PropertyBookingFormProps> = ({
  property,
  user,
  onOpenAuth,
  onSendMessage,
  onBookAppointment
}) => {
  const [contactTab, setContactTab] = useState<'message' | 'appointment'>('message');
  const [contactForm, setContactForm] = useState({ message: '' });
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      await onSendMessage({
        fullName: user.name,
        email: user.email,
        phone: user.phone || '',
        subject: `À propos de: ${property.title}`,
        message: contactForm.message
      });
      setFormSubmitted(true);
      setTimeout(() => setFormSubmitted(false), 3000);
      setContactForm({ message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      await onBookAppointment({
        propertyId: property.id,
        propertyTitle: property.title,
        date: appointmentForm.date,
        time: appointmentForm.time,
        message: appointmentForm.message
      });
      setAppointmentSubmitted(true);
      setTimeout(() => setAppointmentSubmitted(false), 3000);
      setAppointmentForm({ date: '', time: '', message: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setContactTab('message')}
          className={`flex-1 py-4 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            contactTab === 'message'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageSquare size={18} />
          Envoyer un Message
        </button>
        <button
          onClick={() => setContactTab('appointment')}
          className={`flex-1 py-4 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            contactTab === 'appointment'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Calendar size={18} />
          Prendre Rendez-vous
        </button>
      </div>

      <div className="p-6">
        {!user ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon size={32} className="text-blue-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h4>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Veuillez vous connecter pour envoyer un message ou prendre un rendez-vous.
            </p>
            <button
              onClick={onOpenAuth}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
            >
              <UserIcon size={18} />
              Se connecter
            </button>
          </div>
        ) : (
          <>
            {/* Tab: Message */}
            {contactTab === 'message' && (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div>
                  <label htmlFor="property-contact-message" className="block text-sm font-semibold text-gray-700 mb-2">
                    Votre message
                  </label>
                  <textarea
                    id="property-contact-message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ message: e.target.value })}
                    required
                    minLength={10}
                    rows={5}
                    placeholder="Écrivez votre message (minimum 10 caractères)…"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Envoyer le message
                </button>
                {formSubmitted && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <Check size={16} />
                    Message envoyé avec succès!
                  </div>
                )}
              </form>
            )}

            {/* Tab: Appointment */}
            {contactTab === 'appointment' && (
              <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Connecté en tant que</p>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div>
                  <label htmlFor="booking-apt-date" className="block text-sm font-semibold text-gray-700 mb-2">
                    Choisir une date
                  </label>
                  <CustomDatePicker
                    id="booking-apt-date"
                    value={appointmentForm.date}
                    onChange={(date) => setAppointmentForm({ ...appointmentForm, date })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="booking-apt-time" className="block text-sm font-semibold text-gray-700 mb-2">
                    Choisir une heure
                  </label>
                  <CustomTimePicker
                    id="booking-apt-time"
                    value={appointmentForm.time}
                    onChange={(time) => setAppointmentForm({ ...appointmentForm, time })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="booking-apt-message" className="block text-sm font-semibold text-gray-700 mb-2">
                    Message (optionnel)
                  </label>
                  <textarea
                    id="booking-apt-message"
                    value={appointmentForm.message}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, message: e.target.value })}
                    rows={3}
                    placeholder="Précisez vos préférences ou questions..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  Réserver maintenant
                </button>
                {appointmentSubmitted && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <Check size={16} />
                    Rendez-vous demandé avec succès!
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
