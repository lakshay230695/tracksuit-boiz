import { useEffect, useState } from "react";
import { Header } from "../components/header/header.tsx";
import { Insights } from "../components/insights/insights.tsx";
import styles from "./app.module.css";
import type { Insight } from "../schemas/insight.ts";

export const App = () => {
  const [insights, setInsights] = useState<Insight[]>([]);

  const loadInsights = async () => {
    const res = await fetch(`/api/insights`);
    if (!res.ok) {
      console.error("Failed to load insights", await res.text());
      return;
    }
    const data = await res.json();
    const normalized: Insight[] = (data ?? []).map((row: any) => ({
      ...row,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    }));
    setInsights(normalized);
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleDeleted = (id: number) => {
    setInsights((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <main className={styles.main}>
      <Header onCreated={loadInsights} />
      <Insights className={styles.insights} insights={insights} onDeleted={handleDeleted} />
    </main>
  );
};
