import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
	showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null, showDetails: false };
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("[ErrorBoundary]", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
					<div className="text-4xl text-destructive">Something went wrong</div>
					<p className="text-muted-foreground text-sm">
						An unexpected error occurred. Try reloading the page.
					</p>
					<div className="flex gap-2">
						<Button
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							Try Again
						</Button>
						<Button variant="outline" onClick={() => window.location.reload()}>
							Reload Page
						</Button>
					</div>
					{this.state.error && (
						<div className="mt-4 w-full max-w-xl">
							<button
								type="button"
								className="text-muted-foreground text-xs underline hover:text-foreground"
								onClick={() =>
									this.setState((s) => ({
										showDetails: !s.showDetails,
									}))
								}
							>
								{this.state.showDetails ? "Hide" : "Show"} error details
							</button>
							{this.state.showDetails && (
								<pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
									{this.state.error.message}
									{"\n"}
									{this.state.error.stack}
								</pre>
							)}
						</div>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
