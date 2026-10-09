import { Dialog } from "@base-ui/react/dialog";
import { HandWavingIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { needsWelcome, setWelcomed } from "../../lib/storage";
import styles from "./Tour.module.css";
import { useStartTour } from "./useTour";

/** Greets a first visit and offers the tour; either answer is final. */
export function Welcome() {
	const [open, setOpen] = useState(needsWelcome);
	const startTour = useStartTour();
	const startRef = useRef<HTMLButtonElement>(null);

	const close = () => {
		setWelcomed();
		setOpen(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={next => !next && close()}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />
				<Dialog.Popup className={styles.welcome} initialFocus={startRef}>
					<span className={styles.wave}>
						<HandWavingIcon size="1.375rem" weight="fill" />
					</span>
					<Dialog.Title className={styles.welcomeTitle}>Welcome to embate</Dialog.Title>
					<Dialog.Description className={styles.welcomeText}>
						A flow sheet for debate judges: each speech gets its own column, and arrows run from every argument to the responses that answer it.
					</Dialog.Description>
					<p className={styles.welcomeText}>Want a quick tour? It shows you around on a practice round, so your own flows stay as they are. You can also take it later from Info.</p>
					<div className={styles.welcomeActions}>
						<Dialog.Close className={styles.secondary}>Not now</Dialog.Close>
						<button
							ref={startRef}
							type="button"
							className={styles.primary}
							onClick={() => {
								close();
								startTour();
							}}
						>
							Take the tour
						</button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
