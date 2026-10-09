import { Menu } from "@base-ui/react/menu";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { isCross, isFlipped } from "../../lib/columns";
import { FORMATS, formatOf, type FormatId } from "../../lib/formats";
import { useFlowStore } from "../../stores/flow";
import styles from "./FormatMenu.module.css";

/** The round's format, under the title; picking another one renames the speech columns. */
export function FormatMenu() {
	const format = formatOf(useFlowStore(state => state.record?.format));
	const cross = useFlowStore(state => state.record?.columns.some(isCross) ?? false);
	const flipped = useFlowStore(state => (state.record ? isFlipped(format, state.record.columns) : false));

	return (
		<div className={styles.row}>
			<Picker />
			{/* The toggles wrap together under the name when the sidebar is narrow. */}
			<div className={styles.toggles}>
				{format.crossEx && (
					<button type="button" className={styles.toggle} aria-pressed={cross} onClick={() => useFlowStore.getState().setCrossEx(!cross)}>
						{cross ? "with" : "no"} {format.crossEx.name}
					</button>
				)}
				{format.eitherFirst && (
					<button type="button" className={styles.toggle} aria-pressed={flipped} onClick={() => useFlowStore.getState().setFlipped(!flipped)}>
						{format.sideNames[flipped ? "neg" : "aff"]} first
					</button>
				)}
			</div>
		</div>
	);
}

function Picker() {
	const format = formatOf(useFlowStore(state => state.record?.format));

	return (
		<Menu.Root>
			<Menu.Trigger className={styles.trigger}>
				{format.name}
				<CaretDownIcon size="0.75rem" weight="bold" className={styles.caret} />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner side="bottom" align="start" sideOffset={6} className={styles.positioner}>
					<Menu.Popup className={styles.popup}>
						<Menu.RadioGroup value={format.id} onValueChange={value => useFlowStore.getState().setFormat(value as FormatId)}>
							{FORMATS.map(option => (
								<Menu.RadioItem key={option.id} value={option.id} closeOnClick className={styles.item}>
									<span className={styles.name}>{option.name}</span>
									<Menu.RadioItemIndicator className={styles.check}>
										<CheckIcon size="0.875rem" weight="bold" />
									</Menu.RadioItemIndicator>
								</Menu.RadioItem>
							))}
						</Menu.RadioGroup>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
