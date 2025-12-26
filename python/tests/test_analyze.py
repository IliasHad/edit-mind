import unittest
import sys
import os
import json
import tempfile
import shutil
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from analyze import VideoAnalyzer, AnalysisConfig

class TestVideoAnalysis(unittest.TestCase):

    def setUp(self):
        self.video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_video.mp4'))
        
        if not os.path.exists(self.video_path):
            with open(self.video_path, 'w') as f:
                f.write("dummy video content")
            self.dummy_video_created = True
        else:
            self.dummy_video_created = False

        self.tmp_dir = tempfile.TemporaryDirectory()
        self.output_json_path = os.path.join(self.tmp_dir.name, 'analysis_output.json')
        self.unknown_faces_dir = os.path.join(os.path.dirname(__file__), 'unknown_faces')

        self.config = AnalysisConfig(
            sample_interval_seconds=1.0,
            enable_performance_report=False,
            lazy_plugin_init=False,
            unknown_faces_dir=self.unknown_faces_dir
        )
        
        reference_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_video_analysis.json'))
        with open(reference_json_path, 'r') as f:
            self.reference_analysis = json.load(f)

    def tearDown(self):
        if self.dummy_video_created and os.path.exists(self.video_path):
            os.remove(self.video_path)
        self.tmp_dir.cleanup()
        if os.path.exists(self.unknown_faces_dir):
            shutil.rmtree(self.unknown_faces_dir)

    @patch('analyze.load_plugins')
    def test_full_analysis_pipeline(self, mock_load_plugins):
        """Test full analysis pipeline with mocked plugins"""
        
        mock_plugins = []
        
        class MockPlugin:
            def __init__(self, config):
                self.config = config
            
            def setup(self):
                pass
            
            def analyze_frame(self, frame, frame_analysis, video_path):
                return frame_analysis
            
            def analyze_scene(self, frame_analyses):
                pass
            
            def get_results(self):
                return {}
            
            def analyze_activities(self, frame_analyses, scene_analysis):
                return []
            
            def get_summary(self):
                return {}
        
        mock_load_plugins.return_value = [MockPlugin({})]
        
        analyzer = VideoAnalyzer(self.video_path, self.config)
        result = analyzer.analyze()
        
        result_dict = result.to_dict()
        
        with open(self.output_json_path, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=4, ensure_ascii=False)

        self.assertIsNone(result.error)
        
        self.assertIn('scene_analysis', result_dict)
        self.assertIn('frame_analysis', result_dict)
        self.assertIn('detected_activities', result_dict)
        self.assertIn('face_recognition_summary', result_dict)

    def test_file_not_found_error(self):
        non_existent_path = '/path/to/nonexistent/video.mp4'
        analyzer = VideoAnalyzer(non_existent_path, self.config)
        result = analyzer.analyze()

        self.assertIsNotNone(result.error)
        self.assertIn("Video file not found", result.error)
        self.assertEqual(result.video_file, non_existent_path)
        self.assertEqual(len(result.frame_analysis), 0)

if __name__ == '__main__':
    unittest.main()