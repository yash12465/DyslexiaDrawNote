import { users, type User, type InsertUser, type Note, type InsertNote } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Note methods
  getAllNotes(): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private notes: Map<number, Note>;
  private userCurrentId: number;
  private noteCurrentId: number;

  constructor() {
    this.users = new Map();
    this.notes = new Map();
    this.userCurrentId = 1;
    this.noteCurrentId = 1;
    
    // Add a few sample notes for testing
    this.createNote({
      title: "Welcome to DyslexiNote",
      content: "",
      preview: "",
      recognizedText: "Welcome to DyslexiNote, a dyslexia-friendly note-taking app.",
      isFavorite: true,
    });
    
    this.createNote({
      title: "How to Use",
      content: "",
      preview: "",
      recognizedText: "Draw on the canvas and use the text recognition to convert your handwriting to text.",
      isFavorite: false,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Note methods
  async getAllNotes(): Promise<Note[]> {
    return Array.from(this.notes.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  
  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }
  
  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteCurrentId++;
    const now = new Date();
    
    const note: Note = {
      id,
      ...insertNote,
      createdAt: now,
      updatedAt: now
    };
    
    this.notes.set(id, note);
    return note;
  }
  
  async updateNote(id: number, updatedFields: Partial<InsertNote>): Promise<Note | undefined> {
    const existingNote = this.notes.get(id);
    
    if (!existingNote) {
      return undefined;
    }
    
    const updatedNote: Note = {
      ...existingNote,
      ...updatedFields,
      updatedAt: new Date()
    };
    
    this.notes.set(id, updatedNote);
    return updatedNote;
  }
  
  async deleteNote(id: number): Promise<boolean> {
    if (!this.notes.has(id)) {
      return false;
    }
    
    return this.notes.delete(id);
  }
}

export const storage = new MemStorage();
