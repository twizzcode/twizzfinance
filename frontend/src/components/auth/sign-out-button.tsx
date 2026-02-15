"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({ className, label }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100 ${className ?? ""}`}
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? "Keluar..." : label ?? "Sign out"}
    </Button>
  );
}
