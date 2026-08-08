import React, { useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';

export const SettingsModule: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (newPassword.length < 12) {
      setStatusMsg({ text: 'New password must be at least 12 characters.', type: 'error' });
      return;
    }
    
    // As decided in docs/decisions/phase-5.md, warn the user heavily
    const confirmed = window.confirm(
      "WARNING: Your old backup files (.enc) will NOT work with your new password. You must create a new backup immediately after changing your password.\n\nProceed?"
    );
    if (!confirmed) return;

    try {
      await ipcClient.changeMasterPassword(oldPassword, newPassword);
      setStatusMsg({ text: 'Master password changed successfully. PLEASE CREATE A NEW BACKUP NOW.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ text: `Failed to change password: ${err}`, type: 'error' });
    }
  };

  const handleExportBackup = async () => {
    if (!backupPath || !backupPassword) {
      setStatusMsg({ text: 'Path and current password are required for backup.', type: 'error' });
      return;
    }
    try {
      await ipcClient.exportBackup(backupPath, backupPassword);
      setStatusMsg({ text: `Backup successfully exported to ${backupPath}`, type: 'success' });
      setBackupPath('');
      setBackupPassword('');
    } catch (err: any) {
      setStatusMsg({ text: `Backup export failed: ${err}`, type: 'error' });
    }
  };

  const handleImportBackup = async () => {
    if (!restorePath || !restorePassword) {
      setStatusMsg({ text: 'Path and backup password are required for restore.', type: 'error' });
      return;
    }
    const confirmed = window.confirm(
      "WARNING: Restoring a backup will overwrite your current live vault. Any changes made since the backup will be lost. Are you absolutely sure?"
    );
    if (!confirmed) return;

    try {
      await ipcClient.importBackup(restorePath, restorePassword);
      setStatusMsg({ text: `Backup successfully restored from ${restorePath}. Restarting the app is recommended.`, type: 'success' });
      setRestorePath('');
      setRestorePassword('');
    } catch (err: any) {
      setStatusMsg({ text: `Backup restore failed: ${err}`, type: 'error' });
    }
  };

  return (
    <div className="flex h-full w-full bg-obsidian text-bone p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 w-full">
        <h1 className="text-3xl font-medium tracking-wide">Settings & Security</h1>

        {statusMsg.text && (
          <div className={`p-4 rounded border ${statusMsg.type === 'error' ? 'border-red-900 bg-red-900/20 text-red-400' : 'border-green-900 bg-green-900/20 text-green-400'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Security Model Disclosure */}
        <section className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-medium mb-4">Security Model & Threat Profile</h2>
          <div className="text-sm text-text-secondary space-y-4">
            <p>
              <strong className="text-bone">What Secret DOES protect you against:</strong><br />
              - <em>Stolen Laptop (at rest):</em> The SQLite database is encrypted with SQLCipher (AES-256-GCM). Without your Master Password, the attacker has a random blob of bytes.<br />
              - <em>Cloud Breaches:</em> Secret is entirely offline. There are no cloud sync servers to breach. Your data stays on your drive.<br />
              - <em>Malicious Import Files:</em> The CSV engine forces strict schema anonymization. Malicious headers (e.g. SQL Injection payloads) are sanitized or dropped before they touch SQLite.
            </p>
            <p>
              <strong className="text-bone">What Secret DOES NOT protect you against:</strong><br />
              - <em>Active Malware / Keyloggers:</em> If your machine is actively compromised by a keylogger or screen-reader while you are typing your master password or viewing credentials, the vault is exposed.<br />
              - <em>Stolen Laptop (unlocked state):</em> If your laptop is stolen while Secret is unlocked and running, the data is accessible. Always lock your PC and Vault when stepping away.
            </p>
          </div>
        </section>

        {/* Backup & Restore */}
        <section className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-medium mb-4">Backup Engine</h2>
          <p className="text-sm text-text-secondary mb-6">
            Backups are exported as `.enc` files using ChaCha20-Poly1305 authenticated encryption. They are completely independent of the live vault and are safe to store on cloud drives.
          </p>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium">Export Backup</h3>
              <input type="text" placeholder="Absolute path (e.g. C:\backup.enc)" value={backupPath} onChange={e => setBackupPath(e.target.value)}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-bone focus:outline-none" />
              <input type="password" placeholder="Current Master Password" value={backupPassword} onChange={e => setBackupPassword(e.target.value)}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-bone focus:outline-none" />
              <button onClick={handleExportBackup} className="w-full bg-surface-raised border border-subtle hover:bg-subtle text-bone py-2 rounded text-sm transition-colors">
                Export .enc
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-red-400">Restore Backup</h3>
              <input type="text" placeholder="Absolute path to .enc" value={restorePath} onChange={e => setRestorePath(e.target.value)}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-red-900 focus:outline-none" />
              <input type="password" placeholder="Backup Password" value={restorePassword} onChange={e => setRestorePassword(e.target.value)}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-red-900 focus:outline-none" />
              <button onClick={handleImportBackup} className="w-full bg-red-900/20 border border-red-900 hover:bg-red-900/40 text-red-400 py-2 rounded text-sm transition-colors">
                Verify & Restore
              </button>
            </div>
          </div>
        </section>

        {/* Change Master Password */}
        <section className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-medium mb-4 text-red-400">Change Master Password</h2>
          <p className="text-sm text-text-secondary mb-6">
            This will immediately rekey the active vault. <span className="text-bone font-medium">All existing backup files will be invalidated</span> because they are encrypted with the old password.
          </p>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Current Password</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-red-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">New Password (min 12 chars)</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={12}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-red-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12}
                className="w-full bg-obsidian border border-subtle rounded px-3 py-2 text-sm focus:border-red-900 focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-red-900/20 border border-red-900 hover:bg-red-900/40 text-red-400 py-2 rounded font-medium transition-colors">
              Rekey Vault
            </button>
          </form>
        </section>

      </div>
    </div>
  );
};
