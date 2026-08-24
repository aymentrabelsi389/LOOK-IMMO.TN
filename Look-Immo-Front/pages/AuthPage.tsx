import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  RefreshCw,
  Building2,
  ArrowRight
} from 'lucide-react';
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
    title: isLogin ? "Connexion - Look Immo" : "Créer un compte - Look Immo",
    description: "Connectez-vous à votre espace personnel Look Immo pour sauvegarder vos propriétés favorites et planifier des visites."
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = value.replace(/(?:^|\s)\S/g, (match) => match.toUpperCase());
    setName(formattedValue);
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
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_-15px_rgba(12,31,50,0.07)] border border-slate-100/90 relative">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center mx-auto mb-4 text-brand-teal">
            <Building2 className="w-6 h-6 stroke-[2]" />
          </div>
          <h1 className="text-3xl font-extrabold text-brand-dark font-serif tracking-tight">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {isLogin 
              ? 'Accédez à votre espace personnel Look Immo' 
              : 'Rejoignez Look Immo pour gérer vos favoris et visites'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoCapitalize="words"
                  autoComplete="name"
                  placeholder="Nom & Prénom"
                  value={name}
                  onChange={handleNameChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all outline-none"
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="auth-phone" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="auth-phone"
                  type="tel"
                  required
                  placeholder="+216 20 000 000"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                required
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Mot de passe
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => handleNavigate('forgot-password')}
                  className="text-xs font-medium text-brand-teal hover:text-brand-dark transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Afficher ou masquer le mot de passe"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-brand-dark hover:bg-slate-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <span>{isLogin ? 'Se connecter' : "S'inscrire"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="ml-1 text-brand-teal hover:text-brand-dark font-semibold transition-colors"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
