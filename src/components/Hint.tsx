import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import styles from "./Hint.module.css";

interface HintProps {
	label: ReactNode;
	keys?: string[];
	side?: "top" | "bottom" | "left" | "right";
	/** The trigger element; it receives the tooltip's props. */
	children: ReactElement<Record<string, unknown>>;
}

/** Tooltip with an optional shortcut. */
export function Hint({ label, keys, side = "top", children }: HintProps) {
	return (
		<Tooltip.Root>
			<Tooltip.Trigger render={children} />
			<Tooltip.Portal>
				<Tooltip.Positioner side={side} sideOffset={6} className={styles.positioner}>
					<Tooltip.Popup className={styles.popup}>
						<span>{label}</span>
						{keys && <Keys keys={keys} />}
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

export function Keys({ keys, className }: { keys: string[]; className?: string }) {
	return (
		<span className={`${styles.keys} ${className ?? ""}`}>
			{keys.map((key, index) => (
				<kbd key={index} className={styles.key}>
					{key}
				</kbd>
			))}
		</span>
	);
}
