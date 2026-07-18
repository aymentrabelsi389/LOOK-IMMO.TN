import React, { useState, useEffect, useRef } from 'react';
import { Mail, Key, ShieldCheck, ArrowLeft, RefreshCw, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { authAPI } from '@/services/api';
import { useSEO } from '@/hooks/useSEO';
import { useUI } from '@/context/UIContext';
import { notify } from '@/services/notificationStore';

const ForgotPasswordPage = () => {
  const { handleNavigate } = useUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2: Verification Code State
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [codeExpiresIn, setCodeExpiresIn] = useState(600); // 10 minutes in seconds
  const [resendTimer, setResendTimer] = useState(0); // 60 seconds resend cooldown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 3: New Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useSEO({
    title: "Mot de passe oublié",
    description: "Réinitialisez le mot de passe de votre compte Look Immo de manière simple et sécurisée."
  });

  // Timers for Step 2
  useEffect(() => {
    if (step === 2) {
      setCodeExpiresIn(600);
      setResendTimer(60);

      // 10 minutes countdown
      timerRef.current = setInterval(() => {
        setCodeExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 60 seconds resend cooldown
      resendTimerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(resendTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, [step]);

  // Code input boxes handlers
  const handleCodeChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = val.slice(-1); // Only keep the last character typed
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return; // Must be exactly 6 digits

    const digitArray = pasteData.split('');
    setCode(digitArray);
    inputRefs.current[5]?.focus();
  };

  const getCodeString = () => code.join('');

  // Password Strength Evaluator
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'Vide', color: 'bg-gray-200' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Moyen', color: 'bg-amber-500' };
    return { score, label: 'Fort', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  // Submit Handlers
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      notify.success("Un code de vérification à 6 chiffres vous a été envoyé par e-mail.");
      setStep(2);
    } catch (err: any) {
      notify.error(err.message || "Impossible de traiter la demande.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = getCodeString();
    if (codeString.length !== 6) {
      notify.error("Le code doit comporter exactement 6 chiffres.");
      return;
    }
    if (codeExpiresIn === 0) {
      notify.error("Le code a expiré. Veuillez en demander un nouveau.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyResetCode(email, codeString);
      notify.success("Code vérifié avec succès.");
      setStep(3);
    } catch (err: any) {
      notify.error(err.message || "Code incorrect ou invalide.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      notify.success("Un nouveau code a été envoyé.");
      setCode(Array(6).fill(''));
      setCodeExpiresIn(600);
      setResendTimer(60);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      notify.error(err.message || "Impossible de renvoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      notify.error("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        email,
        code: getCodeString(),
        password
      });
      notify.success("Mot de passe réinitialisé avec succès ! Connectez-vous avec vos nouveaux identifiants.");
      handleNavigate('auth');
    } catch (err: any) {
      notify.error(err.message || "Échec de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 transition-all duration-300">
        
        {/* Back Button / Step Indicator */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 1) handleNavigate('auth');
              else if (step === 2) setStep(1);
              else if (step === 3) setStep(2);
            }}
            className="flex items-center text-sm font-semibold text-gray-500 hover:text-brand-dark transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </button>
          <span className="text-xs font-bold text-brand-teal uppercase tracking-widest bg-brand-teal/10 px-3 py-1 rounded-full">
            Étape {step} sur 3
          </span>
        </div>

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-brand-teal/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-brand-teal" />
              </div>
              <h2 className="text-2xl font-extrabold text-brand-dark">
                Mot de passe oublié ?
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Saisissez l'adresse e-mail de votre compte. Nous vous enverrons un code de vérification.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleRequestCode}>
              <div className="relative">
                <label htmlFor="email" className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="exemple@email.com"
                    className="w-full px-4 py-3.5 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 text-sm font-bold text-white bg-brand-dark hover:bg-brand-teal hover:shadow-lg rounded-xl flex justify-center items-center gap-2 transform active:scale-95 transition-all duration-200"
              >
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Envoyer le code"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Enter Code */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-brand-teal/10 rounded-full flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-brand-teal" />
              </div>
              <h2 className="text-2xl font-extrabold text-brand-dark">
                Vérification du code
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Nous avons envoyé un code de sécurité à 6 chiffres à <strong>{email}</strong>.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
              {/* Digit Inputs */}
              <div className="flex justify-between gap-2 max-w-sm mx-auto">
                {code.map((num, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      if (el) inputRefs.current[i] = el;
                    }}
                    type="text"
                    pattern="\d*"
                    maxLength={1}
                    value={num}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 bg-gray-50 text-center font-bold text-2xl border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:bg-white text-gray-900 transition-all duration-200"
                  />
                ))}
              </div>

              {/* Countdown & Expiration Banner */}
              <div className="text-center text-xs text-gray-500">
                {codeExpiresIn > 0 ? (
                  <span className="flex items-center justify-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-brand-teal animate-pulse" />
                    Le code expire dans <strong className="text-brand-dark">{formatTime(codeExpiresIn)}</strong>
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold">Le code a expiré.</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || codeExpiresIn === 0}
                className="w-full py-4 px-6 text-sm font-bold text-white bg-brand-dark hover:bg-brand-teal hover:shadow-lg rounded-xl flex justify-center items-center gap-2 transform active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Valider le code"}
              </button>
            </form>

            {/* Resend Action */}
            <div className="mt-8 text-center text-sm">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                className="font-semibold text-brand-teal hover:text-brand-dark disabled:text-gray-400 transition-colors duration-200 flex items-center gap-1.5 mx-auto"
              >
                {resendTimer > 0 ? (
                  <span>Renvoyer le code ({resendTimer}s)</span>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renvoyer le code
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-brand-teal/10 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-brand-teal" />
              </div>
              <h2 className="text-2xl font-extrabold text-brand-dark">
                Nouveau mot de passe
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Créez un mot de passe fort contenant au moins 6 caractères pour sécuriser votre compte.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
              
              {/* New Password */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min. 6 caractères"
                    className="w-full px-4 py-3.5 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-brand-dark"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirmez votre saisie"
                    className="w-full px-4 py-3.5 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-brand-dark"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Force du mot de passe :</span>
                    <span className="font-bold text-brand-dark">{strength.label}</span>
                  </div>
                  {/* Strength Bars */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i < strength.score ? strength.color : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Password requirements list */}
                  <ul className="text-[10px] text-gray-500 space-y-1 mt-3">
                    <li className="flex items-center gap-1.5">
                      {password.length >= 8 ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span>Au moins 8 caractères</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      {/[A-Z]/.test(password) && /[a-z]/.test(password) ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span>Majuscules & minuscules</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      {/[0-9]/.test(password) ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span>Au moins un chiffre</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      {/[^A-Za-z0-9]/.test(password) ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span>Au moins un caractère spécial</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Password Match Status */}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 font-semibold animate-fade-in-up">
                  Les mots de passe ne correspondent pas.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="w-full py-4 px-6 text-sm font-bold text-white bg-brand-dark hover:bg-brand-teal hover:shadow-lg rounded-xl flex justify-center items-center gap-2 transform active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Réinitialiser mon mot de passe"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;
