# Kho tri thức cho chatbot (RAG)

Nội dung **tóm tắt, diễn giải lại** từ các trang hướng dẫn công khai của BV Đại học Y Dược TP.HCM (bvdaihoc.com.vn), lấy ngày 26/10/2026, chỉ dùng cho mục đích học tập. Đây không phải bản sao nguyên văn. Giờ bắt đầu khám (07h00) và hạn hủy lịch (15h00 hôm trước) đã được chỉnh cho khớp quy tắc của bản demo. Trước khi demo, nên mở link `source` để đối chiếu lại thông tin.

Mỗi file có phần frontmatter gồm `title`, `category`, `source`, `retrieved`. Khi index vào vector DB, giữ các trường này làm metadata để chatbot trích dẫn được nguồn.

| File | Nội dung | Category |
|---|---|---|
| 00-thong-tin-chung.md | Cơ sở, hotline, giờ làm việc, kênh đặt lịch | general |
| 01-dat-lich-truc-tuyen.md | Các bước đặt khám online, việc cần làm khi đến viện | booking |
| 02-bhyt-dung-tuyen.md | Giấy tờ, mức hưởng, hạn giấy chuyển tuyến | insurance |
| 03-bhyt-trai-tuyen-2026.md | Trái tuyến ngoại trú từ 01/07/2026, các khoản BHYT không chi trả | insurance |
| 04-dat-lich-bhyt-trai-tuyen-app.md | Đặt lịch trái tuyến trên app | booking |
| 05-ket-toan-bhyt-app.md | Kết toán BHYT online | payment |
| 06-bao-lanh-vien-phi.md | Bảo hiểm tư nhân, bảo lãnh viện phí | insurance |
| 07-thanh-toan-khong-tien-mat.md | Các hình thức thanh toán | payment |
| 08-hoa-don-vat.md | Xuất hóa đơn VAT | payment |
| 09-hoan-tien.md | Hủy phiếu, hoàn tiền | payment |
| 10-noi-tru.md | Nội quy, tiện ích nội trú, người nuôi bệnh | inpatient |
| 11-nguoi-benh-nuoc-ngoai.md | Người bệnh nước ngoài | international |
| 12-kham-suc-khoe-theo-yeu-cau.md | Gói khám sức khỏe, chuẩn bị trước khi xét nghiệm | health-check |
| 13-dich-vu-va-chuyen-khoa.md | Hình thức khám, lịch bác sĩ, cấp cứu, danh sách khoa | services |
| 14-faq.md | Câu hỏi thường gặp | faq |

Quy tắc nghiệp vụ rút ra từ các tài liệu này nằm ở [../docs/business-rules.md](../docs/business-rules.md).
