import { execFile, type ChildProcess } from "node:child_process";
import type { EventService } from "./event-service";

interface TerminalSession {
	id: string;
	process: ChildProcess;
	scrollback: string[];
	cwd: string;
}

const MAX_SCROLLBACK_BYTES = 50 * 1024; // 50KB
const BATCH_SIZE = 4096; // 4KB
const BATCH_INTERVAL = 4; // 4ms

export class TerminalService {
	private sessions = new Map<string, TerminalSession>();

	constructor(private events: EventService) {}

	createSession(cwd: string): string {
		const id = crypto.randomUUID();
		const shell = process.env.SHELL ?? "/bin/zsh";

		const proc = execFile(shell, ["-i"], {
			cwd,
			env: { ...process.env, TERM: "xterm-256color" },
		});

		const session: TerminalSession = {
			id,
			process: proc,
			scrollback: [],
			cwd,
		};

		this.sessions.set(id, session);
		this.streamOutput(session);

		// Clean up on process exit
		proc.on("exit", () => {
			this.sessions.delete(id);
		});

		return id;
	}

	write(sessionId: string, data: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error("Terminal session not found");
		session.process.stdin?.write(data);
	}

	resize(_sessionId: string, _cols: number, _rows: number): void {
		// resize requires PTY support, no-op for basic shell sessions
	}

	kill(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;
		session.process.kill();
		this.sessions.delete(sessionId);
	}

	getScrollback(sessionId: string): string[] {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error("Terminal session not found");
		return session.scrollback;
	}

	listSessions(): Array<{ id: string; cwd: string }> {
		return Array.from(this.sessions.values()).map((s) => ({
			id: s.id,
			cwd: s.cwd,
		}));
	}

	private streamOutput(session: TerminalSession): void {
		let batch = "";
		let timer: ReturnType<typeof setTimeout> | null = null;

		const flush = () => {
			if (batch) {
				session.scrollback.push(batch);
				this.trimScrollback(session);
				this.events.emit("terminal:output", {
					sessionId: session.id,
					data: batch,
				});
				batch = "";
			}
			timer = null;
		};

		const onData = (chunk: Buffer) => {
			batch += chunk.toString("utf-8");
			if (batch.length >= BATCH_SIZE) {
				flush();
			} else if (!timer) {
				timer = setTimeout(flush, BATCH_INTERVAL);
			}
		};

		session.process.stdout?.on("data", onData);
		session.process.stderr?.on("data", onData);

		session.process.on("exit", () => {
			if (timer) clearTimeout(timer);
			flush();
		});
	}

	private trimScrollback(session: TerminalSession): void {
		let totalLen = session.scrollback.reduce((sum, s) => sum + s.length, 0);
		while (totalLen > MAX_SCROLLBACK_BYTES && session.scrollback.length > 0) {
			const removed = session.scrollback.shift();
			totalLen -= removed?.length ?? 0;
		}
	}

	killAll(): void {
		for (const [id] of this.sessions) {
			this.kill(id);
		}
	}
}
