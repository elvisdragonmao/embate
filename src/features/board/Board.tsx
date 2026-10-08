import { AnimatePresence, motionValue, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { formatOf, sideAt } from "../../lib/formats";
import type { Idea } from "../../lib/record";
import { columnOrder } from "../../lib/tree";
import { useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import { Arrows, DragArrow } from "./Arrows";
import styles from "./Board.module.css";
import { boardState } from "./boardApi";
import { BoardContext, type BoardContextValue } from "./BoardContext";
import { ColumnLabel } from "./ColumnLabel";
import { loadCellEditor } from "./editorLoader";
import { IdeaCell } from "./IdeaCell";
import { IdeaMenu } from "./IdeaMenu";
import { computeLayout, insertionAt, SIZES, toMetrics } from "./layout";
import { useColumnZoom } from "./useColumnZoom";
import { useLinkDrag } from "./useLinkDrag";
import { useReorder, type ReorderLive } from "./useReorder";

const EMPTY_IDEAS: Idea[] = [];
const EMPTY_COLUMNS: string[] = [];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

export function Board() {
	const ideas = useFlowStore(state => state.record?.ideas ?? EMPTY_IDEAS);
	const labels = useFlowStore(state => state.record?.columns ?? EMPTY_COLUMNS);
	const format = formatOf(useFlowStore(state => state.record?.format));
	const rev = useFlowStore(state => state.rev);
	const editing = useUIStore(state => state.editing);
	const columnWidth = useUIStore(state => state.columnWidth);
	const columns = labels.length;

	const scrollerRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const [rem] = useState(rootFontSize);
	const [hovered, setHovered] = useState<string | null>(null);

	// Every visit starts with the columns filling the board; pinching picks a width of its own.
	const fitRem = viewport.width / rem / Math.max(columns, 1);
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

	// Shared motion values let arrows follow ideas mid-animation.
	const ys = useRef(new Map<string, MotionValue<number>>());
	const xs = useRef(new Map<string, MotionValue<number>>());
	const indent = SIZES.indent * rem;

	const { linkDrag, startLink } = useLinkDrag(bodyRef);
	const live = useRef<ReorderLive>(null!);
	const { moving, pressIdea } = useReorder(bodyRef, scrollerRef, live);

	const shown = moving?.preview ?? ideas;
	const layout = useMemo(() => computeLayout(shown, heights.current, metrics, columns), [shown, heightsVersion, metrics, columns]);
	useLayoutEffect(() => {
		boardState.layout = layout;
	});

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
			startLink,
			pressIdea
		};
	}, [indent, resizeObserver, startLink, pressIdea]);
	live.current = { layout, metrics, columns, heights: heights.current, yOf: context.yOf };

	// Ideas glide when the structure changes or a drag rearranges them; typing and zooming move them instantly.
	const seen = useRef({ rev, shown });
	const glide = seen.current.rev !== rev || seen.current.shown !== shown;
	useLayoutEffect(() => {
		seen.current = { rev, shown };
	});

	// Ideas that exist when the board opens appear in place; later ones grow in.
	const ready = useRef(false);
	useEffect(() => {
		ready.current = true;
		// Fetch the editor once the board is on screen, so it is ready before the first click.
		const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
		idle(() => void loadCellEditor());
	}, []);

	// Viewport size drives the fitted column width and the minimum canvas height.
	useLayoutEffect(() => {
		const scroller = scrollerRef.current!;
		const measure = () => setViewport({ width: scroller.clientWidth, height: scroller.clientHeight });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		return () => observer.disconnect();
	}, []);

	useColumnZoom(scrollerRef, columnRem, fitRem, columns, rem);

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

	// An idea counts as hovered from the gutter on its right too, where its extend handle sits, but an arrow
	// running through that gutter wins so it stays clickable.
	const hoverTarget = (target: Element, clientX: number, clientY: number) => {
		const idea = target.closest<HTMLElement>("[data-idea-id]");
		if (idea) return idea.dataset.ideaId!;
		const column = target.closest<HTMLElement>("[data-col]");
		if (!column) return null;
		const col = Number(column.dataset.col);
		const body = bodyRef.current!.getBoundingClientRect();
		const x = clientX - body.left - col * metrics.column;
		const y = clientY - body.top;
		if (x < metrics.column - metrics.padRight) return null;
		for (const [id, placement] of layout.placements) if (placement.col === col && y >= placement.y && y <= placement.y + placement.height) return id;
		return null;
	};

	const addAt = (col: number, clientY: number) => {
		const body = bodyRef.current!.getBoundingClientRect();
		const position = insertionAt(ideas, layout, col, clientY - body.top);
		const id = useFlowStore.getState().addIdea({ col, ...position });
		useUIStore.getState().edit(id, { at: "start" });
	};

	const header = SIZES.header * rem;
	const bodyHeight = Math.max(layout.height + SIZES.tail * rem, viewport.height - header);
	const linkSource = linkDrag ? layout.placements.get(linkDrag.sourceId) : undefined;
	const sides = useMemo(() => labels.map((_, col) => sideAt(format, col)), [labels, format]);

	const style = {
		"--col-w": `${columnRem}rem`,
		"--header-h": `${SIZES.header}rem`,
		"--pad-left": `${SIZES.padLeft}rem`,
		"--pad-right": `${SIZES.padRight}rem`,
		"--cell-pad-y": `${SIZES.cellPadY}rem`,
		"--cell-pad-x": `${SIZES.cellPadX}rem`,
		"--cell-font": `${SIZES.font}rem`,
		"--cell-line": SIZES.line,
		width: `${columnRem * columns}rem`
	} as CSSProperties;

	return (
		<BoardContext.Provider value={context}>
			<IdeaMenu triggerRef={scrollerRef} render={<div className={styles.scroller} />}>
				<div className={styles.canvas} style={style} data-dragging={linkDrag || moving ? "" : undefined}>
					<header className={styles.header}>
						{labels.map((label, col) => (
							<ColumnLabel key={col} col={col} label={label} side={sides[col]} />
						))}
					</header>

					<div
						ref={bodyRef}
						className={styles.body}
						style={{ height: `${bodyHeight / rem}rem` }}
						onPointerMove={event => {
							const id = hoverTarget(event.target as Element, event.clientX, event.clientY);
							if (id !== hovered) setHovered(id);
						}}
						onPointerLeave={() => setHovered(null)}
					>
						{labels.map((_, col) => (
							<div
								key={col}
								className={styles.column}
								data-col={col}
								data-side={sides[col]}
								data-drop={linkDrag?.target?.kind === "col" && linkDrag.target.col === col ? "" : undefined}
								style={{ left: `calc(${col} * var(--col-w))` }}
								onMouseDown={event => {
									if (event.button !== 0 || event.target !== event.currentTarget) return;
									event.preventDefault();
									addAt(col, event.clientY);
								}}
							/>
						))}

						<Arrows ideas={shown} layout={layout} metrics={metrics} focus={linkDrag?.sourceId ?? moving?.id ?? hovered ?? editing?.id ?? null} />

						<AnimatePresence>
							{labels.flatMap((_, col) =>
								columnOrder(shown, col).map(({ idea }) => {
									const placement = layout.placements.get(idea.id)!;
									return (
										<IdeaCell
											key={idea.id}
											idea={idea}
											side={sides[col]}
											depth={placement.depth}
											y={placement.y}
											caret={editing?.id === idea.id ? editing.caret : null}
											glide={glide}
											enter={ready.current}
											canExtend={col < columns - 1}
											dropTarget={linkDrag?.target?.kind === "idea" && linkDrag.target.id === idea.id}
											lifted={moving?.ids.has(idea.id) ?? false}
											hover={hovered === idea.id}
										/>
									);
								})
							)}
						</AnimatePresence>

						{linkDrag && linkSource && (
							<DragArrow sx={(linkSource.col + 1) * metrics.column - metrics.padRight + 0.25 * rem} sy={linkSource.y + metrics.anchor} tx={linkDrag.x} ty={linkDrag.y} rem={rem} />
						)}
					</div>
				</div>
			</IdeaMenu>
		</BoardContext.Provider>
	);
}
