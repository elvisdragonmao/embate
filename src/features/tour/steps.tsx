import type { ReactNode } from "react";
import { isBlank, type FlowRecord } from "../../lib/record";
import { TOUR_COLUMNS, TOUR_IDEAS } from "../../lib/tour";
import { columnOrder } from "../../lib/tree";

/** A rectangle in viewport coordinates. */
export interface Box {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/** What a task can look at: the flow, when the speech timer last started and whether Info is open. */
export interface TourState {
	record: FlowRecord;
	timer: number | null;
	infoOpen: boolean;
}

export interface TourStep {
	title: string;
	/** One line on what this part of the app does. */
	body: string;
	/** What to light up; null dims the whole page and centers the card. */
	target: (() => Box | null) | null;
	/** Scrolled into view when the step opens. */
	reveal?: () => Element | null;
	/** Where the card goes when there is room; otherwise it goes wherever it fits. */
	side?: "right" | "bottom";
	/** One thing to try, checked off once it shows, compared with how things stood as the step opened. */
	task?: { text: ReactNode; done: (now: TourState, start: TourState) => boolean };
}

const { AC, NC, NR } = TOUR_COLUMNS;
const T = TOUR_IDEAS;

const boxOf = (element: Element | null): Box | null => {
	if (!element) return null;
	const { left, top, right, bottom } = element.getBoundingClientRect();
	return { left, top, right, bottom };
};

const union = (...boxes: (Box | null)[]) =>
	boxes.reduce<Box | null>(
		(all, box) => (!box ? all : !all ? box : { left: Math.min(all.left, box.left), top: Math.min(all.top, box.top), right: Math.max(all.right, box.right), bottom: Math.max(all.bottom, box.bottom) }),
		null
	);

const find = (selector: string) => document.querySelector(selector);

/** Clips to the board's scroll area, so parts scrolled out of sight aren't lit. */
function onBoard(box: Box | null): Box | null {
	const board = boxOf(find('[data-tour="board"]'));
	if (!box || !board) return null;
	return { left: Math.max(box.left, board.left), top: Math.max(box.top, board.top), right: Math.min(box.right, board.right), bottom: Math.min(box.bottom, board.bottom) };
}

const columnElement = (col: number) => find(`[data-col="${col}"]`);
const idea = (id: string) => onBoard(boxOf(find(`[data-idea-id="${id}"]`)));

/** A speech column, from its name down. */
function column(col: number) {
	const body = boxOf(columnElement(col));
	const labels = boxOf(find('[data-tour="labels"]'));
	return body && labels && onBoard({ ...body, top: labels.top });
}

/** A column's points in reading order with their depth, so any move or nesting shows. */
const shape = (record: FlowRecord, col: number) =>
	columnOrder(record.ideas, col)
		.map(({ idea, depth }) => `${idea.id}:${depth}`)
		.join(" ");

const answers = (record: FlowRecord, id: string) => record.ideas.filter(idea => idea.from === id && !isBlank(idea.text)).length;

export const STEPS: TourStep[] = [
	{
		title: "One column per speech",
		body: "Each speech gets its own column, in speaking order.",
		target: () => onBoard(union(boxOf(find('[data-tour="labels"]')), ...Array.from(document.querySelectorAll("[data-idea-id]"), boxOf))),
		side: "bottom",
		task: {
			text: (
				<>
					Click <b>AC</b> and rename it.
				</>
			),
			done: (now, start) => now.record.columns.some((column, col) => column.label !== start.record.columns[col]?.label)
		}
	},
	{
		title: "Add a point",
		body: "Click empty space in a column to write a point there.",
		target: () => column(NC),
		reveal: () => columnElement(NC),
		side: "right",
		task: {
			text: (
				<>
					Click below the neg's points in <b>NC</b> and write a third.
				</>
			),
			done: (now, start) => now.record.ideas.some(idea => idea.col === NC && !isBlank(idea.text) && !start.record.ideas.some(old => old.id === idea.id))
		}
	},
	{
		title: "Answer with an arrow",
		body: "Hover a point and click the arrow on its right to answer it in the next speech.",
		target: () => union(idea(T.turn), column(NR)),
		reveal: () => columnElement(NR),
		side: "right",
		task: {
			text: (
				<>
					Click the <b>Turn</b>'s arrow and write the neg's answer.
				</>
			),
			done: (now, start) => answers(now.record, T.turn) > answers(start.record, T.turn)
		}
	},
	{
		title: "Move and nest",
		body: "Drag a point up or down to move it, or sideways to nest it.",
		target: () => column(AC),
		reveal: () => columnElement(AC),
		side: "right",
		task: {
			text: (
				<>
					Drag <b>C2 Mental health</b> above <b>C1 Learning</b>.
				</>
			),
			done: (now, start) => shape(now.record, AC) !== shape(start.record, AC)
		}
	},
	{
		title: "Color and delete",
		body: "Right-click a point to color, unlink or delete it.",
		target: () => union(column(AC), column(NR)),
		reveal: () => columnElement(AC),
		side: "right",
		task: {
			text: "Right-click a point and pick a color.",
			done: (now, start) => now.record.ideas.some(idea => idea.color !== (start.record.ideas.find(old => old.id === idea.id)?.color ?? null))
		}
	},
	{
		title: "Name and format",
		body: "The title names the round, and the format under it sets the speeches and timers.",
		target: () => boxOf(find('[data-tour="heading"]')),
		side: "right",
		task: {
			text: "Click the title and rename the round.",
			done: (now, start) => now.record.title !== start.record.title
		}
	},
	{
		title: "Time the speeches",
		body: "The speech timer, with each team's prep clock under it.",
		target: () => boxOf(find('[data-tour="timer"]')),
		side: "right",
		task: {
			text: "Click the play button to start the timer.",
			done: (now, start) => now.timer !== null && now.timer !== start.timer
		}
	},
	{
		title: "Notes",
		body: "Room for the resolution, the teams and your decision.",
		target: () => boxOf(find('[data-tour="notes"]')),
		side: "right",
		task: {
			text: "Write who won in the notes.",
			done: (now, start) => now.record.note !== start.record.note
		}
	},
	{
		title: "Open, Download, Info",
		body: "Open switches flows, Download saves this one as a file, and Info lists every shortcut.",
		target: () => boxOf(find('[data-tour="actions"]')),
		side: "right",
		task: {
			text: (
				<>
					Click <b>Info</b> to see every shortcut.
				</>
			),
			done: now => now.infoOpen
		}
	},
	{
		title: "You're ready to flow",
		body: "Your own flow opens next, and the practice round goes away.",
		target: null
	}
];
