import { useEffect, useRef, useState } from "react";
import { formatClock, parseClock } from "../../lib/time";

interface ClockTextProps {
	value: string;
	/** Current length in ms, offered as the starting text when editing. */
	duration: number;
	editable: boolean;
	onCommit: (ms: number) => void;
	className: string;
	label: string;
}

/** Clock digits that turn into a text field on click while stopped ("4", "3:30" and "130" all work). */
export function ClockText({ value, duration, editable, onCommit, className, label }: ClockTextProps) {
	const [draft, setDraft] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const editing = draft !== null;

	useEffect(() => {
		if (editing) inputRef.current?.select();
	}, [editing]);

	const commit = () => {
		if (draft === null) return;
		const ms = parseClock(draft);
		if (ms !== null) onCommit(ms);
		setDraft(null);
	};

	if (draft !== null) {
		return (
			<input
				ref={inputRef}
				className={className}
				value={draft}
				inputMode="numeric"
				aria-label={label}
				size={Math.max(4, draft.length)}
				onChange={event => setDraft(event.target.value.replace(/[^\d:]/g, ""))}
				onBlur={commit}
				onKeyDown={event => {
					if (event.key === "Enter") commit();
					if (event.key === "Escape") setDraft(null);
				}}
			/>
		);
	}

	return (
		<button type="button" className={className} disabled={!editable} onClick={() => setDraft(formatClock(duration / 1000))} aria-label={`${value}, edit ${label.toLowerCase()}`}>
			{value}
		</button>
	);
}
