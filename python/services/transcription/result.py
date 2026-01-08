"""Transcription result structures."""
from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class Word:
    """Transcribed word with timing."""
    start: float
    end: float
    word: str
    confidence: Optional[float]

    def to_dict(self) -> Dict:
        return {
            "start": self.start,
            "end": self.end,
            "word": self.word,
            "confidence": self.confidence
        }


@dataclass
class Segment:
    """Transcription segment."""
    id: int
    start: float
    end: float
    text: str
    confidence: Optional[float]
    words: List[Word]

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "text": self.text,
            "confidence": self.confidence,
            "words": [word.to_dict() for word in self.words]
        }


@dataclass
class TranscriptionResult:
    """Complete transcription result."""
    text: str
    segments: List[Segment]
    language: Optional[str]

    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "segments": [seg.to_dict() for seg in self.segments],
            "language": self.language
        }
