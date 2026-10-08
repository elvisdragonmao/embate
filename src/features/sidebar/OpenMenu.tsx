import { Popover } from "@base-ui/react/popover";
import { CheckIcon, PlusIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { createId } from "../../lib/id";
import { createRecord, normalizeRecord } from "../../lib/record";
import { deleteRecord, listRecords, saveRecord } from "../../lib/storage";
import { formatDate } from "../../lib/time";
import { flushSave, useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import styles from "./OpenMenu.module.css";

const recordsKey = ["records"];

export function OpenMenu({ children }: { children: ReactElement<Record<string, unknown>> }) {
	const open = useUIStore(state => state.openMenuOpen);
	const setOpen = useUIStore(state => state.setOpenMenuOpen);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger render={children} />
			<Popover.Portal>
				<Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={12} className={styles.positioner}>
					<Popover.Popup className={styles.popup} aria-label="Open a flow">
						<OpenMenuContent onDone={() => setOpen(false)} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

function OpenMenuContent({ onDone }: { onDone: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const currentId = useFlowStore(state => state.record?.id);
	const fileRef = useRef<HTMLInputElement>(null);
	const [confirming, setConfirming] = useState<string | null>(null);

	const records = useQuery({
		queryKey: recordsKey,
		queryFn: () => {
			flushSave();
			return listRecords();
		}
	});

	const remove = useMutation({
		mutationFn: async (id: string) => deleteRecord(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: recordsKey })
	});

	const upload = useMutation({
		mutationFn: async (file: File) => {
			const record = normalizeRecord(JSON.parse(await file.text()));
			if (!record) throw new Error("invalid");
			const imported = { ...record, id: createId() };
			if (!saveRecord(imported)) throw new Error("storage");
			return imported;
		},
		onSuccess: record => {
			queryClient.invalidateQueries({ queryKey: recordsKey });
			navigate(`/f/${record.id}`);
			onDone();
		}
	});

	useEffect(() => {
		if (!confirming) return;
		const timer = setTimeout(() => setConfirming(null), 2500);
		return () => clearTimeout(timer);
	}, [confirming]);

	const openRecord = (id: string) => {
		if (id !== currentId) navigate(`/f/${id}`);
		onDone();
	};

	const createNew = () => {
		// A judge usually flows a whole day in one format.
		const record = createRecord(useFlowStore.getState().record?.format);
		saveRecord(record);
		queryClient.invalidateQueries({ queryKey: recordsKey });
		navigate(`/f/${record.id}`);
		onDone();
	};

	return (
		<>
			<div className={styles.toolbar}>
				<button type="button" className={styles.tool} onClick={createNew}>
					<PlusIcon size="1rem" weight="bold" />
					New
				</button>
				<button type="button" className={styles.tool} onClick={() => fileRef.current?.click()}>
					<UploadSimpleIcon size="1rem" weight="bold" />
					Upload
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					hidden
					onChange={event => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) upload.mutate(file);
					}}
				/>
			</div>

			{upload.isError && <p className={styles.error}>{upload.error.message === "storage" ? "Browser storage is full." : "That file isn't an embate flow."}</p>}

			<ul className={styles.list}>
				{records.data?.map(record => {
					const current = record.id === currentId;
					return (
						<li key={record.id} className={styles.row}>
							<button type="button" className={styles.item} data-current={current || undefined} onClick={() => openRecord(record.id)}>
								<span className={styles.name} data-untitled={!record.title || undefined}>
									{record.title || "Untitled"}
								</span>
								<span className={styles.date}>{formatDate(record.updatedAt)}</span>
								{current && <CheckIcon size="0.875rem" weight="bold" className={styles.check} />}
							</button>
							{!current && (
								<button
									type="button"
									className={styles.remove}
									data-confirming={confirming === record.id || undefined}
									aria-label={confirming === record.id ? "Confirm delete" : "Delete"}
									onClick={() => {
										if (confirming === record.id) {
											remove.mutate(record.id);
											setConfirming(null);
										} else setConfirming(record.id);
									}}
								>
									<TrashIcon size="0.875rem" weight={confirming === record.id ? "fill" : "regular"} />
								</button>
							)}
						</li>
					);
				})}
			</ul>
		</>
	);
}
