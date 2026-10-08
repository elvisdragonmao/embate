import { DownloadSimpleIcon, FolderOpenIcon, QuestionIcon } from "@phosphor-icons/react";
import { useUIStore } from "../../stores/ui";
import styles from "./Actions.module.css";
import { downloadCurrent } from "./download";
import { HelpDialog } from "./HelpDialog";
import { OpenMenu } from "./OpenMenu";

export function Actions() {
	const setHelpOpen = useUIStore(state => state.setHelpOpen);

	return (
		<nav className={styles.actions}>
			<OpenMenu>
				<button type="button" className={styles.action}>
					<FolderOpenIcon size="1.25rem" />
					<span>Open</span>
				</button>
			</OpenMenu>
			<button type="button" className={styles.action} onClick={downloadCurrent}>
				<DownloadSimpleIcon size="1.25rem" />
				<span>Download</span>
			</button>
			<button type="button" className={styles.action} onClick={() => setHelpOpen(true)}>
				<QuestionIcon size="1.25rem" />
				<span>Help</span>
			</button>
			<HelpDialog />
		</nav>
	);
}
