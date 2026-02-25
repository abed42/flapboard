import { SignupSplitFlapBoard } from "@/components/signup-split-flap-board";
import { getSignupCount } from "@/lib/supabase/admin";

export function SignupCountFallback() {
  return <div className="h-full rounded-xl bg-[#0A0A0A] p-5" />;
}

export async function SignupCountPanel() {
  const { count, error } = await getSignupCount();

  if (typeof count === "number") {
    return <SignupSplitFlapBoard count={count} />;
  }

  return (
    <div className="h-full rounded-xl bg-destructive/5 p-5">
      <p className="text-sm font-medium text-destructive">
        Could not load signup count
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {error ?? "Unexpected error."}
      </p>
    </div>
  );
}
