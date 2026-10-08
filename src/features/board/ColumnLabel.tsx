import { useState } from "react";
import type { Side } from "../../lib/formats";
import { useFlowStore } from "../../stores/flow";
import styles from "./Board.module.css";

/** A speech label in the header; click to rename. Clearing it restores the format's name. */
export function ColumnLabel({ col, label, side, span }: { col: number; label: string; side: Side | null; span: number }) {
	const [draft, setDraft] = useState<string | null>(null);

	const commit = () => {
		if (draft !== null) useFlowStore.getState().setColumnLabel(col, draft);
		setDraft(null);
	};

	return (
		<div className={styles.label} data-side={side ?? "cross"} style={{ width: `calc(${span} * var(--col-w))` }}>
			{draft === null ? (
				<button type="button" className={styles.labelText} onClick={() => setDraft(label)} aria-label={`Rename ${label}`}>
					{label}
				</button>
			) : (
				<input
					className={styles.labelText}
					value={draft}
					size={Math.max(2, draft.length + 1)}
					maxLength={24}
					autoFocus
					onFocus={event => event.currentTarget.select()}
					onChange={event => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={event => {
						if (event.key === "Enter" && !event.nativeEvent.isComposing) commit();
						if (event.key === "Escape") setDraft(null);
					}}
				/>
			)}
		</div>
	);
}
