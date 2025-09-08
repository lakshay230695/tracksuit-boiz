// deno-lint-ignore-file no-explicit-any
import { Database } from "@db/sqlite";
import * as oak from "@oak/oak";
import * as path from "@std/path";
import { Port } from "../lib/utils/index.ts";
import listInsights from "./operations/list-insights.ts";
import lookupInsight from "./operations/lookup-insight.ts";
import createInsight from "./operations/create-insight.ts";
import deleteInsight from "./operations/delete-insight.ts";
import analyzeSentiment from "./operations/analyse-sentiment.ts";
import * as insightsTable from "$tables/insights.ts";

console.log("Loading configuration");

const env = {
  port: Port.parse(Deno.env.get("SERVER_PORT")),
};

const dbFilePath = path.resolve("tmp", "db.sqlite3");

console.log(`Opening SQLite database at ${dbFilePath}`);

await Deno.mkdir(path.dirname(dbFilePath), { recursive: true });
const db = new Database(dbFilePath);

// Ensure the insights table exists
db.prepare(insightsTable.createTable).run();
console.log("Initialising server");

const router = new oak.Router();

const json = (ctx: oak.Context, body: unknown, status = 200) => {
  ctx.response.status = status;
  ctx.response.type = "json";
  ctx.response.body = body;
};

router.get("/_health", (ctx) => json(ctx, "OK"));

// LIST
router.get("/insights", (ctx) => {
  const result = listInsights({ db });
  ctx.response.status = 200;           
  ctx.response.type = "json";
  ctx.response.body = result; 
});

router.get("/insights/:id", (ctx) => {
  const id = Number((ctx.params as Record<string, string>).id);
  const result = lookupInsight({ db, id });
  if (result) {
    ctx.response.status = 200;
    ctx.response.type = "json";
    ctx.response.body = result;
  } else {
    ctx.response.status = 404;
    ctx.response.type = "json";
    ctx.response.body = { error: "Not found" };
  }
});

router.post("/insights", async (ctx) => {
  if (!ctx.request.hasBody) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing request body" };
    return;
  }

  let payload: any;
  try {
    payload = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON" };
    return;
  }

  const { brand, text } = payload ?? {};
  if (typeof brand === "undefined" || !text) {
    ctx.response.status = 400;
    ctx.response.body = { error: "text and brand are required" };
    return;
  }

  const created = createInsight({
    db,
    brand: Number(brand),
    text: String(text),
  });

  ctx.response.status = 201;
  ctx.response.type = "json";
  ctx.response.body = created;
});


router.delete("/insights/:id", (ctx) => {
  const id = Number((ctx.params as Record<string, string>).id);
  if (Number.isNaN(id)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "id must be a number" };
    return;
  }
  const result = deleteInsight({ db, id });
  ctx.response.status = 200;
  ctx.response.type = "json";
  ctx.response.body = result;
});

router.post("/sentiment", async (ctx) => {
  try {
    const { text } = await ctx.request.body.json(); 
    if (!text) return json(ctx, { error: "text is required" }, 400);
    const result = await analyzeSentiment(String(text));
    return json(ctx, result, 200);
  } catch (e) {
    const msg = (e as Error)?.message ?? "sentiment analysis failed";
    const status = msg.includes("No LLM available") ? 400 : 500;
    return json(ctx, { error: msg }, status);
  }
});

const app = new oak.Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: env.port }); 

console.log(`Started server on port ${env.port}`);
