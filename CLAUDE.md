# Hệ thống đặt lịch khám và chatbot hỗ trợ người bệnh

Đồ án cá nhân, chạy local. Mô phỏng nghiệp vụ Cơ sở 1 của BV Đại học Y Dược TP.HCM. Trọng tâm là chatbot: hỏi đáp thủ tục bằng RAG, gợi ý chuyên khoa, đặt, hủy, sửa lịch trong hội thoại.

Đây là bản demo: quy định chỉ cần sát thực tế, không cần chính xác tuyệt đối. Giao tiếp với người dùng bằng tiếng Việt.

## Tài liệu phải bám theo

| File | Nội dung |
|---|---|
| [docs/srs.md](docs/srs.md) | Yêu cầu FR, NFR, use case UC, đặc tả UC-07, ERD, các quyết định đã chốt |
| [docs/business-rules.md](docs/business-rules.md) | Quy tắc nghiệp vụ BR, nguồn gốc của từng quy tắc |
| [docs/research-medpro.md](docs/research-medpro.md) | Khảo sát Medpro |
| [knowledge/](knowledge/) | Kho tri thức cho RAG |

Bản gốc của SRS nằm trên Claude Docs: https://claude.ai/artifact/LgKcP8dgZDxbACbc95AmFZ. `docs/srs.md` là bản sao, sửa một bên thì cập nhật bên còn lại.

## Quy tắc khi làm

- Đọc mục liên quan trong SRS và business-rules trước khi làm một tính năng. Yêu cầu mới hoặc thay đổi nghiệp vụ thì cập nhật tài liệu trước, code sau.
- Ánh xạ tài liệu vào code:
  - Hàm kiểm tra quy tắc ghi mã trong comment, ví dụ `# BR-26: hủy trước 15h00 ngày trước ngày khám`.
  - Tên test chứa mã, ví dụ `test_br26_huy_truoc_15h`, `test_fr19_dat_lich_qua_chat`.
  - Commit ghi mã liên quan, ví dụ `feat(booking): chặn đặt quá hạn (FR-08, BR-07)`.
- Không viết cứng khoa, hình thức khám, giá, hạn chót trong code; đây là dữ liệu cấu hình (NFR-08).

## Chạy dự án

Lệnh chạy, test và migration nằm trong [README.md](README.md). Backend chạy trong Docker, nên chạy test bằng `docker compose exec backend pytest`. PostgreSQL ra cổng 5433 vì máy đã có dịch vụ khác dùng cổng 5432.

## Kiến trúc đã chốt

- Stack: React + Vite + TailwindCSS, FastAPI, PostgreSQL + pgvector, Claude API, Docker Compose.
- LLM chỉ được tạo bản nháp qua `prepare_booking`. Việc xác nhận lịch đi thẳng từ giao diện tới backend, không qua LLM (BR-32).
- `user_id` lấy từ phiên đăng nhập, không lấy từ LLM.
- Kiểm tra cấp cứu chạy trước khi tin nhắn tới LLM, câu cảnh báo là cố định (BR-30).
- Số CCCD và số thẻ BHYT nhập qua form, không đi qua LLM (BR-33).
- Form và chatbot dùng chung một API đặt lịch, quy tắc chỉ cài đặt một lần.
