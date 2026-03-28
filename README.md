# ⚡ Glocery Shop — Full-Stack Grocery Delivery

10-minute grocery delivery app with Firebase Auth, Node.js, Express, and MongoDB.

## 🗂️ Project Structure

```text
glocery/
├── frontend/             # Client-side (Static UI)
│   ├── index.html        # Blinkit-style Dashboard
│   └── app.js            # Firebase Auth & Backend API Utility
│
├── backend/              # Server-side (Node.js/Express)
│   ├── server.js         # API Routes & Middleware
│   ├── seed.js           # Database Seeder (Products)
│   ├── .env.example      # Env Template
│   ├── package.json      # Dependencies
│   └── serviceAccountKey.json # (REPLACE ME — Firebase Admin Key)
│
├── README.md             # Project Guide
└── .gitignore            # Git Exclusions
```

## 🚀 Setup Instructions

### 1. Backend Setup (Node.js + MongoDB)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - Create a `.env` file in the `backend/` directory.
   - Add your `MONGO_URI` and other variables from `.env.example`.
4. **Firebase Admin Key**:
   - Go to [Firebase Console](https://console.firebase.google.com).
   - Project Settings → Service Accounts → Generate new private key.
   - Save the file as `backend/serviceAccountKey.json`.
5. Seed the Database:
   ```bash
   node seed.js
   ```
6. Start the Server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open `frontend/app.js`.
2. Replace `firebaseConfig` with your own project config from Firebase Console (Project Settings → Your apps → Web app).
3. Open `frontend/index.html` in your browser (use Live Server or `python -m http.server 3000`).

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6 Modules)
- **Auth**: Firebase Authentication (Email + Google)
- **Backend**: Node.js, Express.js, Firebase Admin SDK
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Helmet, CORS, Express-Rate-Limit

## 🔒 Security Notes
- `backend/.env` and `backend/serviceAccountKey.json` are excluded from Git for security.
- Always validate Firebase ID Tokens on the backend using the Admin SDK.
