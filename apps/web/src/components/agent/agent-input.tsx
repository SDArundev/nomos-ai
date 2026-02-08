import { Loader2, Send, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AgentInputProps {
	onSend: (content: string) => void;
	onStop?: () => void;
	isStreaming: boolean;
	disabled?: boolean;
}

export function AgentInput({
	onSend,
	onStop,
	isStreaming,
	disabled,
}: AgentInputProps) {
	const [input, setInput] = useState("");

	const isDisabled = disabled || isStreaming;

	const handleSubmit = () => {
		const trimmed = input.trim();
		if (!trimmed || isDisabled) return;
		onSend(trimmed);
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="border-t p-4">
			<div className="flex gap-2">
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Send a message..."
					className="max-h-32 min-h-[44px] resize-none"
					disabled={isDisabled}
					rows={1}
				/>
				{isStreaming ? (
					<Button
						variant="destructive"
						size="icon"
						onClick={onStop}
						className="shrink-0"
					>
						<Square className="size-4" />
					</Button>
				) : (
					<Button
						size="icon"
						onClick={handleSubmit}
						disabled={!input.trim() || isDisabled}
						className="shrink-0"
					>
						{disabled ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Send className="size-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
