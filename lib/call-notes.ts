const STAFF_NOTES_MARKER = "[ORVELLE_STAFF_NOTES_V1]";

export type ParsedCallNotes = {
  analystSummary: string | null;
  staffNotes: string[];
};

function normalizeNoteText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseStoredCallNotes(value?: string | null): ParsedCallNotes {
  const normalizedValue = normalizeNoteText(value ?? "");

  if (!normalizedValue) {
    return {
      analystSummary: null,
      staffNotes: []
    };
  }

  const markerIndex = normalizedValue.indexOf(STAFF_NOTES_MARKER);

  if (markerIndex === -1) {
    return {
      analystSummary: normalizedValue,
      staffNotes: []
    };
  }

  const analystSummary = normalizedValue.slice(0, markerIndex).trim() || null;
  const notesBlock = normalizedValue.slice(markerIndex + STAFF_NOTES_MARKER.length).trim();
  const staffNotes = notesBlock
    .split("\n")
    .map((note) => normalizeNoteText(note))
    .filter(Boolean);

  return {
    analystSummary,
    staffNotes
  };
}

export function appendStoredCallNote(existingValue: string | null | undefined, note: string) {
  const normalizedNote = normalizeNoteText(note);

  if (!normalizedNote) {
    return normalizeNoteText(existingValue ?? "") || null;
  }

  const parsedNotes = parseStoredCallNotes(existingValue);
  const nextStaffNotes = parsedNotes.staffNotes.includes(normalizedNote)
    ? parsedNotes.staffNotes
    : [normalizedNote, ...parsedNotes.staffNotes];

  const segments = [];

  if (parsedNotes.analystSummary) {
    segments.push(parsedNotes.analystSummary);
  }

  if (nextStaffNotes.length > 0) {
    segments.push(`${STAFF_NOTES_MARKER}\n${nextStaffNotes.join("\n")}`);
  }

  return segments.join("\n\n") || null;
}

export function getLatestStoredCallNote(value?: string | null) {
  return parseStoredCallNotes(value).staffNotes[0] ?? null;
}

export function getStoredCallNoteCount(value?: string | null) {
  return parseStoredCallNotes(value).staffNotes.length;
}
