# 🚀 Kanthast Backend

Kanthast is a Medical EdTech platform designed to provide structured learning, authentication, course management, and AI-powered assistance for healthcare students and professionals.

This repository contains the backend service built using Node.js, Express, and MongoDB Atlas.

---

## 🛠️ Tech Stack

- Node.js (v18 LTS)
- Express.js
- MongoDB Atlas (Cloud Database)
- Mongoose
- JWT Authentication
- Cloudinary (Media Uploads)
- CORS
- Express File Upload

---

## 📂 Project Structure

Backend/
│
├── config/
│ ├── database.js
│ ├── cloudinary.js
│
├── controllers/
├── routes/
├── models/
├── middleware/
│
├── server.js
├── package.json
└── .env (not included in repo)

PORT=4000
MONGODB_URL=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
MAIL_FROM=verified_sender@yourdomain.com
MAIL_FROM_NAME=Kanthast
BREVO_API_KEY=your_brevo_v3_api_key


---

## ▶️ Run Locally

1. Clone repository
2. Navigate to Backend folder: cd Backend
3. Install dependencies: npm install
4. Start server: npm instal



---

## 🌍 Deployment

The backend is deployed using **Render**.

Production Architecture:
Frontend (Vercel)
↓
Backend (Render)
↓
MongoDB Atlas


---

## 📡 API Routes

### Authentication
POST /api/v1/auth/register
POST /api/v1/auth/login


### Profile
GET /api/v1/profile
PUT /api/v1/profile


### Courses
GET /api/v1/courses
POST /api/v1/courses


### Chat (AI Integration)
POST /api/v1/chat


---

## 🧠 Features

- Secure JWT-based authentication
- Cloud-based MongoDB storage
- Scalable REST API architecture
- Secure CORS configuration
- Cloudinary media uploads
- Production-ready environment configuration

---

## 👨‍💻 Author

Lakshya Sehgal  
Full Stack MERN Developer

---

## 📌 Future Improvements

- Role-based access control (RBAC)
- Rate limiting
- API documentation using Swagger
- Unit and integration testing
- Docker containerization

