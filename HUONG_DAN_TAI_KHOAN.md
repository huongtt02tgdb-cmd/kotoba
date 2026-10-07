# Đăng nhập tài khoản (email + mật khẩu)

Lưu theo tài khoản: chuỗi học và thời gian học, từ vựng đã chọn, tiến độ bài tập ngữ pháp.
Dùng chung một dự án Firebase cho cả Kotoba và Hànyǔ (mỗi app lưu ở nhánh riêng, không lẫn nhau). Miễn phí.

## 1. Tạo dự án Firebase (làm một lần)
1. Vào https://console.firebase.google.com → **Add project** (tắt Google Analytics cũng được).
2. **Build → Realtime Database → Create database** (chọn khu vực gần bạn, bắt đầu ở "locked mode").
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
4. **Project settings (bánh răng) → General → Web API Key**: sao chép (dạng `AIza...`).
5. Địa chỉ database ở trang Realtime Database, dạng `https://ten-du-an-default-rtdb.firebaseio.com`.

## 2. Đặt quy tắc bảo mật (quan trọng)
Realtime Database → tab **Rules** → dán rồi **Publish**:
```
{
  "rules": {
    "users": {
      "$uid": { ".read": "auth.uid === $uid", ".write": "auth.uid === $uid" }
    }
  }
}
```
Mỗi người chỉ đọc/ghi được dữ liệu của chính mình. 
## 3. Gắn cấu hình vào app (làm một lần cho mỗi app)
Mở file `firebase-config.js` (nằm cạnh `index.html`) bằng Notepad và điền hai thông tin, giữ nguyên dấu nháy:
```
window.FBCFG={
  key:'AIza...API key của bạn...',
  db:'https://ten-du-an-default-rtdb.firebaseio.com'
};
```
Lưu, commit và push lên GitHub. Người dùng chỉ thấy ô Email và Mật khẩu, không thấy gì về Firebase.
Khi cập nhật app sau này, đừng ghi đè file `firebase-config.js` đã điền.

## 4. Dùng
Mở trang là thấy màn hình **Đăng nhập / Đăng ký**. Đăng ký: nhập email, mật khẩu hai lần; nếu email đã có tài khoản thì báo "Email này đã có tài khoản", chưa có thì tạo mới. Đã đăng nhập một lần thì lần sau vào thẳng app, kể cả khi không có mạng. Nút **Đăng xuất** nằm ở tab **Chuỗi học**.
- Thiết bị khác: đăng nhập cùng email.
- Quên mật khẩu: nhập email rồi bấm **Quên mật khẩu**, Firebase gửi thư đặt lại.
- Đăng nhập lần đầu: tiến độ ngữ pháp trên máy được gộp với tài khoản (lấy điểm cao hơn).
- Từ vựng: bản nào sửa sau cùng thì thắng. Nếu bị ghi đè, bản cũ trên máy được giữ ở khóa `...-v1-truoc` trong trình duyệt.
- Đăng xuất không xóa dữ liệu trên máy lẫn trên tài khoản.

## Lưu ý
- Mật khẩu không được lưu trong app, chỉ lưu mã phiên của Firebase.
- Web API Key của Firebase không phải bí mật (nằm công khai trong mọi web app); bảo mật nằm ở phần Rules ở bước 2.
- Gói miễn phí (Spark) đủ cho lớp học vài trăm người.
