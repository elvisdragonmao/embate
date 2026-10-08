import { create } from "zustand";
import { formatOf, type FormatId, type Side } from "../lib/formats";
import { createId } from "../lib/id";
import { clockElapsed, prepClock, type Clock, type FlowRecord, type Idea, type IdeaColor } from "../lib/record";
import { saveRecord, setLastId } from "../lib/storage";
import { childrenOf, descendantIds, moveIdea, type Drop } from "../lib/tree";

export interface AddIdeaInput {
	col: number;
	parent?: string | null;
	from?: string | null;
	text?: string;
	/** Insert right after this idea; otherwise right before `before`; otherwise at the end. */
	after?: string;
	before?: string;
}

interface FlowState {
	record: FlowRecord | null;
	/** Bumped on structural changes (not text) so the board knows when to animate layout. */
	rev: number;
	past: Idea[][];
	future: Idea[][];
	load: (record: FlowRecord) => void;
	setTitle: (title: string) => void;
	/** `id` guards against late writes from an editor of a record that was just closed. */
	setNote: (id: string, note: string) => void;
	addIdea: (input: AddIdeaInput) => string;
	setText: (id: string, text: string) => void;
	setColor: (id: string, color: IdeaColor | null) => void;
	link: (id: string, from: string) => void;
	unlink: (id: string) => void;
	indent: (id: string) => boolean;
	outdent: (id: string) => boolean;
	remove: (id: string, options?: { history?: boolean }) => void;
	move: (id: string, drop: Drop) => void;
	setFormat: (format: FormatId) => void;
	setColumnLabel: (col: number, label: string) => void;
	togglePrep: (side: Side) => void;
	resetPrep: (side: Side) => void;
	setPrepDuration: (side: Side, ms: number) => void;
	undo: () => boolean;
	redo: () => boolean;
}

const HISTORY_LIMIT = 200;

/** Restores structure from a snapshot while keeping the latest text of ideas that still exist. */
function mergeText(snapshot: Idea[], current: Idea[]) {
	const latest = new Map(current.map(idea => [idea.id, idea.text]));
	return snapshot.map(idea => {
		const text = latest.get(idea.id);
		return text === undefined || text === idea.text ? idea : { ...idea, text };
	});
}

/** Same ideas in the same places, ignoring text. */
const sameStructure = (a: Idea[], b: Idea[]) =>
	a.length === b.length &&
	a.every((idea, index) => idea.id === b[index].id && idea.col === b[index].col && idea.parent === b[index].parent && idea.from === b[index].from && idea.color === b[index].color);

/** Drops snapshots that would change nothing, e.g. after an empty idea was cleaned up without history. */
function trimNoops(stack: Idea[][], current: Idea[]) {
	let end = stack.length;
	while (end > 0 && sameStructure(stack[end - 1], current)) end--;
	return end === stack.length ? stack : stack.slice(0, end);
}

export const useFlowStore = create<FlowState>()((set, get) => {
	const update = (ideas: (ideas: Idea[]) => Idea[] | null, options: { structural?: boolean; history?: boolean } = {}) => {
		const { record, rev, past } = get();
		if (!record) return false;
		const next = ideas(record.ideas);
		if (!next) return false;
		const history = options.history ?? options.structural;
		set({
			record: { ...record, ideas: next, updatedAt: Date.now() },
			rev: options.structural ? rev + 1 : rev,
			...(history ? { past: [...past.slice(-HISTORY_LIMIT), record.ideas], future: [] } : {})
		});
		return true;
	};

	const patch = (id: string, change: Partial<Idea>, options?: { structural?: boolean; history?: boolean }) =>
		update(ideas => {
			const index = ideas.findIndex(idea => idea.id === id);
			if (index < 0) return null;
			const next = ideas.slice();
			next[index] = { ...ideas[index], ...change };
			return next;
		}, options);

	return {
		record: null,
		rev: 0,
		past: [],
		future: [],

		load: record => {
			flushSave();
			setLastId(record.id);
			set({ record, rev: get().rev + 1, past: [], future: [] });
		},

		setTitle: title => {
			const { record } = get();
			if (record) set({ record: { ...record, title, updatedAt: Date.now() } });
		},

		setNote: (id, note) => {
			const { record } = get();
			if (record?.id === id && record.note !== note) set({ record: { ...record, note, updatedAt: Date.now() } });
		},

		addIdea: input => {
			const id = createId();
			const idea: Idea = { id, col: input.col, parent: input.parent ?? null, from: input.from ?? null, text: input.text ?? "", color: null };
			update(
				ideas => {
					const next = ideas.slice();
					const afterIndex = input.after ? next.findIndex(item => item.id === input.after) : -1;
					const beforeIndex = input.before ? next.findIndex(item => item.id === input.before) : -1;
					if (afterIndex >= 0) next.splice(afterIndex + 1, 0, idea);
					else if (beforeIndex >= 0) next.splice(beforeIndex, 0, idea);
					else next.push(idea);
					return next;
				},
				{ structural: true }
			);
			return id;
		},

		setText: (id, text) => {
			const idea = get().record?.ideas.find(item => item.id === id);
			if (idea && idea.text !== text) patch(id, { text });
		},

		setColor: (id, color) => {
			patch(id, { color }, { history: true });
		},

		link: (id, from) => {
			const ideas = get().record?.ideas ?? [];
			const target = ideas.find(idea => idea.id === id);
			const source = ideas.find(idea => idea.id === from);
			if (!target || !source || source.col >= target.col) return;
			patch(id, { from }, { structural: true });
		},

		unlink: id => {
			patch(id, { from: null }, { structural: true });
		},

		indent: id =>
			update(
				ideas => {
					const idea = ideas.find(item => item.id === id);
					if (!idea) return null;
					const siblings = childrenOf(ideas, idea.col, idea.parent);
					const previous = siblings[siblings.findIndex(item => item.id === id) - 1];
					if (!previous) return null;
					// Becomes the last child of the previous sibling.
					const next = ideas.filter(item => item.id !== id);
					next.push({ ...idea, parent: previous.id });
					return next;
				},
				{ structural: true }
			),

		outdent: id =>
			update(
				ideas => {
					const idea = ideas.find(item => item.id === id);
					if (!idea?.parent) return null;
					const parent = ideas.find(item => item.id === idea.parent);
					if (!parent) return null;
					// Becomes the sibling right after its former parent.
					const next = ideas.filter(item => item.id !== id);
					next.splice(next.indexOf(parent) + 1, 0, { ...idea, parent: parent.parent });
					return next;
				},
				{ structural: true }
			),

		remove: (id, options) => {
			update(
				ideas => {
					if (!ideas.some(idea => idea.id === id)) return null;
					const removed = descendantIds(ideas, id);
					return ideas.filter(idea => !removed.has(idea.id)).map(idea => (idea.from && removed.has(idea.from) ? { ...idea, from: null } : idea));
				},
				{ structural: true, history: options?.history ?? true }
			);
		},

		move: (id, drop) => {
			update(
				ideas => {
					const next = moveIdea(ideas, id, drop);
					return next && !sameStructure(next, ideas) ? next : null;
				},
				{ structural: true }
			);
		},

		setFormat: formatId => {
			const { record, rev } = get();
			if (!record || record.format === formatId) return;
			const format = formatOf(formatId);
			const used = record.ideas.reduce((max, idea) => Math.max(max, idea.col + 1), 0);
			// Columns that already hold ideas survive a switch to a format with fewer speeches.
			const columns = Array.from({ length: Math.max(format.speeches.length, used) }, (_, col) => format.speeches[col]?.label ?? record.columns[col] ?? `${col + 1}`);
			// Prep that isn't running restarts at the new format's length.
			const fresh = (clock: Clock) => (clock.startedAt === null ? prepClock(format.prep) : clock);
			set({ record: { ...record, format: format.id, columns, prep: { aff: fresh(record.prep.aff), neg: fresh(record.prep.neg) }, updatedAt: Date.now() }, rev: rev + 1 });
		},

		setColumnLabel: (col, label) => {
			const { record } = get();
			if (!record || col >= record.columns.length) return;
			const columns = record.columns.slice();
			columns[col] = label.trim() || formatOf(record.format).speeches[col]?.label || `${col + 1}`;
			if (columns[col] !== record.columns[col]) set({ record: { ...record, columns, updatedAt: Date.now() } });
		},

		togglePrep: side => {
			const { record } = get();
			if (!record) return;
			const now = Date.now();
			const pause = (clock: Clock): Clock => (clock.startedAt === null ? clock : { ...clock, elapsed: clockElapsed(clock, now), startedAt: null });
			const clock = record.prep[side];
			const other = side === "aff" ? "neg" : "aff";
			// Only one team preps at a time.
			const prep = clock.startedAt === null ? { [side]: { ...clock, startedAt: now }, [other]: pause(record.prep[other]) } : { ...record.prep, [side]: pause(clock) };
			set({ record: { ...record, prep: prep as FlowRecord["prep"], updatedAt: now } });
		},

		resetPrep: side => {
			const { record } = get();
			if (record) set({ record: { ...record, prep: { ...record.prep, [side]: { ...record.prep[side], elapsed: 0, startedAt: null } }, updatedAt: Date.now() } });
		},

		setPrepDuration: (side, duration) => {
			const { record } = get();
			if (record) set({ record: { ...record, prep: { ...record.prep, [side]: { duration, elapsed: 0, startedAt: null } }, updatedAt: Date.now() } });
		},

		undo: () => {
			const { record, future, rev } = get();
			if (!record) return false;
			const past = trimNoops(get().past, record.ideas);
			const snapshot = past.at(-1);
			if (!snapshot) return false;
			set({ record: { ...record, ideas: mergeText(snapshot, record.ideas), updatedAt: Date.now() }, past: past.slice(0, -1), future: [...future, record.ideas], rev: rev + 1 });
			return true;
		},

		redo: () => {
			const { record, past, rev } = get();
			if (!record) return false;
			const future = trimNoops(get().future, record.ideas);
			const snapshot = future.at(-1);
			if (!snapshot) return false;
			set({ record: { ...record, ideas: mergeText(snapshot, record.ideas), updatedAt: Date.now() }, past: [...past, record.ideas], future: future.slice(0, -1), rev: rev + 1 });
			return true;
		}
	};
});

export const getIdea = (id: string) => useFlowStore.getState().record?.ideas.find(idea => idea.id === id);

export const columnCount = () => useFlowStore.getState().record?.columns.length ?? 0;

// Autosave: debounce writes, flush when the page is hidden.
let pending: FlowRecord | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function flushSave() {
	clearTimeout(timer);
	if (pending) saveRecord(pending);
	pending = null;
}

useFlowStore.subscribe((state, previous) => {
	if (!state.record || state.record === previous.record) return;
	if (previous.record?.id === state.record.id && previous.record.updatedAt === state.record.updatedAt) return;
	pending = state.record;
	clearTimeout(timer);
	timer = setTimeout(flushSave, 400);
});

if (typeof window !== "undefined") {
	window.addEventListener("pagehide", flushSave);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flushSave();
	});
}
