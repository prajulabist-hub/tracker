# 💸 Expense Tracker

A full-stack **MERN** (MongoDB, Express, React, Node.js) web application that lets you record, view, edit, delete and filter your daily expenses — built as a second-semester final assignment.

---

## ✨ Features

- ➕ **Add** an expense with a title, amount and category
- ✏️ **Edit** any expense — the form pre-fills and the button changes to "Update"
- 🗑️ **Delete** expenses with a single click
- 📋 **View** all expenses in a list (newest first)
- 🔢 **Running total** shown in the header
- 🔍 **Filter** by category (Food, Transport, Study, Entertainment, Other)
- ⚠️ **Error messages** when an API call fails
- 📱 **Responsive** layout that works on mobile and desktop

---

## 🛠 Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Database | MongoDB (local) + Mongoose ODM  |
| Backend  | Node.js + Express.js            |
| Frontend | React (via Vite) + plain CSS    |
| API calls| Browser `fetch()` (no Axios)    |

---

## 📁 Project Structure

```
expense-tracker/
├── server/
│   ├── server.js          ← Express server + all API routes
│   ├── .env.example       ← Safe template for PORT and MONGO_URI
│   ├── package.json
│   └── models/
│       └── Expense.js     ← Mongoose schema / model
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx       ← React entry point
│       ├── App.jsx        ← Main component (all features)
│       ├── App.css        ← Component styles
│       └── index.css      ← Global styles
├── postman/
│   └── expense-tracker.postman_collection.json
├── .gitignore             ← Excludes local config and generated files
└── README.md
```

---

## 🚀 Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally

### 1 · Start MongoDB (if not already running)

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Or run manually
mongod
```

### 2 · Start the Backend (server/)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

You should see:
```
MongoDB connected
Server running on http://localhost:5001
```

### 3 · Start the Frontend (client/)

Open a **new terminal tab**:

```bash
cd client
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

The local `server/.env` file is intentionally ignored by Git. Set `PORT` and
`MONGO_URI` in that file for your machine; never commit production credentials.

---

## 📡 API Endpoints

| Method | Endpoint               | Description                        | Success Code |
|--------|------------------------|------------------------------------|--------------|
| GET    | `/api/expenses`        | Get all expenses (newest first)    | 200          |
| POST   | `/api/expenses`        | Create a new expense               | 201          |
| PUT    | `/api/expenses/:id`    | Update an expense by MongoDB `_id` | 200          |
| DELETE | `/api/expenses/:id`    | Delete an expense by MongoDB `_id` | 200          |

### Request body for POST and PUT

```json
{
  "title": "Lunch",
  "amount": 150,
  "category": "Food"
}
```

**Validation rules:**
- `title` – required, string
- `amount` – required, number, minimum 0
- `category` – one of: `Food`, `Transport`, `Study`, `Entertainment`, `Other`

---

## 🔄 How a Request Flows

Here is what happens when the user clicks **"Add Expense"**:

```
React (App.jsx)
  │  User fills form → clicks "Add Expense"
  │  handleSubmit() builds { title, amount, category }
  │
  ▼
fetch("http://localhost:5001/api/expenses", { method: "POST", body: ... })
  │  An HTTP POST request is sent over the network
  │
  ▼
Express (server.js)  →  app.post("/api/expenses", ...)
  │  req.body contains { title, amount, category }
  │  Creates a new Expense document
  │
  ▼
Mongoose (Expense.js)  →  expense.save()
  │  Validates the data against the schema
  │  Converts the JS object into a BSON document
  │
  ▼
MongoDB (expense_tracker database)
  │  Stores the document in the "expenses" collection
  │  Returns the saved document with _id, date, etc.
  │
  ▼  (response travels back up the same chain)
React receives the new expense object
  │  Updates the state → React re-renders the list
  ▼
User sees the new expense in the list instantly ✅
```

---

## 🧪 Testing with Postman

1. Import `postman/expense-tracker.postman_collection.json` into Postman.
2. Run **GET all expenses** to see the list.
3. Run **POST create expense** to add one.
4. Copy the `_id` from the response.
5. Paste it into the **PUT** and **DELETE** requests (replace `REPLACE_WITH_REAL_ID`).
6. Try **POST invalid expense** – you should get a `400` error.

---

## 📤 Push to GitHub

Create an empty repository on GitHub (without initializing it with a README,
license, or `.gitignore`), then run these commands from this project directory:

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

The `.gitignore` excludes `node_modules`, build output, and environment files.
The checked-in `server/.env.example` contains only local development defaults.
This project also has a GitHub Actions deployment workflow; it needs the
documented EC2 GitHub Actions secrets configured before deployment will work.

---

## 👨‍💻 Author

Built for a second-semester web development final assignment.
