import { ArrowCounterClockwiseIcon, HourglassMediumIcon, PauseIcon, PlayIcon, TimerIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { shortcuts } from "../../app/shortcuts";
import { Hint } from "../../components/Hint";
import { formatOf } from "../../lib/formats";
import { keyLabels } from "../../lib/platform";
import { formatClock, formatCountdown } from "../../lib/time";
import { useFlowStore } from "../../stores/flow";
import { elapsedOf, useTimerStore } from "../../stores/timer";
import { ClockText } from "./ClockText";
import { PrepTimers } from "./PrepTimers";
import styles from "./Timer.module.css";

const WARN_MS = 30_000;

export function Timer() {
	const { mode, duration, elapsed, startedAt, toggle, reset, setDuration, quickStart, toggleMode } = useTimerStore(useShallow(state => state));
	const quick = formatOf(useFlowStore(state => state.record?.format)).quick;
	const running = startedAt !== null;
	const barRef = useRef<HTMLDivElement>(null);
	const [, setTick] = useState(0);

	// Drive the bar every frame; re-render only when the shown second changes.
	useEffect(() => {
		if (startedAt === null) return;
		let frame = 0;
		let shown = -1;
		const tick = () => {
			const spent = elapsedOf({ elapsed, startedAt });
			if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, spent / duration)})`;
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

	const spent = elapsedOf({ elapsed, startedAt });
	const remaining = duration - spent;
	const over = remaining <= 0 && spent > 0;
	const warn = !over && remaining <= WARN_MS && spent > 0;
	const started = running || elapsed > 0;

	const display = mode === "countdown" ? formatCountdown(remaining) : formatClock(spent / 1000);

	const state = over ? "over" : warn ? "warn" : "normal";

	return (
		<section className={styles.timer} data-state={state} data-running={running || undefined}>
			<div className={styles.readout}>
				<ClockText className={styles.digits} label="Speech length" value={display} editable={!running} duration={duration} onCommit={setDuration} />
				<span className={styles.total} data-visible={started || mode === "stopwatch" || undefined}>
					/ {formatClock(duration / 1000)}
				</span>
				<Hint label={mode === "countdown" ? "Countdown" : "Stopwatch"} keys={shortcuts.timerMode}>
					<button type="button" className={styles.mode} onClick={toggleMode} aria-label={mode === "countdown" ? "Switch to stopwatch" : "Switch to countdown"}>
						{mode === "countdown" ? <HourglassMediumIcon size="1.125rem" /> : <TimerIcon size="1.125rem" />}
					</button>
				</Hint>
			</div>

			<div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.min(spent, duration)}>
				<div ref={barRef} className={styles.bar} style={{ transform: `scaleX(${Math.min(1, spent / duration)})` }} />
			</div>

			<div className={styles.controls}>
				<Hint label={running ? "Pause" : "Start"} keys={shortcuts.timerToggle}>
					<button type="button" className={styles.primary} onClick={toggle} aria-label={running ? "Pause" : "Start"}>
						{running ? <PauseIcon size="1rem" weight="fill" /> : <PlayIcon size="1rem" weight="fill" />}
					</button>
				</Hint>
				<Hint label="Reset" keys={shortcuts.timerReset}>
					<button type="button" className={styles.icon} onClick={reset} aria-label="Reset" disabled={!started}>
						<ArrowCounterClockwiseIcon size="1rem" weight="bold" />
					</button>
				</Hint>
				<div className={styles.quick}>
					{quick.map(minutes => (
						<Hint key={minutes} label={`Start ${minutes}:00`} keys={[keyLabels.alt, String(minutes)]}>
							<button type="button" className={styles.chip} data-active={duration === minutes * 60_000 || undefined} onClick={() => quickStart(minutes * 60_000)}>
								{minutes}m
							</button>
						</Hint>
					))}
				</div>
			</div>

			<PrepTimers />
		</section>
	);
}
