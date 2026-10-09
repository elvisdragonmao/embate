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
					<Dialog.Description className={styles.welcomeText}>A flow sheet for debate judges. Want a quick tour on a practice round? Info can start it again anytime.</Dialog.Description>
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
