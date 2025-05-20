import { type Note, type InsertNote } from "@shared/schema";

// In-memory storage
const notes: Note[] = [];
let nextId = 1;

export const storage = {
  async getAllNotes(): Promise<Note[]> {
    return notes;
  },

  async getNote(id: number): Promise<Note | undefined> {
    return notes.find(note => note.id === id);
  },

  async createNote(note: InsertNote): Promise<Note> {
    const newNote: Note = {
      id: nextId++,
      ...note,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    notes.push(newNote);
    return newNote;
  },

  async updateNote(id: number, note: InsertNote): Promise<Note | undefined> {
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return undefined;

    const updatedNote: Note = {
      ...notes[index],
      ...note,
      updatedAt: new Date()
    };
    notes[index] = updatedNote;
    return updatedNote;
  },

  async deleteNote(id: number): Promise<boolean> {
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    notes.splice(index, 1);
    return true;
  }
};