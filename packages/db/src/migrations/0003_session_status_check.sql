ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_status_check" CHECK (status IN ('pending', 'running', 'completed', 'failed'));
