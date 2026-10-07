#!/usr/bin/env python3
"""Tạo docs/index.json (danh sách tài liệu) - KHÔNG bắt buộc.
App tự lấy danh sách từ GitHub. File này chỉ dùng nếu muốn danh sách hiện ngay, không phụ thuộc GitHub.
Cách dùng: bỏ file vào thư mục docs, rồi chạy:  python tao_danh_muc.py
"""
import os, json
here = os.path.dirname(os.path.abspath(__file__)); d = os.path.join(here, 'docs')
out = []
for root, _, fs in os.walk(d):
    for f in sorted(fs):
        if f.lower() in ('index.json', 'readme.md', '.gitkeep', '.ds_store', 'thumbs.db'): continue
        p = os.path.join(root, f); rel = os.path.relpath(p, d).replace(os.sep, '/')
        out.append({'f': rel, 'n': os.path.splitext(f)[0], 's': os.path.getsize(p)})
json.dump(out, open(os.path.join(d, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Đã ghi docs/index.json với', len(out), 'tài liệu')
