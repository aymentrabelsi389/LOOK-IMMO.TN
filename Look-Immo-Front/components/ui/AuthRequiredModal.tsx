import React from 'react';
import { Heart } from 'lucide-react';

const AuthRequiredModal = ({
  isOpen,
  onClose,
  onLogin,
  onSignup,
  message = 'Veuillez créer un compte ou vous connecter pour ajouter cette propriété à votre liste de favoris.',
  icon = <Heart className="text-red-500" size={32} />,
  iconBgColor = 'bg-red-50',
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
  message?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className={`w-16 h-16 ${iconBgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>{icon}</div>
          <h2 className="text-2xl font-bold text-brand-dark mb-3">Connexion Requise</h2>
          <p className="text-brand-grey leading-relaxed">{message}</p>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => {
              onClose();
              onLogin();
            }}
            className="bg-brand-dark text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-teal transition shadow-lg transform hover:scale-105"
          >
            Se connecter
          </button>
          <button
            onClick={() => {
              onClose();
              onSignup();
            }}
            className="bg-white text-brand-dark px-6 py-3 rounded-full font-semibold border-2 border-brand-dark hover:bg-gray-50 transition transform hover:scale-105"
          >
            Créer un compte
          </button>
          <button onClick={onClose} className="text-brand-grey hover:text-brand-dark transition text-sm py-2">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredModal;
