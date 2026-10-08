import type { Format, Side } from "./formats";

export interface Column {
	label: string;
	/** The team that speaks; null for crossfire and cross-examination, where both do. */
	side: Side | null;
}

export const isCross = (column: Column) => column.side === null;

/** Cross-examination columns hold short notes, so they take less room than speeches. */
export const widthOf = (column: Column) => (isCross(column) ? 0.85 : 1);

export const speechColumns = (format: Format): Column[] => format.speeches.map(speech => ({ label: speech.label, side: speech.side }));

/** Position of a column among the columns of its own kind (speeches or cross-ex). */
export function ordinalOf(columns: Column[], col: number) {
	const cross = isCross(columns[col]);
	return columns.slice(0, col).filter(column => isCross(column) === cross).length;
}

export function defaultLabel(format: Format, columns: Column[], col: number) {
	const ordinal = ordinalOf(columns, col);
	return isCross(columns[col]) ? (format.crossEx?.labels[ordinal] ?? format.crossEx?.name ?? "CX") : (format.speeches[ordinal]?.label ?? `${col + 1}`);
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
