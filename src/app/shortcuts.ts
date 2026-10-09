import { keyLabels as k } from "../lib/platform";

export const shortcuts = {
	info: [k.mod, "/"],
	open: [k.mod, "O"],
	download: [k.mod, "S"],
	undo: [k.mod, "Z"],
	redo: [k.mod, k.shift, "Z"],
	timerToggle: [k.alt, "T"],
	timerReset: [k.alt, "R"],
	timerMode: [k.alt, "M"],
	quickStart: [k.alt, "1–9"],
	prepAff: [k.alt, "["],
	prepNeg: [k.alt, "]"],
	nextPoint: [k.enter],
	lineBreak: [k.shift, k.enter],
	subPoint: [k.tab],
	outdent: [k.shift, k.tab],
	extend: [k.mod, k.enter],
	remove: [k.backspace],
	move: ["↑", "↓"],
	stop: [k.esc],
	bold: [k.mod, "B"],
	italic: [k.mod, "I"],
	strike: [k.mod, k.shift, "X"],
	code: [k.mod, "E"],
	rightArrow: ["->"],
	leftArrow: ["<-"]
} satisfies Record<string, string[]>;
