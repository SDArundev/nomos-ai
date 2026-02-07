import { useCallback, useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/use-terminal";

interface TerminalViewProps {
	sessionId: string | null;
}

export function TerminalView({ sessionId }: TerminalViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const cleanupRef = useRef<(() => void) | null>(null);
	const { initTerminal } = useTerminal({ sessionId });

	const setupTerminal = useCallback(async () => {
		if (!containerRef.current || !sessionId) return;

		cleanupRef.current?.();
		const cleanup = await initTerminal(containerRef.current);
		cleanupRef.current = cleanup ?? null;
	}, [sessionId, initTerminal]);

	useEffect(() => {
		setupTerminal();
		return () => {
			cleanupRef.current?.();
		};
	}, [setupTerminal]);

	if (!sessionId) {
		return (
			<div className="flex h-full items-center justify-center bg-[#1a1b26]">
				<p className="text-neutral-500">No terminal session selected</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="h-full w-full"
			style={{ backgroundColor: "#1a1b26" }}
		/>
	);
}
