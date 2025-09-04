import { BRANDS } from "../../lib/consts.ts";
import { Button } from "../button/button.tsx";
import { Modal, type ModalProps } from "../modal/modal.tsx";
import styles from "./add-insight.module.css";

type AddInsightProps = ModalProps & { onCreated?: () => void };

export const AddInsight = (props: AddInsightProps) => {
  const addInsight: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const brandSelect = form.querySelector<HTMLSelectElement>('select[name="brand"]');
    const textArea = form.querySelector<HTMLTextAreaElement>('textarea[name="text"]');

    const brand = Number(brandSelect?.value);
    const text = textArea?.value?.trim();
    if (!text || Number.isNaN(brand)) return;

    const res = await fetch(`/api/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, text }),
    });

    if (res.ok) {
      if (textArea) textArea.value = "";
      props.onCreated?.();
      props.onClose?.();
    } else {
      console.error("Failed to create insight", await res.text());
    }
  };

  return (
    <Modal {...props}>
      <h1 className={styles.heading}>Add a new insight</h1>
      <form className={styles.form} onSubmit={addInsight}>
        <label className={styles.field}>
          Brand
          <select
            className={styles["field-input"]}
            name="brand"
            defaultValue={BRANDS[0]?.id}
            required
          >
            {BRANDS.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
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
          />
        </label>
        <Button className={styles.submit} type="submit" label="Add insight" />
      </form>
    </Modal>
  );
};
