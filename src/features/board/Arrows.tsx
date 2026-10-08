import { motion, useTransform } from "motion/react";
import { memo, useMemo, useState } from "react";
import type { Idea, IdeaColor } from "../../lib/record";
import { useFlowStore } from "../../stores/flow";
import styles from "./Arrows.module.css";
import { useBoard } from "./BoardContext";
import type { Layout, Metrics } from "./layout";

/** A soft S-curve with horizontal tangents and a small chevron head. */
export function arrowPath(sx: number, sy: number, tx: number, ty: number, rem: number) {
	const dx = Math.max(tx - sx, 1);
	const bend = Math.max(dx * 0.5, Math.min(Math.abs(ty - sy) * 0.35, 3 * rem));
	const head = 0.3125 * rem;
	return `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty} M ${tx - head} ${ty - head * 0.8} L ${tx} ${ty} L ${tx - head} ${ty + head * 0.8}`;
}

/** Every idea connected to `id` through extensions, upstream and downstream. */
function threadOf(ideas: Idea[], id: string | null) {
	const thread = new Set<string>();
	if (!id) return thread;
	const byId = new Map(ideas.map(idea => [idea.id, idea]));
	const children = new Map<string, string[]>();
	for (const idea of ideas) if (idea.from) children.set(idea.from, [...(children.get(idea.from) ?? []), idea.id]);
	for (let cursor = byId.get(id); cursor && !thread.has(cursor.id); cursor = cursor.from ? byId.get(cursor.from) : undefined) thread.add(cursor.id);
	const queue = [id];
	while (queue.length) {
		for (const child of children.get(queue.pop()!) ?? []) {
			if (thread.has(child)) continue;
			thread.add(child);
			queue.push(child);
		}
	}
	return thread;
}

interface ArrowsProps {
	ideas: Idea[];
	layout: Layout;
	metrics: Metrics;
	/** Column offsets and widths, in units of one speech column. */
	lefts: number[];
	widths: number[];
	focus: string | null;
}

export const Arrows = memo(function Arrows({ ideas, layout, metrics, lefts, widths, focus }: ArrowsProps) {
	const thread = useMemo(() => threadOf(ideas, focus), [ideas, focus]);
	const byId = useMemo(() => new Map(ideas.map(idea => [idea.id, idea])), [ideas]);

	return (
		<svg className={styles.arrows} aria-hidden>
			{ideas.map(idea => {
				const source = idea.from ? byId.get(idea.from) : undefined;
				const from = source && layout.placements.get(source.id);
				const to = layout.placements.get(idea.id);
				if (!source || !from || !to) return null;
				return (
					<Arrow
						key={idea.id}
						fromId={source.id}
						toId={idea.id}
						startX={(lefts[from.col] + widths[from.col]) * metrics.column - metrics.padRight + 0.25 * metrics.rem}
						endX={lefts[to.col] * metrics.column + metrics.padLeft - 0.0625 * metrics.rem}
						fromY={from.y}
						toY={to.y}
						toDepth={to.depth}
						metrics={metrics}
						color={source.color}
						active={thread.has(idea.id) && thread.has(source.id)}
					/>
				);
			})}
		</svg>
	);
});

interface ArrowProps {
	fromId: string;
	toId: string;
	/** Where the arrow leaves the source column and where it reaches the target column (before indentation). */
	startX: number;
	endX: number;
	fromY: number;
	toY: number;
	toDepth: number;
	metrics: Metrics;
	color: IdeaColor | null;
	active: boolean;
}

const Arrow = memo(function Arrow({ fromId, toId, startX, endX, fromY, toY, toDepth, metrics, color, active }: ArrowProps) {
	const { yOf, xOf } = useBoard();
	const sourceY = yOf(fromId, fromY);
	const targetY = yOf(toId, toY);
	const targetX = xOf(toId, toDepth);
	const { anchor, rem } = metrics;

	const [hover, setHover] = useState(false);
	const sx = startX;
	const targetLeft = endX;
	const d = useTransform([sourceY, targetY, targetX], ([sy, ty, tx]: number[]) => arrowPath(sx, sy + anchor, targetLeft + tx, ty + anchor, rem));
	// The curve is symmetric, so its midpoint is the midpoint of its ends.
	const midX = useTransform(targetX, tx => (sx + targetLeft + tx) / 2);
	const midY = useTransform([sourceY, targetY], ([sy, ty]: number[]) => (sy + ty) / 2 + anchor);

	return (
		<g>
			<motion.path d={d} className={styles.arrow} data-active={active || undefined} data-color={color ?? undefined} data-removing={hover || undefined} />
			<motion.path
				d={d}
				className={styles.hit}
				onPointerEnter={() => setHover(true)}
				onPointerLeave={() => setHover(false)}
				onMouseDown={event => event.preventDefault()}
				onClick={() => useFlowStore.getState().unlink(toId)}
			>
				<title>Remove link</title>
			</motion.path>
			{hover && (
				<motion.g style={{ x: midX, y: midY }} className={styles.badge}>
					<circle r={0.5625 * rem} />
					<path d={`M ${-0.1875 * rem} ${-0.1875 * rem} L ${0.1875 * rem} ${0.1875 * rem} M ${0.1875 * rem} ${-0.1875 * rem} L ${-0.1875 * rem} ${0.1875 * rem}`} />
				</motion.g>
			)}
		</g>
	);
});

/** The arrow that follows the pointer while dragging a link. */
export function DragArrow({ sx, sy, tx, ty, rem }: { sx: number; sy: number; tx: number; ty: number; rem: number }) {
	return (
		<svg className={styles.overlay} aria-hidden>
			<path d={arrowPath(sx, sy, Math.max(tx, sx + 1), ty, rem)} className={styles.drag} />
		</svg>
	);
}
