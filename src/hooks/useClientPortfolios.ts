import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ClientPortfolio {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  introduction: string | null;
  client_name: string | null;
  client_logo_url: string | null;
  accent_color: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioProject {
  id: string;
  portfolio_id: string;
  project_id: string;
  display_order: number | null;
  created_at: string;
}

export function useClientPortfolios() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client-portfolios", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("client_portfolios")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientPortfolio[];
    },
    enabled: !!user,
  });
}

export function useClientPortfolio(slug: string) {
  return useQuery({
    queryKey: ["client-portfolio", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portfolios")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as ClientPortfolio | null;
    },
    enabled: !!slug,
  });
}

export function usePortfolioProjects(portfolioId: string) {
  return useQuery({
    queryKey: ["portfolio-projects", portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select(`
          *,
          project:projects(*)
        `)
        .eq("portfolio_id", portfolioId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });
}

export function useCreateClientPortfolio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (portfolio: Omit<ClientPortfolio, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("client_portfolios")
        .insert({ ...portfolio, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as ClientPortfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-portfolios"] });
      toast.success("Client portfolio created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateClientPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientPortfolio> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_portfolios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ClientPortfolio;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["client-portfolio", data.slug] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useAddProjectToPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ portfolioId, projectId, displayOrder }: { portfolioId: string; projectId: string; displayOrder?: number }) => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .insert({ portfolio_id: portfolioId, project_id: projectId, display_order: displayOrder || 0 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects", variables.portfolioId] });
      toast.success("Project added to portfolio");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveProjectFromPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ portfolioId, projectId }: { portfolioId: string; projectId: string }) => {
      const { error } = await supabase
        .from("portfolio_projects")
        .delete()
        .eq("portfolio_id", portfolioId)
        .eq("project_id", projectId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects", variables.portfolioId] });
      toast.success("Project removed from portfolio");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
