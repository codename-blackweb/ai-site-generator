-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  target_audience TEXT,
  primary_goal TEXT,
  brand_tone TEXT,
  color_preferences TEXT,
  layout_type TEXT,
  project_type TEXT DEFAULT 'website',
  status TEXT DEFAULT 'draft',
  generated_content JSONB,
  preview_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client portfolios table
CREATE TABLE public.client_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  introduction TEXT,
  client_name TEXT,
  client_logo_url TEXT,
  accent_color TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for portfolio-projects relationship
CREATE TABLE public.portfolio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.client_portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, project_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view public projects"
ON public.projects FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- Client portfolios policies
CREATE POLICY "Users can view their own portfolios"
ON public.client_portfolios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view public portfolios"
ON public.client_portfolios FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create their own portfolios"
ON public.client_portfolios FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
ON public.client_portfolios FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
ON public.client_portfolios FOR DELETE
USING (auth.uid() = user_id);

-- Portfolio projects policies
CREATE POLICY "Users can view their portfolio projects"
ON public.portfolio_projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portfolios 
    WHERE id = portfolio_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Public can view public portfolio projects"
ON public.portfolio_projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portfolios 
    WHERE id = portfolio_id AND is_public = true
  )
);

CREATE POLICY "Users can manage their portfolio projects"
ON public.portfolio_projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_portfolios 
    WHERE id = portfolio_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their portfolio projects"
ON public.portfolio_projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_portfolios 
    WHERE id = portfolio_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their portfolio projects"
ON public.portfolio_projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_portfolios 
    WHERE id = portfolio_id AND user_id = auth.uid()
  )
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_portfolios_updated_at
  BEFORE UPDATE ON public.client_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();