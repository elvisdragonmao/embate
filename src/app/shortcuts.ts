import { keyLabels as k } from "../lib/platform";

export const shortcuts = {
	help: [k.mod, "/"],
	open: [k.mod, "O"],
	download: [k.mod, "S"],
	undo: [k.mod, "Z"],
	redo: [k.mod, k.shift, "Z"],
	timerToggle: [k.alt, "T"],
	timerReset: [k.alt, "R"],
	timerMode: [k.alt, "M"],
	quick4: [k.alt, "4"],
	quick3: [k.alt, "3"],
	quick2: [k.alt, "2"],
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
	code: [k.mod, "E"]
} satisfies Record<string, string[]>;
