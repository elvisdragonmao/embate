import styles from "./Brand.module.css";

export function Brand() {
	return (
		<h1 className={styles.brand}>
			<span className={styles.name}>embate</span>
			<span className={styles.tagline}>Flow for debate judges</span>
		</h1>
	);
}
