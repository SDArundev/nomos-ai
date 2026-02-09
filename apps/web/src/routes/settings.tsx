import { createFileRoute } from "@tanstack/react-router";
import { AutoModeDashboard } from "@/components/auto-mode/auto-mode-dashboard";
import { AutoModeTab } from "@/components/settings/auto-mode-tab";
import { GeneralTab } from "@/components/settings/general-tab";
import { IntegrationTab } from "@/components/settings/integration-tab";
import { ModelTab } from "@/components/settings/model-tab";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { ShortcutsTab } from "@/components/settings/shortcuts-tab";
import { TerminalTab } from "@/components/settings/terminal-tab";
import { useSettings } from "@/hooks/use-settings";
import { requireAuth } from "@/lib/auth-guard";
import { useAppStore } from "@/store";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
	beforeLoad: requireAuth,
});

const tabs = [
	{ id: "general", label: "General" },
	{ id: "model", label: "Model" },
	{ id: "auto-mode", label: "Auto-Mode" },
	{ id: "terminal", label: "Terminal" },
	{ id: "shortcuts", label: "Shortcuts" },
	{ id: "integrations", label: "Integrations" },
	{ id: "dashboard", label: "Dashboard" },
];

function SettingsPage() {
	const projectId = useAppStore((s) => s.selectedProjectId);
	const { settings, updateSetting } = useSettings(projectId ?? undefined);

	return (
		<div className="h-full">
			<SettingsLayout tabs={tabs} defaultTab="general">
				{{
					general: <GeneralTab settings={settings} onUpdate={updateSetting} />,
					model: <ModelTab settings={settings} onUpdate={updateSetting} />,
					"auto-mode": (
						<AutoModeTab settings={settings} onUpdate={updateSetting} />
					),
					terminal: (
						<TerminalTab settings={settings} onUpdate={updateSetting} />
					),
					shortcuts: (
						<ShortcutsTab settings={settings} onUpdate={updateSetting} />
					),
					integrations: <IntegrationTab />,
					dashboard: <AutoModeDashboard />,
				}}
			</SettingsLayout>
		</div>
	);
}
