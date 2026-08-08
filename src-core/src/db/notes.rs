use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::activity::log_activity;

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content_markdown: Option<String>,
    pub folder_id: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

pub fn create_folder(
    conn: &mut Connection,
    name: &str,
    parent_id: Option<&str>,
) -> Result<NoteFolder> {
    let id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO note_folders (id, name, parent_id) VALUES (?1, ?2, ?3)",
        params![id, name, parent_id],
    )?;
    log_activity(&tx, "Note Folder Created", Some(name))?;
    let folder = tx.query_row(
        "SELECT id, name, parent_id, datetime(created_at, 'localtime') FROM note_folders WHERE id = ?1",
        params![id],
        |row| Ok(NoteFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            created_at: row.get(3)?,
        })
    )?;
    tx.commit()?;
    Ok(folder)
}

pub fn get_folders(conn: &Connection) -> Result<Vec<NoteFolder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id, datetime(created_at, 'localtime') FROM note_folders",
    )?;
    let folder_iter = stmt.query_map([], |row| {
        Ok(NoteFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;

    let mut folders = Vec::new();
    for folder in folder_iter {
        folders.push(folder?);
    }
    Ok(folders)
}

pub fn update_folder(
    conn: &mut Connection,
    id: &str,
    name: &str,
    parent_id: Option<&str>,
) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE note_folders SET name = ?1, parent_id = ?2 WHERE id = ?3",
        params![name, parent_id, id],
    )?;
    log_activity(&tx, "Note Folder Updated", Some(name))?;
    tx.commit()?;
    Ok(())
}

pub fn delete_folder(conn: &mut Connection, id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    let name: String = tx.query_row("SELECT name FROM note_folders WHERE id = ?1", params![id], |row| row.get(0)).unwrap_or_default();
    tx.execute("DELETE FROM note_folders WHERE id = ?1", params![id])?;
    log_activity(&tx, "Note Folder Deleted", Some(&name))?;
    tx.commit()?;
    Ok(())
}

pub fn create_note(
    conn: &mut Connection,
    title: &str,
    content_markdown: Option<&str>,
    folder_id: Option<&str>,
    is_favorite: bool,
) -> Result<Note> {
    let id = Uuid::new_v4().to_string();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO notes (id, title, content_markdown, folder_id, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, title, content_markdown, folder_id, is_favorite],
    )?;
    log_activity(&tx, "Note Created", Some(title))?;
    let note = tx.query_row(
        "SELECT id, title, content_markdown, folder_id, is_favorite, datetime(created_at, 'localtime'), datetime(updated_at, 'localtime') FROM notes WHERE id = ?1",
        params![id],
        |row| Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content_markdown: row.get(2)?,
            folder_id: row.get(3)?,
            is_favorite: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    )?;
    tx.commit()?;
    Ok(note)
}

pub fn get_notes(conn: &Connection) -> Result<Vec<Note>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, content_markdown, folder_id, is_favorite, datetime(created_at, 'localtime'), datetime(updated_at, 'localtime') FROM notes ORDER BY updated_at DESC",
    )?;
    let note_iter = stmt.query_map([], |row| {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content_markdown: row.get(2)?,
            folder_id: row.get(3)?,
            is_favorite: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut notes = Vec::new();
    for note in note_iter {
        notes.push(note?);
    }
    Ok(notes)
}

pub fn update_note(
    conn: &mut Connection,
    id: &str,
    title: &str,
    content_markdown: Option<&str>,
    folder_id: Option<&str>,
    is_favorite: bool,
) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE notes SET title = ?1, content_markdown = ?2, folder_id = ?3, is_favorite = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
        params![title, content_markdown, folder_id, is_favorite, id],
    )?;
    log_activity(&tx, "Note Updated", Some(title))?;
    tx.commit()?;
    Ok(())
}

pub fn delete_note(conn: &mut Connection, id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    let title: String = tx.query_row("SELECT title FROM notes WHERE id = ?1", params![id], |row| row.get(0)).unwrap_or_default();
    tx.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    log_activity(&tx, "Note Deleted", Some(&title))?;
    tx.commit()?;
    Ok(())
}

pub fn search_notes(conn: &Connection, query: &str) -> Result<Vec<Note>> {
    let like_query = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, title, content_markdown, folder_id, is_favorite, datetime(created_at, 'localtime'), datetime(updated_at, 'localtime') 
         FROM notes 
         WHERE title LIKE ?1 OR content_markdown LIKE ?1
         ORDER BY updated_at DESC",
    )?;
    let note_iter = stmt.query_map(params![like_query], |row| {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content_markdown: row.get(2)?,
            folder_id: row.get(3)?,
            is_favorite: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut notes = Vec::new();
    for note in note_iter {
        notes.push(note?);
    }
    Ok(notes)
}
