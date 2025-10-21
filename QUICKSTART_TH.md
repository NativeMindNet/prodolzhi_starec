# เริ่มต้นอย่างรวดเร็ว "ดำเนินต่อไปเถิด พ่อแก่!" 🚀

## ติดตั้งใน 5 นาที

### ขั้นตอนที่ 1: ดาวน์โหลดส่วนขยาย

#### สำหรับ VS Code:

```bash
# ดาวน์โหลดเวอร์ชันล่าสุด
wget https://github.com/nativemind/sdelay-starets/releases/latest/download/sdelay-starets.vsix

# ติดตั้ง
code --install-extension sdelay-starets.vsix
```

#### สำหรับ JetBrains:

1. เปิด `Settings` → `Plugins`
2. คลิก ⚙️ → `Install Plugin from Disk`
3. เลือกไฟล์ `.jar` ที่ดาวน์โหลด
4. รีสตาร์ท IDE

### ขั้นตอนที่ 2: การเริ่มต้นครั้งแรก

หลังจากติดตั้ง:

1. เปิด VS Code / JetBrains IDE
2. คุณจะเห็นหน้าต่างต้อนรับ "ดำเนินต่อไปเถิด พ่อแก่!"
3. เลือกภาษา: 🦅 รัสเซีย หรือ ครุฑ ไทย
4. เสร็จแล้ว! 🎉

### ขั้นตอนที่ 3: คำสั่งแรก

ลองใช้ฟังก์ชันหลัก:

#### 1. เปิดแชท:

```
Ctrl + Shift + C (Windows/Linux)
Cmd + Shift + C (Mac)
```

ถามคำถาม:
```
โค้ดนี้ทำงานอย่างไร?
```

#### 2. เริ่มตัวแทน:

```
Ctrl + Shift + A (Windows/Linux)
Cmd + Shift + A (Mac)
```

ให้งาน:
```
เพิ่มการตรวจสอบข้อผิดพลาดในฟังก์ชันนี้
```

#### 3. แก้ไขโค้ด:

เลือกโค้ดและกด:
```
Ctrl + K (Windows/Linux)
Cmd + K (Mac)
```

อธิบายการเปลี่ยนแปลง:
```
เปลี่ยนชื่อตัวแปรให้เข้าใจง่ายขึ้น
```

#### 4. เติมอัตโนมัติ:

เริ่มพิมพ์ - คำแนะนำจะปรากฏโดยอัตโนมัติ!

```typescript
function calculateSum(  // <-- เริ่มพิมพ์
```

กด `Tab` เพื่อยอมรับคำแนะนำ

## การกำหนดค่าพื้นฐาน

สร้างไฟล์ `.sdelay-starets/config.yaml` ในรากของโปรเจกต์:

```yaml
# การกำหนดค่าขั้นต่ำ
version: "1.0"
language: "th"

models:
  default: "mozgach108"
```

## แป้นพิมพ์ลัด

| การดำเนินการ | Windows/Linux | Mac | คำอธิบาย |
|----------|---------------|-----|----------|
| แชท | `Ctrl+Shift+C` | `Cmd+Shift+C` | เปิดแชท |
| ตัวแทน | `Ctrl+Shift+A` | `Cmd+Shift+A` | เริ่มตัวแทน |
| แก้ไข | `Ctrl+K` | `Cmd+K` | โหมดแก้ไข |
| ยอมรับ | `Tab` | `Tab` | ยอมรับคำแนะนำ |
| ปฏิเสธ | `Esc` | `Esc` | ปฏิเสธ |
| ภาษา | `Alt+L` | `Option+L` | สลับภาษา |
| การตั้งค่า | `Ctrl+,` | `Cmd+,` | เปิดการตั้งค่า |

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: อธิบายโค้ด

```javascript
// เลือกโค้ดนี้และถามในแชท
function fibonacci(n) {
  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
```

**คำถามในแชท:**
```
ฟังก์ชันนี้ทำอะไรและสามารถเพิ่มประสิทธิภาพได้ไหม?
```

### ตัวอย่างที่ 2: รีแฟคเตอร์

```python
# เลือกและกด Ctrl+K
def calc(x, y, op):
    if op == "+":
        return x + y
    elif op == "-":
        return x - y
    elif op == "*":
        return x * y
    elif op == "/":
        return x / y
```

**คำสั่งแก้ไข:**
```
รีแฟคเตอร์โดยใช้ dictionary ของการดำเนินการ
```

### ตัวอย่างที่ 3: สร้างการทดสอบ

```typescript
// ขอให้ตัวแทนเพิ่มการทดสอบ
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

**คำสั่งตัวแทน:**
```
สร้าง unit tests สำหรับฟังก์ชันนี้
```

### ตัวอย่างที่ 4: เพิ่มเอกสาร

```go
// ขอให้เพิ่มความคิดเห็น
func ProcessData(data []byte) (Result, error) {
    // implementation
}
```

**คำสั่งตัวแทน:**
```
เพิ่มความคิดเห็น GoDoc
```

## การตั้งค่าโมเดล

### การใช้ Mozgach108:

```yaml
models:
  # สำหรับการสนทนา
  chat: "mozgach108"
  
  # สำหรับเติมอัตโนมัติ (โมเดลเร็ว)
  autocomplete: "mozgach108-mini"
  
  # สำหรับงานที่ซับซ้อน
  agent: "mozgach108-full"
```

### พารามิเตอร์โมเดล:

```yaml
model_config:
  temperature: 0.7      # ความคิดสร้างสรรค์ (0.0 - 1.0)
  max_tokens: 2048      # จำนวนโทเค็นสูงสุดในการตอบ
  top_p: 0.9           # ความหลากหลายของคำตอบ
```

## การสลับภาษา

มี 3 วิธี:

### 1. ผ่าน UI:
คลิกที่สัญลักษณ์ที่มุมขวาบน:
- 🦅 สำหรับรัสเซีย
- ครุฑ สำหรับไทย

### 2. แป้นพิมพ์ลัด:
`Alt + L` (Option + L บน Mac)

### 3. ในการกำหนดค่า:
```yaml
language: "th"  # หรือ "ru"
```

## ปัญหาที่พบบ่อย

### การเติมอัตโนมัติไม่ทำงาน?

**วิธีแก้:**
1. ตรวจสอบว่าโมเดลถูกระบุในการกำหนดค่า
2. รีสตาร์ท IDE
3. ตรวจสอบการตั้งค่า `editor.inlineSuggest.enabled`

### การตอบช้า?

**วิธีแก้:**
1. ใช้ `mozgach108-mini` สำหรับการดำเนินการที่รวดเร็ว
2. เพิ่ม `timeout` ในการกำหนดค่า:
```yaml
advanced:
  timeout: 60000  # 60 วินาที
```

### ข้อผิดพลาดการเชื่อมต่อ?

**วิธีแก้:**
1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
2. ตรวจสอบ firewall/antivirus
3. รีสตาร์ท IDE

## ขั้นตอนถัดไป

1. 📖 อ่าน[เอกสารฉบับเต็ม](docs/README_TH.md)
2. ⚙️ ตั้งค่า[การกำหนดค่า](docs/README_TH.md#การกำหนดค่า)
3. 🎨 ปรับแต่ง[ธีม](docs/README_TH.md#การตั้งค่าธีม)
4. 🤝 เข้าร่วม[ชุมชน](https://t.me/sdelay_starets)

## รับความช่วยเหลือ

- 📧 อีเมล: contact@nativemind.net
- 💬 Telegram: [@sdelay_starets](https://t.me/sdelay_starets)
- 🐛 บั๊ก: [GitHub Issues](https://github.com/nativemind/sdelay-starets/issues)
- 📚 เอกสาร: [เอกสารฉบับเต็ม](docs/README_TH.md)

---

**ขอให้ปัญญาของพ่อแก่สถิตอยู่กับท่าน! 🙏**

---

© 2025 NativeMind. สงวนลิขสิทธิ์


