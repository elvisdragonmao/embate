import { Dialog } from "@base-ui/react/dialog";
import { CheckIcon, CopyIcon, GithubLogoIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { shortcuts } from "../../app/shortcuts";
import { Keys } from "../../components/Hint";
import { transcriptPrompt } from "../../lib/prompt";
import { useUIStore } from "../../stores/ui";
import styles from "./InfoDialog.module.css";

const usage = [
	"Click empty space in a speech column to add a point. Drag a point up or down to move it with its sub-points; drag sideways to nest it.",
	"Hover a point and click the arrow on its right to extend it into the next speech. Drag the arrow onto any later speech or point to link there. Click a link to remove it.",
	"Right-click a point to color, unlink, or delete it.",
	"Click a speech label to rename it. Pick the format under the title to switch speeches, quick timers, and prep; the buttons beside it add or remove crossfire and cross-examination columns and, in Public Forum, let the neg speak first.",
	"Pinch on the trackpad to widen or narrow the columns; pinch back to the edges to fit them again.",
	"Everything saves in this browser as you type. Download exports a JSON file that Open can upload again; Open → Demo loads a sample round."
];

const REPOSITORY = "https://github.com/elvisdragonmao/embate";

const groups: { title: string; rows: [string, string[]][] }[] = [
	{
		title: "Flowing",
		rows: [
			["Next point", shortcuts.nextPoint],
			["Line break", shortcuts.lineBreak],
			["Sub-point, or indent an empty point", shortcuts.subPoint],
			["Outdent", shortcuts.outdent],
			["Extend into the next speech", shortcuts.extend],
			["Delete an empty point", shortcuts.remove],
			["Previous or next point", shortcuts.move],
			["Stop editing", shortcuts.stop]
		]
	},
	{
		title: "Formatting",
		rows: [
			["Bold", shortcuts.bold],
			["Italic", shortcuts.italic],
			["Strikethrough", shortcuts.strike],
			["Code", shortcuts.code],
			["Arrow → or ←", [...shortcuts.rightArrow, "/", ...shortcuts.leftArrow]]
		]
	},
	{
		title: "Timer",
		rows: [
			["Start or pause", shortcuts.timerToggle],
			["Reset", shortcuts.timerReset],
			["Countdown or stopwatch", shortcuts.timerMode],
			["Start a 1–9 minute timer", shortcuts.quickStart],
			["Start or pause aff prep", shortcuts.prepAff],
			["Start or pause neg prep", shortcuts.prepNeg]
		]
	},
	{
		title: "General",
		rows: [
			["Open", shortcuts.open],
			["Download", shortcuts.download],
			["Undo or redo points", [...shortcuts.undo, "/", ...shortcuts.redo.slice(1)]],
			["Info", shortcuts.info]
		]
	}
];

export function InfoDialog() {
	const open = useUIStore(state => state.infoOpen);
	const setOpen = useUIStore(state => state.setInfoOpen);

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />
				<Dialog.Popup className={styles.popup}>
					<header className={styles.header}>
						<Dialog.Title className={styles.credit}>
							Made by <strong>Elvis Mao</strong>
						</Dialog.Title>
						<a className={styles.github} href={REPOSITORY} target="_blank" rel="noreferrer" aria-label="embate on GitHub">
							<GithubLogoIcon size="1.125rem" weight="fill" />
						</a>
						<Dialog.Close className={styles.close} aria-label="Close">
							<XIcon size="1rem" weight="bold" />
						</Dialog.Close>
					</header>
					<div className={styles.body}>
						<PromptCopy />
						<ol className={styles.usage}>
							{usage.map(line => (
								<li key={line}>{line}</li>
							))}
						</ol>
						<div className={styles.groups}>
							{groups.map(group => (
								<section key={group.title} className={styles.group}>
									<h3 className={styles.groupTitle}>{group.title}</h3>
									<dl className={styles.rows}>
										{group.rows.map(([label, keys]) => (
											<div key={label} className={styles.row}>
												<dt>{label}</dt>
												<dd>
													<Keys keys={keys} />
												</dd>
											</div>
										))}
									</dl>
								</section>
							))}
						</div>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/** Copies a prompt for an AI chat that turns a round's transcript into a flow file to upload. */
function PromptCopy() {
	const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

	useEffect(() => {
		if (status === "idle") return;
		const timer = setTimeout(() => setStatus("idle"), 2000);
		return () => clearTimeout(timer);
	}, [status]);

	const copy = () =>
		// The clipboard API is missing outside secure contexts; that counts as a failure too.
		Promise.resolve()
			.then(() => navigator.clipboard.writeText(transcriptPrompt()))
			.then(
				() => setStatus("copied"),
				() => setStatus("failed")
			);

	return (
		<div className={styles.prompt}>
			<button type="button" className={styles.copy} onClick={copy}>
				{status === "copied" ? <CheckIcon size="1rem" weight="bold" /> : <CopyIcon size="1rem" weight="bold" />}
				<span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy" : "Copy AI prompt"}</span>
			</button>
			<p className={styles.promptText}>Paste it into an AI chat with a round's transcript, save the JSON it returns, and upload it from Open to see the flow.</p>
		</div>
	);
}
