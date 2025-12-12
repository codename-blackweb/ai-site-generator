import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  industry: string | null;
  target_audience: string | null;
  primary_goal: string | null;
  brand_tone: string | null;
  color_preferences: string | null;
  layout_type: string | null;
  project_type: string | null;
  status: string | null;
  generated_content: Json | null;
  preview_image_url: string | null;
  is_public: boolean | null;
  is_archived: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (project: { title: string; description?: string; industry?: string; target_audience?: string; primary_goal?: string; brand_tone?: string; color_preferences?: string; layout_type?: string; project_type?: string; generated_content?: Json }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; is_public?: boolean; is_archived?: boolean; generated_content?: Json }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateWebsite() {
  return useMutation({
    mutationFn: async (params: {
      projectName: string;
      industry: string;
      audience: string;
      goal: string;
      tone: string;
      colors: string;
      layout: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.generatedContent;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateWebsite() {
  return useMutation({
    mutationFn: async (params: {
      projectName: string;
      industry: string;
      audience: string;
      goal: string;
      tone: string;
      colors: string;
      layout: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.generatedContent;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
