import React, { useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';
import { Plus } from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // UI State for expanding settings
  const [activeForm, setActiveForm] = useState<string | null>(null);

  // Mock settings state for toggles
  const [requirePassword, setRequirePassword] = useState(true);
  const [activityLedger, setActivityLedger] = useState(true);

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
      setActiveForm(null);
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
      setActiveForm(null);
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
      setActiveForm(null);
    } catch (err: any) {
      setStatusMsg({ text: `Backup restore failed: ${err}`, type: 'error' });
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${checked ? 'bg-bone' : 'bg-surface-raised border border-border-subtle'}`}
    >
      <div className={`w-4 h-4 rounded-full transition-transform ${checked ? 'bg-obsidian translate-x-5' : 'bg-text-secondary translate-x-0'}`} />
    </button>
  );

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-12 px-12 relative pb-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Vault Preferences</h3>
            <h1 className="text-4xl font-bold text-text-primary tracking-tight">Settings</h1>
          </div>
          <button className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
            <Plus size={18} />
            <span>Export backup</span>
          </button>
        </div>

        {statusMsg.text && (
          <div className={`p-4 rounded-lg mb-8 text-sm ${statusMsg.type === 'error' ? 'border border-red-900/50 bg-red-900/10 text-red-400' : 'border border-green-900/50 bg-green-900/10 text-green-400'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* Settings List */}
        <div className="flex flex-col max-w-3xl space-y-12">
          
          {/* Session Section */}
          <section>
            <h2 className="text-sm font-bold text-text-primary mb-6 tracking-wide">Session</h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Auto-lock</div>
                  <div className="text-sm text-text-secondary">Lock your vault after inactivity.</div>
                </div>
                <select className="bg-obsidian border border-border-subtle text-text-primary text-sm rounded-lg px-4 py-2.5 min-w-[140px] focus:outline-none focus:border-bone cursor-pointer appearance-none">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>Never</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Clear clipboard</div>
                  <div className="text-sm text-text-secondary">Remove copied secrets automatically.</div>
                </div>
                <select className="bg-obsidian border border-border-subtle text-text-primary text-sm rounded-lg px-4 py-2.5 min-w-[140px] focus:outline-none focus:border-bone cursor-pointer appearance-none">
                  <option>30 seconds</option>
                  <option>1 minute</option>
                  <option>2 minutes</option>
                  <option>Never</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-border-subtle" />

          {/* Backup Section */}
          <section>
            <h2 className="text-sm font-bold text-text-primary mb-6 tracking-wide">Backup</h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Encrypted exports</div>
                  <div className="text-sm text-text-secondary">Keep an offline recovery copy of your vault.</div>
                </div>
                <button 
                  onClick={() => setActiveForm(activeForm === 'export' ? null : 'export')}
                  className="border border-border-subtle text-bone hover:bg-surface-raised transition-colors text-sm rounded-lg px-5 py-2.5"
                >
                  Export now
                </button>
              </div>

              {activeForm === 'export' && (
                <div className="bg-surface-raised border border-border-subtle rounded-lg p-5 space-y-4">
                  <input type="text" placeholder="Absolute path (e.g. C:\backup.enc)" value={backupPath} onChange={e => setBackupPath(e.target.value)}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-bone focus:outline-none" />
                  <input type="password" placeholder="Current Master Password" value={backupPassword} onChange={e => setBackupPassword(e.target.value)}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-bone focus:outline-none" />
                  <button onClick={handleExportBackup} className="bg-bone text-obsidian font-medium py-2 px-4 rounded-lg text-sm w-full">
                    Confirm Export
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Import encrypted archive</div>
                  <div className="text-sm text-text-secondary">Merge a verified Secret backup.</div>
                </div>
                <button 
                  onClick={() => setActiveForm(activeForm === 'import' ? null : 'import')}
                  className="border border-border-subtle text-bone hover:bg-surface-raised transition-colors text-sm rounded-lg px-5 py-2.5"
                >
                  Import
                </button>
              </div>

              {activeForm === 'import' && (
                <div className="bg-surface-raised border border-border-subtle rounded-lg p-5 space-y-4">
                  <input type="text" placeholder="Absolute path to .enc" value={restorePath} onChange={e => setRestorePath(e.target.value)}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-bone focus:outline-none" />
                  <input type="password" placeholder="Backup Password" value={restorePassword} onChange={e => setRestorePassword(e.target.value)}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-bone focus:outline-none" />
                  <button onClick={handleImportBackup} className="bg-red-500 text-white font-medium py-2 px-4 rounded-lg text-sm w-full">
                    Verify & Restore
                  </button>
                </div>
              )}
            </div>
          </section>

          <hr className="border-border-subtle" />

          {/* Security Model Section */}
          <section>
            <h2 className="text-sm font-bold text-text-primary mb-6 tracking-wide">Security model</h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Require master password on launch</div>
                  <div className="text-sm text-text-secondary">Your vault stays encrypted until you unlock it.</div>
                </div>
                <Toggle checked={requirePassword} onChange={() => setRequirePassword(!requirePassword)} />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-text-primary mb-1">Activity ledger</div>
                  <div className="text-sm text-text-secondary">Maintain a local, tamper-evident history.</div>
                </div>
                <Toggle checked={activityLedger} onChange={() => setActivityLedger(!activityLedger)} />
              </div>
            </div>
          </section>

          <hr className="border-border-subtle" />
          
          {/* Change Password Section (Hidden by default, standard UX practice) */}
          <section>
             <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-red-400 mb-1">Change master password</div>
                  <div className="text-sm text-text-secondary">Invalidates all previous backup archives.</div>
                </div>
                <button 
                  onClick={() => setActiveForm(activeForm === 'password' ? null : 'password')}
                  className="border border-red-900/50 text-red-400 hover:bg-red-900/10 transition-colors text-sm rounded-lg px-5 py-2.5"
                >
                  Rekey vault
                </button>
              </div>

              {activeForm === 'password' && (
                <form onSubmit={handleChangePassword} className="bg-surface-raised border border-red-900/30 rounded-lg p-5 mt-6 space-y-4">
                  <input type="password" placeholder="Current Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none" />
                  <input type="password" placeholder="New Password (min 12 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={12}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none" />
                  <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12}
                    className="w-full bg-obsidian border border-border-subtle rounded-lg px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none" />
                  <button type="submit" className="bg-red-500 text-white font-medium py-2 px-4 rounded-lg text-sm w-full">
                    Confirm Rekey
                  </button>
                </form>
              )}
          </section>

        </div>
      </div>
    </div>
  );
};
