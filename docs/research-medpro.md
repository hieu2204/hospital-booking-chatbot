# Khảo sát hệ thống hiện có: Medpro

Ngày khảo sát: 26/10/2026. Nguồn: medpro.vn (Quy định sử dụng, các bài hướng dẫn và tin tức), phục vụ mục đích học tập.

> Các trang trong mục "Hướng dẫn" của Medpro tải nội dung bằng JavaScript nên không đọc được trực tiếp. Phần lớn thông tin dưới đây lấy từ trang **Quy định sử dụng** (nguồn chính thức nhất) và các bài hướng dẫn trong mục Tin tức.

## 1. Tổng quan

- **Mô hình:** nền tảng trung gian đặt khám cho nhiều cơ sở y tế (bệnh viện công, bệnh viện tư, phòng khám, phòng mạch, xét nghiệm, y tế tại nhà, tiêm chủng). Có website, app và tổng đài 1900 2115.
- **Doanh thu:** thu **phí tiện ích** cho mỗi lượt đặt, cộng phí trung gian thanh toán. Tiền khám do bệnh viện quy định.
- **BV ĐH Y Dược TP.HCM** có mặt trên Medpro với cả 3 cơ sở. Song song, bệnh viện có app riêng: UMC Care (cơ sở 1), UMC2, UMC3.

## 2. Các hình thức đặt khám (cấp cơ sở y tế)

Mỗi cơ sở y tế tự bật những hình thức mình hỗ trợ:

| Hình thức | Ghi chú |
|---|---|
| Đặt khám theo chuyên khoa | Chọn khoa, sau đó mới chọn bác sĩ (nếu có) |
| Đặt khám theo bác sĩ | Chọn bác sĩ trước, hệ thống hiện ra lịch của bác sĩ đó |
| Đặt khám ngoài giờ | Chỉ một số cơ sở có |
| Gói khám sức khỏe | Đặt theo gói |
| Đặt lịch chụp phim, nội soi | Đặt trực tiếp dịch vụ cận lâm sàng |
| Tư vấn khám qua video | Khám từ xa |

→ **Bài học cho đồ án:** đây chính là mô hình bảng `service_types` cấu hình theo cơ sở mà ta đã thiết kế. Nên hỗ trợ **2 điểm bắt đầu luồng**: theo chuyên khoa và theo bác sĩ.

## 3. Luồng đặt khám

```
Đăng nhập (SĐT + OTP)
  → Chọn cơ sở y tế → Chọn hình thức đặt khám
  → Chọn chuyên khoa → Chọn bác sĩ → Chọn dịch vụ → Chọn ngày → Chọn giờ
  → Chọn / tạo hồ sơ bệnh nhân
  → Xác nhận thông tin (tùy chọn: thêm dịch vụ hỗ trợ đi khám)
  → Thanh toán (tiền khám + phí tiện ích)
  → Nhận phiếu khám điện tử (app, email, SMS): giờ khám dự kiến + số thứ tự
```

### Tài khoản
- Định danh bằng **số điện thoại**, xác thực qua OTP. Khi đăng ký nhập họ tên, mật khẩu, ngày sinh, giới tính.

### Hồ sơ bệnh nhân (một tài khoản có nhiều hồ sơ)
Có 3 cách tạo hồ sơ:
1. **Đã từng khám:** nhập **mã số bệnh nhân** (mã hồ sơ tại bệnh viện) để liên kết.
2. **Quét thẻ BHYT / CCCD** để tự điền thông tin.
3. **Bệnh nhân mới:** họ tên, ngày sinh, giới tính, số BHYT, CCCD/hộ chiếu, dân tộc, nghề nghiệp, SĐT, email, địa chỉ.

Thông tin sai so với thực tế thì bệnh viện có thể **từ chối khám và không hoàn tiền**.

### Đặt nhiều chuyên khoa trong một lượt
- Các chuyên khoa phải **cùng ngày khám** và **không trùng giờ**.
- Mỗi chuyên khoa ra một phiếu riêng, nhưng **chỉ trả phí tiện ích một lần**.
- **Hủy một phiếu thì toàn bộ các phiếu trong lượt đó bị hủy.**

## 4. Quy định thời gian (áp dụng cho BV ĐH Y Dược)

| Quy định | Giá trị |
|---|---|
| Đặt trước | **1 – 30 ngày** (qua app phải đặt trước ít nhất 1 ngày) |
| Hạn đặt cho ngày mai | Đăng ký và thanh toán **trước 16h30 hôm nay** |
| Hạn hủy phiếu online | **Trước 15h00 ngày trước ngày khám** |
| Hạn sửa phiếu | **Trước 16h30 ngày trước ngày khám** |
| Số lần sửa | **1 lần, miễn phí**. Chỉ sửa được ngày, giờ, phòng khám (bác sĩ). Số thứ tự cấp lại theo lịch mới |
| Hủy trong / sau ngày khám | Không tự hủy được, phải gọi tổng đài |
| Bác sĩ đổi lịch đột xuất sau 16h30 hôm trước | Không hủy, không đổi được; người bệnh khám theo sắp xếp thay thế của bệnh viện |
| Đến viện | Trước giờ hẹn 15–30 phút. Có BHYT thì xác nhận tại quầy 12, 13, 14 Khu A |
| Hiệu lực phiếu giấy | 6h30 – 16h30 ngày khám |

→ Ngày đặt càng sớm thì **số thứ tự càng nhỏ**.

## 5. Phí và thanh toán

**Tiền khám tại BV ĐH Y Dược** (theo quy định trên Medpro, giá tham khảo):

| Chuyên khoa | Giá |
|---|---|
| Phần lớn chuyên khoa | 150.000đ |
| Tâm thần kinh | 250.000đ |
| Tư vấn tâm lý | 500.000đ |
| Tiêm ngừa | 100.000đ |
| Cơ sở 3 | khoảng 100.000đ |

**Phí tiện ích + phí trung gian thanh toán:** cộng thêm vào mỗi lượt đặt. Thanh toán bằng thẻ khám bệnh của bệnh viện thì phí thấp nhất.

**Phương thức thanh toán:** thẻ khám bệnh của bệnh viện, ATM nội địa, Visa/Master/JCB, ví MoMo/VNPay/ZaloPay/ViettelMoney/ShopeePay, QR/chuyển khoản, thanh toán tại cửa hàng (Thế Giới Di Động), trả sau (Fundiin).

**Hoàn tiền** (tính từ khi hủy thành công, không tính T7, CN, ngày lễ):

| Phương thức | Thời gian |
|---|---|
| MoMo, VNPay (tự hủy trên app trước hạn) | Trong 24 giờ |
| MoMo, VNPay (hủy qua tổng đài) | 5–7 ngày làm việc |
| ZaloPay, ViettelMoney, QR, ATM | 5–7 ngày làm việc |
| Thẻ quốc tế | 15–45 ngày làm việc |

## 6. Khi đến bệnh viện (BV ĐH Y Dược cơ sở 1)

1. Đến trước giờ hẹn 15 phút, đi thẳng đến phòng khám ghi trên phiếu.
2. Điều dưỡng kiểm tra phiếu. Thông tin sai thì ra **quầy tiếp nhận số 1** để sửa.
3. Bác sĩ khám, chỉ định cận lâm sàng nếu cần.
4. Đóng phí, làm cận lâm sàng, quay lại phòng khám nhận kết quả, chẩn đoán, đơn thuốc.
5. Thanh toán tại quầy thuốc, nhận thuốc.

**Tiện ích xung quanh:** bãi xe trong viện (khi quá tải thì gửi ở Hùng Vương Plaza), căn tin, Circle K, Highlands gần cổng.

## 7. Các tính năng khác đáng chú ý

- Lấy **số thứ tự online**, có **giờ khám dự kiến**.
- Nhắc lịch khám qua thông báo, SMS, email.
- Tổng đài 24/7, hỗ trợ qua Zalo và Messenger, có mục "Cộng đồng hỏi đáp".
- **Care247:** dịch vụ người hỗ trợ đưa đón và đi cùng người bệnh khi khám.
- Gợi ý từ chính Medpro: tổng đài quá tải vào T2, T3, nên gọi vào T6 đến CN.

## 8. Điểm yếu của Medpro, cũng là cơ hội cho đồ án

| Điểm yếu | Đồ án khắc phục bằng |
|---|---|
| Chỉ có form, người dùng phải **tự biết mình cần khám khoa nào** | Chatbot gợi ý chuyên khoa từ triệu chứng |
| Quy định dài, nằm rải rác ở nhiều trang (hủy, sửa, hoàn tiền, BHYT) | Chatbot trả lời ngay câu hỏi kiểu "15h chiều mai tôi khám, giờ còn hủy được không?" |
| Muốn hỏi thì phải gọi tổng đài, mà tổng đài hay quá tải | Bot trả lời 24/7, chỉ chuyển cho người thật khi cần |
| Không tư vấn chọn hình thức khám (thường, chuyên gia, BHYT đúng/trái tuyến) | Bot áp dụng quy tắc nghiệp vụ để tư vấn, ví dụ "không có giấy chuyển tuyến → trái tuyến, hưởng 50%" |
| Đổi lịch phải hủy rồi đặt lại (theo một số bài hướng dẫn) | Bot đổi lịch ngay trong hội thoại, tuân thủ hạn 16h30 và giới hạn 1 lần |

## 9. Đưa vào đồ án

**Nên áp dụng:**
- Đăng nhập bằng SĐT, một tài khoản nhiều hồ sơ; hồ sơ có trường `hospital_patient_code` (mã bệnh nhân cũ).
- Hai luồng đặt: theo chuyên khoa và theo bác sĩ.
- Phiếu khám có **số thứ tự** và **giờ khám dự kiến**.
- Các hạn chót: đặt lịch ngày mai trước 16h30, hủy trước 15h00, sửa trước 16h30 hôm trước; sửa tối đa 1 lần.
- Đặt trước 1–30 ngày.

**Có thể bỏ qua hoặc đơn giản hóa:**
- Phí tiện ích, nhiều cổng thanh toán: chỉ cần **giả lập một bước thanh toán**.
- Đặt nhiều chuyên khoa trong một lượt: đưa vào phần mở rộng.
- Care247, video call, xét nghiệm tại nhà: nằm ngoài phạm vi.

**Đưa vào báo cáo:** chương "Khảo sát hệ thống hiện có" so sánh Medpro, UMC Care và đồ án; tham khảo mục 8 ở trên.

## Nguồn
- https://medpro.vn/quy-dinh-su-dung
- https://medpro.vn/tin-tuc/huong-dan-di-kham-benh-vien-dh-y-duoc-cs1
- https://medpro.vn/tin-tuc/kham-dich-vu-bv-dai-hoc-y-duoc-tphcm
- https://medpro.vn/tin-tuc/dat-lich-kham-lay-so-thu-tu-tren-medpro
- https://medpro.vn/dich-vu-y-te/dat-kham-tai-co-so/trung-tam-mat-quoc-te-phuong-dong/hinh-thuc-dat-kham
- https://medpro.vn/
