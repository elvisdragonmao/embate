import type { Idea } from "../../lib/record";
import { columnOrder } from "../../lib/tree";

/** Layout constants in rem; also exposed to CSS as custom properties. */
export const SIZES = {
	header: 2.75,
	top: 0.5,
	padLeft: 0.5,
	padRight: 1.75,
	indent: 1.125,
	gap: 0.25,
	groupGap: 0.75,
	cellPadY: 0.3125,
	cellPadX: 0.5,
	font: 0.875,
	line: 1.5,
	/** Narrowest column the default fit allows; past this the board scrolls sideways. Pinching can go narrower. */
	fitMin: 8.5,
	minColumn: 6,
	maxColumn: 40,
	tail: 16
};

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
 * A link that skips columns keeps the source's row clear in the columns it crosses, where its arrow runs;
 * ideas there move below the row.
 */
export function computeLayout(ideas: Idea[], heights: Map<string, number>, metrics: Metrics, columns: number): Layout {
	const byId = new Map(ideas.map(idea => [idea.id, idea]));
	const skips: { source: Idea; target: Idea }[] = [];
	for (const target of ideas) {
		const source = target.from ? byId.get(target.from) : undefined;
		if (source && target.col - source.col > 1) skips.push({ source, target });
	}
	const placements = new Map<string, Placement>();
	let height = 0;
	for (let col = 0; col < columns; col++) {
		const order = columnOrder(ideas, col);
		const rows = skips.flatMap(({ source, target }) => {
			const from = placements.get(source.id);
			// A column with its own response to the source is part of the row already.
			if (!from || source.col >= col || target.col <= col || order.some(({ idea }) => idea.from === source.id)) return [];
			return [{ top: from.y, bottom: from.y + Math.max(from.height, heights.get(target.id) ?? metrics.estimate) }];
		});
		rows.sort((a, b) => a.top - b.top);
		let cursor = metrics.top;
		let first = true;
		for (const { idea, depth } of order) {
			const own = heights.get(idea.id) ?? metrics.estimate;
			let y = first ? cursor : cursor + (depth === 0 ? metrics.groupGap : metrics.gap);
			const source = idea.from ? placements.get(idea.from) : undefined;
			if (source) y = Math.max(y, source.y);
			for (const row of rows) if (y < row.bottom && y + own + metrics.gap > row.top) y = row.bottom + metrics.groupGap;
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
