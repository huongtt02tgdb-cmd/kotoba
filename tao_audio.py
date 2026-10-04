#!/usr/bin/env python3
"""Tạo file âm thanh (giọng Edge Nanami) cho Kotoba.
Cách dùng:   pip install edge-tts
             python tao_audio.py
Chạy lại bao nhiêu lần cũng được: file nào có rồi sẽ bỏ qua.
Giọng nam:   python tao_audio.py --voice ja-JP-KeitaNeural
"""
import asyncio, json, os, sys, argparse
try:
    import edge_tts
except ImportError:
    sys.exit('Chưa có edge-tts. Hãy chạy:  pip install edge-tts')

ap = argparse.ArgumentParser()
ap.add_argument('--voice', default='ja-JP-NanamiNeural')
ap.add_argument('--rate', default='-10%', help='tốc độ, ví dụ -10%% (chậm hơn một chút, hợp để học)')
ap.add_argument('--workers', type=int, default=4)
a = ap.parse_args()

here = os.path.dirname(os.path.abspath(__file__))
adir = os.path.join(here, 'audio'); os.makedirs(adir, exist_ok=True)
items = json.load(open(os.path.join(here, 'texts.json'), encoding='utf-8'))
ok_size = lambda p: os.path.exists(p) and os.path.getsize(p) > 500

def write_index():
    idx = {x['k']: x['f'] for x in items if ok_size(os.path.join(adir, x['f']))}
    json.dump(idx, open(os.path.join(adir, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    return len(idx)

async def one(x, sem, st):
    p = os.path.join(adir, x['f'])
    if ok_size(p): st['skip'] += 1; return
    async with sem:
        for t in range(4):
            try:
                await edge_tts.Communicate(x['t'], a.voice, rate=a.rate).save(p)
                if ok_size(p): st['done'] += 1; break
            except Exception as e:
                err = e; await asyncio.sleep(1.5 * (t + 1))
        else:
            st['fail'] += 1; print('Lỗi:', x['t'], err)
    n = st['done'] + st['skip'] + st['fail']
    if n % 50 == 0: print(f'  {n}/{len(items)}  (mới {st["done"]}, bỏ qua {st["skip"]}, lỗi {st["fail"]})', flush=True)
    if st['done'] and st['done'] % 200 == 0: write_index()

async def main():
    sem = asyncio.Semaphore(a.workers); st = {'done': 0, 'skip': 0, 'fail': 0}
    print(f'Giọng {a.voice} · {len(items)} câu/từ'); await asyncio.gather(*[one(x, sem, st) for x in items])
    n = write_index()
    print(f'XONG. Có {n}/{len(items)} file trong thư mục audio.' + (f' Còn {st["fail"]} lỗi: hãy chạy lại script.' if st['fail'] else ''))

asyncio.run(main())
