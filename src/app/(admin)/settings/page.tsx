import { ensureAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const settings = await ensureAppSettings();

  return (
    <div>
      <h1 className="font-serif text-3xl text-text">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Editorial defaults. Buffer tokens and channel IDs stay in environment
        variables.
      </p>
      <SettingsForm initial={settings} />
    </div>
  );
}
