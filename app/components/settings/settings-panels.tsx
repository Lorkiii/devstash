import { DatabaseBackup, LockKeyhole, MonitorCog, Palette, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/app/components/ui/page-heading";
import { AppearanceSettings } from "./appearance-settings";
import { BackupSettings } from "./backup-settings";
import { SessionSettings } from "./session-settings";
import { SettingsSection } from "./settings-section";
import { VaultBehaviorSettings } from "./vault-behavior-settings";
import { VaultSecuritySettings } from "./vault-security-settings";

export function SettingsPanels() {
  return (
    <div className="space-y-8 pb-4">
      <PageHeading
        eyebrow="SETTINGS"
        title="Settings"
        description="Personalize how DevStash looks and behaves, manage vault access, and control this signed-in session."
      />

      <SettingsSection
        id="appearance-settings"
        title="Appearance"
        description="Choose a comfortable theme for every DevStash screen on this device."
        icon={Palette}
      >
        <AppearanceSettings />
      </SettingsSection>

      <SettingsSection
        id="vault-behavior-settings"
        title="Vault behavior"
        description="Control when decrypted data is removed from this browser tab."
        icon={MonitorCog}
      >
        <VaultBehaviorSettings />
      </SettingsSection>

      <SettingsSection
        id="vault-security-settings"
        title="Vault security"
        description="Change the local unlock credential or rotate the separate offline recovery path."
        icon={ShieldCheck}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <VaultSecuritySettings />
        </div>
      </SettingsSection>

      <SettingsSection
        id="backup-settings"
        title="Data and backup"
        description="Create an encrypted backup or return to the locked screen before restoring one."
        icon={DatabaseBackup}
      >
        <BackupSettings />
      </SettingsSection>

      <SettingsSection
        id="session-settings"
        title="Account session"
        description="Review the identity boundary and safely end this signed-in session."
        icon={LockKeyhole}
      >
        <SessionSettings />
      </SettingsSection>
    </div>
  );
}
