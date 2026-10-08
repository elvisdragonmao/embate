import { Actions } from "./Actions";
import { Brand } from "./Brand";
import { EventTitle } from "./EventTitle";
import { FormatMenu } from "./FormatMenu";
import { Note } from "./Note";
import styles from "./Sidebar.module.css";
import { Timer } from "./Timer";

export function Sidebar() {
	return (
		<aside className={styles.sidebar}>
			<Brand />
			<div className={styles.heading}>
				<EventTitle />
				<FormatMenu />
			</div>
			<Timer />
			<Note />
			<Actions />
		</aside>
	);
}
