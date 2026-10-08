import { SPEECHES, type Idea } from "../../lib/record";
import { columnOrder } from "../../lib/tree";

/** Layout constants in rem; also exposed to CSS as custom properties. */
export const SIZES = {
	header: 2.75,
	top: 0.5,
	padLeft: 0.5,
	padRight: 1.25,
	indent: 1.125,
	gap: 0.25,
	groupGap: 0.75,
	cellPadY: 0.3125,
	cellPadX: 0.5,
	font: 0.875,
	line: 1.5,
	fitMin: 8.5,
	minColumn: 7,
	maxColumn: 40,
	tail: 16
};

export const COLUMN_COUNT = SPEECHES.length;

export interface Metrics {
	rem: number;
	columnRem: number;
	column: number;
	padLeft: number;
	padRight: number;
	indent: number;
	gap: number;
	groupGap: number;
	top: number;
	/** Height of a one-line idea. */
	estimate: number;
	/** Offset from an idea's top to the middle of its first line, where arrows attach. */
	anchor: number;
}

export function toMetrics(columnRem: number, rem: number): Metrics {
	const lineHeight = SIZES.font * SIZES.line;
	return {
		rem,
		columnRem,
		column: columnRem * rem,
		padLeft: SIZES.padLeft * rem,
		padRight: SIZES.padRight * rem,
		indent: SIZES.indent * rem,
		gap: SIZES.gap * rem,
		groupGap: SIZES.groupGap * rem,
		top: SIZES.top * rem,
		estimate: (SIZES.cellPadY * 2 + lineHeight) * rem,
		anchor: (SIZES.cellPadY + lineHeight / 2) * rem
	};
}

export interface Placement {
	col: number;
	depth: number;
	y: number;
	height: number;
}

export interface Layout {
	placements: Map<string, Placement>;
	height: number;
}

/**
 * Stacks each column's ideas in reading order. An idea that extends an earlier one
 * is pushed down to line up with its source, like writing a response next to the argument on paper.
 */
export function computeLayout(ideas: Idea[], heights: Map<string, number>, metrics: Metrics): Layout {
	const placements = new Map<string, Placement>();
	let height = 0;
	for (let col = 0; col < COLUMN_COUNT; col++) {
		let cursor = metrics.top;
		let first = true;
		for (const { idea, depth } of columnOrder(ideas, col)) {
			const own = heights.get(idea.id) ?? metrics.estimate;
			let y = first ? cursor : cursor + (depth === 0 ? metrics.groupGap : metrics.gap);
			const source = idea.from ? placements.get(idea.from) : undefined;
			if (source) y = Math.max(y, source.y);
			placements.set(idea.id, { col, depth, y, height: own });
			cursor = y + own;
			first = false;
		}
		height = Math.max(height, cursor);
	}
	return { placements, height };
}

/** Where a new top-level idea should go so it lands at (or just after) vertical position `y`. */
export function insertionAt(ideas: Idea[], layout: Layout, col: number, y: number): { after?: string; before?: string } {
	const tops = ideas.filter(idea => idea.col === col && idea.parent === null);
	let after: string | undefined;
	for (const idea of tops) {
		const placement = layout.placements.get(idea.id);
		if (placement && placement.y <= y) after = idea.id;
	}
	if (after) return { after };
	return tops[0] ? { before: tops[0].id } : {};
}

/** Insertion point for a response to an idea at `y`: before the first top-level idea placed below it. */
export function insertionBelow(ideas: Idea[], layout: Layout, col: number, y: number): { before?: string } {
	for (const idea of ideas) {
		if (idea.col !== col || idea.parent !== null) continue;
		const placement = layout.placements.get(idea.id);
		if (placement && placement.y > y) return { before: idea.id };
	}
	return {};
}
