import { VideoPlayer } from '@/components/video-player';
import { getVideoUrl } from '@/lib/video-url';

export default function TestVideoPage() {
  // Automatically uses local files in dev, GCS in production
  const videoUrl = getVideoUrl('last-dance');
  const posterUrl = 'https://image.tmdb.org/t/p/original/placeholder.jpg';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">HLS Video Player Test</h1>
      
      <div className="max-w-4xl mx-auto mb-8">
        <VideoPlayer
          src={videoUrl}
          poster={posterUrl}
          title="Test Video"
          autoPlay={false}
          videoId="test-video-the-signal"
        />
      </div>

      <div className="max-w-4xl mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
        
        <ol className="list-decimal list-inside space-y-3 mb-6">
          <li>
            <strong>Convert your MP4 to HLS:</strong>
            <pre className="mt-2 p-3 bg-black text-green-400 rounded overflow-x-auto">
              ./scripts/convert-to-hls.sh /path/to/your/video.mp4 sample-movie
            </pre>
          </li>
          
          <li>
            <strong>Update the video URL above</strong> to match your output name (default: sample-movie)
          </li>
          
          <li>
            <strong>Refresh this page</strong> and the video should play
          </li>
        </ol>

        <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-6">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Adaptive bitrate streaming (1080p, 720p, 480p, 360p)</li>
            <li>Automatic quality selection based on bandwidth</li>
            <li>HLS.js for cross-browser compatibility</li>
            <li>Native HLS support in Safari</li>
            <li>Custom video controls with seek, volume, fullscreen</li>
          </ul>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-6">
          <h3 className="font-semibold mb-2">Video URL Format:</h3>
          <code className="text-sm bg-white dark:bg-gray-900 px-2 py-1 rounded">
            /videos/hls/[output-name]/master.m3u8
          </code>
        </div>
      </div>
    </div>
  );
}
