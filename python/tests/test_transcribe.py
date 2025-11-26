import unittest
import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from transcribe import run_transcription

class TestTranscribeVideo(unittest.TestCase):

    def test_transcribe_video(self):
        video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_video.mp4'))

        # Temporary JSON output path
        tmp_dir = tempfile.gettempdir()
        output_json_path = os.path.join(tmp_dir, 'transcription_output.json')

        # Run transcription and save JSON
        run_transcription(video_path, output_json_path) 

        # Load generated output
        with open(output_json_path, 'r') as f:
            data = json.load(f)

        # Test structure exists
        self.assertIn('text', data, "Missing 'text' field")
        self.assertIn('segments', data, "Missing 'segments' field")
        self.assertIn('language', data, "Missing 'language' field")
        
        # Test content quality
        self.assertGreater(len(data['text']), 0, "Transcription is empty")
        self.assertGreater(len(data['segments']), 0, "No segments generated")
        
        # Test language detection (adjust expected language as needed)
        self.assertEqual(data['language'], 'en', "Expected English language")
        
        # Test segment structure and validity
        for i, segment in enumerate(data['segments']):
            # Required fields
            self.assertIn('start', segment, f"Segment {i} missing start time")
            self.assertIn('end', segment, f"Segment {i} missing end time")
            self.assertIn('text', segment, f"Segment {i} missing text")
            
            # Validate timing logic
            self.assertGreaterEqual(segment['start'], 0, f"Segment {i} has negative start time")
            self.assertGreater(segment['end'], segment['start'], 
                             f"Segment {i} end time not after start time")
            
            # Validate text content
            self.assertGreater(len(segment['text'].strip()), 0, 
                             f"Segment {i} has empty text")
            
            # Validate numeric fields if present
            if 'id' in segment:
                self.assertIsInstance(segment['id'], int, f"Segment {i} ID should be integer")
            
            if 'no_speech_prob' in segment:
                self.assertGreaterEqual(segment['no_speech_prob'], 0, 
                                      f"Segment {i} has invalid no_speech_prob")
                self.assertLessEqual(segment['no_speech_prob'], 1, 
                                   f"Segment {i} has invalid no_speech_prob")

        # Clean up
        if os.path.exists(output_json_path):
            os.remove(output_json_path)

if __name__ == '__main__':
    unittest.main()