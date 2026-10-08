import { useEffect, useRef } from "react";
import { createMarkdownEditor } from "../../lib/milkdown";
import { useFlowStore } from "../../stores/flow";
import prose from "../../styles/prose.module.css";
import styles from "./Note.module.css";

export function Note() {
	const id = useFlowStore(state => state.record?.id);
	return (
		<div className={styles.note}>
			<NoteEditor key={id} />
		</div>
	);
}

function NoteEditor() {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const record = useFlowStore.getState().record;
		if (!record) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let flush = () => {};

		const editor = createMarkdownEditor({
			root,
			value: record.note,
			onChange: markdown => {
				// Long notes are serialized at most a few times per second.
				flush = () => useFlowStore.getState().setNote(record.id, markdown());
				clearTimeout(timer);
				timer = setTimeout(() => {
					flush();
					flush = () => {};
				}, 250);
			}
		});
		return () => {
			clearTimeout(timer);
			flush();
			editor.then(instance => instance.destroy());
		};
	}, []);

	return (
		<div
			ref={rootRef}
			className={`${prose.prose} ${styles.editor}`}
			onMouseDown={event => {
				// Clicking the blank area below the text focuses the end of the note.
				if (event.target === event.currentTarget) {
					event.preventDefault();
					const editable = event.currentTarget.querySelector<HTMLElement>("[contenteditable]");
					editable?.focus();
				}
			}}
		/>
	);
}
