#!/usr/bin/env python3
"""Tạo MP3 nghe hiểu cho app Kotoba.
Chạy trên máy local (không chạy được trên VM do proxy chặn WebSocket).

Yêu cầu: pip install edge-tts

Cách dùng:
    python3 tao_audio_nghe.py

Đọc /tmp/listen_audio.json (125 đoạn), tạo MP3 vào audio/listen/.
- female -> ja-JP-NanamiNeural (giọng nữ)
- male -> ja-JP-KeitaNeural (giọng nam)
- rate -10% giống audio cũ của app
"""
import asyncio
import json
import os
import re
import sys

try:
    import edge_tts
except ImportError:
    sys.exit("Cần cài edge-tts: pip install edge-tts")

AUDIO_JSON = "/tmp/listen_audio.json"
OUT_DIR = "audio/listen"
RATE = "-10%"

async def gen_one(item):
    fname = item["file"]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", fname)
    # nếu chạy từ repo root
    if not os.path.exists(os.path.dirname(os.path.abspath(__file__)) + "/../" + fname):
        out = fname
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    if os.path.exists(out) and os.path.getsize(out) > 0:
        print(f"skip (đã có): {fname}")
        return
    text = item["text"]
    voice = item["voice"]
    try:
        tts = edge_tts.Communicate(text, voice, rate=RATE)
        await tts.save(out)
        print(f"OK: {fname} [{voice}]")
    except Exception as e:
        print(f"LỖI {fname}: {e}")

async def main():
    items = json.load(open(AUDIO_JSON, encoding="utf-8"))
    print(f"Tổng {len(items)} file")
    for it in items:
        await gen_one(it)
    print("Xong!")

if __name__ == "__main__":
    asyncio.run(main())
