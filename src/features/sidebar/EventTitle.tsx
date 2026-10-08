import { useLayoutEffect, useRef } from "react";
import { useFlowStore } from "../../stores/flow";
import styles from "./EventTitle.module.css";

export function EventTitle() {
	const title = useFlowStore(state => state.record?.title ?? "");
	const setTitle = useFlowStore(state => state.setTitle);
	const ref = useRef<HTMLTextAreaElement>(null);

	// Grow with the text instead of scrolling.
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		element.style.height = "auto";
		element.style.height = `${element.scrollHeight}px`;
	}, [title]);

	return (
		<textarea
			ref={ref}
			className={styles.title}
			value={title}
			rows={1}
			placeholder="Untitled"
			spellCheck={false}
			aria-label="Event title"
			onChange={event => setTitle(event.target.value.replace(/\n/g, " "))}
			onKeyDown={event => {
				if (event.key === "Enter" || event.key === "Escape") {
					event.preventDefault();
					event.currentTarget.blur();
				}
			}}
		/>
	);
}
