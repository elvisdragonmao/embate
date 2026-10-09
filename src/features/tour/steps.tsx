import type { ReactNode } from "react";
import { shortcuts } from "../../app/shortcuts";
import { Keys } from "../../components/Hint";
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

export interface TourStep {
	title: string;
	body: ReactNode;
	/** What to light up; null dims the whole page and centers the card. */
	target: (() => Box | null) | null;
	/** Scrolled into view when the step opens. */
	reveal?: () => Element | null;
	/** Where the card goes when there is room; otherwise it goes wherever it fits. */
	side?: "right" | "bottom";
	/** Something to try, checked off once the flow shows it, compared with the flow as the step opened. */
	task?: { text: ReactNode; done: (record: FlowRecord, start: FlowRecord) => boolean };
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
		body: (
			<>
				<p>
					The board follows the round in speaking order. The aff's speeches have blue names and the neg's red ones. This practice round already has a few points, and each arrow runs from an argument
					to the response that answers it.
				</p>
				<p>Click a speech's name to rename it. Pinch on a trackpad to widen or narrow the columns.</p>
			</>
		),
		target: () => onBoard(union(boxOf(find('[data-tour="labels"]')), ...Array.from(document.querySelectorAll("[data-idea-id]"), boxOf))),
		side: "bottom"
	},
	{
		title: "Add a point",
		body: (
			<p>
				Click empty space in a column to start a point there. <Keys keys={shortcuts.nextPoint} /> adds the next one, <Keys keys={shortcuts.subPoint} /> makes it a sub-point, and{" "}
				<Keys keys={shortcuts.stop} /> finishes. Points take Markdown, like <code>**bold**</code>, and typing <code>-&gt;</code> makes an arrow.
			</p>
		),
		target: () => column(NC),
		reveal: () => columnElement(NC),
		side: "right",
		task: {
			text: "Click the empty space in NC, below the neg's two points, and add a third.",
			done: (record, start) => record.ideas.some(idea => idea.col === NC && !isBlank(idea.text) && !start.ideas.some(old => old.id === idea.id))
		}
	},
	{
		title: "Answer with an arrow",
		body: (
			<p>
				Hover a point and click the arrow on its right to answer it in the next speech, or press <Keys keys={shortcuts.extend} /> while writing it. Drag that arrow onto any later point to link the two
				instead, and click a link to remove it.
			</p>
		),
		target: () => union(idea(T.turn), column(NR)),
		reveal: () => columnElement(NR),
		side: "right",
		task: {
			text: (
				<>
					Hover the <b>Turn</b> in AR, click its arrow, and write the neg's answer.
				</>
			),
			done: (record, start) => answers(record, T.turn) > answers(start, T.turn)
		}
	},
	{
		title: "Move and nest",
		body: <p>Drag a point up or down to move it along with its sub-points. Drag it sideways to nest it under the point above, or to pull it back out.</p>,
		target: () => column(AC),
		reveal: () => columnElement(AC),
		side: "right",
		task: {
			text: (
				<>
					Drag <b>C2 Mental health</b> above <b>C1 Learning</b>.
				</>
			),
			done: (record, start) => shape(record, AC) !== shape(start, AC)
		}
	},
	{
		title: "Color and clean up",
		body: (
			<p>
				Right-click a point to color it, unlink it or delete it. Give each color a meaning, such as green for voters and red for dropped arguments. Made a mistake? <Keys keys={shortcuts.undo} />{" "}
				undoes it.
			</p>
		),
		target: () => union(column(AC), column(NR)),
		reveal: () => columnElement(AC),
		side: "right",
		task: {
			text: "Right-click a point and pick a color.",
			done: (record, start) => record.ideas.some(idea => idea.color !== (start.ideas.find(old => old.id === idea.id)?.color ?? null))
		}
	},
	{
		title: "Name the round, pick the format",
		body: (
			<p>
				Type the round's name at the top. The format under it sets the speeches, quick timers and prep. The buttons beside it add crossfire or cross-ex columns and, in Public Forum, let the neg speak
				first.
			</p>
		),
		target: () => boxOf(find('[data-tour="heading"]')),
		side: "right"
	},
	{
		title: "Time the speeches",
		body: (
			<p>
				Click the digits to set a length, or pick a quick timer to start one. <Keys keys={shortcuts.timerToggle} /> starts and pauses, and the icon beside the digits switches to a stopwatch. Below are
				each team's prep clocks, which <Keys keys={shortcuts.prepAff} /> and <Keys keys={shortcuts.prepNeg} /> start.
			</p>
		),
		target: () => boxOf(find('[data-tour="timer"]')),
		side: "right"
	},
	{
		title: "Notes",
		body: <p>Keep the resolution, the teams and your decision here. Notes take Markdown, just like points.</p>,
		target: () => boxOf(find('[data-tour="notes"]')),
		side: "right"
	},
	{
		title: "Open, Download, Info",
		body: (
			<p>
				Every flow saves in this browser as you type. Open starts a new one, switches between them, uploads a file or loads a full demo round. Download saves this flow as a file. Info lists every
				shortcut, copies a prompt that turns a transcript into a flow, and starts this tour again.
			</p>
		),
		target: () => boxOf(find('[data-tour="actions"]')),
		side: "right"
	},
	{
		title: "You're ready to flow",
		body: <p>That's everything. The practice round goes away, and your own flow opens.</p>,
		target: null
	}
];
