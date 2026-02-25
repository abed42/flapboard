import Link from "next/link";
import { Suspense } from "react";
import { NavBrand } from "@/components/nav-brand";
import {
  SignupCountFallback,
  SignupCountPanel,
} from "@/components/signup-count-panel";

export default function SignupsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <nav className="w-full flex justify-center h-16">
        <div className="w-full max-w-6xl flex items-center justify-between p-3 px-5 text-sm">
          <div className="font-semibold">
            <NavBrand />
          </div>
          <Link
            href="/"
            className="inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            Back Home
          </Link>
        </div>
      </nav>
      <div className="h-[calc(100vh-4rem)] w-full px-4 py-0">
        <div className="h-full w-full">
          <Suspense fallback={<SignupCountFallback />}>
            <SignupCountPanel />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
