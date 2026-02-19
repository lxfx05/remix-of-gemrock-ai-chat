import { useState } from 'react';
import { X, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthStep = 'choose' | 'email-form' | 'otp' | 'email-login';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('choose');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  if (!open) return null;

  const reset = () => {
    setStep('choose');
    setLoading(false);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setOtp('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error(result.error.message || 'Errore login Google');
  };

  const handleAppleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error(result.error.message || 'Errore login Apple');
  };

  const handleEmailSignup = async () => {
    if (!email || !password || !firstName || !lastName || !phone) {
      toast.error('Compila tutti i campi');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password, firstName, lastName, phone }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Errore invio OTP');
        // If email already registered, switch to login
        if (resp.status === 409) setStep('email-login');
      } else {
        toast.success('Codice di verifica inviato!');
        setStep('otp');
      }
    } catch {
      toast.error('Errore di connessione');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, otp }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Codice non valido');
      } else {
        toast.success('Account creato! Effettua il login.');
        setStep('email-login');
      }
    } catch {
      toast.error('Errore di connessione');
    }
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error('Inserisci email e password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message || 'Credenziali non valide');
    } else {
      toast.success('Accesso effettuato!');
      handleClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-3xl p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          <X size={18} />
        </button>

        {step !== 'choose' && (
          <button
            onClick={() => setStep('choose')}
            className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl gemrock-gradient flex items-center justify-center mx-auto mb-3 gemrock-glow">
            <span className="text-2xl">💎</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {step === 'choose' && 'Accedi a GemRock'}
            {step === 'email-form' && 'Crea Account'}
            {step === 'otp' && 'Verifica Email'}
            {step === 'email-login' && 'Accedi'}
          </h2>
        </div>

        {step === 'choose' && (
          <div className="space-y-2.5">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-secondary hover:bg-muted rounded-xl text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continua con Google
            </button>

            <button
              onClick={handleAppleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-secondary hover:bg-muted rounded-xl text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continua con Apple
            </button>

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">oppure</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setStep('email-form')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-secondary hover:bg-muted rounded-xl text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              <Mail size={20} />
              Registrati con Email
            </button>

            <button
              onClick={() => setStep('email-login')}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Hai già un account? <span className="text-primary font-medium">Accedi</span>
            </button>
          </div>
        )}

        {step === 'email-form' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text" placeholder="Nome" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text" placeholder="Cognome" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="tel" placeholder="Telefono" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleEmailSignup}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Invia codice di verifica
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Abbiamo inviato un codice a <span className="text-foreground font-medium">{email}</span>
            </p>
            <input
              type="text" placeholder="Codice a 6 cifre" value={otp} maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-secondary rounded-xl px-3 py-3 text-center text-lg font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Verifica
            </button>
          </div>
        )}

        {step === 'email-login' && (
          <div className="space-y-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Accedi
            </button>
            <button
              onClick={() => setStep('email-form')}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Non hai un account? <span className="text-primary font-medium">Registrati</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
