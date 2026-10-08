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
