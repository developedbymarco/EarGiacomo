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
}: {
  label: string;
  settings: PracticeSettings;
  meta: SessionMeta;
}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => {
        saveSession({ ...settings, seed: crypto.randomUUID() }, meta);
        router.push("/session");
      }}
    >
      {label}
    </Button>
  );
}
