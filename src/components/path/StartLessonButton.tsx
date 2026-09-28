"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SessionMeta } from "@/lib/practice/settings";
import { saveSession } from "@/lib/practice/settings";
import type { PracticeSettings } from "@/lib/question-generation/generate";

export function StartLessonButton({
  label,
  settings,
  meta,
  variant = "gold",
  className = "",
}: {
  label: string;
  settings: PracticeSettings;
  meta: SessionMeta;
  variant?: "gold" | "ghost" | "parchment";
  className?: string;
}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => {
        saveSession({ ...settings, seed: crypto.randomUUID() }, meta);
        router.push("/session");
      }}
    >
      {label}
    </Button>
  );
}
