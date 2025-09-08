import { BRANDS } from "../../lib/consts.ts";
import { Button } from "../button/button.tsx";
import { Modal, type ModalProps } from "../modal/modal.tsx";
import styles from "./add-insight.module.css";

type AddInsightProps = ModalProps & { onCreated?: () => void };

export const AddInsight = ({ onCreated, ...modalProps }: AddInsightProps) => {
  /**
   * Submit handler (kept as `addInsight` per boilerplate).
   * @param e React form submit event for the <form>.
   *
   * Sends JSON to `/api/insights`:
   *   {
   *     brand: number,   // selected brand id
   *     text:  string    // insight text
   *   }
   * On success: resets form, calls onCreated, and closes the modal.
   */
  const addInsight: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const fd = new FormData(form);

    const brand = Number(fd.get("brand"));
    const text = String(fd.get("text") ?? "").trim();
    if (!text || Number.isNaN(brand)) return;

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, text }),
      });

      if (!res.ok) {
        console.error("Failed to create insight", await res.text());
        return;
      }

      form.reset(); // clear inputs
      onCreated?.(); // let parent refresh list
      modalProps.onClose?.();
    } catch (err) {
      console.error("Failed to create insight", err);
    }
  };

  return (
    <Modal {...modalProps}>
      <h1 className={styles.heading}>Add a new insight</h1>

      <form className={styles.form} onSubmit={addInsight} aria-busy={false}>
        <label className={styles.field}>
          Brand
          <select
            className={styles["field-input"]}
            name="brand"
            defaultValue={BRANDS[0]?.id}
            required
            aria-label="Choose brand"
          >
            {BRANDS.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Insight
          <textarea
            className={styles["field-input"]}
            name="text"
            rows={5}
            placeholder="Something insightful..."
            required
            aria-label="Insight text"
          />
        </label>

        <Button className={styles.submit} type="submit" label="Add insight" />
      </form>
    </Modal>
  );
};
