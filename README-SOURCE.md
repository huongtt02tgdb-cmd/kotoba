# Kotoba — source + build

`index.html` (file 2MB deploy lên GitHub Pages) được **tạo tự động** từ thư mục `src/`
bằng script `tools/build.py`. Không sửa `index.html` trực tiếp nữa.

## Cấu trúc

```
src/
  index.template.html   # khung HTML, chứa marker <!--BUILD:BLOCK:...-->
  css/
    main.css            # style chính (gồm 6 font @font-face)
    theme.css           # biến theme :root
  js/
    app.js              # logic app (chứa placeholder __VDEF_JSON__ / __GD_JSON__)
  data/
    vocab.json          # 873 từ vựng (JSON thuần, sửa bằng editor thường)
    grammar.json        # 1300 câu ngữ pháp (JSON thuần)
  lib/
    xlsx.min.js         # SheetJS — chỉ nạp khi xem file Excel trong tab Tài liệu
tools/
  build.py              # ráp src/ -> index.html, tự tăng BUILD trong sw.js
tools/
  build.py              # ráp src/ -> index.html, tự tăng BUILD trong sw.js
```

## Workflow mới

```bash
# 1. Sửa file nhỏ, ví dụ thêm từ vào src/data/vocab.json
# 2. Build thử ở máy local (cần Python 3):
python tools/build.py
# 3. Push:
git add src tools && git commit -m "..." && git push
```

Khi push lên `main`, **GitHub Actions tự chạy `tools/build.py`** rồi commit
`index.html` + `sw.js` mới — bạn không cần build ở máy.

## Quy tắc

- Dữ liệu (`vocab.json`, `grammar.json`) phải là JSON hợp lệ.
- Trong `src/js/app.js` giữ nguyên 2 placeholder `__VDEF_JSON__` và `__GD_JSON__`
  (build.py sẽ thay bằng nội dung 2 file JSON).
- Không sửa `index.html` bằng tay — mọi thay đổi sẽ bị ghi đè khi build.

## Kho dữ liệu gốc (từ 2026-10-10)

**Mọi dữ liệu từ vựng + bài tập chỉ nằm trong repo, không nhập/liưu trong app nữa:**

- `src/data/vocab.json` — toàn bộ từ vựng. App luôn đọc từ đây (`VDEF`),
  không đọc/ghi localStorage, không còn chức năng nhập Excel / thêm tay / sửa / xóa / sao lưu.
- `src/data/grammar.json` — toàn bộ câu ngữ pháp (hiện 1300 câu, bài 1–13).
  Không còn chức năng "Thêm bài tập từ file".
- Muốn thêm/sửa từ hoặc câu hỏi: **sửa trực tiếp 2 file JSON trên** rồi push,
  hoặc **gửi file Excel cho Pax trong chat** để convert rồi push (không cần SheetJS trong app).
- Tên mẫu ngữ pháp (`patterns`) nằm trong `GPT` ở đầu `src/js/app.js`
  (hiện có bài 1, 2, 10–13; bài 3–9 hiển thị "Mẫu N").
