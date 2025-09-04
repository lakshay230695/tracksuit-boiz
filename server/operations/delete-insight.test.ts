import { expect } from "jsr:@std/expect";
import { beforeAll, describe, it } from "jsr:@std/testing/bdd";
import type { Insight } from "$models/insight.ts";
import { withDB } from "../testing.ts";
import listInsights from "./list-insights.ts";
import deleteInsight from "./delete-insight.ts";

describe("deleting an insight", () => {
  describe("when the id exists", () => {
    withDB((fixture) => {
      let remaining: Insight[];

      beforeAll(() => {
        const seed: Insight[] = [
          { id: 1, brand: 0, createdAt: new Date(), text: "keep me" },
          { id: 2, brand: 1, createdAt: new Date(), text: "delete me" },
        ];
        fixture.insights.insert(
          seed.map((it) => ({ ...it, createdAt: it.createdAt.toISOString() })),
        );

        // perform delete
        // don't assert the return shape (could be boolean or {success:true});
        // we assert the side-effect instead.
        deleteInsight({ db: fixture.db, id: 2 });
        remaining = listInsights(fixture);
      });

      it("removes the row from the database", () => {
        expect(remaining.map((r) => r.id)).toEqual([1]);
        expect(remaining[0].text).toBe("keep me");
      });
    });
  });

  describe("when the id does not exist", () => {
    withDB((fixture) => {
      let before: Insight[];
      let after: Insight[];

      beforeAll(() => {
        // empty DB
        before = listInsights(fixture);
        deleteInsight({ db: fixture.db, id: 999 }); // should be a no-op
        after = listInsights(fixture);
      });

      it("is a no-op (does not throw and leaves DB unchanged)", () => {
        expect(before).toEqual([]);
        expect(after).toEqual([]);
      });
    });
  });
});
