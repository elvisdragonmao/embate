import { redoDepth, undoDepth } from "@milkdown/kit/prose/history";
import { Selection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { isComposing, isMac, isMod } from "../../lib/platform";
import { hasChildren, neighbour } from "../../lib/tree";
import { undoStructure } from "../../stores/actions";
import { getIdea, useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import { extendIdea } from "./boardApi";
import { cellEditor } from "./cellEditor";

const isEmpty = (view: EditorView) => view.state.doc.childCount === 1 && view.state.doc.firstChild!.isTextblock && view.state.doc.firstChild!.content.size === 0;

function stop(view: EditorView) {
	useUIStore.getState().stopEditing();
	view.dom.blur();
}

/** Outliner keys for the idea being edited. Returns true when the key was handled. */
function handleKey(id: string, event: KeyboardEvent, view: EditorView): boolean {
	if (isComposing(event)) return false;
	const flow = useFlowStore.getState();
	const ui = useUIStore.getState();
	const idea = getIdea(id);
	const ideas = flow.record?.ideas;
	if (!idea || !ideas) return false;
	const mod = isMod(event);
	const plain = !mod && !event.altKey && !(isMac && event.ctrlKey);

	switch (event.key) {
		case "Enter": {
			if (mod && !event.shiftKey && !event.altKey) {
				const created = extendIdea(id);
				if (created) ui.edit(created, { at: "start" });
				return true;
			}
			if (!plain || event.shiftKey) return false;
			if (isEmpty(view)) {
				if (idea.parent) flow.outdent(id);
				else stop(view);
				return true;
			}
			// Split at the caret: the text after it moves into the new point.
			const { from, to } = view.state.selection;
			const end = Selection.atEnd(view.state.doc).from;
			let rest = "";
			if (to < end) {
				rest = cellEditor.serialize(view.state.doc.cut(to)).trim();
				view.dispatch(view.state.tr.delete(from, end));
			} else if (from < to) view.dispatch(view.state.tr.delete(from, to));
			const created = flow.addIdea({ col: idea.col, parent: idea.parent, after: id, text: rest });
			ui.edit(created, { at: "start" });
			return true;
		}

		case "Tab": {
			if (!plain) return false;
			if (event.shiftKey) {
				if (idea.parent) flow.outdent(id);
				return true;
			}
			if (isEmpty(view)) {
				flow.indent(id);
				return true;
			}
			const created = flow.addIdea({ col: idea.col, parent: id });
			ui.edit(created, { at: "start" });
			return true;
		}

		case "Backspace": {
			if (!plain || event.shiftKey || !isEmpty(view)) return false;
			if (hasChildren(ideas, id)) return true;
			const target = neighbour(ideas, id, -1) ?? neighbour(ideas, id, 1);
			flow.remove(id, { history: false });
			if (target) ui.edit(target.id, { at: "end" });
			else stop(view);
			return true;
		}

		case "ArrowUp":
		case "ArrowDown": {
			if (!plain || event.shiftKey) return false;
			const direction = event.key === "ArrowUp" ? -1 : 1;
			const { selection, doc } = view.state;
			const atEdge = direction < 0 ? selection.from === Selection.atStart(doc).from || view.endOfTextblock("up") : selection.to === Selection.atEnd(doc).from || view.endOfTextblock("down");
			const blockEdge = direction < 0 ? selection.$from.index(0) === 0 : selection.$to.index(0) === doc.childCount - 1;
			if (!atEdge || !blockEdge) return false;
			const target = neighbour(ideas, id, direction);
			if (!target) return false;
			const x = view.coordsAtPos(selection.head).left;
			ui.edit(target.id, { at: "edge", x, edge: direction < 0 ? "bottom" : "top" });
			return true;
		}

		case "Escape":
			stop(view);
			return true;
	}

	// ⌘Z / ⌘⇧Z fall through to point-level undo once the text history of this idea is exhausted.
	if (mod && !event.altKey && (event.code === "KeyZ" || (!isMac && event.code === "KeyY"))) {
		const redo = event.code === "KeyY" || event.shiftKey;
		if ((redo ? redoDepth(view.state) : undoDepth(view.state)) > 0) return false;
		return undoStructure(redo);
	}

	return false;
}

cellEditor.onKey = handleKey;
cellEditor.onChange = (id, markdown) => useFlowStore.getState().setText(id, markdown);
cellEditor.onBlur = id => {
	if (useUIStore.getState().editing?.id === id) useUIStore.getState().stopEditing();
};
