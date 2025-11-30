import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { decode } from "node-wav";
import MusicTempo from "music-tempo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateBeats(duration, bpm, offset = 0) {
  const beats = [];
  const beatInterval = 60 / bpm;

  let time = offset;
  while (time < duration) {
    beats.push(time);
    time += beatInterval;
  }

  return beats;
}

async function analyzeMusicFile(audioPath) {
  let tempWavPath = null;

  try {
    const audioBuffer = fs.readFileSync(audioPath);
    const decoded = decode(audioBuffer);

    let audioData;

    if (decoded.channelData.length === 1) {
      audioData = decoded.channelData[0];
    } else {
      const left = decoded.channelData[0];
      const right = decoded.channelData[1];
      audioData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        audioData[i] = (left[i] + right[i]) / 2;
      }
    }

    const musicTempo = new MusicTempo(audioData);
    const bpm = musicTempo.tempo;

    const duration = audioData.length / decoded.sampleRate;

    const beats = generateBeats(duration, bpm);

    return {
      bpm: parseFloat(bpm),
      beats: beats.map((b) => parseFloat(b.toFixed(3))),
      confidence: 1.0,
    };
  } catch {
    return null;
  } finally {
    if (tempWavPath && fs.existsSync(tempWavPath)) {
      fs.unlinkSync(tempWavPath);
    }
  }
}

async function main() {
  try {
    const file = "background-music.wav";
    const filePath = path.join(__dirname, "../public", file);

    const analysis = await analyzeMusicFile(filePath);

    if (analysis) {
      const outputPath = path.join(__dirname, "../beats.json");
      fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    }
  } catch (err) {
    console.error(err);
    /* */
  }
}

main();
