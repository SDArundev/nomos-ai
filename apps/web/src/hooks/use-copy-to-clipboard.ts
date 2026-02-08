import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UseCopyToClipboardReturn {
	copy: (text: string) => Promise<void>;
	copied: boolean;
	error: Error | null;
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const copy = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setError(null);
			toast.success("Copied to clipboard");

			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Reset copied state after 2 seconds
			timeoutRef.current = setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to copy");
			setError(error);
			setCopied(false);
			toast.error("Failed to copy to clipboard");
		}
	}, []);

	return { copy, copied, error };
}
