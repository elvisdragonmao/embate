import { ArrowCounterClockwiseIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { shortcuts } from "../../app/shortcuts";
import { Hint } from "../../components/Hint";
import { formatOf, type Side } from "../../lib/formats";
import { clockElapsed } from "../../lib/record";
import { formatCountdown } from "../../lib/time";
import { useFlowStore } from "../../stores/flow";
import { ClockText } from "./ClockText";
import styles from "./PrepTimers.module.css";

const SIDES: Side[] = ["aff", "neg"];

/** Per-team prep countdowns, for formats that have in-round prep. */
export function PrepTimers() {
	const format = formatOf(useFlowStore(state => state.record?.format));
	if (format.prep === null) return null;
	return (
		<div className={styles.prep}>
			{SIDES.map(side => (
				<PrepClock key={side} side={side} name={format.sideNames[side]} />
			))}
		</div>
	);
}

function PrepClock({ side, name }: { side: Side; name: string }) {
	const clock = useFlowStore(state => state.record?.prep[side]);
	const fillRef = useRef<HTMLDivElement>(null);
	const [, setTick] = useState(0);
	const { duration = 1, elapsed = 0, startedAt = null } = clock ?? {};
	const running = startedAt !== null;

	// The fill drains every frame; the digits re-render once a second.
	useEffect(() => {
		if (startedAt === null) return;
		let frame = 0;
		let shown = -1;
		const tick = () => {
			const spent = clockElapsed({ elapsed, startedAt });
			if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.max(0, 1 - spent / duration)})`;
			const second = Math.floor(spent / 1000);
			if (second !== shown) {
				shown = second;
				setTick(second);
			}
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
	}, [elapsed, startedAt, duration]);

	if (!clock) return null;
	const spent = clockElapsed(clock);
	const remaining = duration - spent;
	const used = running || elapsed > 0;
	const store = useFlowStore.getState();

	return (
		<div className={styles.clock} data-side={side} data-running={running || undefined} data-over={remaining <= 0 || undefined}>
			<div ref={fillRef} className={styles.fill} style={{ transform: `scaleX(${Math.max(0, 1 - spent / duration)})` }} />
			<span className={styles.name}>{name}</span>
			<ClockText className={styles.digits} label={`${name} prep`} value={formatCountdown(remaining)} editable={!running} duration={duration} onCommit={ms => store.setPrepDuration(side, ms)} />
			<div className={styles.actions}>
				{used && !running && (
					<Hint label="Reset">
						<button type="button" className={styles.button} onClick={() => store.resetPrep(side)} aria-label={`Reset ${name} prep`}>
							<ArrowCounterClockwiseIcon size="0.875rem" weight="bold" />
						</button>
					</Hint>
				)}
				<Hint label={`${running ? "Pause" : "Start"} ${name} prep`} keys={side === "aff" ? shortcuts.prepAff : shortcuts.prepNeg}>
					<button type="button" className={styles.button} data-primary="" onClick={() => store.togglePrep(side)} aria-label={`${running ? "Pause" : "Start"} ${name} prep`}>
						{running ? <PauseIcon size="0.875rem" weight="fill" /> : <PlayIcon size="0.875rem" weight="fill" />}
					</button>
				</Hint>
			</div>
		</div>
	);
}
