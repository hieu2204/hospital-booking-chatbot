# Quy tắc nghiệp vụ (Business Rules)

Tham khảo từ website BV Đại học Y Dược TP.HCM (bvdaihoc.com.vn), lấy ngày 26/10/2026, phục vụ mục đích học tập. Đây là bản demo nên quy định chỉ cần sát thực tế, không cần chính xác tuyệt đối.

Cột **Nguồn**:
- `UMC`: lấy từ tài liệu của bệnh viện (file tương ứng trong [knowledge/](../knowledge/)).
- `Medpro`: quan sát từ nền tảng Medpro.
- `Giả định`: quy tắc do đồ án tự đặt ra vì nguồn không nêu, cần ghi rõ trong báo cáo.

Cột **Áp dụng tại**:
- `Booking`: kiểm tra ở backend khi đặt, hủy lịch.
- `Chatbot`: đưa vào system prompt hoặc RAG để bot tư vấn.
- `UI`: hiển thị hoặc ràng buộc trên giao diện.

## 1. Thời gian khám

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-01 | Khám ngoại trú T2–T6: sáng 07h00–12h00, chiều 13h00–16h30 | Medpro (giờ bắt đầu) / UMC (00) | Booking, Chatbot |
| BR-02 | Thứ Bảy chỉ khám buổi sáng 07h00–12h00 | Medpro (giờ bắt đầu) / UMC (00) | Booking, Chatbot |
| BR-03 | Chủ nhật, ngày lễ, Tết **không** khám ngoại trú, nên không sinh slot cho các ngày này | UMC (00) | Booking, UI |
| BR-04 | Khoa Cấp cứu 24/7, không đặt lịch qua hệ thống | UMC (13) | Chatbot |
| BR-05 | Mỗi slot khám dài **30 phút** | Medpro / Giả định | Booking |
| BR-06 | Mỗi slot nhận tối đa **N** người bệnh, N cấu hình theo từng ca, mặc định 3 | Giả định | Booking |
| BR-07 | Đặt trước **1–30 ngày**. Muốn đặt lịch ngày mai phải đặt và thanh toán **trước 16h30 hôm nay**. Không đặt được slot đã qua | Medpro | Booking, UI |
| BR-07a | Ngày đặt càng sớm thì **số thứ tự** càng nhỏ. Phiếu khám hiển thị số thứ tự và **giờ khám dự kiến** | Medpro | Booking, UI |

## 2. Lịch bác sĩ

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-08 | Bác sĩ có lịch cố định theo **buổi trong tuần** (ví dụ "Sáng T2"); hệ thống sinh lịch theo ngày từ mẫu tuần này | UMC (13) | Booking |
| BR-09 | Có thể khai báo **ngày khám thay**: bác sĩ B khám thay bác sĩ A vào một ngày cụ thể. Lịch hẹn giữ nguyên, người bệnh được thông báo | UMC (13) | Booking, UI |
| BR-10 | Bác sĩ nghỉ đột xuất thì khóa ca; các lịch hẹn đã đặt chuyển sang trạng thái `need_reschedule` | Giả định | Booking |

## 3. Đặt lịch và hồ sơ người bệnh

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-11 | Phải đăng nhập bằng **số điện thoại** mới đặt lịch được | UMC (01) | Booking, UI |
| BR-12 | Một tài khoản quản lý **nhiều hồ sơ người bệnh** (bản thân và người thân); mỗi lịch hẹn gắn với một hồ sơ | UMC (01) | Booking |
| BR-12a | Có 2 cách tạo hồ sơ: (1) người bệnh **đã từng khám** thì nhập mã bệnh nhân để liên kết; (2) **bệnh nhân mới** thì nhập họ tên, ngày sinh, giới tính, CCCD/hộ chiếu, số BHYT (nếu có), SĐT, email, địa chỉ | Medpro | Booking, UI |
| BR-12b | Có 2 luồng đặt: **theo chuyên khoa** (chọn khoa trước rồi đến bác sĩ) và **theo bác sĩ** (chọn bác sĩ trước rồi xem lịch) | Medpro | UI, Chatbot |
| BR-13 | Luồng đặt: chọn hồ sơ → chuyên khoa → (bác sĩ) → ngày → slot → xác nhận → thanh toán → phiếu khám điện tử | UMC (01) | Booking, UI |
| BR-14 | Mỗi hồ sơ người bệnh không được đặt **2 lịch trùng giờ**, và tối đa **3 lịch/ngày** | Giả định | Booking |
| BR-15 | Hai người cùng đặt slot cuối cùng thì chỉ một người thành công (dùng transaction hoặc lock) | Giả định | Booking |
| BR-16 | Lịch hẹn chỉ ở trạng thái **xác nhận** sau khi đã thanh toán (đồ án giả lập thanh toán). Chưa thanh toán sau 15 phút thì tự hủy và trả slot | UMC (01) / Giả định | Booking |
| BR-17 | Phiếu khám điện tử gồm: mã lịch hẹn, mã QR, hồ sơ, chuyên khoa, bác sĩ, phòng, ngày giờ, số thứ tự, hướng dẫn khi đến viện | UMC (01) / Giả định | UI |

## 4. Hình thức khám và BHYT

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-18 | Hình thức khám trong MVP: **Khám thường**, **Phòng khám Chuyên gia**, **Tái khám**. Khám sức khỏe theo gói để vào phần mở rộng | UMC (13) | Booking |
| BR-18a | Giá khám demo: Khám thường và Tái khám 150.000đ (Medpro), Phòng khám Chuyên gia 300.000đ (giả định, không đọc được Bảng giá của UMC). Phòng khám Chuyên gia không nhận BHYT (giả định) | Medpro / Giả định | Booking, Chatbot |
| BR-19 | Đối tượng thanh toán của lịch hẹn: `none` (dịch vụ) / `bhyt_dung_tuyen` / `bhyt_trai_tuyen` / `bao_lanh` (bảo hiểm tư nhân). Với `bao_lanh`, hệ thống chỉ ghi nhận và hướng dẫn đến quầy | UMC (02, 03, 06) | Booking |
| BR-19a | Demo thu đủ phí khám dù có BHYT; mức hưởng chỉ dùng để tư vấn | Giả định | Booking, Chatbot |
| BR-20 | BHYT đúng tuyến cần: thẻ BHYT (hoặc CCCD/VNeID có tích hợp), giấy tờ có ảnh, và **giấy chuyển tuyến** hoặc **giấy hẹn tái khám** | UMC (02) | Chatbot, UI |
| BR-21 | Giấy chuyển tuyến có hạn **10 ngày làm việc** (bệnh thuộc Phụ lục III: 1 năm). Hệ thống cảnh báo nếu ngày khám vượt hạn giấy | UMC (02) | Booking, Chatbot |
| BR-22 | Trái tuyến ngoại trú (từ 01/07/2026): BHYT chi trả **50% mức hưởng** (100%→50%, 95%→47,5%, 80%→40%). Khi đặt phải đính kèm ảnh CCCD 2 mặt và tick ô cam kết | UMC (03, 04) | Booking, Chatbot |
| BR-23 | Trong **cùng một ngày**, một hồ sơ không được dùng BHYT cho cả đúng tuyến lẫn trái tuyến | UMC (03) | Booking |
| BR-24 | Khám sức khỏe, thẩm mỹ, tật khúc xạ ở người ≥18 tuổi... **không** được dùng BHYT, nên ẩn tùy chọn BHYT với các dịch vụ này | UMC (03) | Booking, UI |
| BR-25 | Hướng dẫn khi đến viện thay đổi theo đối tượng: không BHYT thì đến phòng khám trước 15–30 phút; BHYT thì xác nhận ở quầy 12–14 Khu A; bảo lãnh thì đến quầy đăng ký | UMC (01) | UI, Chatbot |

## 5. Hủy và hoàn tiền

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-26 | Người bệnh tự hủy lịch online **trước 15h00 ngày trước ngày khám**. Quá hạn này, hoặc trong ngày khám, thì không hủy online được, phải liên hệ tổng đài | UMC (09) / Medpro | Booking, UI, Chatbot |
| BR-27 | Hủy online hợp lệ thì hoàn tiền về phương thức đã thanh toán (thực tế: ví 24 giờ đến 7 ngày, thẻ quốc tế 15–45 ngày; đồ án chỉ đổi trạng thái sang `refunded`) | UMC (09) / Medpro | Booking |
| BR-28 | Mỗi lịch hẹn được **sửa tối đa 1 lần, miễn phí, trước 16h30 ngày trước ngày khám**. Chỉ sửa được ngày, giờ, bác sĩ; số thứ tự cấp lại theo lịch mới | Medpro | Booking, Chatbot |
| BR-28a | Bác sĩ đổi lịch đột xuất sau 16h30 hôm trước: lịch hẹn không hủy, không đổi được; người bệnh khám với bác sĩ thay thế và được thông báo | Medpro | Booking |

## 6. Chatbot và an toàn

| Mã | Quy tắc | Nguồn | Áp dụng tại |
|---|---|---|---|
| BR-29 | Bot **không chẩn đoán, không kê đơn**. Gợi ý chuyên khoa luôn kèm câu lưu ý | Giả định | Chatbot |
| BR-29a | Gợi ý chuyên khoa tra bảng ánh xạ triệu chứng trước. Bảng **không khớp** cụm nào thì bot tự chọn khoa phù hợp nhất theo mô tả của các khoa; chỉ gợi ý **Khám bệnh** khi mô tả chung chung, không chỉ ra được cơ quan nào | Giả định (đánh giá NFR-06 ngày 09/11/2026: bảng chỉ khớp 57% mô tả thực tế) | Chatbot |
| BR-30 | Phát hiện dấu hiệu cấp cứu (đau ngực dữ dội, khó thở, yếu liệt, co giật, bất tỉnh, chảy máu nhiều, có ý định tự hại) thì dừng luồng đặt lịch và hướng dẫn gọi **115** hoặc đến Cấp cứu, SĐT (028) 3952 5515 | UMC (13) / Giả định | Chatbot |
| BR-31 | Bot chỉ trả lời thủ tục dựa trên tài liệu trong kho. Không tìm thấy thì nói rõ là không có thông tin và gợi ý tổng đài **1900 2827**. Điểm tương đồng của câu ngoài phạm vi chồng lên câu trong phạm vi (đo bằng `evals/eval_retrieval.py`), nên không lọc bằng ngưỡng điểm mà để LLM tự đánh giá đoạn tìm được có trả lời câu hỏi không | Giả định | Chatbot |
| BR-32 | Trước khi tạo, hủy hoặc đổi lịch, bot phải **tóm tắt và chờ người dùng bấm xác nhận** | Giả định | Chatbot |
| BR-33 | Không gửi số CCCD hoặc số thẻ BHYT đầy đủ cho LLM; chỉ gửi dạng đã che, ví dụ `****1234` | Giả định | Chatbot |
