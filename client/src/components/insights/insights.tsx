import { useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { cx } from "../../lib/cx.ts";
import styles from "./insights.module.css";
import type { Insight } from "../../schemas/insight.ts";

/** Sentiment classes returned by the API. */
enum SentimentLabel {
  Positive = "positive",
  Neutral = "neutral",
  Negative = "negative",
}

type InsightsProps = {
  insights: Insight[];
  className?: string;
  onDeleted?: (id: number) => void;
};

type Sentiment = { label: SentimentLabel; score: number };

const BADGE_CLASS: Record<SentimentLabel, string> = {
  [SentimentLabel.Positive]: styles.badgePositive,
  [SentimentLabel.Neutral]: styles.badgeNeutral,
  [SentimentLabel.Negative]: styles.badgeNegative,
};

export const Insights = ({ insights, className, onDeleted }: InsightsProps) => {
  const [sentiments, setSentiments] = useState<Record<number, Sentiment>>({});

  useEffect(() => {
    const missing = insights.filter((i) => !sentiments[i.id]);
    if (!missing.length) return;

    (async () => {
      const results = await Promise.all(
        missing.map(async (i) => {
          try {
            const res = await fetch("/api/sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: i.text }),
            });
            if (!res.ok) {
              console.error(
                "Sentiment API error",
                res.status,
                await res.text()
              );
              return null;
            }
            const s = (await res.json()) as Sentiment;
            return [i.id, s] as const;
          } catch (err) {
            console.error("Failed to analyze sentiment", err);
            return null;
          }
        })
      );

      // Commit all successful results in one state update (avoids races)
      setSentiments((prev) => {
        const next = { ...prev };
        for (const item of results) {
          if (!item) continue; // skip failed requests
          const [id, s] = item;
          if (!next[id]) next[id] = s;
        }
        return next;
      });
    })();
    // Only rerun when the list of insights changes
  }, [insights]);

  const deleteInsight = async (id: number) => {
    try {
      const res = await fetch(`/api/insights/${id}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to delete insight", res.status, await res.text());
        return;
      }
      onDeleted?.(id);
      setSentiments((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete insight", err);
    }
  };

  return (
    <div className={cx(className)}>
      <h1 className={styles.heading}>Insights</h1>
      <div className={styles.list}>
        {insights?.length ? (
          insights.map(({ id, text, createdAt, brand }) => {
            const s = sentiments[id];
            return (
              <div className={styles.insight} key={id}>
                <div className={styles["insight-meta"]}>
                  <span>{brand}</span>
                  <div className={styles["insight-meta-details"]}>
                    <span>
                      {(createdAt instanceof Date
                        ? createdAt
                        : new Date(createdAt)
                      ).toLocaleString()}
                    </span>

                    {s && (
                      <span
                        className={cx(styles.badge, BADGE_CLASS[s.label])}
                        title={`${s.label} • ${(s.score * 100).toFixed(0)}%`}
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
