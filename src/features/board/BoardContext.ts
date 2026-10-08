import type { MotionValue } from "motion/react";
import { createContext, useContext, type PointerEvent } from "react";

/** Stable board services; deliberately free of per-render data so cells don't re-render on zoom. */
export interface BoardContextValue {
	/** Shared vertical position of an idea, read by its cell and by the arrows attached to it. */
	yOf: (id: string, initial: number) => MotionValue<number>;
	/** Shared horizontal indent offset of an idea, in px. */
	xOf: (id: string, depth: number) => MotionValue<number>;
	/** Indent per depth level, in px. */
	indent: number;
	observe: (element: Element) => () => void;
	startLink: (id: string, event: PointerEvent) => void;
	/** Press on an idea: a click edits it, a drag reorders it. */
	pressIdea: (id: string, event: PointerEvent) => void;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard() {
	const value = useContext(BoardContext);
	if (!value) throw new Error("useBoard must be used inside <Board>");
	return value;
}

/** Spring for ideas sliding into place. */
export const SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 1 } as const;
