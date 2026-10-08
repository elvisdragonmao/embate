import { createId } from "./id";

export const SPEECHES = ["AC", "NC", "AR", "NR", "AS", "NS", "AFF", "NFF"] as const;
export type Speech = (typeof SPEECHES)[number];

export const sideOf = (col: number) => (col % 2 === 0 ? "aff" : "neg");

export const IDEA_COLORS = ["red", "peach", "yellow", "green", "blue", "mauve"] as const;
export type IdeaColor = (typeof IDEA_COLORS)[number];

export interface Idea {
	id: string;
	/** Index into SPEECHES. */
	col: number;
	/** Parent idea in the same column, for sub-points. */
	parent: string | null;
	/** Idea in an earlier column that this one extends. */
	from: string | null;
	/** Markdown. */
	text: string;
	color: IdeaColor | null;
}

export interface FlowRecord {
	app: "embate";
	version: 1;
	id: string;
	format: "pf";
	title: string;
	createdAt: number;
	updatedAt: number;
	note: string;
	ideas: Idea[];
}

export function createRecord(): FlowRecord {
	const now = Date.now();
	return { app: "embate", version: 1, id: createId(), format: "pf", title: "", createdAt: now, updatedAt: now, note: "", ideas: [] };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Validates untrusted JSON (storage or uploads) into a consistent record, dropping broken references. */
export function normalizeRecord(input: unknown): FlowRecord | null {
	if (!isObject(input) || !Array.isArray(input.ideas)) return null;
	const now = Date.now();

	const raw = input.ideas.filter(isObject).flatMap(item => {
		const id = str(item.id);
		const col = num(item.col, -1);
		if (!id || !Number.isInteger(col) || col < 0 || col >= SPEECHES.length) return [];
		const color = IDEA_COLORS.includes(item.color as IdeaColor) ? (item.color as IdeaColor) : null;
		return [{ id, col, parent: str(item.parent) || null, from: str(item.from) || null, text: str(item.text), color }];
	});

	const seen = new Set<string>();
	const unique = raw.filter(idea => !seen.has(idea.id) && seen.add(idea.id));
	const byId = new Map(unique.map(idea => [idea.id, idea]));

	const ideas = unique.map(idea => {
		let parent = idea.parent ? byId.get(idea.parent) : undefined;
		if (parent && parent.col !== idea.col) parent = undefined;
		// Break parent cycles.
		for (let cursor = parent, steps = 0; cursor; cursor = cursor.parent ? byId.get(cursor.parent) : undefined, steps++) {
			if (cursor.id === idea.id || steps > unique.length) {
				parent = undefined;
				break;
			}
		}
		const from = idea.from ? byId.get(idea.from) : undefined;
		return { ...idea, parent: parent?.id ?? null, from: from && from.col < idea.col ? from.id : null };
	});

	return {
		app: "embate",
		version: 1,
		id: str(input.id) || createId(),
		format: "pf",
		title: str(input.title),
		createdAt: num(input.createdAt, now),
		updatedAt: num(input.updatedAt, now),
		note: str(input.note),
		ideas
	};
}

export const isBlank = (markdown: string) => markdown.replace(/\\$/gm, "").trim() === "";
