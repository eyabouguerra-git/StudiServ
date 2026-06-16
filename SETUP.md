# StudiServ — Setup Guide

Steps to run the project on a fresh Windows machine.

## 1. Prerequisites

Install on the target machine:
- **Git** — https://git-scm.com/download/win
- **Python 3.11+** — https://www.python.org/downloads/ (check *Add Python to PATH*)
- **Node.js LTS** — https://nodejs.org/
- **XAMPP** (for MariaDB) — https://www.apachefriends.org/

## 2. Clone the repo

```powershell
git clone https://github.com/Yassine1206/studiServ.git
cd studiServ
git checkout claude/amazing-hypatia-40zey2
```

## 3. Create the database

Start **MySQL** in the XAMPP Control Panel, then:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root
```

At the `mysql>` prompt:

```sql
CREATE DATABASE studiserv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'studiserv_user'@'localhost' IDENTIFIED BY 'Studiserv123!';
GRANT ALL PRIVILEGES ON studiserv.* TO 'studiserv_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> Note: `settings.py` is configured for MariaDB on port **3306**. If your XAMPP uses a different port, edit `StudiServ/settings.py` accordingly.

## 4. Backend (Django)

In the project root:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install "Django>=4.2,<5.0" channels channels-redis mysqlclient
pip install langchain langchain-community chromadb sentence-transformers
python manage.py migrate
python manage.py load_studiserv_faq
python manage.py createsuperuser
python manage.py runserver
```

The Django API runs at **http://127.0.0.1:8000/**.

> The `createsuperuser` email can be anything (e.g. `admin@studiserv.local`) — Django doesn't send mail. Pick a username and password you'll remember.

## 5. Frontend (React + Vite)

In a **second** PowerShell window:

```powershell
cd studiServ\frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173/** — open this in your browser.

## 6. Accessing the three interfaces

All three roles use the same URL (`http://localhost:5173`); the dashboard you see depends on the role of the logged-in account.

| Role | How to access |
|---|---|
| **Student (consumer)** | *Sign up* → choose **Consumer** → email + password. Login → student dashboard (browse services, order, track, rate, open dispute). |
| **Provider (prestataire)** | *Sign up* → choose **Provider** → email, password, university, **upload a student card image**. Account is `EN_ATTENTE` until an admin approves it. Once approved, login → provider dashboard (create/edit/delete services, upload ZIP deliverables). |
| **Admin** | Login with the superuser you created at step 4. Two entry points: Django admin at **http://localhost:8000/admin/** (raw tables), and the React admin dashboard at **http://localhost:5173** (stats, card approval queue, disputes, moderation). |

## 7. Testing the chatbot

A widget appears at the bottom-right of the homepage. Click it and ask, e.g. *"Comment créer une annonce ?"* — answers come from the 58 FAQ entries loaded at step 4 (extractive fallback, no LLM required).

To use a real LLM (optional):

```powershell
$env:LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="sk-..."
python manage.py runserver
```

## 8. End-to-end smoke test

1. Sign up as a student (email A) and a provider (email B, upload any image as the card).
2. Login as **admin** → *Cards* tab → approve provider B's card.
3. Login as provider B → create a service (title, price, delivery delay).
4. Login as student A → order that service → pay with test card `4242 4242 4242 4242`.
5. As provider B → upload a ZIP deliverable.
6. As student A → download the ZIP, leave a rating.

Test card for **payment refusal**: `4000 0000 0000 0002`.

## Troubleshooting

- **`Can't connect to MySQL server on 'localhost' (10061)`** — MariaDB isn't running. Start it in XAMPP Control Panel.
- **`NotSupportedError: MariaDB X is too old`** — Django 5 needs MariaDB ≥ 10.5. Install Django 4.2 (`pip install "Django>=4.2,<5.0"`), already covered above.
- **`No module named 'channels'` / `MySQLdb` / etc.** — the venv isn't active or that package wasn't installed. Re-run the `pip install` lines from step 4.
- **`No module named 'langchain.schema'` in chatbot logs** — non-fatal. ChromaDB indexing is skipped; the extractive fallback still answers questions from the FAQ DB.
- **`phpMyAdmin` shows 404** — Apache isn't started in XAMPP. Either start Apache, or use the `mysql.exe` CLI (step 3).
- **Frontend can't reach the API** — make sure Django is running on port 8000 (don't close that PowerShell window).
