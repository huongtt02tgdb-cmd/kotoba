#!/usr/bin/env python3
"""Tạo MP3 nghe hiểu cho app Kotoba.
Chạy trên máy local (không chạy được trên VM do proxy chặn WebSocket).

Yêu cầu: pip install edge-tts

Cách dùng:
    python tools/tao_audio_nghe.py

Đọc tools/listen_audio.json (125 đoạn), tạo MP3 vào audio/listen/.
- Dialogue: A và B dùng 2 giọng khác nhau (SSML), nghe như hội thoại thật
- Monologue: 1 giọng (xen kẽ Nanami/Keita theo đoạn)
- rate -10% giống audio cũ của app
"""
import asyncio
import json
import os
import sys
import xml.sax.saxutils as sax

try:
    import edge_tts
except ImportError:
    sys.exit("Cần cài edge-tts: pip install edge-tts")

AUDIO_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "listen_audio.json")
RATE = "-10%"

def build_ssml(turns):
    """Tạo SSML với voice xen kẽ cho hội thoại."""
    parts = ['<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">']
    for t in turns:
        text = sax.escape(t["text"])
        parts.append(f'<voice name="{t["voice"]}"><prosody rate="{RATE}">{text}</prosody></voice>')
    parts.append('</speak>')
    return ''.join(parts)

async def gen_one(item, repo_root):
    fname = item["file"]
    out = os.path.join(repo_root, fname)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out) and os.path.getsize(out) > 0:
        print(f"skip (đã có): {fname}")
        return
    try:
        if item["kind"] == "dialogue":
            ssml = build_ssml(item["turns"])
            tts = edge_tts.Communicate(ssml, "ja-JP-NanamiNeural")
        else:
            tts = edge_tts.Communicate(item["text"], item["voice"], rate=RATE)
        await tts.save(out)
        print(f"OK: {fname} [{item['kind']}]")
    except Exception as e:
        print(f"LỖI {fname}: {e}")

async def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    items = json.load(open(AUDIO_JSON, encoding="utf-8"))
    print(f"Tổng {len(items)} file")
    for it in items:
        await gen_one(it, repo_root)
    print("Xong!")

if __name__ == "__main__":
    asyncio.run(main())
