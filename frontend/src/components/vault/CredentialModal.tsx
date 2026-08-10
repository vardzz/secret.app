import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, Trash2, RefreshCw } from 'lucide-react';
import { ipcClient, VaultCredential } from '../../lib/ipc-client';
import { generatePassword } from '../../lib/password-gen';
import { calculateEntropy, getStrengthLabel } from '../../lib/entropy';

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingCred?: VaultCredential;
}

export function CredentialModal({ isOpen, onClose, onSaved, existingCred }: CredentialModalProps) {
  const [accountName, setAccountName] = useState("");
  const [usernameEmail, setUsernameEmail] = useState("");
  const [password, setPassword] = useState("");
  const [providerUrl, setProviderUrl] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generator state
  const [genLength, setGenLength] = useState(24);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genNoAmbiguous, setGenNoAmbiguous] = useState(true);
  
  useEffect(() => {
    if (isOpen) {
      if (existingCred) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccountName(existingCred.account_name);
        setUsernameEmail(existingCred.username_email);
        setPassword(existingCred.encrypted_password);
        setProviderUrl(existingCred.provider_url || "");
        setIsFavorite(existingCred.is_favorite);
      } else {
        setAccountName("");
        setUsernameEmail("");
        setPassword("");
        setProviderUrl("");
        setIsFavorite(false);
      }
      setShowPassword(false);
      setIsGeneratorOpen(false);
      setError(null);
    }
  }, [isOpen, existingCred]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      if (!accountName || !usernameEmail || !password) {
        setError("Account name, username, and password are required");
        return;
      }
      
      if (existingCred) {
        await ipcClient.updateCredential(
          existingCred.id,
          accountName,
          usernameEmail,
          password,
          providerUrl || undefined,
          isFavorite
        );
      } else {
        await ipcClient.createCredential(
          accountName,
          usernameEmail,
          password,
          providerUrl || undefined
        );
      }
      
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!existingCred) return;
    if (confirm("Are you sure you want to delete this credential? This action cannot be undone.")) {
      try {
        await ipcClient.deleteCredential(existingCred.id);
        onSaved();
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  };

  const handleGenerate = () => {
    try {
      const rules = {
        length: genLength,
        uppercase: genUpper,
        lowercase: genLower,
        digits: genDigits,
        symbols: genSymbols,
        excludeAmbiguous: genNoAmbiguous
      };
      
      const newPassword = generatePassword(rules);
      setPassword(newPassword);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Calculate entropy for the generated password
  const currentRules = { length: genLength, uppercase: genUpper, lowercase: genLower, digits: genDigits, symbols: genSymbols, excludeAmbiguous: genNoAmbiguous };
  const entropy = calculateEntropy(currentRules);
  const strength = getStrengthLabel(entropy);
  
  // Progress bar width (max out at 120 bits)
  const strengthWidth = Math.min((entropy / 120) * 100, 100);
  const strengthColor = 
    strength === "Weak" ? "bg-red-500" :
    strength === "Fair" ? "bg-yellow-500" :
    strength === "Strong" ? "bg-green-500" : "bg-emerald-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-base border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border-subtle shrink-0">
          <h2 className="text-xl font-bold">{existingCred ? "Edit Item" : "New Item"}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="w-full bg-surface-raised border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-border-default transition-colors"
              placeholder="e.g. Github, Personal Bank"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">Username or Email</label>
            <input
              type="text"
              value={usernameEmail}
              onChange={e => setUsernameEmail(e.target.value)}
              className="w-full bg-surface-raised border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-border-default transition-colors"
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-text-secondary">Password</label>
              <button 
                onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
                className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} />
                Generator
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="off"
                className="w-full bg-surface-raised border border-border-subtle rounded-xl px-4 py-3 pr-12 text-text-primary focus:outline-none focus:border-border-default transition-colors font-mono"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isGeneratorOpen && (
            <div className="bg-surface-raised p-4 rounded-xl border border-border-subtle space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Length: {genLength}</span>
                <input 
                  type="range" min="8" max="64" value={genLength} 
                  onChange={e => setGenLength(parseInt(e.target.value))}
                  className="w-1/2 accent-accent-solid"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genUpper} onChange={e => setGenUpper(e.target.checked)} className="accent-accent-solid" />
                  <span>A-Z</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genLower} onChange={e => setGenLower(e.target.checked)} className="accent-accent-solid" />
                  <span>a-z</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genDigits} onChange={e => setGenDigits(e.target.checked)} className="accent-accent-solid" />
                  <span>0-9</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={genSymbols} onChange={e => setGenSymbols(e.target.checked)} className="accent-accent-solid" />
                  <span>!@#$</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer col-span-2 text-text-secondary">
                  <input type="checkbox" checked={genNoAmbiguous} onChange={e => setGenNoAmbiguous(e.target.checked)} className="accent-accent-solid" />
                  <span>Exclude ambiguous (1, l, I, 0, O)</span>
                </label>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Strength: {strength}</span>
                  <span>{Math.round(entropy)} bits</span>
                </div>
                <div className="h-1.5 w-full bg-surface-base rounded-full overflow-hidden">
                  <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strengthWidth}%` }} />
                </div>
              </div>
              
              <button
                onClick={handleGenerate}
                className="w-full py-2 bg-surface-base border border-border-default rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Generate Password
              </button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">URL</label>
            <input
              type="text"
              value={providerUrl}
              onChange={e => setProviderUrl(e.target.value)}
              className="w-full bg-surface-raised border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-border-default transition-colors"
              placeholder="https://github.com"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isFavorite} 
              onChange={e => setIsFavorite(e.target.checked)}
              className="w-5 h-5 rounded border-border-subtle bg-surface-raised accent-accent-solid"
            />
            <span className="font-medium">Mark as favorite</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-subtle bg-surface-raised flex justify-between shrink-0">
          {existingCred ? (
            <button 
              onClick={handleDelete}
              className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              <span className="inline">Delete</span>
            </button>
          ) : <div />}
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-border-subtle rounded-lg font-medium hover:bg-surface-raised-hover transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-bone text-obsidian rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
