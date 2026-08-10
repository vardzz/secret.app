import React, { useState, useEffect } from 'react';
import { ipcClient, Note } from '../../lib/ipc-client';
import { MarkdownEditor } from './MarkdownEditor';
import { Plus, Search, ChevronDown, ArrowLeft } from 'lucide-react';

export const NotesModule: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    fetchNotes();
  }, [searchQuery]);

  const handleCreateNote = async () => {
    try {
      const newNote = await ipcClient.createNote("Untitled Note", "", undefined, false);
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
      setActiveNote({ ...activeNote, content_markdown: content });
      setNotes((prev) =>
        prev.map((n) => (n.id === activeNote.id ? { ...n, content_markdown: content } : n))
      );
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };
  
  if (activeNote) {
    return (
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-8 md:pt-12 px-6 md:px-12 relative overflow-hidden">
        <button onClick={() => setActiveNote(null)} className="flex items-center gap-2 text-text-secondary hover:text-bone mb-8 transition-colors text-sm font-medium w-fit">
          <ArrowLeft size={16} />
          <span>Back to notes</span>
        </button>
        
        <div className="h-full flex flex-col space-y-6 pb-12">
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
            className="text-4xl font-bold bg-transparent border-none outline-none text-text-primary placeholder:text-border-subtle"
            placeholder="Note Title"
          />
          <div className="flex-1 overflow-hidden border border-border-subtle rounded-xl bg-surface-raised">
            <MarkdownEditor
              initialContent={activeNote.content_markdown || ''}
              onContentChange={handleUpdateNote}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-8 md:pt-12 px-6 md:px-12 relative">
        {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Encrypted Notebook</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Secure notes</h1>
        </div>
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>New note</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border border-border-subtle rounded-xl py-3 pl-11 pr-4 text-text-primary focus:outline-none focus:border-border-default transition-colors text-sm"
          />
        </div>
        <button className="flex items-center justify-between gap-4 px-5 py-3 bg-transparent border border-border-subtle rounded-xl hover:border-border-default transition-colors text-sm font-medium min-w-[120px]">
          <span>All notes</span>
          <ChevronDown size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {notes.length === 0 ? (
          <div className="col-span-2 text-center text-text-secondary mt-12">
            <p>No notes found.</p>
          </div>
        ) : (
          notes.map(note => {
            const displayDate = note.updated_at 
              ? new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()
              : 'AUG 07'; // Fallback
            const snippet = note.content_markdown ? note.content_markdown.substring(0, 100) : "Empty note";
            return (
              <div 
                key={note.id}
                onClick={() => setActiveNote(note)}
                className="p-6 border border-border-subtle rounded-xl bg-surface-base hover:border-border-default transition-colors cursor-pointer flex flex-col h-44"
              >
                <h3 className="font-semibold text-text-primary mb-3">{note.title}</h3>
                <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed flex-1">
                  {snippet}
                </p>
                <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest mt-4">
                  UPDATED {displayDate}
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
};
