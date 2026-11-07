# Hệ thống đặt lịch khám và chatbot hỗ trợ người bệnh

Đồ án cá nhân, chạy local. Mô phỏng nghiệp vụ đặt lịch khám của một bệnh viện, trọng tâm là chatbot hỏi đáp thủ tục, gợi ý chuyên khoa và đặt lịch trong hội thoại. Dữ liệu nghiệp vụ chỉ để tham khảo cho mục đích học tập.

Yêu cầu và thiết kế: [docs/srs.md](docs/srs.md), [docs/business-rules.md](docs/business-rules.md).

## Chạy dự án

Cần Docker Desktop đang chạy.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend python -m app.seed
```

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
docker compose down -v                                                    # xóa cả dữ liệu
```
