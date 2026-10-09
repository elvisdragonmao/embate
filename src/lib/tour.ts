import { createRecord, type FlowRecord, type Idea } from "./record";

/** The tour's practice round always lives under this id; leaving it throws the round away. */
export const TOUR_ID = "tour";

/** Speeches the tour points at, by column. */
export const TOUR_COLUMNS = { AC: 0, NC: 1, AR: 2, NR: 3 };

/** Fixed ids, so the round's links hold and the tour's steps can find points on the board. */
export const TOUR_IDEAS = { learning: "tour-learning", health: "tour-health", safety: "tour-safety", turn: "tour-turn" };

const { AC, NC, AR } = TOUR_COLUMNS;
const T = TOUR_IDEAS;

/**
 * Just enough of a Public Forum round to read as a flow: a sub-point, a couple of colors and two answered arguments.
 * NR starts empty for the tour's first answer, and no arrow crosses the gutter beside the Turn, where its extend arrow sits.
 */
const IDEAS: Idea[] = [
	{ id: T.learning, col: AC, parent: null, from: null, text: "**C1 Learning**: phones = #1 distraction", color: "green" },
	{ id: "tour-study", col: AC, parent: T.learning, from: null, text: "*Beland & Murphy '16*: bans → scores **+6% SD**", color: null },
	{ id: T.health, col: AC, parent: null, from: null, text: "**C2 Mental health**: less scrolling → less comparison", color: null },
	{ id: T.safety, col: NC, parent: null, from: null, text: "**C1 Safety**: in a lockdown, a phone is the only line to family", color: "yellow" },
	{ id: "tour-fail", col: NC, parent: null, from: null, text: "**C2 Bans fail**: use just moves to after school", color: null },
	{ id: T.turn, col: AR, parent: null, from: T.safety, text: "**Turn**: light & noise give away location", color: null },
	{ id: "tour-inschool", col: AR, parent: null, from: "tour-fail", text: "doesn't touch C1: learning happens *in* school", color: null }
];

const NOTE = `**Resolved:** Public high schools should ban student phones during the school day.

This practice round is only for the tour; it goes away when the tour ends.`;

export function createTourRecord(): FlowRecord {
	return { ...createRecord("pf"), id: TOUR_ID, title: "Practice · Phones in schools", note: NOTE, ideas: IDEAS };
}
