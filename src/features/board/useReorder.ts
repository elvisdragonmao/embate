import type { MotionValue } from "motion/react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Idea } from "../../lib/record";
import { columnOrder, descendantIds, moveIdea, type Drop } from "../../lib/tree";
import { useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import { computeLayout, type Layout, type Metrics } from "./layout";

export interface Moving {
	id: string;
	/** The dragged idea and its sub-points. */
	ids: Set<string>;
	/** Ideas with the move applied, so the rest of the column makes room while dragging. */
	preview: Idea[];
}

export interface ReorderLive {
	layout: Layout;
	metrics: Metrics;
	columns: number;
	heights: Map<string, number>;
	yOf: (id: string, initial: number) => MotionValue<number>;
}

interface Session {
	ideas: Idea[];
	ids: Set<string>;
	/** Remaining ideas of the column, in reading order, with their midpoints in a layout without the dragged block. */
	order: { id: string; depth: number; mid: number }[];
	depth: number;
	height: number;
	grab: number;
	drop: Drop | null;
	preview: Layout;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const THRESHOLD = 4;

/**
 * Press an idea and drag it up or down to move it, together with its sub-points, within its column.
 * Dragging sideways changes how deep it is nested. A press without movement edits the idea instead.
 */
export function useReorder(bodyRef: RefObject<HTMLDivElement | null>, scrollerRef: RefObject<HTMLDivElement | null>, live: RefObject<ReorderLive>) {
	const [moving, setMoving] = useState<Moving | null>(null);

	const pressRef = useRef((id: string, event: ReactPointerEvent) => {
		if (event.button !== 0) return;
		const start = { x: event.clientX, y: event.clientY };
		const pointer = { ...start };
		let session: Session | null = null;
		let frame = 0;

		const begin = (): Session | null => {
			const { layout, metrics, columns, heights } = live.current;
			const ideas = useFlowStore.getState().record?.ideas ?? [];
			const idea = ideas.find(item => item.id === id);
			const placement = layout.placements.get(id);
			if (!idea || !placement) return null;
			const ids = descendantIds(ideas, id);
			const without = ideas.filter(item => !ids.has(item.id));
			const base = computeLayout(without, heights, metrics, columns);
			const order = columnOrder(without, idea.col).map(({ idea: item, depth }) => {
				const at = base.placements.get(item.id)!;
				return { id: item.id, depth, mid: at.y + at.height / 2 };
			});
			const bodyTop = bodyRef.current!.getBoundingClientRect().top;
			return { ideas, ids, order, depth: placement.depth, height: placement.height, grab: start.y - bodyTop - placement.y, drop: null, preview: layout };
		};

		const update = () => {
			if (!session) return;
			const { metrics, columns, heights, yOf } = live.current;
			const top = pointer.y - bodyRef.current!.getBoundingClientRect().top - session.grab;
			const center = top + session.height / 2;
			let gap = 0;
			while (gap < session.order.length && session.order[gap].mid < center) gap++;
			const prev = session.order[gap - 1];
			const next = session.order[gap];
			const depth = clamp(session.depth + Math.round((pointer.x - start.x) / metrics.indent), next?.depth ?? 0, prev ? prev.depth + 1 : 0);
			const drop = { prev: prev?.id ?? null, depth };
			if (!session.drop || session.drop.prev !== drop.prev || session.drop.depth !== drop.depth) {
				session.drop = drop;
				const preview = moveIdea(session.ideas, id, drop) ?? session.ideas;
				session.preview = computeLayout(preview, heights, metrics, columns);
				setMoving({ id, ids: session.ids, preview });
			}
			// The whole block follows the pointer, keeping its sub-points in place underneath.
			const anchor = session.preview.placements.get(id)?.y ?? 0;
			for (const member of session.ids) {
				const placement = session.preview.placements.get(member);
				if (placement) yOf(member, placement.y).set(top + placement.y - anchor);
			}
		};

		// Scroll when the pointer nears the top or bottom edge.
		const autoscroll = () => {
			const scroller = scrollerRef.current;
			if (session && scroller) {
				const rect = scroller.getBoundingClientRect();
				const edge = 3 * live.current.metrics.rem;
				const speed = pointer.y < rect.top + edge ? -(rect.top + edge - pointer.y) : pointer.y > rect.bottom - edge ? pointer.y - (rect.bottom - edge) : 0;
				if (speed) {
					scroller.scrollTop += speed / 4;
					update();
				}
			}
			frame = requestAnimationFrame(autoscroll);
		};

		const onMove = (move: PointerEvent) => {
			pointer.x = move.clientX;
			pointer.y = move.clientY;
			if (!session) {
				if (Math.abs(pointer.x - start.x) < THRESHOLD && Math.abs(pointer.y - start.y) < THRESHOLD) return;
				session = begin();
				if (!session) return finish(false);
				frame = requestAnimationFrame(autoscroll);
			}
			update();
		};

		const finish = (commit: boolean) => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onCancel);
			window.removeEventListener("keydown", onKey, true);
			cancelAnimationFrame(frame);
			if (!session) {
				if (commit) useUIStore.getState().edit(id, { at: "point", x: start.x, y: start.y });
				return;
			}
			if (commit && session.drop) useFlowStore.getState().move(id, session.drop);
			setMoving(null);
			session = null;
		};

		const onUp = () => finish(true);
		const onCancel = () => finish(false);
		const onKey = (key: KeyboardEvent) => {
			if (key.key !== "Escape" || !session) return;
			key.preventDefault();
			key.stopPropagation();
			finish(false);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onCancel);
		window.addEventListener("keydown", onKey, true);
	});

	return { moving, pressIdea: pressRef.current };
}
