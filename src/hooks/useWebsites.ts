import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export type Website = Tables<"websites">;

/* ------------------------------------------------------------------ */
/* Queries */
/* ------------------------------------------------------------------ */

export async function getWebsiteBySlug(slug: string) {
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as Website | null;
}

// Public website by slug (viewer)
export function useWebsiteBySlug(slug?: string) {
  return useQuery({
    queryKey: ["website", "public", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("slug", slug!)
        .eq("is_public", true)
        .maybeSingle();

      if (error) throw error;
      return data as Website | null;
    },
  });
}

// Website by slug for owner/editor (no is_public filter)
export function useWebsiteBySlugForOwner(slug?: string) {
  return useQuery({
    queryKey: ["website", "owner", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();

      if (error) throw error;
      return data as Website | null;
    },
  });
}

// All websites for a user
export function getUserWebsites(userId: string) {
  return supabase
    .from("websites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) throw error;
      return data as Website[];
    });
}

// Create website (simple helper for direct calls)
export async function createWebsite(payload: TablesInsert<"websites">) {
  const { data, error } = await supabase
    .from("websites")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Website;
}

// Generate and attach a thumbnail to a website
export async function generateThumbnailForWebsite({
  websiteId,
  title,
  description,
}: {
  websiteId: string;
  title?: string | null;
  description?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
    body: { websiteId, title, description },
  });

  if (error) throw error;
  const thumbnailUrl = (data as any)?.thumbnail_url as string | undefined;

  if (thumbnailUrl) {
    const { error: updateError } = await supabase
      .from("websites")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", websiteId);

    if (updateError) throw updateError;
  }

  return thumbnailUrl;
}

/* ------------------------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------------------------ */

// Create website
export function useCreateWebsite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"websites">) => {
      const { data, error } = await supabase
        .from("websites")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as Website;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
    },
  });
}

// Update website
export function useUpdateWebsite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: TablesUpdate<"websites">;
    }) => {
      const { data, error } = await supabase
        .from("websites")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Website;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["website", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["websites"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Domain Hooks (Safe Stubs — No Domains Table Yet) */
/* ------------------------------------------------------------------ */

// These exist to satisfy runtime imports.
// They return stable shapes and can be fully implemented later.

// Fetch domains for a website
export function useDomainsForWebsite(_websiteId?: string) {
  return {
    data: [],
    isLoading: false,
    error: null as Error | null,
  };
}

// Add a domain
export function useAddDomain() {
  return useMutation({
    mutationFn: async (_payload: { websiteId: string; domain: string }) => {
      // No-op for now
      return true;
    },
  });
}

// Delete a domain
export function useDeleteDomain() {
  return useMutation({
    mutationFn: async (_domainId: string) => {
      // No-op for now
      return true;
    },
  });
}
