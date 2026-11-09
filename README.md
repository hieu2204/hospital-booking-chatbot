# Hệ thống đặt lịch khám và chatbot hỗ trợ người bệnh

Đồ án cá nhân, chạy local. Mô phỏng nghiệp vụ đặt lịch khám của một bệnh viện, trọng tâm là chatbot hỏi đáp thủ tục, gợi ý chuyên khoa và đặt lịch trong hội thoại. Dữ liệu nghiệp vụ chỉ để tham khảo cho mục đích học tập.

Yêu cầu và thiết kế: [docs/srs.md](docs/srs.md), [docs/business-rules.md](docs/business-rules.md).

## Chạy dự án

Cần Docker Desktop đang chạy.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend python -m app.seed
docker compose exec backend python -m app.index_knowledge
```

Lần chạy đầu, backend tải mô hình embedding khoảng 2,2 GB (15–20 phút), sau đó lưu trong volume `model_cache`. Chatbot cần `ANTHROPIC_API_KEY` trong `.env`.

- Giao diện: http://localhost:5173
- API: http://localhost:8000, tài liệu API: http://localhost:8000/docs
- PostgreSQL: cổng 5433 trên máy

Chạy lại `app.seed` mỗi khi cần sinh bù ca khám cho 30 ngày tới, lệnh này không tạo trùng.

Tài khoản demo (mật khẩu là `SEED_PASSWORD` trong `.env`):

| Vai trò | Số điện thoại |
|---|---|
| Quản trị viên | 0900000001 |
| Bệnh nhân | 0900000002 |

## Lệnh thường dùng

```bash
docker compose exec backend pytest                                        # chạy test
docker compose exec backend alembic revision --autogenerate -m "mo ta"    # tạo migration
docker compose exec backend alembic upgrade head                          # áp dụng migration
docker compose exec backend python -m app.usage_report                     # chi phí Claude đã dùng
docker compose exec -e CHAT_MODEL=claude-haiku-5-5 backend python -m evals.chat_smoke   # chạy thử chatbot thật
docker compose run --rm --no-deps frontend npm run build                  # kiểm tra kiểu và build frontend
sh tools/screenshots/run.sh                                               # chụp màn hình các trang vào tools/screenshots/out/
docker compose down -v                                                    # xóa cả dữ liệu và mô hình đã tải
```

## Đánh giá chatbot (NFR-06)

Bộ đánh giá gọi Claude thật nên có tốn tiền. Cả bộ 114 ca chạy khoảng 3 phút với 4 luồng, tốn khoảng $0,15 với Haiku và $2,6 với Sonnet.

```bash
docker compose exec backend python -m evals.chat_quality                                  # cả bộ, mô hình theo cấu hình
docker compose exec -e CHAT_MODEL=claude-haiku-5-5 backend python -m evals.chat_quality   # chạy rẻ khi đang sửa
docker compose exec backend python -m evals.chat_quality --suite dat_lich --ids dl01,dl02  # vài ca
docker compose exec backend python -m evals.chat_quality --regrade evals/reports/<file>.json  # chấm lại kết quả cũ, không tốn tiền
docker compose exec backend python -m evals.eval_retrieval                                # chất lượng tìm tài liệu, không tốn tiền
```

Bộ test nằm ở `backend/evals/chat_cases/`:

| File | Nội dung | Mục tiêu |
|---|---|---|
| `thu_tuc.json` | 46 câu thủ tục, kèm câu không có trong tài liệu, câu ngoài phạm vi, câu hỏi thuốc và chẩn đoán | Trả lời đúng ≥ 85% |
| `chuyen_khoa.json` | 30 mô tả triệu chứng, có câu không dấu | Gợi ý đúng khoa ≥ 80% |
| `dat_lich.json` | 20 kịch bản đặt lịch nhiều lượt | Hoàn tất ≥ 90% |

Câu thủ tục đạt khi câu trả lời có đủ các ý bắt buộc lấy từ `knowledge/` và có trích nguồn. Gợi ý khoa đạt khi nêu đúng khoa và có câu lưu ý. Kịch bản đặt lịch đạt khi bot tạo bản nháp đúng khoa, hồ sơ, đối tượng thanh toán và buổi khám. Báo cáo ghi vào `backend/evals/reports/`; script dùng tài khoản riêng `0900009001`, không đụng tài khoản demo.
