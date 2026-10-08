import { getIdea, useFlowStore } from "./flow";
import { useUIStore } from "./ui";

/** Undo or redo a structural change (adding, moving, linking, coloring or deleting points). */
export function undoStructure(redo = false) {
	const flow = useFlowStore.getState();
	const changed = redo ? flow.redo() : flow.undo();
	const editing = useUIStore.getState().editing;
	if (editing && !getIdea(editing.id)) useUIStore.setState({ editing: null });
	return changed;
}
