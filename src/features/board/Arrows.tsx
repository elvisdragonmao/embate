import { motion, useTransform } from "motion/react";
import { memo, useMemo } from "react";
import type { Idea, IdeaColor } from "../../lib/record";
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
	focus: string | null;
}

export const Arrows = memo(function Arrows({ ideas, layout, metrics, focus }: ArrowsProps) {
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
						fromCol={from.col}
						toCol={to.col}
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
	fromCol: number;
	toCol: number;
	fromY: number;
	toY: number;
	toDepth: number;
	metrics: Metrics;
	color: IdeaColor | null;
	active: boolean;
}

const Arrow = memo(function Arrow({ fromId, toId, fromCol, toCol, fromY, toY, toDepth, metrics, color, active }: ArrowProps) {
	const { yOf, xOf } = useBoard();
	const sourceY = yOf(fromId, fromY);
	const targetY = yOf(toId, toY);
	const targetX = xOf(toId, toDepth);
	const { column, padLeft, padRight, anchor, rem } = metrics;

	const d = useTransform([sourceY, targetY, targetX], ([sy, ty, tx]: number[]) =>
		arrowPath((fromCol + 1) * column - padRight + 0.25 * rem, sy + anchor, toCol * column + padLeft + tx - 0.0625 * rem, ty + anchor, rem)
	);

	return <motion.path d={d} className={styles.arrow} data-active={active || undefined} data-color={color ?? undefined} />;
});

/** The arrow that follows the pointer while dragging a link. */
export function DragArrow({ sx, sy, tx, ty, rem }: { sx: number; sy: number; tx: number; ty: number; rem: number }) {
	return (
		<svg className={styles.overlay} aria-hidden>
			<path d={arrowPath(sx, sy, Math.max(tx, sx + 1), ty, rem)} className={styles.drag} />
		</svg>
	);
}
