import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, parserCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { history } from "@milkdown/kit/plugin/history";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm, strikethroughSchema } from "@milkdown/kit/preset/gfm";
import { toggleMark } from "@milkdown/kit/prose/commands";
import { keymap } from "@milkdown/kit/prose/keymap";
import type { Node } from "@milkdown/kit/prose/model";
import { Plugin } from "@milkdown/kit/prose/state";
import type { DirectEditorProps, EditorView } from "@milkdown/kit/prose/view";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { $prose } from "@milkdown/kit/utils";

type ViewOptions = Partial<Omit<DirectEditorProps, "state">>;

interface MarkdownEditorOptions {
	root: HTMLElement;
	value: string;
	/** Called after every document change; serializing is deferred to the caller. */
	onChange: (markdown: () => string, view: EditorView) => void;
	viewOptions?: ViewOptions;
}

/** ⌘⇧X toggles strikethrough, alongside Milkdown's default ⌘⌥X. */
const strikeShortcut = $prose(ctx => keymap({ "Mod-Shift-x": toggleMark(strikethroughSchema.type(ctx)) }));

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

export function createMarkdownEditor({ root, value, onChange, viewOptions }: MarkdownEditorOptions) {
	return Editor.make()
		.config(ctx => {
			ctx.set(rootCtx, root);
			ctx.set(defaultValueCtx, value);
			if (viewOptions) ctx.update(editorViewOptionsCtx, previous => ({ ...previous, ...viewOptions }));
		})
		.use(commonmark)
		.use(gfm)
		.use(history)
		.use(clipboard)
		.use(strikeShortcut)
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
