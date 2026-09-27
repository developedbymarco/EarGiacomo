import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  resolve: {
    alias: { "@": path.resolve("src") },
  },
});

const { CURRICULUM_NODES, FOUNDATION_SLUGS } = await server.ssrLoadModule("/src/lib/curriculum/seed.ts");
await server.close();

const economy = readFileSync("supabase/migrations/20260927200000_economy.sql", "utf8");
const start = economy.indexOf("create or replace function public.record_practice_result(");
const end = economy.indexOf("create or replace function public.unlock_node(");
const fn = economy.slice(start, end).trim().replaceAll(
  "^(interval|chord):[A-Za-z0-9]+$",
  "^(interval|chord|cadence):[A-Za-z0-9]+$",
);

const foundation = new Set(FOUNDATION_SLUGS);
const depth = CURRICULUM_NODES.filter((node) => !foundation.has(node.slug));

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const lines = [
  "-- EarGiacomo depth: sixths through the fifteenth, inversions, open voicing, sevenths, and IV–I / V–I cadences.",
  "-- Apply this in the Supabase SQL editor after the economy migration.",
  "-- Existing lessons and unlocks are left in place.",
  "",
  fn,
  "",
  "insert into public.piano_instruments (id, slug, name, description)",
  "values",
  "  ('6f0c9a2e-4b17-4c3a-9d55-7e1b0c0a11e2', 'warm-felt', 'Warm Felt', 'Soft and intimate. Same samples, a darker filter.'),",
  "  ('6f0c9a2e-4b17-4c3a-9d55-7e1b0c0a11e3', 'bright-classical', 'Bright Classical', 'Defined upper register. Same samples, a brighter touch.')",
  "on conflict (slug) do nothing;",
  "",
];

for (const node of depth) {
  lines.push(`insert into public.curriculum_nodes (
  id, slug, title, description, category, path, difficulty, unlock_cost, xp_reward, config, concepts, sort_order
) values (
  ${quote(node.id)}::uuid,
  ${quote(node.slug)},
  ${quote(node.title)},
  ${quote(node.description)},
  ${quote(node.category)},
  ${quote(node.path)},
  ${node.difficulty},
  ${node.unlockCost},
  ${node.xpReward},
  ${quote(JSON.stringify(node.config))}::jsonb,
  array[${node.concepts.map(quote).join(", ")}]::text[],
  ${node.sortOrder}
) on conflict (slug) do nothing;
`);
}

for (const node of depth) {
  for (const prerequisite of node.prerequisites) {
    lines.push(`insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = ${quote(prerequisite)}
where child.slug = ${quote(node.slug)}
on conflict do nothing;
`);
  }
}

writeFileSync("supabase/migrations/20260927210000_depth.sql", `${lines.join("\n")}\n`);
console.log(`wrote ${depth.length} lessons`);
