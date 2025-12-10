import unittest
import sys
import os
import json
import tempfile
import shutil

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

    def test_full_analysis_pipeline(self):
        analyzer = VideoAnalyzer(self.video_path, self.config)
        result = analyzer.analyze()
        
        result_dict = result.to_dict()
        
        with open(self.output_json_path, "w", encoding="utf-8") as f:
            json.dump(result_dict, f, indent=4, ensure_ascii=False)

        self.assertIsNone(result.error)
        
        self.assertEqual(self.reference_analysis['scene_analysis']['environment'], result_dict['scene_analysis']['environment'])
        self.assertEqual(self.reference_analysis['scene_analysis']['object_distribution'], result_dict['scene_analysis']['object_distribution'])
        self.assertEqual(self.reference_analysis['scene_analysis']['total_frames'], result_dict['scene_analysis']['total_frames'])
        
        if 'dominant_color' in self.reference_analysis['scene_analysis']:
            self.assertEqual(
                self.reference_analysis['scene_analysis']['dominant_color']['name'],
                result_dict['scene_analysis']['dominant_color']['name']
            )

        self.assertEqual(self.reference_analysis['detected_activities'], result_dict['detected_activities'])
        
        ref_summary = self.reference_analysis['face_recognition_summary']
        result_summary = result_dict['face_recognition_summary']
        
        self.assertCountEqual(ref_summary['known_people_identified'], result_summary['known_people_identified'])
        self.assertIn('Ilias', result_summary['known_people_identified'])
        self.assertIn('Aiony Haust', result_summary['known_people_identified'])
        
        self.assertEqual(ref_summary['unknown_faces_detected'], result_summary['unknown_faces_detected'])
        self.assertEqual(ref_summary['unique_unknown_faces'], result_summary['unique_unknown_faces'])
        
        self.assertEqual(
            set(ref_summary['unknown_faces_details'].keys()),
            set(result_summary['unknown_faces_details'].keys())
        )
        
        self.assertEqual(len(self.reference_analysis['frame_analysis']), len(result_dict['frame_analysis']))
        
        for ref_frame, result_frame in zip(self.reference_analysis['frame_analysis'], result_dict['frame_analysis']):
            self.assertEqual(ref_frame['start_time_ms'], result_frame['start_time_ms'])
            self.assertEqual(ref_frame['end_time_ms'], result_frame['end_time_ms'])
            self.assertEqual(ref_frame['shot_type'], result_frame['shot_type'])
            self.assertEqual(ref_frame['environment_caption'], result_frame['environment_caption'])
                   
            ref_objects = {obj['label'] for obj in ref_frame['objects']}
            result_objects = {obj['label'] for obj in result_frame['objects']}
            self.assertEqual(ref_objects, result_objects)
            
            ref_face_names = {face['name'] for face in ref_frame['faces']}
            result_face_names = {face['name'] for face in result_frame['faces']}
            self.assertEqual(ref_face_names, result_face_names)
            
            for ref_face in ref_frame['faces']:
                matching_face = next((f for f in result_frame['faces'] if f['name'] == ref_face['name']), None)
                self.assertIsNotNone(matching_face)
                if ref_face['name'] in ['Ilias', 'Aiony Haust']:
                    self.assertEqual(ref_face['name'], matching_face['name'])

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