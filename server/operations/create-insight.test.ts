import { expect } from "jsr:@std/expect";
import { beforeAll, describe, it } from "jsr:@std/testing/bdd";
import type { Insight } from "$models/insight.ts";
import { withDB } from "../testing.ts";
import listInsights from "./list-insights.ts";
import createInsight from "./create-insight.ts";

describe("creating an insight", () => {
  describe("into an empty DB", () => {
    withDB((fixture) => {
      let created: Insight;
      let listed: Insight[];

      beforeAll(() => {
        const start = Date.now();
        created = createInsight({ db: fixture.db, brand: 2, text: "hello world" });
        const end = Date.now();

        // sanity on timestamps
        expect(created.createdAt instanceof Date).toBe(true);
        expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(start);
        expect(created.createdAt.getTime()).toBeLessThanOrEqual(end);

        listed = listInsights(fixture);
      });

      it("returns the inserted row", () => {
        expect(created.id).toBe(1);
        expect(created.brand).toBe(2);
        expect(created.text).toBe("hello world");
      });

      it("persists to the database", () => {
        expect(listed).toEqual([created]);
      });
    });
  });

  describe("when rows already exist", () => {
    withDB((fixture) => {
      let created: Insight;

      beforeAll(() => {
        const seed: Insight[] = [
          { id: 1, brand: 0, createdAt: new Date(), text: "1" },
          { id: 2, brand: 1, createdAt: new Date(), text: "2" },
        ];
        fixture.insights.insert(
          seed.map((it) => ({ ...it, createdAt: it.createdAt.toISOString() })),
        );

        created = createInsight({ db: fixture.db, brand: 9, text: "third" });
      });

      it("auto-increments the id", () => {
        expect(created.id).toBe(3);
        expect(created.brand).toBe(9);
        expect(created.text).toBe("third");
      });
    });
  });
});
