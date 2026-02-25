import { createClient } from "@supabase/supabase-js";

type SignupCountResult = {
  count: number | null;
  error: string | null;
};

export async function getSignupCount(): Promise<SignupCountResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return {
      count: null,
      error:
        "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    };
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("get_signup_count");

  if (error) {
    return {
      count: null,
      error: error.message,
    };
  }

  return {
    count: Number(data ?? 0),
    error: null,
  };
}
