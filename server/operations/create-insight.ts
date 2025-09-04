import type { HasDBClient } from "../shared.ts";
import type * as insightsTable from "$tables/insights.ts";
import type { Insight } from "$models/insight.ts";

type Input = HasDBClient & {
  text: string;
  brand: number;
};

export default function createInsight(input: Input): Insight {
  const createdAtIso = new Date().toISOString();

  // Insert new row
  input.db.sql`
    INSERT INTO insights (brand, createdAt, text)
    VALUES (${input.brand}, ${createdAtIso}, ${input.text})
  `;

  // Fetch the just-inserted row by last_insert_rowid()
  const [row] = input.db.sql<insightsTable.Row>`
    SELECT * FROM insights WHERE rowid = last_insert_rowid()
  `;

  return { ...row, createdAt: new Date(row.createdAt) };
}
