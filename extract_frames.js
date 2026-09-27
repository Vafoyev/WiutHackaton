const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const inputVideo = 'C:\\Users\\isobe\\Downloads\\Microchip_processing_light_into_…_20260927151823.mp4';
const outputDir = path.join(__dirname, 'eda-website', 'public', 'video-frames');

// Create directory if not exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
} else {
    // Clear the directory first
    fs.readdirSync(outputDir).forEach(file => fs.unlinkSync(path.join(outputDir, file)));
}

console.log('Extracting frames to WEBP in 4K resolution... This may take a moment.');

ffmpeg(inputVideo)
  .outputOptions([
    '-vcodec', 'libwebp',
    '-lossless', '0',
    '-qscale', '85', // Better quality
    '-preset', 'default',
    '-r', '24' // 24 FPS to save space
  ])
  .output(path.join(outputDir, 'frame_%d.webp'))
  .on('end', () => {
    console.log('Frame extraction complete!');
    
    // Count frames
    const frames = fs.readdirSync(outputDir).filter(f => f.endsWith('.webp')).length;
    console.log(`Extracted ${frames} frames.`);
  })
  .on('error', (err) => {
    console.error('Error extracting frames:', err);
  })
  .run();
