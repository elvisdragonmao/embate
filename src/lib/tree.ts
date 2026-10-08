import type { Idea } from "./record";

export const childrenOf = (ideas: Idea[], col: number, parent: string | null) => ideas.filter(idea => idea.col === col && idea.parent === parent);

/** Ideas of a column in reading order: each top-level idea followed by its sub-points, depth-first. */
export function columnOrder(ideas: Idea[], col: number) {
	const byParent = new Map<string | null, Idea[]>();
	for (const idea of ideas) {
		if (idea.col !== col) continue;
		const siblings = byParent.get(idea.parent);
		if (siblings) siblings.push(idea);
		else byParent.set(idea.parent, [idea]);
	}
	const out: { idea: Idea; depth: number }[] = [];
	const visit = (parent: string | null, depth: number) => {
		for (const idea of byParent.get(parent) ?? []) {
			out.push({ idea, depth });
			visit(idea.id, depth + 1);
		}
	};
	visit(null, 0);
	return out;
}

export function descendantIds(ideas: Idea[], id: string) {
	const ids = new Set([id]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const idea of ideas) {
			if (idea.parent && ids.has(idea.parent) && !ids.has(idea.id)) {
				ids.add(idea.id);
				grew = true;
			}
		}
	}
	return ids;
}

export function depthOf(ideas: Idea[], id: string) {
	const byId = new Map(ideas.map(idea => [idea.id, idea]));
	let depth = 0;
	for (let cursor = byId.get(id); cursor?.parent; cursor = byId.get(cursor.parent)) depth++;
	return depth;
}

export const hasChildren = (ideas: Idea[], id: string) => ideas.some(idea => idea.parent === id);

/** The idea visually above or below `id` in its column. */
export function neighbour(ideas: Idea[], id: string, direction: -1 | 1) {
	const idea = ideas.find(item => item.id === id);
	if (!idea) return null;
	const order = columnOrder(ideas, idea.col);
	const index = order.findIndex(entry => entry.idea.id === id);
	return order[index + direction]?.idea ?? null;
}

export interface Drop {
	/** The idea that will sit right above the moved one in reading order, or null for the top of the column. */
	prev: string | null;
	depth: number;
}

/**
 * Moves an idea, with its sub-points, so it follows `drop.prev` in reading order at `drop.depth`.
 * The caller keeps `depth` between the next idea's depth and one deeper than `prev`, which keeps the result valid.
 */
export function moveIdea(ideas: Idea[], id: string, drop: Drop): Idea[] | null {
	const idea = ideas.find(item => item.id === id);
	if (!idea) return null;
	const rest = ideas.filter(item => item.id !== id);
	const byId = new Map(rest.map(item => [item.id, item]));
	const depth = (item: Idea) => {
		let level = 0;
		for (let cursor = item; cursor.parent && byId.has(cursor.parent); cursor = byId.get(cursor.parent)!) level++;
		return level;
	};

	const prev = drop.prev ? byId.get(drop.prev) : undefined;
	let parent: string | null = null;
	let index: number;
	if (!prev) {
		const first = rest.find(item => item.col === idea.col && item.parent === null);
		index = first ? rest.indexOf(first) : rest.length;
	} else if (drop.depth > depth(prev)) {
		// First sub-point of `prev`.
		parent = prev.id;
		const firstChild = rest.find(item => item.parent === prev.id);
		index = firstChild ? rest.indexOf(firstChild) : rest.length;
	} else {
		// Next sibling of `prev`'s ancestor at the target depth.
		let sibling = prev;
		while (depth(sibling) > drop.depth && sibling.parent) sibling = byId.get(sibling.parent)!;
		parent = sibling.parent;
		index = rest.indexOf(sibling) + 1;
	}

	const next = rest.slice();
	next.splice(index, 0, parent === idea.parent ? idea : { ...idea, parent });
	return next;
}
