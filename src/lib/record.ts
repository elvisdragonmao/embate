import { speechColumns, type Column } from "./columns";
import { FORMAT_IDS, formatOf, type FormatId, type Side } from "./formats";
import { createId } from "./id";

/** Hard cap on columns, so a malformed upload can't create thousands. */
export const MAX_COLUMNS = 16;

export const IDEA_COLORS = ["red", "peach", "yellow", "green", "blue", "mauve"] as const;
export type IdeaColor = (typeof IDEA_COLORS)[number];

export interface Idea {
	id: string;
	/** Column (speech) index. */
	col: number;
	/** Parent idea in the same column, for sub-points. */
	parent: string | null;
	/** Idea in an earlier column that this one extends. */
	from: string | null;
	/** Markdown. */
	text: string;
	color: IdeaColor | null;
}

/** A countdown that survives reloads: time spent before the current run, plus the run's wall-clock start. */
export interface Clock {
	duration: number;
	elapsed: number;
	startedAt: number | null;
}

export interface FlowRecord {
	app: "embate";
	version: 1;
	id: string;
	format: FormatId;
	/** Speech (and optional cross-ex) columns in speaking order; labels are editable. */
	columns: Column[];
	/** Prep time per side for formats that have it. */
	prep: Record<Side, Clock>;
	title: string;
	createdAt: number;
	updatedAt: number;
	note: string;
	ideas: Idea[];
}

export const prepClock = (minutes: number | null): Clock => ({ duration: (minutes ?? 2) * 60_000, elapsed: 0, startedAt: null });

export function createRecord(formatId: FormatId = "pf"): FlowRecord {
	const now = Date.now();
	const format = formatOf(formatId);
	return {
		app: "embate",
		version: 1,
		id: createId(),
		format: format.id,
		columns: speechColumns(format),
		prep: { aff: prepClock(format.prep), neg: prepClock(format.prep) },
		title: "",
		createdAt: now,
		updatedAt: now,
		note: "",
		ideas: []
	};
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
		if (!id || !Number.isInteger(col) || col < 0 || col >= MAX_COLUMNS) return [];
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

	const format = formatOf(FORMAT_IDS.includes(input.format as FormatId) ? (input.format as FormatId) : "pf");
	const used = ideas.reduce((max, idea) => Math.max(max, idea.col + 1), 0);
	// Older records stored plain labels; they never had cross-ex columns.
	const stored: Column[] = (Array.isArray(input.columns) ? input.columns.slice(0, MAX_COLUMNS) : []).map((value, col) =>
		isObject(value)
			? { label: str(value.label), side: value.side === "aff" || value.side === "neg" ? value.side : null }
			: { label: str(value), side: format.speeches[col]?.side ?? (col % 2 === 0 ? "aff" : "neg") }
	);
	const base = stored.length ? stored : speechColumns(format);
	const columns = Array.from({ length: Math.max(base.length, used) }, (_, col): Column => base[col] ?? { label: `${col + 1}`, side: col % 2 === 0 ? "aff" : "neg" });
	const prep = isObject(input.prep) ? input.prep : {};
	const clock = (value: unknown): Clock => {
		const fallback = prepClock(format.prep);
		if (!isObject(value)) return fallback;
		const startedAt = num(value.startedAt, NaN);
		return { duration: Math.max(1000, num(value.duration, fallback.duration)), elapsed: Math.max(0, num(value.elapsed, 0)), startedAt: Number.isNaN(startedAt) ? null : startedAt };
	};

	return {
		app: "embate",
		version: 1,
		id: str(input.id) || createId(),
		format: format.id,
		columns,
		prep: { aff: clock(prep.aff), neg: clock(prep.neg) },
		title: str(input.title),
		createdAt: num(input.createdAt, now),
		updatedAt: num(input.updatedAt, now),
		note: str(input.note),
		ideas
	};
}

export const isBlank = (markdown: string) => markdown.replace(/\\$/gm, "").trim() === "";

export const clockElapsed = (clock: Pick<Clock, "elapsed" | "startedAt">, now = Date.now()) => clock.elapsed + (clock.startedAt === null ? 0 : now - clock.startedAt);
