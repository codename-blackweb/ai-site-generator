import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type GenerateWebsiteParams = {
  projectName: string;
  goal: string;
};

export function useGenerateWebsite() {
  const mutation = useMutation({
    mutationFn: async (params: GenerateWebsiteParams) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-website",
        { body: params }
      );

      if (error) {
        throw new Error(error.message || "Website generation failed");
      }

      return data;
    },
  });

  return {
    generateWebsite: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}
