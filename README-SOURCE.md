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
    vendor/
      xlsx.min.js       # SheetJS, giữ nguyên không sửa
  data/
    vocab.json          # 873 từ vựng (JSON thuần, sửa bằng editor thường)
    grammar.json        # 900 mục ngữ pháp (JSON thuần)
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
- File build ra được verify byte-identical với bản gốc (so SHA256 từng khối).
