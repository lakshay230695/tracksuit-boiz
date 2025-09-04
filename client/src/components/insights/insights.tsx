import { useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { cx } from "../../lib/cx.ts";
import styles from "./insights.module.css";
import type { Insight } from "../../schemas/insight.ts";

type InsightsProps = {
  insights: Insight[];
  className?: string;
  onDeleted?: (id: number) => void;
};

type Sentiment = { label: "positive" | "neutral" | "negative"; score: number };

export const Insights = ({ insights, className, onDeleted }: InsightsProps) => {
  const [sentiments, setSentiments] = useState<Record<number, Sentiment>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = insights.filter((i) => !sentiments[i.id]);
      if (!missing.length) return;

      await Promise.all(
        missing.map(async (i) => {
          try {
            const res = await fetch("/api/sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: i.text }),
            });
            if (!res.ok) return;
            const s: Sentiment = await res.json();
            if (!cancelled) {
              setSentiments((prev) => ({ ...prev, [i.id]: s }));
            }
          } catch {
            /* ignore */
          }
        }),
      );
    })();
    return () => { cancelled = true; };
  }, [insights]); // run when list changes

  const deleteInsight = async (id: number) => {
    const res = await fetch(`/api/insights/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(id);
    else console.error("Failed to delete insight", await res.text());
  };

  const badgeStyles = (label?: Sentiment["label"]) => {
    if (label === "positive") {
      return { color: "#17823b", background: "rgba(23,130,59,0.12)" };
    }
    if (label === "negative") {
      return { color: "#c62828", background: "rgba(198,40,40,0.12)" };
    }
    // neutral
    return { color: "#374151", background: "rgba(55,65,81,0.12)" };
  };

  return (
    <div className={cx(className)}>
      <h1 className={styles.heading}>Insights</h1>
      <div className={styles.list}>
        {insights?.length ? (
          insights.map(({ id, text, createdAt, brand }) => {
            const s = sentiments[id];
            const style = badgeStyles(s?.label);
            return (
              <div className={styles.insight} key={id}>
                <div className={styles["insight-meta"]}>
                  <span>{brand}</span>
                  <div className={styles["insight-meta-details"]}>
                    <span>{(createdAt instanceof Date ? createdAt : new Date(createdAt)).toLocaleString()}</span>
                    {s && (
                      <span
                        title={`${s.label} • ${(s.score * 100).toFixed(0)}%`}
                        style={{
                          marginLeft: 8,
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "capitalize",
                          ...style,
                        }}
                      >
                        {s.label}
                      </span>
                    )}
                    <Trash2Icon
                      className={styles["insight-delete"]}
                      role="button"
                      aria-label="Delete insight"
                      onClick={() => deleteInsight(id)}
                    />
                  </div>
                </div>
                <p className={styles["insight-content"]}>{text}</p>
              </div>
            );
          })
        ) : (
          <p>We have no insight!</p>
        )}
      </div>
    </div>
  );
};
