import { DownloadSimpleIcon, FolderOpenIcon, InfoIcon } from "@phosphor-icons/react";
import { useUIStore } from "../../stores/ui";
import styles from "./Actions.module.css";
import { downloadCurrent } from "./download";
import { InfoDialog } from "./InfoDialog";
import { OpenMenu } from "./OpenMenu";

export function Actions() {
	const setInfoOpen = useUIStore(state => state.setInfoOpen);

	return (
		<nav className={styles.actions} data-tour="actions">
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
			<button type="button" className={styles.action} onClick={() => setInfoOpen(true)}>
				<InfoIcon size="1.25rem" />
				<span>Info</span>
			</button>
			<InfoDialog />
		</nav>
	);
}
