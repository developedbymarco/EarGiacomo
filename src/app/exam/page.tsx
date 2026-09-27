import Link from "next/link";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { EXAM_PRESETS, examSettings } from "@/lib/curriculum/exam";
import { getPathData } from "@/lib/curriculum/load";

export default async function ExamPage() {
  const data = await getPathData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Exam</h1>
        <p className="mt-3 max-w-2xl text-lg text-parchment">
          Ten questions from concepts you can already practice. Nothing is marked until the end. The result shows the
          score and how each concept went.
        </p>
      </div>

      {!data.ready ? (
        <p className="text-parchment">
          Run the path migration, then reload. You can still{" "}
          <Link href="/practice" className="text-gold underline-offset-4 hover:underline">
            practice
          </Link>{" "}
          without it.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {EXAM_PRESETS.map((preset) => {
            const settings = examSettings(data.nodes, preset.id, data.range, data.pianoId);
            return (
              <section key={preset.id} className="rounded-3xl border border-gold/30 bg-plum/50 p-5">
                <h2 className="font-serif text-3xl text-cream">{preset.title}</h2>
                <p className="mt-2 text-parchment">{preset.lede}</p>
                {settings ? (
                  <div className="mt-4">
                    <StartExamButton settings={settings} />
                  </div>
                ) : (
                  <p className="mt-4 text-parchment">Unlock two of these sounds first.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
