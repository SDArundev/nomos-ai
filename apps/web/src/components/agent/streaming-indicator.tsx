export function StreamingIndicator() {
	return (
		<div className="flex items-center gap-2 px-4 py-2 text-muted-foreground text-sm">
			<div className="flex gap-1">
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
			</div>
			<span>Agent is thinking...</span>
		</div>
	);
}
