import { create } from "zustand";
import { isBlank } from "../lib/record";
import { hasChildren } from "../lib/tree";
import { useFlowStore } from "./flow";

/** Where to put the caret when an idea starts editing. */
export type Caret = { at: "start" } | { at: "end" } | { at: "point"; x: number; y: number } | { at: "edge"; x: number; edge: "top" | "bottom" };

export interface Editing {
	id: string;
	caret: Caret;
}

interface UIState {
	editing: Editing | null;
	/** Column width in rem chosen by pinching; null fits all columns to the viewport, which is how every visit starts. */
	columnWidth: number | null;
	helpOpen: boolean;
	openMenuOpen: boolean;
	edit: (id: string, caret?: Caret) => void;
	stopEditing: () => void;
	setColumnWidth: (rem: number | null) => void;
	setHelpOpen: (open: boolean) => void;
	setOpenMenuOpen: (open: boolean) => void;
}

/** Ideas left empty are dropped as soon as editing moves elsewhere. */
function dropIfBlank(id: string) {
	const flow = useFlowStore.getState();
	const ideas = flow.record?.ideas ?? [];
	const idea = ideas.find(item => item.id === id);
	if (idea && isBlank(idea.text) && !hasChildren(ideas, id)) flow.remove(id, { history: false });
}

export const useUIStore = create<UIState>()((set, get) => ({
	editing: null,
	columnWidth: null,
	helpOpen: false,
	openMenuOpen: false,
	edit: (id, caret = { at: "end" }) => {
		const previous = get().editing;
		set({ editing: { id, caret } });
		if (previous && previous.id !== id) dropIfBlank(previous.id);
	},
	stopEditing: () => {
		const previous = get().editing;
		if (!previous) return;
		set({ editing: null });
		dropIfBlank(previous.id);
	},
	setColumnWidth: columnWidth => set({ columnWidth }),
	setHelpOpen: helpOpen => set({ helpOpen }),
	setOpenMenuOpen: openMenuOpen => set({ openMenuOpen })
}));
