import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GenerateParams = {
  projectName: string;
  industry?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  colors?: string;
  layout?: string;
};

export function useGenerateWebsite() {
  const mutation = useMutation({
    mutationFn: async (params: GenerateParams) => {
      const { data, error } = await supabase.functions.invoke("generate-website", {
        body: params,
      });

      if (error) throw new Error(error.message || "Website generation failed.");
      if (!data) throw new Error("No data returned from generate-website.");
      if (data.error) throw new Error(data.error);

      // Your function returns { generatedContent }
      return data.generatedContent ?? data;
    },
  });

  return {
    generateWebsite: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
