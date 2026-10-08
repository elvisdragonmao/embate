import type { Editor } from "@milkdown/kit/core";
import { EditorState, Selection, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { createMarkdownEditor, getView, parse, serialize } from "../../lib/milkdown";
import type { Caret } from "../../stores/ui";
import prose from "../../styles/prose.module.css";

type KeyHandler = (id: string, event: KeyboardEvent, view: EditorView) => boolean;

/**
 * One Milkdown editor shared by every idea. It moves into whichever idea is being edited and swaps
 * its document synchronously, so typing straight after Enter or Tab never drops keystrokes while
 * a new editor boots, and the board stays light no matter how many ideas it holds.
 */
export class CellEditor {
	readonly root = document.createElement("div");
	private editor: Editor | null = null;
	private ideaId: string | null = null;
	private swapping = false;
	private pendingCaret: Caret | null = null;
	private pendingMarkdown = "";
	onKey: KeyHandler = () => false;
	onChange: (id: string, markdown: string) => void = () => {};
	onBlur: (id: string) => void = () => {};

	constructor() {
		this.root.className = prose.prose;
		createMarkdownEditor({
			root: this.root,
			label: "Point",
			value: "",
			onChange: markdown => {
				if (!this.swapping && this.ideaId) this.onChange(this.ideaId, markdown());
			},
			viewOptions: {
				handleKeyDown: (view, event) => (this.ideaId ? this.onKey(this.ideaId, event, view) : false)
			}
		}).then(editor => {
			this.editor = editor;
			if (this.ideaId && this.root.isConnected) {
				this.load(this.ideaId, this.pendingMarkdown);
				if (this.pendingCaret) this.focus(this.pendingCaret);
			}
		});

		this.root.addEventListener("focusout", () => {
			const id = this.ideaId;
			// Focus may only be in transit while the editor moves between ideas.
			setTimeout(() => {
				if (id && this.ideaId === id && !this.root.contains(document.activeElement)) this.onBlur(id);
			});
		});
	}

	get view() {
		return this.editor ? getView(this.editor) : null;
	}

	get activeId() {
		return this.ideaId;
	}

	attach(container: HTMLElement, id: string, markdown: string) {
		container.appendChild(this.root);
		this.ideaId = id;
		this.pendingMarkdown = markdown;
		if (this.editor) this.load(id, markdown);
	}

	detach(id: string) {
		if (this.ideaId !== id) return;
		this.ideaId = null;
		this.pendingCaret = null;
		this.root.remove();
	}

	private load(id: string, markdown: string) {
		const view = this.view;
		if (!view || !this.editor) return;
		this.swapping = true;
		// A fresh state per idea also gives each idea its own undo history.
		view.updateState(EditorState.create({ doc: parse(this.editor, markdown), plugins: view.state.plugins }));
		this.swapping = false;
		this.ideaId = id;
	}

	focus(caret: Caret) {
		const view = this.view;
		if (!view) {
			this.pendingCaret = caret;
			return;
		}
		view.focus();
		const { doc } = view.state;
		let selection: Selection = caret.at === "start" ? Selection.atStart(doc) : Selection.atEnd(doc);
		if (caret.at === "point" || caret.at === "edge") {
			const rect = view.dom.getBoundingClientRect();
			const line = parseFloat(getComputedStyle(view.dom).lineHeight) || 20;
			const y = caret.at === "point" ? caret.y : caret.edge === "top" ? rect.top + line / 2 : rect.bottom - line / 2;
			const hit = view.posAtCoords({ left: Math.min(Math.max(caret.x, rect.left), rect.right - 1), top: Math.min(Math.max(y, rect.top + 1), rect.bottom - 1) });
			if (hit) selection = TextSelection.near(doc.resolve(hit.pos));
			else if (caret.at === "edge") selection = caret.edge === "top" ? Selection.atStart(doc) : Selection.atEnd(doc);
		}
		view.dispatch(view.state.tr.setSelection(selection));
	}

	serialize(doc = this.view?.state.doc) {
		return this.editor && doc ? serialize(this.editor, doc) : "";
	}
}

export const cellEditor = new CellEditor();
