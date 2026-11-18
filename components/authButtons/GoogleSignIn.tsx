"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function GoogleSignIn({ className, label }: { className?: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google")}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-md border border-brand-line bg-white short:h-11 text-base font-semibold text-brand-ink transition-colors hover:border-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        className,
      )}
    >
      <Image src="/google-logo.png" height={20} width={20} alt="" />
      {label}
    </button>
  );
}
