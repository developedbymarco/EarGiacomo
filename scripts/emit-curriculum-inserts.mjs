import { CURRICULUM_NODES } from "../src/lib/curriculum/seed.ts";

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

for (const node of CURRICULUM_NODES) {
  const config = JSON.stringify(node.config);
  console.log(`insert into public.curriculum_nodes (
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
  ${quote(config)}::jsonb,
  array[${node.concepts.map(quote).join(", ")}]::text[],
  ${node.sortOrder}
);`);
}

for (const node of CURRICULUM_NODES) {
  for (const prerequisite of node.prerequisites) {
    console.log(`insert into public.curriculum_prerequisites (node_id, prerequisite_node_id)
select child.id, parent.id
from public.curriculum_nodes child
join public.curriculum_nodes parent on parent.slug = ${quote(prerequisite)}
where child.slug = ${quote(node.slug)};`);
  }
}
