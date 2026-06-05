import mysql.connector
import random

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="", # Local dev
        database="saodo_equipment"
    )
    cursor = conn.cursor()

    cursor.execute("SELECT id, name FROM users WHERE name LIKE 'Giảng viên%'")
    users = cursor.fetchall()

    firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
    middleNames = ['Văn', 'Thị', 'Đức', 'Hữu', 'Minh', 'Ngọc', 'Quang', 'Hồng', 'Thanh', 'Tuấn', 'Công', 'Xuân', 'Kim', 'Bảo']
    lastNames = ['Anh', 'Bình', 'Cường', 'Dũng', 'Dương', 'Đạt', 'Hải', 'Hùng', 'Huy', 'Khoa', 'Lâm', 'Long', 'Nghĩa', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Thái', 'Thành', 'Trung', 'Tuấn', 'Việt', 'An', 'Châu', 'Chi', 'Diệp', 'Giang', 'Hà', 'Hân', 'Hương', 'Lan', 'Linh', 'Mai', 'Ngân', 'Nhung', 'Phương', 'Quyên', 'Tâm', 'Thảo', 'Trang', 'Tú', 'Uyên', 'Vân', 'Yến']

    for user_id, current_name in users:
        new_name = random.choice(firstNames) + ' ' + random.choice(middleNames) + ' ' + random.choice(lastNames)
        cursor.execute("UPDATE users SET name = %s WHERE id = %s", (new_name, user_id))
        print(f"Updated user ID {user_id}")

    cursor.execute("UPDATE plan_items SET topic = REPLACE(topic, 'Giảng viên 1 (Khoa Công nghệ thông tin)', 'Lê Hữu Tuấn') WHERE topic LIKE '%Giảng viên%'")
    # Actually wait, let's just do a generic replace loop for all users if needed.
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Done!")

except Exception as e:
    print(f"Error: {e}")
