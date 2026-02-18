
-- Table to store user service connections (GitHub, Vercel, Supabase tokens)
CREATE TABLE public.user_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,  -- 'github', 'vercel', 'supabase_ext'
  access_token TEXT NOT NULL,
  display_name TEXT,  -- username or org name from the service
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
ON public.user_services FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
ON public.user_services FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
ON public.user_services FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
ON public.user_services FOR DELETE
USING (auth.uid() = user_id);
