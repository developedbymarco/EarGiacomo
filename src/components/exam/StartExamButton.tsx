"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveSession } from "@/lib/practice/settings";
import type { PracticeSettings } from "@/lib/question-generation/generate";

export function StartExamButton({ settings }: { settings: PracticeSettings }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => {
        saveSession({ ...settings, seed: crypto.randomUUID() }, { mode: "exam", nodeSlug: null });
        router.push("/session");
      }}
    >
      Start exam
    </Button>
  );
}
