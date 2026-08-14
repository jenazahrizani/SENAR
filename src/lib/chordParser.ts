export interface ParsedPart {
  type: 'chord' | 'lyric' | 'section';
  value: string;
}

export function parseChordLine(line: string): ParsedPart[] {
  // Deteksi section seperti [Intro], [Verse], [Chorus]
  const sectionMatch = line.match(/^\[(Intro|Verse|Chorus|Bridge|Interlude|Outro|Pre-Chorus|Tag)\]/i);
  if (sectionMatch) {
    return [{ type: 'section', value: sectionMatch[0] }];
  }

  // Parser untuk chord [C] [Am] [G7] dll
  const parts: ParsedPart[] = [];
  const regex = /(\[[^\]]+\])|([^\[\]]+)/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      // Ini adalah chord (dalam kurung siku)
      const chord = match[1].slice(1, -1);
      if (chord.trim()) {
        parts.push({ type: 'chord', value: chord });
      }
    } else if (match[2]) {
      // Ini adalah lirik
      const lyric = match[2];
      if (lyric.trim()) {
        parts.push({ type: 'lyric', value: lyric });
      }
    }
  }

  return parts;
}

export function parseChordContent(content: string): ParsedPart[][] {
  const lines = content.split('\n');
  return lines.map(line => parseChordLine(line));
}

// Fungsi untuk generate slug dari judul
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Hapus karakter spesial
    .replace(/\s+/g, '-') // Ganti spasi dengan -
    .replace(/-+/g, '-'); // Hapus multiple dash
}