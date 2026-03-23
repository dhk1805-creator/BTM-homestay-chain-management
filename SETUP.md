# 🏠 HCMP — Hướng dẫn Setup từ đầu (Windows)

## Yêu cầu hệ thống
- **Node.js** 18+ (khuyến khích 20 LTS)
- **npm** 10+ (đi kèm Node.js)
- **Docker Desktop** (cho Redis)
- **Git** (optional)

---

## BƯỚC 1: Tạo project Supabase mới

1. Vào https://supabase.com/dashboard → **New Project**
2. Chọn **Region**: Singapore (ap-southeast-1)
3. Đặt **database password** (GHI NHỚ password này!)
4. Đợi project tạo xong (~2 phút)
5. Vào **Settings > Database**:
   - Bật **"Direct connection (IPv4)"** nếu có
   - Copy **Connection string** (URI format)
6. Vào **Settings > API**:
   - Copy **Project URL** (dạng `https://xxxxx.supabase.co`)
   - Copy **anon key** (public)
   - Copy **service_role key** (secret)

---

## BƯỚC 2: Copy project vào máy

Project đã được đóng gói sẵn. Giải nén/copy toàn bộ vào:
```
C:\Users\WELCOME\HCMD\
```

Cấu trúc sau khi copy:
```
C:\Users\WELCOME\HCMD\
├── apps/web/          ← Next.js Admin Dashboard
├── packages/api/      ← NestJS Backend
├── packages/db/       ← Prisma Schema & Seed
├── packages/shared/   ← Shared Types
├── .env.example
├── package.json
├── turbo.json
└── SETUP.md           ← file này
```

---

## BƯỚC 3: Tạo file .env

```powershell
cd C:\Users\WELCOME\HCMD
copy .env.example .env
```

Mở `.env` và điền thông tin Supabase vừa tạo:

```env
# Thay YOUR_PROJECT_ID và YOUR_PASSWORD bằng giá trị thật
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...
REDIS_URL=redis://localhost:6379
JWT_SECRET=hcmp-super-secret-change-in-production-2026
API_PORT=3001
WEB_PORT=3000
NODE_ENV=development
```

**QUAN TRỌNG:** Copy `.env` vào packages/db nữa:
```powershell
copy .env packages\db\.env
```

---

## BƯỚC 4: Khởi động Redis (Docker)

```powershell
# Kiểm tra Docker đang chạy
docker ps

# Nếu container redis cũ vẫn còn:
docker start nsca-cis-redis

# Nếu không có, tạo mới:
docker run -d --name hcmp-redis -p 6379:6379 redis:7-alpine

# Kiểm tra:
docker ps
# Phải thấy redis chạy ở port 6379
```

---

## BƯỚC 5: Cài đặt dependencies

```powershell
cd C:\Users\WELCOME\HCMD

# Cài tất cả packages (monorepo workspaces)
npm install

# Kết quả mong đợi: ~800-1000 packages installed
```

**Nếu lỗi:** Thử `npm install --legacy-peer-deps`

---

## BƯỚC 6: Generate Prisma Client & Push schema lên DB

```powershell
# Generate Prisma Client
cd C:\Users\WELCOME\HCMD\packages\db
npx prisma generate

# Push schema lên Supabase (tạo bảng)
npx prisma db push

# Kết quả mong đợi:
# ✅ Your database is now in sync with your Prisma schema

# Seed demo data
npx ts-node prisma/seed.ts

# Kết quả mong đợi:
# ✅ Organization: BTM Homestay Chain
# ✅ Building: BTM 03 - Đà Nẵng
# ✅ Units: 5 rooms created
# ✅ Staff: admin + manager created
# ...
# 🎉 Seeding complete!
```

**Kiểm tra:** Vào Supabase Dashboard > Table Editor → thấy 18 bảng với data

---

## BƯỚC 7: Chạy NestJS API

```powershell
cd C:\Users\WELCOME\HCMD\packages\api

# Build API
npx nest build

# Kiểm tra dist/ đã tạo
dir dist\main.js
# Phải thấy file main.js

# Chạy API (development mode)
npx nest start --watch

# Kết quả mong đợi:
# ✅ Prisma connected to database
# 🚀 HCMP API running at http://localhost:3001/api/v1
# 📚 Swagger docs at http://localhost:3001/api/docs
```

**Test API:**
- Mở browser: http://localhost:3001/api/docs → thấy Swagger UI
- Test login: POST /api/v1/auth/login với body:
  ```json
  {"email": "admin@btm-homestay.com", "password": "Admin@123"}
  ```

⚠️ **GIỮ terminal này mở**, mở terminal mới cho bước tiếp.

---

## BƯỚC 8: Chạy Next.js Web

```powershell
# Mở TERMINAL MỚI
cd C:\Users\WELCOME\HCMD\apps\web
npm run dev

# Kết quả:
# ▲ Next.js 14.x
# - Local: http://localhost:3000
```

**Test Web:**
1. Mở browser: http://localhost:3000
2. Trang login hiện ra
3. Email: `admin@btm-homestay.com`
4. Password: `Admin@123`
5. → Chuyển sang Dashboard → thấy stats, bookings, incidents

---

## BƯỚC 9: Xác nhận mọi thứ hoạt động

| Kiểm tra | URL | Kết quả |
|-----------|-----|---------|
| Swagger API | http://localhost:3001/api/docs | Swagger UI hiện đầy đủ endpoints |
| Dashboard stats | http://localhost:3001/api/v1/dashboard/stats | JSON với totalBuildings=1, totalUnits=5 |
| Login API | POST /api/v1/auth/login | Trả về accessToken + user info |
| Web login | http://localhost:3000/login | Form login hoạt động |
| Web dashboard | http://localhost:3000/dashboard | Cards hiển thị stats từ API |
| Buildings page | http://localhost:3000/dashboard/buildings | Thấy "BTM 03 - Đà Nẵng" |
| Bookings page | http://localhost:3000/dashboard/bookings | Thấy 1 demo booking |

---

## Xử lý sự cố thường gặp

### ❌ `Cannot find module dist/main`
```powershell
cd C:\Users\WELCOME\HCMD\packages\api
npx nest build
# Rồi chạy lại: npx nest start --watch
```

### ❌ `ENOWORKSPACES`
```powershell
# Không chạy app qua turbo, chạy trực tiếp:
cd C:\Users\WELCOME\HCMD\packages\api
npx nest start --watch
```

### ❌ Prisma generate lỗi
```powershell
cd C:\Users\WELCOME\HCMD\packages\db
# Đảm bảo .env có DATABASE_URL đúng
npx prisma generate
```

### ❌ Redis connection refused
```powershell
docker ps  # kiểm tra container
docker start hcmp-redis  # hoặc nsca-cis-redis
```

### ❌ Web hiển thị "Lỗi kết nối API"
- Đảm bảo API đang chạy ở port 3001
- Kiểm tra CORS: API cho phép localhost:3000

---

## Tài khoản Demo

| Role | Email | Password |
|------|-------|----------|
| Chain Admin | admin@btm-homestay.com | Admin@123 |
| Building Manager | manager@btm-homestay.com | Admin@123 |

---

## Tasks tiếp theo sau khi setup xong

1. ✅ API chạy + Swagger hoạt động
2. ✅ Web login + dashboard hiển thị data
3. 🔲 Tích hợp Claude API cho AI Agent
4. 🔲 Kiosk UI (apps/kiosk)
5. 🔲 Tablet UI (apps/tablet)
6. 🔲 Smart Lock integration
7. 🔲 Post-stay automation (BullMQ jobs)
