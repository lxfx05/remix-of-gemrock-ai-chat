import { useState, useEffect } from 'react';
import { Link2, Unlink, ChevronRight, ExternalLink, Loader2, Github } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ServiceKey = 'github' | 'vercel' | 'supabase_ext';

type ServiceInfo = {
  key: ServiceKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  tokenHint: string;
  tokenUrl: string;
};

const SERVICES: ServiceInfo[] = [
  {
    key: 'github',
    label: 'GitHub',
    icon: <Github size={18} />,
    color: 'text-foreground',
    tokenHint: 'Personal Access Token (classic) con permessi repo',
    tokenUrl: 'https://github.com/settings/tokens',
  },
  {
    key: 'vercel',
    label: 'Vercel',
    icon: <span className="text-lg font-bold">▲</span>,
    color: 'text-foreground',
    tokenHint: 'Token da Account Settings → Tokens',
    tokenUrl: 'https://vercel.com/account/tokens',
  },
  {
    key: 'supabase_ext',
    label: 'Supabase',
    icon: <span className="text-lg font-bold">⚡</span>,
    color: 'text-emerald-400',
    tokenHint: 'Access Token da supabase.com/dashboard/account/tokens',
    tokenUrl: 'https://supabase.com/dashboard/account/tokens',
  },
];

type ConnectedService = {
  service_name: string;
  display_name: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  updated_at: string;
  language?: string;
};

export function ServicesPanel() {
  const { user } = useAuth();
  const [connected, setConnected] = useState<ConnectedService[]>([]);
  const [connecting, setConnecting] = useState<ServiceKey | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenFor, setShowTokenFor] = useState<ServiceKey | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<ServiceKey | null>(null);
  const [expandedService, setExpandedService] = useState<ServiceKey | null>(null);

  useEffect(() => {
    if (user) loadConnected();
  }, [user]);

  const callProxy = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/service-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const loadConnected = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_services')
      .select('service_name, display_name')
      .eq('user_id', user.id);
    if (data) setConnected(data);
  };

  const isConnected = (key: ServiceKey) => connected.some(c => c.service_name === key);
  const getDisplayName = (key: ServiceKey) => connected.find(c => c.service_name === key)?.display_name;

  const handleConnect = async (service: ServiceKey) => {
    if (!tokenInput.trim()) {
      toast.error('Inserisci il token');
      return;
    }
    setConnecting(service);
    const result = await callProxy({ action: 'connect', service, token: tokenInput.trim() });
    setConnecting(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${service} collegato come ${result.display_name}`);
      setTokenInput('');
      setShowTokenFor(null);
      loadConnected();
    }
  };

  const handleDisconnect = async (service: ServiceKey) => {
    await callProxy({ action: 'disconnect', service });
    setConnected(prev => prev.filter(c => c.service_name !== service));
    setProjects([]);
    setExpandedService(null);
    toast.success('Servizio scollegato');
  };

  const handleListProjects = async (service: ServiceKey) => {
    if (expandedService === service) {
      setExpandedService(null);
      return;
    }
    setLoadingProjects(service);
    setExpandedService(service);
    const result = await callProxy({ action: 'list_projects', service });
    setLoadingProjects(null);
    if (result.error) {
      toast.error(result.error);
      setExpandedService(null);
    } else {
      setProjects(result.projects || []);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <Link2 size={32} className="mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Accedi per collegare servizi</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-1">
      {SERVICES.map((svc) => {
        const conn = isConnected(svc.key);
        return (
          <div key={svc.key} className="bg-secondary rounded-xl overflow-hidden">
            {/* Service header */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className={`${svc.color} shrink-0`}>{svc.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{svc.label}</p>
                {conn && (
                  <p className="text-[10px] text-primary truncate">✓ {getDisplayName(svc.key)}</p>
                )}
              </div>
              {conn ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleListProjects(svc.key)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    title="Progetti"
                  >
                    <ChevronRight size={14} className={`transition-transform ${expandedService === svc.key ? 'rotate-90' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(svc.key)}
                    className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    title="Scollega"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTokenFor(showTokenFor === svc.key ? null : svc.key)}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-[11px] font-medium hover:bg-primary/30 transition-all"
                >
                  Collega
                </button>
              )}
            </div>

            {/* Token input */}
            {showTokenFor === svc.key && !conn && (
              <div className="px-3 pb-3 space-y-2 animate-slide-up">
                <p className="text-[10px] text-muted-foreground">{svc.tokenHint}</p>
                <a
                  href={svc.tokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  Ottieni token <ExternalLink size={10} />
                </a>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Incolla il token..."
                  className="w-full bg-muted rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => handleConnect(svc.key)}
                  disabled={connecting === svc.key || !tokenInput.trim()}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  {connecting === svc.key ? (
                    <Loader2 size={14} className="mx-auto animate-spin" />
                  ) : 'Connetti'}
                </button>
              </div>
            )}

            {/* Projects list */}
            {expandedService === svc.key && conn && (
              <div className="border-t border-border/50 max-h-48 overflow-y-auto scrollbar-thin">
                {loadingProjects === svc.key ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-primary" />
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">Nessun progetto trovato</p>
                ) : (
                  projects.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">{p.name}</p>
                        {p.description && (
                          <p className="text-[9px] text-muted-foreground truncate">{p.description}</p>
                        )}
                      </div>
                      {p.language && (
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.language}</span>
                      )}
                      <ExternalLink size={10} className="text-muted-foreground shrink-0" />
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
