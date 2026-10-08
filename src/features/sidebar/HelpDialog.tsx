import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { shortcuts } from "../../app/shortcuts";
import { Keys } from "../../components/Hint";
import { useUIStore } from "../../stores/ui";
import styles from "./HelpDialog.module.css";

const usage = [
	"Click empty space in a speech column to add a point.",
	"Hover a point and click the arrow on its right to extend it into the next speech. Drag the arrow onto any later speech or point to link there.",
	"Right-click a point to color, unlink, or delete it.",
	"Pinch on the trackpad to widen or narrow the columns. Double-click a speech label to fit them again.",
	"Everything saves in this browser as you type. Download exports a JSON file that Open can upload again."
];

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
			["Code", shortcuts.code]
		]
	},
	{
		title: "Timer",
		rows: [
			["Start or pause", shortcuts.timerToggle],
			["Reset", shortcuts.timerReset],
			["Countdown or stopwatch", shortcuts.timerMode],
			["Start 4, 3 or 2 minutes", [shortcuts.quick4[0], "4 3 2"]]
		]
	},
	{
		title: "General",
		rows: [
			["Open", shortcuts.open],
			["Download", shortcuts.download],
			["Undo or redo points", [...shortcuts.undo, "/", ...shortcuts.redo.slice(1)]],
			["Help", shortcuts.help]
		]
	}
];

export function HelpDialog() {
	const open = useUIStore(state => state.helpOpen);
	const setOpen = useUIStore(state => state.setHelpOpen);

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />
				<Dialog.Popup className={styles.popup}>
					<header className={styles.header}>
						<Dialog.Title className={styles.title}>Help</Dialog.Title>
						<Dialog.Close className={styles.close} aria-label="Close">
							<XIcon size="1rem" weight="bold" />
						</Dialog.Close>
					</header>
					<div className={styles.body}>
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
