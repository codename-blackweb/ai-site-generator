import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClientPortfolios() {
  const query = useQuery({
    queryKey: ["websites", "public"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id,title,slug,thumbnail_url,is_public,created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.warn("Unable to load public websites, falling back to templates.", error);
        return [];
      }

      return data ?? [];
    },
  });

  return {
    portfolios: query.data ?? [],
    isLoading: query.isLoading,
  };
}
