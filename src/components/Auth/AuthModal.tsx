import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'form' | 'otp';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setEmail(''); setPassword(''); setFirstName(''); setLastName('');
    setPhone(''); setOtp(''); setStep('form'); setLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Accesso effettuato! 🎉');
      resetForm();
      onClose();
    }
  };

  const handleSendOtp = async () => {
    if (!email || !password || !firstName || !lastName || !phone) {
      toast.error('Compila tutti i campi');
      return;
    }
    if (password.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password, firstName, lastName, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Errore nell\'invio del codice');
        setLoading(false);
        return;
      }
      toast.success('Codice di verifica inviato! 📧');
      setStep('otp');
    } catch {
      toast.error('Errore di connessione');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Inserisci il codice a 6 cifre');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Codice non valido');
        setLoading(false);
        return;
      }
      // Auto-login after verification
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        toast.error('Account creato! Effettua il login.');
      } else {
        toast.success('Account verificato e attivo! ✅');
      }
      resetForm();
      onClose();
    } catch {
      toast.error('Errore di connessione');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error(result.error.message || 'Errore login Google');
  };

  const inputClass = "w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-3xl p-6 animate-slide-up shadow-2xl">
        <button
          onClick={() => { resetForm(); onClose(); }}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl gemrock-gradient flex items-center justify-center mx-auto mb-3 gemrock-glow">
            <span className="text-2xl">💎</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {step === 'otp' ? 'Verifica Email' : 'Accedi a GemRock'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 'otp'
              ? `Inserisci il codice a 6 cifre inviato a ${email}`
              : 'Per inviare messaggi, effettua l\'accesso'}
          </p>
        </div>

        {step === 'otp' ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-48 text-center text-2xl font-mono tracking-[0.5em] bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifico...
                </span>
              ) : 'Verifica e Crea Account'}
            </button>
            <button
              onClick={() => setStep('form')}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Torna indietro
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-secondary rounded-xl p-0.5 mb-5">
              {(['login', 'register'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    tab === t
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'login' ? 'Accedi' : 'Registrati'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-secondary hover:bg-muted rounded-xl text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Accedi con Google
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">oppure</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {tab === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" className={inputClass} />
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" className={inputClass} />
                  </div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero di telefono" type="tel" className={inputClass} />
                </>
              )}

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputClass} />

              <button
                onClick={tab === 'login' ? handleEmailLogin : handleSendOtp}
                disabled={loading || !email || !password || (tab === 'register' && (!firstName || !lastName || !phone))}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:brightness-110 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  </span>
                ) : tab === 'login' ? 'Accedi' : 'Invia Codice Verifica'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
