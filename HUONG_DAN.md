# Kotoba – đưa lên GitHub Pages, dùng như app trên iPad / Mi Pad

## A. Tạo âm thanh (làm 1 lần, trên máy tính có mạng)
1. Cài Python (python.org, nhớ tick **Add Python to PATH**).
2. Mở Terminal / Command Prompt, đi tới thư mục này rồi gõ:
   - `pip install edge-tts`
   - `python tao_audio.py`
   Chờ vài phút → xuất hiện thư mục `audio/` (có `index.json` và các file .mp3). Gặp lỗi mạng thì chạy lại, file nào có rồi sẽ được bỏ qua.
   Muốn giọng nam: `python tao_audio.py --voice ja-JP-KeitaNeural`

## B. Đưa lên GitHub
Chép TOÀN BỘ thư mục này (index.html, manifest.json, sw.js, icons/, audio/…) vào repo `kotoba`, thay file cũ, commit.
Chờ 1–2 phút rồi mở https://huongtt02tgdb-cmd.github.io/kotoba/
(`tao_audio.py`, `texts.json`, `HUONG_DAN.md` không bắt buộc phải đưa lên.)

## C. Cài trên thiết bị
- **iPad (Safari):** Chia sẻ → *Thêm vào Màn hình chính*.
- **Mi Pad (Chrome/Edge):** menu ⋮ → *Cài đặt ứng dụng* / *Thêm vào màn hình chính*.
Mở app (có mạng) → tab **Từ vựng**, mục *Giọng đọc* → bấm **Tải sẵn âm thanh để dùng offline** → từ đó dùng được khi không có mạng.

## Lưu ý
- Từ vựng (873 từ) và bài tập Bài 1–9 đã có sẵn trong app. Các nút nhập từ vựng, thêm bài tập từ file, xóa, sao lưu/khôi phục vẫn giữ nguyên.
- Lịch sử học lưu riêng trên từng thiết bị. Chuyển giữa các máy bằng **Sao lưu / Khôi phục**.
- Sau khi cập nhật app, mở lại 2 lần để bản mới được áp dụng.
