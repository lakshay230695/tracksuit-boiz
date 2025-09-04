import type { HasDBClient } from "../shared.ts";

type Input = HasDBClient & { id: number };

export default function deleteInsight(input: Input): { success: true } {
  input.db.sql`DELETE FROM insights WHERE id = ${input.id}`;
  return { success: true };
}
