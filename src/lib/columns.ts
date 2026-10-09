import type { Format, Side } from "./formats";

export interface Column {
	label: string;
	/** The team that speaks; null for crossfire and cross-examination, where both do. */
	side: Side | null;
}

export const isCross = (column: Column) => column.side === null;

/** Cross-examination columns hold short notes, so they take less room than speeches. */
export const widthOf = (column: Column) => (isCross(column) ? 0.85 : 1);

/** Whether the team that usually speaks second opens instead, e.g. the neg in Public Forum. */
export function isFlipped(format: Format, columns: Column[]) {
	const first = columns.find(column => !isCross(column));
	return !!format.eitherFirst && !!first && first.side !== format.speeches[0].side;
}

/** The format's speeches in speaking order; flipped, the teams trade turns and each keeps its own speech names in order. */
export function speechesOf(format: Format, flipped = false) {
	if (!flipped) return format.speeches;
	const names = { aff: format.speeches.filter(speech => speech.side === "aff"), neg: format.speeches.filter(speech => speech.side === "neg") };
	return format.speeches.map(speech => names[speech.side === "aff" ? "neg" : "aff"].shift()!);
}

export const speechColumns = (format: Format): Column[] => format.speeches.map(speech => ({ label: speech.label, side: speech.side }));

/** Position of a column among the columns of its own kind (speeches or cross-ex). */
export function ordinalOf(columns: Column[], col: number) {
	const cross = isCross(columns[col]);
	return columns.slice(0, col).filter(column => isCross(column) === cross).length;
}

export function defaultLabel(format: Format, columns: Column[], col: number) {
	const ordinal = ordinalOf(columns, col);
	return isCross(columns[col]) ? (format.crossEx?.labels[ordinal] ?? format.crossEx?.name ?? "CX") : (speechesOf(format, isFlipped(format, columns))[ordinal]?.label ?? `${col + 1}`);
}

/**
 * Lays out `speeches` with the format's cross-ex columns in place when `cross` is on, reusing labels from `previous`.
 * Returns the columns and where each previous column went (-1 when it no longer exists).
 */
export function arrangeColumns(format: Format, speeches: Column[], cross: boolean, previous: Column[]) {
	const oldCross = previous.filter(isCross);
	const columns: Column[] = [];
	speeches.forEach((speech, index) => {
		columns.push(speech);
		const slot = format.crossEx?.after.indexOf(index) ?? -1;
		if (cross && slot >= 0) columns.push({ label: oldCross[slot]?.label ?? format.crossEx!.labels[slot], side: null });
	});
	return { columns, map: mapColumns(previous, columns) };
}

/** Maps each column of `from` to the column of the same kind and ordinal in `to`, or -1. */
export function mapColumns(from: Column[], to: Column[]) {
	const slots = { speech: [] as number[], cross: [] as number[] };
	to.forEach((column, index) => slots[isCross(column) ? "cross" : "speech"].push(index));
	const seen = { speech: 0, cross: 0 };
	return from.map(column => {
		const kind = isCross(column) ? "cross" : "speech";
		return slots[kind][seen[kind]++] ?? -1;
	});
}

/**
 * Switches which team opens. Speech columns stay in place, so ideas and links stay valid, and take the other order's sides;
 * each team keeps its own labels, renamed ones included. Cross-ex columns and speeches beyond the format's stay as they are.
 */
export function flipColumns(format: Format, columns: Column[], flipped: boolean) {
	const order = speechesOf(format, flipped);
	const speeches = columns.filter(column => !isCross(column)).slice(0, order.length);
	const labels = { aff: [] as string[], neg: [] as string[] };
	speeches.forEach(column => labels[column.side!].push(column.label));
	let index = 0;
	return columns.map((column): Column => {
		const speech = isCross(column) ? undefined : order[index++];
		return speech ? { label: labels[speech.side].shift() ?? speech.label, side: speech.side } : column;
	});
}
