export type Side = "aff" | "neg";

export const FORMAT_IDS = ["pf", "ld", "policy", "bp", "wsdc", "ap", "oregon"] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export interface Format {
	id: FormatId;
	name: string;
	/** Flowed speeches in speaking order; cross-examination isn't flowed. */
	speeches: { label: string; side: Side }[];
	/** How each side is called in this format. */
	sideNames: Record<Side, string>;
	/** Quick-start lengths in minutes. */
	quick: number[];
	/** Prep time per team in minutes, or null when the format has no in-round prep. */
	prep: number | null;
}

const speeches = (labels: string, sides: string) => labels.split(" ").map((label, index) => ({ label, side: (sides[index] === "a" ? "aff" : "neg") as Side }));

export const FORMATS: Format[] = [
	{ id: "pf", name: "Public Forum", speeches: speeches("AC NC AR NR AS NS AFF NFF", "anananan"), sideNames: { aff: "Aff", neg: "Neg" }, quick: [4, 3, 2], prep: 2 },
	{ id: "ld", name: "Lincoln–Douglas", speeches: speeches("AC NC 1AR NR 2AR", "anana"), sideNames: { aff: "Aff", neg: "Neg" }, quick: [7, 6, 4, 3], prep: 4 },
	{ id: "policy", name: "Policy", speeches: speeches("1AC 1NC 2AC 2NC 1NR 1AR 2NR 2AR", "anannana"), sideNames: { aff: "Aff", neg: "Neg" }, quick: [8, 5, 3], prep: 8 },
	{ id: "bp", name: "British Parliamentary", speeches: speeches("PM LO DPM DLO MG MO GW OW", "anananan"), sideNames: { aff: "Gov", neg: "Opp" }, quick: [7], prep: null },
	{ id: "wsdc", name: "World Schools", speeches: speeches("P1 O1 P2 O2 P3 O3 OR PR", "anananna"), sideNames: { aff: "Prop", neg: "Opp" }, quick: [8, 4], prep: null },
	{ id: "ap", name: "Asian Parliamentary", speeches: speeches("PM LO DPM DLO GW OW OR PR", "anananna"), sideNames: { aff: "Gov", neg: "Opp" }, quick: [7, 4], prep: null },
	{ id: "oregon", name: "新式奧瑞岡", speeches: speeches("正一 反一 正二 反二 正三 反三 反結 正結", "anananna"), sideNames: { aff: "正方", neg: "反方" }, quick: [3], prep: null }
];

export const formatOf = (id: string | undefined) => FORMATS.find(format => format.id === id) ?? FORMATS[0];

/** Side of a column; columns beyond the format's speeches alternate. */
export const sideAt = (format: Format, col: number): Side => format.speeches[col]?.side ?? (col % 2 === 0 ? "aff" : "neg");
