export type NoteElementType = 'slider' | 'text' | 'mood' | 'tags';

export interface SliderNoteElement {
  type: 'slider';
  pillar: string;
  value: number;
  min: number;
  max: number;
}

export interface TextNoteElement {
  type: 'text';
  label: string;
  value: string;
}

export interface MoodNoteElement {
  type: 'mood';
  value: number; // 1-5
}

export interface TagsNoteElement {
  type: 'tags';
  selected: string[];
}

export type NoteElement =
  | SliderNoteElement
  | TextNoteElement
  | MoodNoteElement
  | TagsNoteElement;

export interface SessionNotes {
  elements: NoteElement[];
}

export interface MeditationSession {
  id: string;
  duration: number; // minutes
  date: number; // timestamp ms
  presetId: string | null;
  notes: SessionNotes | null;
}
