export function createId(): string {
	return crypto.randomUUID();
}

export const createEventId = () => `evt_${createId()}`;
export const createMessageId = () => `msg_${createId()}`;
export const createNotificationId = () => `ntf_${createId()}`;
export const createSettingId = () => `set_${createId()}`;
export const createWorktreeId = () => `wt_${createId()}`;
