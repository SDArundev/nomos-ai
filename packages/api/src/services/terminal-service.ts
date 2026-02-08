import * as pty from "node-pty";
import type { EventService } from "./event-service";

interface TerminalSession {
	id: string;
	process: pty.IPty;
	scrollback: string[];
	cwd: string;
	userId: string;
}

const MAX_SCROLLBACK_BYTES = 50 * 1024; // 50KB
const BATCH_SIZE = 4096; // 4KB
const BATCH_INTERVAL = 4; // 4ms

export class TerminalService {
	private sessions = new Map<string, TerminalSession>();

	constructor(private events: EventService) {}

	createSession(cwd: string, userId: string): string {
		const id = crypto.randomUUID();
		const shell = process.env.SHELL ?? "/bin/zsh";

		const proc = pty.spawn(shell, [], {
			name: "xterm-256color",
			cwd,
			env: process.env as Record<string, string>,
			cols: 80,
			rows: 24,
		});

		const session: TerminalSession = {
			id,
			process: proc,
			scrollback: [],
			cwd,
			userId,
		};

		this.sessions.set(id, session);
		this.streamOutput(session);

		// Clean up on process exit
		proc.onExit(() => {
			this.sessions.delete(id);
		});

		return id;
	}

	write(sessionId: string, data: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error("Terminal session not found");
		session.process.write(data);
	}

	resize(sessionId: string, cols: number, rows: number): void {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error("Terminal session not found");
		session.process.resize(cols, rows);
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

	getSession(sessionId: string): { id: string; cwd: string; userId: string } {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error("Terminal session not found");
		return {
			id: session.id,
			cwd: session.cwd,
			userId: session.userId,
		};
	}

	listSessions(): Array<{ id: string; cwd: string; userId: string }> {
		return Array.from(this.sessions.values()).map((s) => ({
			id: s.id,
			cwd: s.cwd,
			userId: s.userId,
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
					userId: session.userId,
				});
				batch = "";
			}
			timer = null;
		};

		session.process.onData((data: string) => {
			batch += data;
			if (batch.length >= BATCH_SIZE) {
				flush();
			} else if (!timer) {
				timer = setTimeout(flush, BATCH_INTERVAL);
			}
		});

		session.process.onExit(() => {
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
