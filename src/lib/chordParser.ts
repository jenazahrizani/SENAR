// ============================================================
// SENAR CHORD PARSER
// ============================================================
//
// Supported formats:
//
// 1. Section
//    [Intro]
//    [Verse 1]
//    [Chorus]
//    [Pre-Chorus]
//    [Bridge]
//    [Outro]
//
// 2. Traditional chord sheet
//    G       D       G
//    Bengawan Solo
//
// 3. Instrumental chord line
//    G  D  G
//
// 4. Legacy inline format
//    [G]Bengawan [D]Solo
//
// Important:
// - Whitespace / column position is preserved.
// - Chord symbols are validated before being classified.
// - [Verse 1] is a section, NOT a chord.
// ============================================================


// ============================================================
// TYPES
// ============================================================

export interface ChordPart {
  type: 'chord';
  value: string;

  /**
   * Character position inside the original line.
   * Example:
   *
   * G       D       G
   * ^       ^       ^
   * 0       8       16
   */
  position: number;

  /**
   * Original length of the chord token.
   */
  length: number;
}

export interface LyricPart {
  type: 'lyric';
  value: string;

  /**
   * Character position inside the original line.
   */
  position: number;

  /**
   * Original length.
   */
  length: number;
}

export interface SectionPart {
  type: 'section';
  value: string;

  position: number;
  length: number;
}

export type ParsedPart =
  | ChordPart
  | LyricPart
  | SectionPart;


// ============================================================
// STRUCTURED SONG MODEL
// ============================================================

export interface ParsedChord {
  value: string;
  position: number;
  length: number;
}

export interface ParsedSongSection {
  type: 'section';
  value: string;
  raw: string;
}

export interface ParsedSongLine {
  /**
   * A paired chord + lyric line.
   *
   * Example:
   *
   * G       D       G
   * Bengawan Solo
   */
  type: 'line';

  rawChordLine: string;
  rawLyricLine: string;

  chords: ParsedChord[];

  /**
   * Raw lyric string.
   */
  lyric: string;
}

export interface ParsedInstrumentalLine {
  /**
   * Chord line without a following lyric line.
   *
   * Example:
   *
   * G  D  G
   */
  type: 'instrumental';

  raw: string;
  chords: ParsedChord[];
}

export interface ParsedLyricLine {
  type: 'lyric';

  raw: string;
  lyric: string;
}

export interface ParsedBlankLine {
  type: 'blank';

  raw: string;
}

export type ParsedSongBlock =
  | ParsedSongSection
  | ParsedSongLine
  | ParsedInstrumentalLine
  | ParsedLyricLine
  | ParsedBlankLine;


// ============================================================
// CHORD DETECTION
// ============================================================

/**
 * Validates common chord notation.
 *
 * Supported examples:
 *
 * C
 * Cm
 * C7
 * Cmaj7
 * Cmin7
 * Cdim
 * Cdim7
 * Caug
 * Csus2
 * Csus4
 * Cadd9
 * C#7
 * Bbmaj7
 * G/B
 * C/G
 * Am7/G
 * F#sus4
 * N.C.
 */
const CHORD_PATTERN =
  /^(?:[A-Ga-g](?:#|b)?(?:maj|min|m|dim|aug|sus|add)?(?:\d{1,2})?(?:(?:sus)\d{1,2})?(?:[#b]\d{1,2})?(?:\/[A-Ga-g](?:#|b)?)?|N\.C\.)$/i;


/**
 * Determine whether a value is a valid chord symbol.
 */
export function isChordSymbol(value: string): boolean {
  const chord = value.trim();

  if (!chord) {
    return false;
  }

  return CHORD_PATTERN.test(chord);
}


// ============================================================
// SECTION DETECTION
// ============================================================

/**
 * Detect generic section syntax.
 *
 * Examples:
 *
 * [Intro]
 * [Verse]
 * [Verse 1]
 * [Verse 2]
 * [Chorus]
 * [Chorus 1]
 * [Pre-Chorus]
 * [Bridge]
 * [Outro]
 * [Instrumental]
 *
 * Any complete [Something] line is considered a section,
 * as long as it is not an inline chord expression.
 */
export function parseSectionLine(
  line: string
): SectionPart | null {
  const match = line.match(/^\s*\[([^\]]+)\]\s*$/);

  if (!match) {
    return null;
  }

  const label = match[1].trim();

  if (!label) {
    return null;
  }

  return {
    type: 'section',
    value: `[${label}]`,
    position: line.indexOf('['),
    length: match[0].trim().length,
  };
}


// ============================================================
// TOKENIZE PLAIN CHORD LINE
// ============================================================

/**
 * Extract chords from a traditional chord line while preserving
 * their original character positions.
 *
 * Example:
 *
 * "G       D       G"
 *
 * becomes:
 *
 * G -> position 0
 * D -> position 8
 * G -> position 16
 */
export function parsePlainChordLine(
  line: string
): ParsedChord[] | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const matches = Array.from(
    line.matchAll(/\S+/g)
  );

  if (matches.length === 0) {
    return null;
  }

  const chords: ParsedChord[] = [];

  for (const match of matches) {
    const token = match[0];

    if (!isChordSymbol(token)) {
      return null;
    }

    const position = match.index ?? 0;

    chords.push({
      value: token,
      position,
      length: token.length,
    });
  }

  return chords.length > 0
    ? chords
    : null;
}


// ============================================================
// INLINE CHORD FORMAT
// ============================================================

/**
 * Parse the legacy format:
 *
 * [C]Bengawan [D]Solo
 *
 * This is kept for backwards compatibility.
 */
function parseInlineChordLine(
  line: string
): ParsedPart[] {
  const parts: ParsedPart[] = [];

  const regex =
    /\[([^\]]+)\]|([^\[\]]+)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const fullValue = match[0];
    const position = match.index;

    // [C], [Am], [G7], etc.
    if (match[1] !== undefined) {
      const chord = match[1].trim();

      // Only treat bracketed value as chord if it
      // actually looks like a chord.
      if (isChordSymbol(chord)) {
        parts.push({
          type: 'chord',
          value: chord,
          position,
          length: fullValue.length,
        });

        continue;
      }

      // If it is not a chord, treat it as lyric text.
      parts.push({
        type: 'lyric',
        value: fullValue,
        position,
        length: fullValue.length,
      });

      continue;
    }

    // Plain lyric section.
    if (match[2] !== undefined) {
      const lyric = match[2];

      if (lyric.length > 0) {
        parts.push({
          type: 'lyric',
          value: lyric,
          position,
          length: lyric.length,
        });
      }
    }
  }

  return parts;
}


// ============================================================
// SINGLE LINE PARSER
// ============================================================

/**
 * Parse one line.
 *
 * Detection priority:
 *
 * 1. Section
 * 2. Plain chord line
 * 3. Legacy inline chord format
 * 4. Lyric
 */
export function parseChordLine(
  line: string
): ParsedPart[] {
  // ----------------------------------------------------------
  // EMPTY LINE
  // ----------------------------------------------------------

  if (line.trim() === '') {
    return [];
  }


  // ----------------------------------------------------------
  // SECTION
  // ----------------------------------------------------------

  const section = parseSectionLine(line);

  if (section) {
    return [section];
  }


  // ----------------------------------------------------------
  // TRADITIONAL CHORD LINE
  // ----------------------------------------------------------

  const plainChords =
    parsePlainChordLine(line);

  if (plainChords) {
    return plainChords.map((chord) => ({
      type: 'chord',
      value: chord.value,
      position: chord.position,
      length: chord.length,
    }));
  }


  // ----------------------------------------------------------
  // LEGACY INLINE FORMAT
  // ----------------------------------------------------------

  if (/\[[^\]]+\]/.test(line)) {
    const inlineParts =
      parseInlineChordLine(line);

    if (inlineParts.length > 0) {
      return inlineParts;
    }
  }


  // ----------------------------------------------------------
  // NORMAL LYRIC
  // ----------------------------------------------------------

  return [
    {
      type: 'lyric',
      value: line,
      position: 0,
      length: line.length,
    },
  ];
}


// ============================================================
// LEGACY CONTENT PARSER
// ============================================================
//
// Kept compatible with existing SENAR code:
//
// ParsedPart[][]
//
// However every chord now contains its original position.
//
// This lets SongDetail be upgraded later without changing
// Firestore content.
// ============================================================

export function parseChordContent(
  content: string
): ParsedPart[][] {
  const normalized =
    content.replace(/\r\n/g, '\n');

  const lines =
    normalized.split('\n');

  return lines.map((line) =>
    parseChordLine(line)
  );
}


// ============================================================
// NEW STRUCTURED SONG PARSER
// ============================================================
//
// This is the parser that should eventually be used by:
//
// - SongDetail.astro
// - admin/create.astro
// - admin/[slug].astro
//
// Example:
//
// G       D       G
// Bengawan Solo
//
// becomes:
//
// {
//   type: 'line',
//   chords: [
//      { value: 'G', position: 0 },
//      { value: 'D', position: 8 },
//      { value: 'G', position: 16 }
//   ],
//   lyric: 'Bengawan Solo'
// }
// ============================================================

export function parseSongContent(
  content: string
): ParsedSongBlock[] {
  const normalized =
    content.replace(/\r\n/g, '\n');

  const lines =
    normalized.split('\n');

  const result: ParsedSongBlock[] = [];

  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index];

    // --------------------------------------------------------
    // BLANK
    // --------------------------------------------------------

    if (currentLine.trim() === '') {
      result.push({
        type: 'blank',
        raw: currentLine,
      });

      index += 1;
      continue;
    }


    // --------------------------------------------------------
    // SECTION
    // --------------------------------------------------------

    const section =
      parseSectionLine(currentLine);

    if (section) {
      result.push({
        type: 'section',
        value: section.value,
        raw: currentLine,
      });

      index += 1;
      continue;
    }


    // --------------------------------------------------------
    // CHORD LINE
    // --------------------------------------------------------

    const chords =
      parsePlainChordLine(currentLine);

    if (chords) {
      const nextLine =
        lines[index + 1];

      // ------------------------------------------------------
      // CHORD + LYRIC PAIR
      // ------------------------------------------------------

      if (
        nextLine !== undefined &&
        nextLine.trim() !== '' &&
        !parseSectionLine(nextLine) &&
        !parsePlainChordLine(nextLine)
      ) {
        result.push({
          type: 'line',
          rawChordLine: currentLine,
          rawLyricLine: nextLine,
          chords,
          lyric: nextLine,
        });

        index += 2;
        continue;
      }


      // ------------------------------------------------------
      // INSTRUMENTAL CHORD LINE
      // ------------------------------------------------------

      result.push({
        type: 'instrumental',
        raw: currentLine,
        chords,
      });

      index += 1;
      continue;
    }


    // --------------------------------------------------------
    // INLINE CHORD / LYRIC
    // --------------------------------------------------------

    const inlineParts =
      /\[[^\]]+\]/.test(currentLine)
        ? parseInlineChordLine(currentLine)
        : [];

    const hasInlineChord =
      inlineParts.some(
        (part) => part.type === 'chord'
      );

    if (hasInlineChord) {
      const chordsFromInline =
        inlineParts
          .filter(
            (part): part is ChordPart =>
              part.type === 'chord'
          )
          .map((part) => ({
            value: part.value,
            position: part.position,
            length: part.length,
          }));

      const lyric =
        inlineParts
          .filter(
            (part): part is LyricPart =>
              part.type === 'lyric'
          )
          .map((part) => part.value)
          .join('');

      result.push({
        type: 'line',
        rawChordLine: currentLine,
        rawLyricLine: lyric,
        chords: chordsFromInline,
        lyric,
      });

      index += 1;
      continue;
    }


    // --------------------------------------------------------
    // NORMAL LYRIC
    // --------------------------------------------------------

    result.push({
      type: 'lyric',
      raw: currentLine,
      lyric: currentLine,
    });

    index += 1;
  }

  return result;
}


// ============================================================
// CHORD EXTRACTION HELPER
// ============================================================

/**
 * Get only chord symbols from an entire song.
 *
 * Useful later for:
 * - chord statistics
 * - chord diagram lookup
 * - preloading ukulele shapes
 * - validation
 */
export function extractChords(
  content: string
): string[] {
  const song =
    parseSongContent(content);

  const chords: string[] = [];

  for (const block of song) {
    if (
      block.type === 'line' ||
      block.type === 'instrumental'
    ) {
      for (const chord of block.chords) {
        if (!chords.includes(chord.value)) {
          chords.push(chord.value);
        }
      }
    }
  }

  return chords;
}


// ============================================================
// SLUG GENERATOR
// ============================================================

export function generateSlug(
  title: string
): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}