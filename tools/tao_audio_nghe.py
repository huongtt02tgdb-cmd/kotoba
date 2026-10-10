#!/usr/bin/env python3
"""Tạo MP3 nghe hiểu cho app Kotoba.
Chạy trên máy local (không chạy được trên VM do proxy chặn WebSocket).

Yêu cầu: pip install edge-tts

Cách dùng:
    python tools/tao_audio_nghe.py

Đọc tools/listen_audio.json (125 đoạn), tạo MP3 vào audio/listen/.
- Dialogue: mỗi lượt nói tạo riêng bằng đúng giọng (A=nam Keita, B=nữ Nanami),
  rồi nối lại thành 1 file -> nghe như hội thoại thật, không dùng SSML
- Monologue: 1 giọng (xen kẽ Nanami/Keita theo đoạn)
- rate -10% giống audio cũ của app
"""
import asyncio
import json
import os
import sys
import tempfile

try:
    import edge_tts
except ImportError:
    sys.exit("Cần cài edge-tts: pip install edge-tts")

AUDIO_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "listen_audio.json")
RATE = "-10%"

def strip_id3(data):
    """Bỏ ID3 tag ở đầu để nối MP3 cho sạch."""
    if data[:3] == b'ID3':
        size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
        return data[10 + size:]
    return data

async def tts_to_bytes(text, voice):
    """Tạo audio cho 1 đoạn text, trả về bytes MP3 (không ID3)."""
    tts = edge_tts.Communicate(text, voice, rate=RATE)
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        tmp = f.name
    try:
        await tts.save(tmp)
        with open(tmp, 'rb') as f:
            return strip_id3(f.read())
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

async def gen_one(item, repo_root):
    fname = item["file"]
    out = os.path.join(repo_root, fname)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out) and os.path.getsize(out) > 0:
        print(f"skip (đã có): {fname}")
        return
    try:
        if item["kind"] == "dialogue":
            parts = []
            for t in item["turns"]:
                audio = await tts_to_bytes(t["text"], t["voice"])
                parts.append(audio)
            combined = b''.join(parts)
            with open(out, 'wb') as f:
                f.write(combined)
        else:
            audio = await tts_to_bytes(item["text"], item["voice"])
            with open(out, 'wb') as f:
                f.write(audio)
        print(f"OK: {fname} [{item['kind']}]")
    except Exception as e:
        print(f"LỖI {fname}: {e}")
        if os.path.exists(out):
            os.remove(out)

async def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    items = json.load(open(AUDIO_JSON, encoding="utf-8"))
    print(f"Tổng {len(items)} file")
    for it in items:
        await gen_one(it, repo_root)
    print("Xong!")

if __name__ == "__main__":
    asyncio.run(main())
