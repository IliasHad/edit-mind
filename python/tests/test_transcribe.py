import unittest
import sys
import os
import json
import tempfile
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env.testing'))

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from transcribe import run_transcription, TranscriptionService


class MockWhisperSegment:
    """Mock segment returned by Whisper model"""
    def __init__(self, id, start, end, text, words=None):
        self.id = id
        self.start = start
        self.end = end
        self.text = text
        self.words = words or []
        self.avg_logprob = -0.5


class MockWhisperWord:
    """Mock word with timestamps"""
    def __init__(self, start, end, word):
        self.start = start
        self.end = end
        self.word = word
        self.probability = 0.95


class MockTranscriptionInfo:
    """Mock transcription info"""
    def __init__(self, duration=10.0, language='en'):
        self.duration = duration
        self.language = language


class TestTranscribeVideo(unittest.TestCase):

    def setUp(self):
        self.video_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), 'test_video.mp4')
        )
        self.tmp_dir = tempfile.gettempdir()
        self.output_json_path = os.path.join(self.tmp_dir, 'transcription_output.json')
        
        self.mock_segments = [
            MockWhisperSegment(
                id=0,
                start=0.0,
                end=3.5,
                text="Hello, this is a test video.",
                words=[
                    MockWhisperWord(0.0, 0.5, "Hello"),
                    MockWhisperWord(0.6, 0.9, "this"),
                    MockWhisperWord(1.0, 1.2, "is"),
                    MockWhisperWord(1.3, 1.5, "a"),
                    MockWhisperWord(1.6, 2.0, "test"),
                    MockWhisperWord(2.1, 3.5, "video"),
                ]
            ),
            MockWhisperSegment(
                id=1,
                start=3.5,
                end=7.0,
                text="We are testing the transcription service.",
                words=[
                    MockWhisperWord(3.5, 3.7, "We"),
                    MockWhisperWord(3.8, 4.0, "are"),
                    MockWhisperWord(4.1, 4.8, "testing"),
                    MockWhisperWord(4.9, 5.1, "the"),
                    MockWhisperWord(5.2, 6.5, "transcription"),
                    MockWhisperWord(6.6, 7.0, "service"),
                ]
            ),
        ]
        self.mock_info = MockTranscriptionInfo(duration=10.0, language='en')

    def tearDown(self):
        """Clean up test files"""
        if os.path.exists(self.output_json_path):
            os.remove(self.output_json_path)

    @patch('transcribe.TranscriptionService.is_model_cached')
    @patch('transcribe.WhisperModel')
    @patch('transcribe.Path.exists')
    def test_transcribe_video(self, mock_path_exists, mock_whisper_model, mock_is_cached):
        """Test transcription with mocked Whisper model"""
        mock_path_exists.return_value = True
        mock_is_cached.return_value = True
        
        # Create mock model instance
        mock_model_instance = MagicMock()
        mock_model_instance.transcribe.return_value = (
            iter(self.mock_segments),
            self.mock_info
        )
        mock_whisper_model.return_value = mock_model_instance
        
        # Run transcription
        result = run_transcription(self.video_path, self.output_json_path)
        
        # Verify model was called correctly
        mock_whisper_model.assert_called_once()
        mock_model_instance.transcribe.assert_called_once()
        
        # Load generated output
        with open(self.output_json_path, 'r') as f:
            data = json.load(f)
        
        # Test structure exists
        self.assertIn('text', data, "Missing 'text' field")
        self.assertIn('segments', data, "Missing 'segments' field")
        self.assertIn('language', data, "Missing 'language' field")
        
        # Test content quality
        self.assertGreater(len(data['text']), 0, "Transcription is empty")
        self.assertGreater(len(data['segments']), 0, "No segments generated")
        
        # Test language detection
        self.assertEqual(data['language'], 'en', "Expected English language")
        
        # Test that text contains expected content
        full_text = data['text'].lower()
        self.assertIn('test', full_text, "Expected keyword not in transcription")
        
        # Test segment structure and validity
        for i, segment in enumerate(data['segments']):
            # Required fields
            self.assertIn('start', segment, f"Segment {i} missing start time")
            self.assertIn('end', segment, f"Segment {i} missing end time")
            self.assertIn('text', segment, f"Segment {i} missing text")
            self.assertIn('words', segment, f"Segment {i} missing words")
            
            # Validate timing logic
            self.assertGreaterEqual(segment['start'], 0, 
                                  f"Segment {i} has negative start time")
            self.assertGreater(segment['end'], segment['start'], 
                             f"Segment {i} end time not after start time")
            
            # Validate text content
            self.assertGreater(len(segment['text'].strip()), 0, 
                             f"Segment {i} has empty text")
            
            # Validate numeric fields
            if 'id' in segment:
                self.assertIsInstance(segment['id'], int, 
                                    f"Segment {i} ID should be integer")
            
            if 'confidence' in segment:
                self.assertIsInstance(segment['confidence'], (int, float, type(None)),
                                    f"Segment {i} confidence should be numeric or None")
            
            # Validate words structure
            self.assertIsInstance(segment['words'], list, 
                                f"Segment {i} words should be a list")
            for j, word in enumerate(segment['words']):
                self.assertIn('start', word, 
                            f"Segment {i}, word {j} missing start time")
                self.assertIn('end', word, 
                            f"Segment {i}, word {j} missing end time")
                self.assertIn('word', word, 
                            f"Segment {i}, word {j} missing word text")

    @patch('transcribe.TranscriptionService.is_model_cached')
    @patch('transcribe.WhisperModel')
    @patch('transcribe.Path.exists')
    def test_transcribe_empty_audio(self, mock_path_exists, mock_whisper_model, mock_is_cached):
        """Test transcription with video that has no audio"""
        mock_path_exists.return_value = True
        mock_is_cached.return_value = True  # Pretend model is already cached
        
        # Mock model to raise RuntimeError for no audio
        mock_model_instance = MagicMock()
        mock_model_instance.transcribe.side_effect = RuntimeError("No audio streams found")
        mock_whisper_model.return_value = mock_model_instance
        
        # Run transcription
        result = run_transcription(self.video_path, self.output_json_path)
        
        # Verify empty result
        self.assertEqual(result['text'], '', "Expected empty text for no audio")
        self.assertEqual(len(result['segments']), 0, "Expected no segments for no audio")
        self.assertEqual(result['language'], 'N/A', "Expected N/A language for no audio")

    @patch('transcribe.TranscriptionService.is_model_cached')
    @patch('transcribe.WhisperModel')
    @patch('transcribe.Path.exists')
    def test_transcribe_with_progress_callback(self, mock_path_exists, mock_whisper_model, mock_is_cached):
        """Test transcription with progress callback"""
        mock_path_exists.return_value = True
        mock_is_cached.return_value = True  # Pretend model is already cached
        
        mock_model_instance = MagicMock()
        mock_model_instance.transcribe.return_value = (
            iter(self.mock_segments),
            self.mock_info
        )
        mock_whisper_model.return_value = mock_model_instance
        
        # Track progress updates
        progress_updates = []
        
        def progress_callback(percent, time_str):
            progress_updates.append((percent, time_str))
        
        result = run_transcription(
            self.video_path, 
            self.output_json_path, 
            progress_callback
        )
        
        self.assertGreater(len(progress_updates), 0, 
                          "Progress callback should be called")
        self.assertEqual(progress_updates[-1][0], 100, 
                        "Final progress should be 100%")

    @patch('transcribe.WhisperModel')
    def test_transcribe_file_not_found(self, mock_whisper_model):
        non_existent_path = '/path/to/nonexistent/video.mp4'
        
        with self.assertRaises(FileNotFoundError):
            run_transcription(non_existent_path, self.output_json_path)


if __name__ == '__main__':
    unittest.main()