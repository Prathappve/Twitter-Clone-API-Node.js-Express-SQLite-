# Twitter Clone - Backend API (Node.js + SQLite)

A fully functional backend API for a simplified Twitter-like social media platform built with **Node.js**, **Express**, and **SQLite**. This API allows users to securely register, login, tweet, like, reply, and view feeds — all while enforcing access controls and following best practices in RESTful API development.

## 🚀 Features

✅ User Registration & Authentication (JWT-based)  
✅ Post, Delete, and View Tweets  
✅ Like and Reply Functionality  
✅ View Feed of Followed Users  
✅ Secure Access Control for Data Privacy  
✅ Follows RESTful principles with clear route structure  
✅ SQLite3 database integration using `sqlite` & `sqlite3`

---

## 📁 Project Structure

├── app.js # Main Express server

├── db.js # Database connection setup

├── covid19IndiaPortal.db # SQLite database file

├── package.json # NPM configuration

├── routes/ # API route handlers

├── middleware/ # JWT authentication logic

└── README.md # Project documentation


---

## 🔐 Authentication

All protected routes use JWT tokens for authorization.  
Include the token in the `Authorization` header as:  
```http
Authorization: Bearer <your_jwt_token>

🧪 Sample API Endpoints

1. API-1: Register - POST /register/

   Body:

        {
          "username": "prathap",
          "password": "your_password",
          "name": "Prathap V",
          "gender": "male"
        }

2. API-2: Login - POST /login/

   Body:

        {
          "username": "prathap",
          "password": "your_password"
        }

3. API-3: Tweet a Message - POST /user/tweets/

4. API-4: Delete Your Tweet - DELETE /tweets/:tweetId/

5. API-5: View Tweet Details - GET /tweets/:tweetId/

   Returns:

           {
              "tweet": "Hello World!",
              "likes": 3,
              "replies": 2,
              "dateTime": "2025-07-21 10:30:00"
            }

📦 Installation & Setup

1. Clone the repo

   git clone https://github.com/your-username/twitter-clone-backend.git

   cd twitter-clone-backend

2. Install dependencies

   npm install

3. Run the server

   node app.js

4. Import DB (optional)

   Make sure covid19IndiaPortal.db or your SQLite file is in place.

🛡️ Tech Stack

1. Node.js – JavaScript runtime

2. Express.js – Backend framework

3. SQLite3 – Lightweight SQL database

4. JWT – Authentication mechanism

5. bcrypt – Password hashing

6. REST API – Architecture style

👨‍💻 Author

Venkata Eswar Prathap Palaparthi

Aspiring MERN Stack Developer | Passionate about building impactful products

⭐ Contribute

Found a bug or want to add a feature?

Pull requests and issues are welcome! Feel free to fork and improve the project.
