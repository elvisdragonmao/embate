import { AnimatePresence, motionValue, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { sideOf, SPEECHES, type Idea } from "../../lib/record";
import { columnOrder } from "../../lib/tree";
import { lastColumn, useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import { Arrows, DragArrow } from "./Arrows";
import styles from "./Board.module.css";
import { boardState, extendIdea } from "./boardApi";
import { BoardContext, type BoardContextValue } from "./BoardContext";
import "./cellKeys";
import { IdeaCell } from "./IdeaCell";
import { IdeaMenu } from "./IdeaMenu";
import { COLUMN_COUNT, computeLayout, insertionAt, SIZES, toMetrics } from "./layout";

const EMPTY: Idea[] = [];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

type DropTarget = { kind: "idea"; id: string } | { kind: "col"; col: number };

interface Drag {
	sourceId: string;
	x: number;
	y: number;
	target: DropTarget | null;
}

export function Board() {
	const ideas = useFlowStore(state => state.record?.ideas ?? EMPTY);
	const rev = useFlowStore(state => state.rev);
	const editing = useUIStore(state => state.editing);
	const columnWidth = useUIStore(state => state.columnWidth);

	const scrollerRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const [rem] = useState(rootFontSize);
	const [hovered, setHovered] = useState<string | null>(null);
	const [drag, setDrag] = useState<Drag | null>(null);

	// Columns fit the viewport until the user pinches to a width of their own.
	const fitRem = Math.max(SIZES.fitMin, viewport.width / rem / COLUMN_COUNT);
	const columnRem = clamp(columnWidth ?? fitRem, SIZES.minColumn, SIZES.maxColumn);
	const metrics = useMemo(() => toMetrics(columnRem, rem), [columnRem, rem]);

	// Measured idea heights feed the layout; ResizeObserver keeps them current as text wraps.
	const heights = useRef(new Map<string, number>());
	const [heightsVersion, bumpHeights] = useReducer((n: number) => n + 1, 0);
	const [resizeObserver] = useState(
		() =>
			new ResizeObserver(entries => {
				let changed = false;
				for (const entry of entries) {
					const id = (entry.target as HTMLElement).dataset.ideaId;
					const height = entry.borderBoxSize?.[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight;
					if (id && heights.current.get(id) !== height) {
						heights.current.set(id, height);
						changed = true;
					}
				}
				// Re-layout before paint so a wrapping line never overlaps the idea below.
				if (changed) flushSync(bumpHeights);
			})
	);
	useEffect(() => () => resizeObserver.disconnect(), [resizeObserver]);

	const layout = useMemo(() => computeLayout(ideas, heights.current, metrics), [ideas, heightsVersion, metrics]);
	useLayoutEffect(() => {
		boardState.layout = layout;
	});

	// Ideas glide only when the structure changed; typing and zooming move them instantly.
	const seenRev = useRef(rev);
	const glide = seenRev.current !== rev;
	useLayoutEffect(() => {
		seenRev.current = rev;
	});

	// Ideas that exist when the board opens appear in place; later ones grow in.
	const ready = useRef(false);
	useEffect(() => {
		ready.current = true;
	}, []);

	// Shared motion values let arrows follow ideas mid-animation.
	const ys = useRef(new Map<string, MotionValue<number>>());
	const xs = useRef(new Map<string, MotionValue<number>>());
	const indent = SIZES.indent * rem;
	const context = useMemo<BoardContextValue>(() => {
		const valueOf = (map: Map<string, MotionValue<number>>, id: string, initial: number) => {
			let value = map.get(id);
			if (!value) map.set(id, (value = motionValue(initial)));
			return value;
		};
		return {
			yOf: (id, initial) => valueOf(ys.current, id, initial),
			xOf: (id, depth) => valueOf(xs.current, id, depth * indent),
			indent,
			observe: element => {
				resizeObserver.observe(element);
				return () => {
					resizeObserver.unobserve(element);
					const id = (element as HTMLElement).dataset.ideaId;
					if (id && !useFlowStore.getState().record?.ideas.some(idea => idea.id === id)) {
						heights.current.delete(id);
						ys.current.delete(id);
						xs.current.delete(id);
					}
				};
			},
			startLink: (id, event) => startLinkRef.current(id, event)
		};
	}, [indent, resizeObserver]);

	// Viewport size drives the fitted column width and the minimum canvas height.
	useLayoutEffect(() => {
		const scroller = scrollerRef.current!;
		const observer = new ResizeObserver(() => setViewport({ width: scroller.clientWidth, height: scroller.clientHeight }));
		observer.observe(scroller);
		return () => observer.disconnect();
	}, []);

	// Pinch (ctrl + wheel, or Safari gestures) changes column width around the pointer.
	const columnRemRef = useRef(columnRem);
	columnRemRef.current = columnRem;
	useEffect(() => {
		const scroller = scrollerRef.current!;
		const zoomTo = (next: number, clientX: number) => {
			const current = columnRemRef.current;
			const target = clamp(next, SIZES.minColumn, SIZES.maxColumn);
			if (Math.abs(target - current) < 0.001) return;
			const offset = clientX - scroller.getBoundingClientRect().left;
			const ratio = (scroller.scrollLeft + offset) / (current * COLUMN_COUNT * rem);
			flushSync(() => useUIStore.getState().setColumnWidth(target));
			scroller.scrollLeft = ratio * target * COLUMN_COUNT * rem - offset;
		};
		const onWheel = (event: WheelEvent) => {
			if (!event.ctrlKey) return;
			event.preventDefault();
			const delta = clamp(event.deltaY, -30, 30);
			zoomTo(columnRemRef.current * Math.exp(-delta * 0.012), event.clientX);
		};
		let gestureBase = columnRemRef.current;
		const onGestureStart = (event: Event) => {
			event.preventDefault();
			gestureBase = columnRemRef.current;
		};
		const onGestureChange = (event: Event) => {
			event.preventDefault();
			const gesture = event as Event & { scale: number; clientX: number };
			zoomTo(gestureBase * gesture.scale, gesture.clientX);
		};
		scroller.addEventListener("wheel", onWheel, { passive: false });
		scroller.addEventListener("gesturestart", onGestureStart);
		scroller.addEventListener("gesturechange", onGestureChange);
		return () => {
			scroller.removeEventListener("wheel", onWheel);
			scroller.removeEventListener("gesturestart", onGestureStart);
			scroller.removeEventListener("gesturechange", onGestureChange);
		};
	}, [rem]);

	// Keep the idea being edited in view, using its final position rather than a mid-animation one.
	useEffect(() => {
		const scroller = scrollerRef.current;
		const placement = editing && boardState.layout?.placements.get(editing.id);
		if (!scroller || !placement) return;
		const header = SIZES.header * rem;
		const margin = 2 * rem;
		const top = placement.y + header;
		const bottom = top + placement.height;
		const left = placement.col * metrics.column;
		const right = left + metrics.column;
		let scrollTop = scroller.scrollTop;
		let scrollLeft = scroller.scrollLeft;
		if (top - header - margin < scrollTop) scrollTop = top - header - margin;
		else if (bottom + margin > scrollTop + scroller.clientHeight) scrollTop = bottom + margin - scroller.clientHeight;
		if (left < scrollLeft) scrollLeft = left;
		else if (right > scrollLeft + scroller.clientWidth) scrollLeft = right - scroller.clientWidth;
		if (scrollTop !== scroller.scrollTop || scrollLeft !== scroller.scrollLeft) scroller.scrollTo({ top: Math.max(0, scrollTop), left: Math.max(0, scrollLeft), behavior: "smooth" });
	}, [editing?.id]);

	// Drag the extend handle onto a later speech or idea to link there; a plain click extends into the next speech.
	const startLinkRef = useRef<(id: string, event: ReactPointerEvent) => void>(() => {});
	startLinkRef.current = (sourceId, event) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		const source = useFlowStore.getState().record?.ideas.find(idea => idea.id === sourceId);
		if (!source) return;
		const start = { x: event.clientX, y: event.clientY };
		let dragging = false;

		const hitTest = (x: number, y: number): DropTarget | null => {
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
			setDrag({ sourceId, x: move.clientX - body.left, y: move.clientY - body.top, target: hitTest(move.clientX, move.clientY) });
		};
		const finish = (up: PointerEvent | null) => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", finish);
			window.removeEventListener("pointercancel", cancel);
			setDrag(null);
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
	};

	const addAt = (col: number, clientY: number) => {
		const body = bodyRef.current!.getBoundingClientRect();
		const position = insertionAt(ideas, layout, col, clientY - body.top);
		const id = useFlowStore.getState().addIdea({ col, ...position });
		useUIStore.getState().edit(id, { at: "start" });
	};

	const header = SIZES.header * rem;
	const bodyHeight = Math.max(layout.height + SIZES.tail * rem, viewport.height - header);
	const dragSource = drag ? layout.placements.get(drag.sourceId) : undefined;

	const style = {
		"--col-w": `${columnRem}rem`,
		"--header-h": `${SIZES.header}rem`,
		"--pad-left": `${SIZES.padLeft}rem`,
		"--cell-pad-y": `${SIZES.cellPadY}rem`,
		"--cell-pad-x": `${SIZES.cellPadX}rem`,
		"--cell-font": `${SIZES.font}rem`,
		"--cell-line": SIZES.line,
		width: `${columnRem * COLUMN_COUNT}rem`
	} as CSSProperties;

	return (
		<BoardContext.Provider value={context}>
			<IdeaMenu triggerRef={scrollerRef} render={<div className={styles.scroller} />}>
				<div className={styles.canvas} style={style} data-dragging={drag ? "" : undefined}>
					<header className={styles.header} onDoubleClick={() => useUIStore.getState().setColumnWidth(null)}>
						{SPEECHES.map((speech, col) => (
							<div key={speech} className={styles.label} data-side={sideOf(col)}>
								{speech}
							</div>
						))}
					</header>

					<div
						ref={bodyRef}
						className={styles.body}
						style={{ height: `${bodyHeight / rem}rem` }}
						onPointerOver={event => {
							const id = (event.target as Element).closest<HTMLElement>("[data-idea-id]")?.dataset.ideaId ?? null;
							if (id !== hovered) setHovered(id);
						}}
						onPointerLeave={() => setHovered(null)}
					>
						{SPEECHES.map((speech, col) => (
							<div
								key={speech}
								className={styles.column}
								data-col={col}
								data-side={sideOf(col)}
								data-drop={drag?.target?.kind === "col" && drag.target.col === col ? "" : undefined}
								style={{ left: `calc(${col} * var(--col-w))` }}
								onMouseDown={event => {
									if (event.button !== 0 || event.target !== event.currentTarget) return;
									event.preventDefault();
									addAt(col, event.clientY);
								}}
							/>
						))}

						<Arrows ideas={ideas} layout={layout} metrics={metrics} focus={drag?.sourceId ?? hovered ?? editing?.id ?? null} />

						<AnimatePresence>
							{SPEECHES.flatMap((_, col) =>
								columnOrder(ideas, col).map(({ idea }) => {
									const placement = layout.placements.get(idea.id)!;
									return (
										<IdeaCell
											key={idea.id}
											idea={idea}
											depth={placement.depth}
											y={placement.y}
											caret={editing?.id === idea.id ? editing.caret : null}
											glide={glide}
											enter={ready.current}
											canExtend={idea.col < lastColumn}
											dropTarget={drag?.target?.kind === "idea" && drag.target.id === idea.id}
										/>
									);
								})
							)}
						</AnimatePresence>

						{drag && dragSource && <DragArrow sx={(dragSource.col + 1) * metrics.column - metrics.padRight + 0.25 * rem} sy={dragSource.y + metrics.anchor} tx={drag.x} ty={drag.y} rem={rem} />}
					</div>
				</div>
			</IdeaMenu>
		</BoardContext.Provider>
	);
}
