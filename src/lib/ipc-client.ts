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

export interface NoteFolder {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content_markdown?: string;
  folder_id?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  tags?: string;
  due_date?: string;
  created_at: string;
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

  // Notes Commands
  createFolder: (name: string, parentId?: string) =>
    invoke<NoteFolder>("create_folder", { name, parentId }),
  getFolders: () =>
    invoke<NoteFolder[]>("get_folders"),
  updateFolder: (id: string, name: string, parentId?: string) =>
    invoke<void>("update_folder", { id, name, parentId }),
  deleteFolder: (id: string) =>
    invoke<void>("delete_folder", { id }),

  createNote: (title: string, contentMarkdown?: string, folderId?: string, isFavorite: boolean = false) =>
    invoke<Note>("create_note", { title, contentMarkdown, folderId, isFavorite }),
  getNotes: () =>
    invoke<Note[]>("get_notes"),
  updateNote: (id: string, title: string, contentMarkdown?: string, folderId?: string, isFavorite: boolean = false) =>
    invoke<void>("update_note", { id, title, contentMarkdown, folderId, isFavorite }),
  deleteNote: (id: string) =>
    invoke<void>("delete_note", { id }),
  searchNotes: (query: string) =>
    invoke<Note[]>("search_notes", { query }),

  // Tasks Commands
  createTask: (title: string, description?: string, status: string = "To Do", priority: string = "Medium", tags?: string, dueDate?: string) =>
    invoke<Task>("create_task", { title, description, status, priority, tags, dueDate }),
  getTasks: () =>
    invoke<Task[]>("get_tasks"),
  updateTask: (id: string, title: string, description?: string, status: string = "To Do", priority: string = "Medium", tags?: string, dueDate?: string) =>
    invoke<void>("update_task", { id, title, description, status, priority, tags, dueDate }),
  deleteTask: (id: string) =>
    invoke<void>("delete_task", { id }),
};
