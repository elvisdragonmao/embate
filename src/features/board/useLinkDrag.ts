import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import { extendIdea } from "./boardApi";

export type LinkTarget = { kind: "idea"; id: string } | { kind: "col"; col: number };

export interface LinkDrag {
	sourceId: string;
	/** Pointer position in board-body coordinates. */
	x: number;
	y: number;
	target: LinkTarget | null;
}

/** Drag the extend handle onto a later speech or idea to link there; a plain click extends into the next speech. */
export function useLinkDrag(bodyRef: RefObject<HTMLDivElement | null>) {
	const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
	const startRef = useRef((sourceId: string, event: ReactPointerEvent) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		const source = useFlowStore.getState().record?.ideas.find(idea => idea.id === sourceId);
		if (!source) return;
		const start = { x: event.clientX, y: event.clientY };
		let dragging = false;

		const hitTest = (x: number, y: number): LinkTarget | null => {
			for (const element of document.elementsFromPoint(x, y)) {
				const idea = element.closest<HTMLElement>("[data-idea-id]");
				if (idea) {
					const id = idea.dataset.ideaId!;
					const target = useFlowStore.getState().record?.ideas.find(item => item.id === id);
					return target && target.col > source.col ? { kind: "idea", id } : null;
				}
				const column = element.closest<HTMLElement>("[data-col]");
				if (column) {
					const col = Number(column.dataset.col);
					return col > source.col ? { kind: "col", col } : null;
				}
			}
			return null;
		};

		const onMove = (move: PointerEvent) => {
			if (!dragging && Math.hypot(move.clientX - start.x, move.clientY - start.y) < 4) return;
			dragging = true;
			const body = bodyRef.current!.getBoundingClientRect();
			setLinkDrag({ sourceId, x: move.clientX - body.left, y: move.clientY - body.top, target: hitTest(move.clientX, move.clientY) });
		};
		const finish = (up: PointerEvent | null) => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", finish);
			window.removeEventListener("pointercancel", cancel);
			setLinkDrag(null);
			if (!up) return;
			const ui = useUIStore.getState();
			if (!dragging) {
				const created = extendIdea(sourceId);
				if (created) ui.edit(created, { at: "start" });
				return;
			}
			const target = hitTest(up.clientX, up.clientY);
			if (target?.kind === "idea") useFlowStore.getState().link(target.id, sourceId);
			else if (target?.kind === "col") {
				const created = extendIdea(sourceId, target.col);
				if (created) ui.edit(created, { at: "start" });
			}
		};
		const cancel = () => finish(null);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", finish);
		window.addEventListener("pointercancel", cancel);
	});

	return { linkDrag, startLink: startRef.current };
}
