import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, parserCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { history } from "@milkdown/kit/plugin/history";
import { commonmark, emphasisSchema, inlineCodeSchema, strongSchema } from "@milkdown/kit/preset/commonmark";
import { gfm, strikethroughSchema } from "@milkdown/kit/preset/gfm";
import { toggleMark } from "@milkdown/kit/prose/commands";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import { keymap } from "@milkdown/kit/prose/keymap";
import type { Node } from "@milkdown/kit/prose/model";
import { Plugin } from "@milkdown/kit/prose/state";
import type { DirectEditorProps, EditorView } from "@milkdown/kit/prose/view";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { $inputRule, $prose } from "@milkdown/kit/utils";
import { isMac } from "./platform";

type ViewOptions = Partial<Omit<DirectEditorProps, "state">>;

interface MarkdownEditorOptions {
	root: HTMLElement;
	/** Accessible name of the editable area. */
	label: string;
	value: string;
	/** Called after every document change; serializing is deferred to the caller. */
	onChange: (markdown: () => string, view: EditorView) => void;
	viewOptions?: ViewOptions;
}

/** ⌘⇧X toggles strikethrough next to Milkdown's ⌘⌥X; on macOS, Ctrl+B and Ctrl+I work like ⌘B and ⌘I. */
const extraShortcuts = $prose(ctx =>
	keymap({
		"Mod-Shift-x": toggleMark(strikethroughSchema.type(ctx)),
		...(isMac ? { "Ctrl-b": toggleMark(strongSchema.type(ctx)), "Ctrl-i": toggleMark(emphasisSchema.type(ctx)) } : {})
	})
);

/** Text matching `typed` becomes `symbol`, except in inline code; Backspace right after brings the characters back. */
const replace = (typed: RegExp, symbol: string) =>
	$inputRule(
		ctx =>
			// Milkdown's input rules ignore `inCodeMark`, so inline code is checked here.
			new InputRule(typed, (state, match, start, end) => {
				// The last group, when there is one, is the part replaced; whatever comes before it stays.
				const from = start + match[0].length - (match[match.length - 1] ?? match[0]).length;
				return state.doc.rangeHasMark(start, end, inlineCodeSchema.type(ctx)) ? null : state.tr.insertText(symbol, from, end);
			})
	);

/** Emoticons only count on their own, so `XD` inside a word or `:)` after one stays as typed. */
const emoticon = (typed: string, emoji: string) => replace(new RegExp(`(?:^|\\s)(${typed.replace(/[()]/g, "\\$&")})$`), emoji);

const replacements = [
	replace(/->$/, "→"),
	replace(/<-$/, "←"),
	replace(/=>$/, "⇒"),
	emoticon(":)", "🙂"),
	emoticon(":(", "🙁"),
	emoticon(":D", "😄"),
	emoticon(";)", "😉"),
	emoticon(":P", "😛"),
	emoticon("XD", "😆")
];

const changes = (onChange: MarkdownEditorOptions["onChange"]) =>
	$prose(
		ctx =>
			new Plugin({
				view: () => ({
					update: (view, previous) => {
						if (!view.state.doc.eq(previous.doc)) onChange(() => ctx.get(serializerCtx)(view.state.doc), view);
					}
				})
			})
	);

export function createMarkdownEditor({ root, label, value, onChange, viewOptions }: MarkdownEditorOptions) {
	return Editor.make()
		.config(ctx => {
			ctx.set(rootCtx, root);
			ctx.set(defaultValueCtx, value);
			ctx.update(editorViewOptionsCtx, previous => ({ ...previous, ...viewOptions, attributes: { "aria-label": label } }));
		})
		.use(commonmark)
		.use(gfm)
		.use(history)
		.use(clipboard)
		.use(extraShortcuts)
		.use(replacements)
		.use(changes(onChange))
		.create();
}

export const getView = (editor: Editor) => editor.action(ctx => ctx.get(editorViewCtx));

export const serialize = (editor: Editor, doc: Node) => editor.action(ctx => ctx.get(serializerCtx)(doc));

export function parse(editor: Editor, markdown: string) {
	return editor.action(ctx => {
		try {
			return ctx.get(parserCtx)(markdown);
		} catch {
			return ctx.get(parserCtx)(markdown.replace(/[\\`*_~[\]#>|-]/g, "\\$&"));
		}
	});
}
