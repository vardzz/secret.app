import { invoke } from "@tauri-apps/api/core";

export interface VaultCredential {
  id: string;
  account_name: string;
  username_email: string;
  encrypted_password: string;
  provider_url?: string;
  icon_svg_or_path?: string;
  tags?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const ipcClient = {
  // Auth Commands
  setupMasterPassword: (password: string) => invoke<void>("setup_master_password", { password }),
  unlock: (password: string) => invoke<void>("unlock", { password }),
  lock: () => invoke<void>("lock"),
  getAuthState: () => invoke<boolean>("get_auth_state"),
  needsSetup: () => invoke<boolean>("needs_setup"),

  // Vault Commands
  createCredential: (accountName: string, usernameEmail: string, encryptedPassword: string, providerUrl?: string) => 
    invoke<VaultCredential>("create_credential", { accountName, usernameEmail, encryptedPassword, providerUrl }),
    
  getCredentials: () => 
    invoke<VaultCredential[]>("get_credentials"),
    
  updateCredential: (id: string, accountName: string, usernameEmail: string, encryptedPassword: string, providerUrl: string | undefined, isFavorite: boolean) => 
    invoke<VaultCredential>("update_credential", { id, accountName, usernameEmail, encryptedPassword, providerUrl, isFavorite }),
    
  deleteCredential: (id: string) => 
    invoke<void>("delete_credential", { id }),
    
  copyToClipboard: (text: string) => 
    invoke<void>("copy_to_clipboard", { text }),
};
