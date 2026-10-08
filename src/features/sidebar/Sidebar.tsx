import { Actions } from "./Actions";
import { EventTitle } from "./EventTitle";
import { Note } from "./Note";
import styles from "./Sidebar.module.css";
import { Timer } from "./Timer";

export function Sidebar() {
	return (
		<aside className={styles.sidebar}>
			<EventTitle />
			<Timer />
			<Note />
			<Actions />
		</aside>
	);
}
