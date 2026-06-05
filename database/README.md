# CSDL: `saodo_equipment` — Quản lý Khai thác Thiết bị

**Trường Đại học Sao Đỏ** · Phòng Quản lý Chất lượng  
Dữ liệu demo từ tháng **12/2025**

---

## Cách import vào XAMPP

```bash
# Cách 1 – dòng lệnh (đang ở thư mục Project)
C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\saodo_equipment.sql

# Cách 2 – phpMyAdmin
# Mở http://localhost/phpmyadmin → Import → chọn file saodo_equipment.sql
```

---

## Sơ đồ CSDL (ERD đơn giản)

```
khoa (1) ──────────< giang_vien (N)
  │                       │
  │                       └──────< ket_qua_kiem_tra (N)
  │
  ├──< ke_hoach_khai_thac (N)
  │          │
  │          └───< chi_tiet_ke_hoach (N) >──── thiet_bi
  │                       │
  │                       └──< sinh_vien_tham_gia (N)
  │
  └──< bao_cao_tong_hop (1)
```

---

## Các bảng chính

| Bảng | Số bản ghi | Mô tả |
|------|-----------|-------|
| `khoa` | 5 | 5 Khoa: Điện, Cơ khí, May & TT, CNTT, Ô tô |
| `giang_vien` | 36 | Giảng viên thuộc các khoa |
| `thiet_bi` | 10 | Thiết bị tại Trung tâm TH Khoa Điện |
| `ke_hoach_khai_thac` | 1 | KH tháng 12/2025 – Khoa Điện (số 12/KH-KĐ) |
| `chi_tiet_ke_hoach` | 12 | 8 GV + 4 SV, mỗi người 1 chủ đề NC |
| `sinh_vien_tham_gia` | 4 | Sinh viên tham gia nghiên cứu |
| `ket_qua_kiem_tra` | 36 | Kết quả kiểm tra từng GV mỗi tuần |
| `bao_cao_tong_hop` | 5 | Tổng hợp theo từng khoa |

---

## Tổng hợp kết quả tháng 12/2025

| Khoa | Số GV | Tổng giờ TH |
|------|-------|------------|
| Khoa Điện | 9 | **256** giờ |
| Khoa Cơ khí | 8 | **219** giờ |
| Khoa May & Thời trang | 7 | **90** giờ |
| Khoa CNTT | 8 | **58** giờ |
| Khoa Ô tô | 4 | **0** giờ |

---

## Các VIEW sẵn có

| View | Mô tả |
|------|-------|
| `v_ket_qua_giang_vien` | Kết quả theo từng GV + % hoàn thành |
| `v_tong_hop_khoa` | Tổng hợp theo khoa, sắp xếp theo tổng giờ |
| `v_ke_hoach_khoa_dien` | Chi tiết KH Khoa Điện tháng 12/2025 |

### Ví dụ truy vấn

```sql
-- Xem kết quả tất cả GV
SELECT * FROM v_ket_qua_giang_vien;

-- Xem tổng hợp khoa
SELECT * FROM v_tong_hop_khoa;

-- Xem kế hoạch Khoa Điện
SELECT * FROM v_ke_hoach_khoa_dien;

-- GV đạt >= 100% kế hoạch
SELECT giang_vien, gio_KH, gio_TH, ty_le_hoanthanh_pct
FROM v_ket_qua_giang_vien
WHERE ty_le_hoanthanh_pct >= 100;

-- Thiết bị được sử dụng nhiều nhất
SELECT tb.ten_thiet_bi, COUNT(*) AS so_lan_dung
FROM chi_tiet_ke_hoach ct
JOIN thiet_bi tb ON tb.id = ct.thiet_bi_id
GROUP BY tb.id ORDER BY so_lan_dung DESC;
```
