import transcriptData from '../../Context_Engineering_and_the_Physics_of_Attention_eng.json';

export interface TranscriptWord {
  text: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptSpeaker {
  id: string;
  name: string;
}

export interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
  speaker: TranscriptSpeaker;
  words: TranscriptWord[];
}

export interface TranscriptData {
  language_code: string;
  segments: TranscriptSegment[];
}

const data = transcriptData as TranscriptData;

export const segments = data.segments;

export const getSegmentAtTime = (seconds: number): TranscriptSegment | null => {
  return segments.find(s => seconds >= s.start_time && seconds < s.end_time) || null;
};

export const getSegmentAtFrame = (frame: number, fps: number = 30): TranscriptSegment | null => {
  return getSegmentAtTime(frame / fps);
};

export const getWordAtTime = (seconds: number): TranscriptWord | null => {
  const segment = getSegmentAtTime(seconds);
  if (!segment) return null;
  return segment.words.find(w => seconds >= w.start_time && seconds < w.end_time) || null;
};
