"use client";

import { createContext, useContext, type ReactNode } from "react";
import { noteNaming, type NoteNaming } from "@/lib/music-theory/naming";

const NoteNamesContext = createContext<NoteNaming>("letters");

export function NoteNamesProvider({ value, children }: { value: unknown; children: ReactNode }) {
  return <NoteNamesContext.Provider value={noteNaming(value)}>{children}</NoteNamesContext.Provider>;
}

export function useNoteNames(): NoteNaming {
  return useContext(NoteNamesContext);
}
