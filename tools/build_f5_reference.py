#!/usr/bin/env python3
"""Build a browser-ready F5-TTS reference mel pack from a short voice sample.

F5-TTS conditions on a log-mel spectrogram, not on a WAV. The browser engine
uses the compact float16 layout in the model repository: [100 mel bins, frames].
This tool reproduces the vocos mel front end used by F5-TTS (24 kHz, 1024-point
STFT, 256 hop, 100 HTK mel bins, natural log, clamp 1e-5), then writes:

    <id>.bin   float16 little-endian, row-major [bins, frames]
    <id>.json  metadata and the exact transcript spoken in the sample

The transcript must match the sample word for word. Keep the sample near six
seconds and free of music, noise and long pauses. Only build a pack from a
voice you have permission to use.

Example:
    python3 tools/build_f5_reference.py \
      --audio /tmp/reader.wav \
      --text "The storm was breaking. Far off, a rainbow burned." \
      --id storyteller --name "Mythos Storyteller" \
      --out assets/f5/refs
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

SAMPLE_RATE = 24_000
N_FFT = 1024
HOP = 256
WIN = 1024
N_MELS = 100
F_MIN = 0.0
F_MAX = SAMPLE_RATE / 2
MEL_SCALE = 2595.0


def hz_to_mel(freq):
    return MEL_SCALE * np.log10(1.0 + np.asarray(freq) / 700.0)


def mel_to_hz(mel):
    return 700.0 * (10.0 ** (np.asarray(mel) / MEL_SCALE) - 1.0)


def mel_filterbank():
    """HTK-scale triangular filters, norm=None, matching torchaudio defaults."""
    f_max = min(F_MAX, SAMPLE_RATE / 2)
    mel_min, mel_max = hz_to_mel(F_MIN), hz_to_mel(f_max)
    mel_points = np.linspace(mel_min, mel_max, N_MELS + 2)
    hz_points = mel_to_hz(mel_points)
    freqs = np.linspace(0.0, SAMPLE_RATE / 2, N_FFT // 2 + 1)
    bank = np.zeros((N_MELS, len(freqs)), dtype=np.float64)
    for index in range(N_MELS):
        left, centre, right = hz_points[index:index + 3]
        rising = (freqs - left) / max(centre - left, 1e-9)
        falling = (right - freqs) / max(right - centre, 1e-9)
        bank[index] = np.maximum(0.0, np.minimum(rising, falling))
    return bank


def decode_audio(path):
    result = subprocess.run(
        [
            'ffmpeg', '-v', 'error', '-i', str(path),
            '-f', 'f32le', '-acodec', 'pcm_f32le',
            '-ac', '1', '-ar', str(SAMPLE_RATE), '-',
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    audio = np.frombuffer(result.stdout, dtype='<f4').astype(np.float64)
    if not audio.size:
        raise SystemExit('ffmpeg produced no audio')
    return audio


def log_mel(audio):
    # torchaudio center=True, reflect padding, periodic Hann, power=1.
    padded = np.pad(audio, (N_FFT // 2, N_FFT // 2), mode='reflect')
    if padded.size < N_FFT:
        padded = np.pad(padded, (0, N_FFT - padded.size))
    frames = np.lib.stride_tricks.sliding_window_view(padded, N_FFT)[::HOP]
    window = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(WIN) / WIN)
    spectrum = np.fft.rfft(frames * window, axis=1)
    magnitude = np.abs(spectrum).T  # [freq, frames]
    with np.errstate(all='ignore'):
        mel = mel_filterbank() @ magnitude
    return np.log(np.maximum(mel, 1e-5))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audio', required=True, help='WAV, MP3 or other ffmpeg-readable sample')
    parser.add_argument('--text', required=True, help='exact transcript of the sample')
    parser.add_argument('--id', required=True, help='lowercase id used in the URL and file names')
    parser.add_argument('--name', default='', help='human-readable voice name')
    parser.add_argument('--out', default='assets/f5/refs', help='output directory')
    args = parser.parse_args()

    if not args.id.replace('-', '').isalnum() or args.id != args.id.lower():
        raise SystemExit('--id must be lowercase letters, digits or dashes')
    text = ' '.join(args.text.split())
    if len(text) < 12:
        raise SystemExit('--text is too short to be a useful transcript')

    audio = decode_audio(args.audio)
    mel = log_mel(audio)
    frames = mel.shape[1]
    if frames < 200:
        raise SystemExit(f'sample is too short ({frames} frames); aim for 4-8 seconds')
    if frames > 768:
        raise SystemExit(f'sample is too long ({frames} frames); crop it to about 6 seconds')

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    bin_path = out / f'{args.id}.bin'
    json_path = out / f'{args.id}.json'
    bin_path.write_bytes(mel.astype('<f2').tobytes())
    meta = {
        'id': args.id,
        'name': args.name or args.id.replace('-', ' ').title(),
        'mel_file': f'{args.id}.bin',
        'mel_shape': [N_MELS, frames],
        'dtype': 'float16',
        'ref_text': text,
        'seconds': round(audio.size / SAMPLE_RATE, 2),
    }
    json_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {bin_path} ({bin_path.stat().st_size:,} bytes)')
    print(f'wrote {json_path} ({frames} frames, {meta["seconds"]}s)')
    print(f'mel range: {mel.min():.3f} .. {mel.max():.3f}; mean {mel.mean():.3f}')


if __name__ == '__main__':
    main()
