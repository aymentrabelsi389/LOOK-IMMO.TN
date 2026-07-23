import React, { useState, useEffect } from 'react';
import { User as UserIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { User } from '@/types';
import { authAPI } from '@/services/api';
import { useSEO } from '@/hooks/useSEO';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUI } from '@/context/UIContext';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

const AuthPage = ({ initialMode = 'login' }: AuthPageProps) => {
  const { handleLogin: onLogin, user } = useAuthStore();
  const { handleNavigate } = useUI();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useSEO({
    title: isLogin ? "Connexion" : "Créer un compte",
    description: "Connectez-vous à votre espace personnel Look Immo pour sauvegarder vos propriétés favorites et planifier des visites."
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'agent') {
        handleNavigate('admin');
      } else {
        handleNavigate('home');
      }
    }
  }, [user, handleNavigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const phoneRegex = /^[0-9+\-\s()]*$/;
    if (phoneRegex.test(value)) setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let loggedInUser: User;
      if (isLogin) {
        loggedInUser = await authAPI.login({ email, password });
        onLogin(loggedInUser, false);
      } else {
        loggedInUser = await authAPI.register({ name, email, password, phone });
        onLogin(loggedInUser, true);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-brand-teal/10 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="h-6 w-6 text-brand-teal" />
          </div>
          <h2 className="text-3xl font-extrabold text-brand-dark">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLogin && (
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            {!isLogin && (
              <input
                type="tel"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
                placeholder="Numéro de téléphone"
                value={phone}
                onChange={handlePhoneChange}
              />
            )}
            <input
              type="email"
              required
              className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm`}
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-end text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => handleNavigate('forgot-password')}
                className="font-medium text-brand-teal hover:text-brand-dark transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-gray-400' : 'bg-brand-dark hover:bg-brand-teal'}`}
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-brand-teal hover:text-brand-dark">
            {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
