import { supabase } from "@/integrations/supabase/client";

export const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const buildAuthHeaders = async (baseHeaders: Record<string, string> = {}) => {
  const token = await getAccessToken();
  if (!token) {
    return { headers: baseHeaders, token: null as string | null };
  }
  return {
    headers: {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    },
    token,
  };
};
