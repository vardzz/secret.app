import React, { useState, useEffect } from 'react';
import { ipcClient, Note, NoteFolder } from '../../lib/ipc-client';
import { MarkdownEditor } from './MarkdownEditor';

export const NotesModule: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const data = searchQuery
        ? await ipcClient.searchNotes(searchQuery)
        : await ipcClient.getNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const fetchFolders = async () => {
    try {
      const data = await ipcClient.getFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [searchQuery]);

  const handleCreateNote = async () => {
    try {
      const newNote = await ipcClient.createNote("Untitled Note", "", activeFolderId || undefined, false);
      setNotes([newNote, ...notes]);
      setActiveNote(newNote);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleUpdateNote = async (content: string) => {
    if (!activeNote) return;
    try {
      await ipcClient.updateNote(
        activeNote.id,
        activeNote.title,
        content,
        activeNote.folder_id,
        activeNote.is_favorite
      );
      // Optimistic UI update
      setActiveNote({ ...activeNote, content_markdown: content });
      setNotes((prev) =>
        prev.map((n) => (n.id === activeNote.id ? { ...n, content_markdown: content } : n))
      );
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const displayedNotes = activeFolderId
    ? notes.filter((n) => n.folder_id === activeFolderId)
    : notes;

  return (
    <div className="flex h-full w-full bg-obsidian text-bone">
      {/* Sidebar: Folders */}
      <div className="w-64 border-r border-subtle bg-surface-base flex flex-col">
        <div className="p-4 border-b border-subtle font-medium text-text-secondary tracking-wide">
          FOLDERS
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setActiveFolderId(null)}
            className={`w-full text-left px-3 py-2 rounded transition-colors ${
              activeFolderId === null ? 'bg-bone text-obsidian' : 'hover:bg-surface-raised'
            }`}
          >
            All Notes
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFolderId(f.id)}
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                activeFolderId === f.id ? 'bg-bone text-obsidian' : 'hover:bg-surface-raised'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Pane: Notes List */}
      <div className="w-80 border-r border-subtle bg-surface-base flex flex-col">
        <div className="p-4 border-b border-subtle space-y-3">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border border-subtle rounded px-3 py-2 text-sm focus:border-bone focus:outline-none transition-colors"
          />
          <button
            onClick={handleCreateNote}
            className="w-full bg-bone text-obsidian rounded py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setActiveNote(note)}
              className={`p-4 cursor-pointer border-b border-subtle transition-colors ${
                activeNote?.id === note.id ? 'bg-surface-raised' : 'hover:bg-surface-raised hover:bg-opacity-50'
              }`}
            >
              <h3 className="font-medium truncate">{note.title}</h3>
              <p className="text-xs text-text-tertiary mt-1">
                {new Date(note.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Editor */}
      <div className="flex-1 p-6 bg-obsidian overflow-hidden">
        {activeNote ? (
          <div className="h-full flex flex-col space-y-4">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setActiveNote({ ...activeNote, title: newTitle });
                ipcClient.updateNote(
                  activeNote.id,
                  newTitle,
                  activeNote.content_markdown,
                  activeNote.folder_id,
                  activeNote.is_favorite
                );
                setNotes((prev) =>
                  prev.map((n) => (n.id === activeNote.id ? { ...n, title: newTitle } : n))
                );
              }}
              className="text-2xl font-medium bg-transparent border-none outline-none text-text-primary"
              placeholder="Note Title"
            />
            <MarkdownEditor
              initialContent={activeNote.content_markdown || ''}
              onContentChange={handleUpdateNote}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-tertiary">
            Select a note to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};
