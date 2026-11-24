# 🚀 Deployment Guide — Expense Tracker (AWS + GitHub Actions)

This guide walks you through deploying the MERN Expense Tracker to AWS using
a GitHub Actions CI/CD pipeline. Every time you push code to `main`, it
automatically deploys to your server.

---

## 🏗️ Architecture Overview

```
Your Machine  ──push──▶  GitHub (main branch)
                               │
                        GitHub Actions
                        (CI/CD Pipeline)
                               │
                         SSH into EC2
                               │
                    ┌──────────────────────┐
                    │   AWS EC2 (Ubuntu)   │
                    │                      │
                    │  Nginx (port 80/443) │
                    │    ├── /api  ──▶ Express (PM2, port 5001)
                    │    └── /    ──▶ React build (static files)
                    └──────────────────────┘
                               │
                        MongoDB Atlas
                        (Free cloud DB)
```

**What each piece does:**

| Tool | Role |
|------|------|
| **AWS EC2** | A virtual Linux server in the cloud |
| **Nginx** | A web server that routes traffic — `/api` → Node.js, `/` → React |
| **PM2** | Keeps the Node.js server running (restarts it if it crashes) |
| **MongoDB Atlas** | Free cloud MongoDB (replaces your local MongoDB) |
| **GitHub Actions** | Runs automatic deployment every time you push to `main` |

---

## ✅ Prerequisites (do these first)

- [ ] A [GitHub](https://github.com) account with this project pushed to a repo
- [ ] An [AWS](https://aws.amazon.com) account (free tier is enough)
- [ ] A [MongoDB Atlas](https://cloud.mongodb.com) account (free)
- [ ] Your local machine has `ssh` and `git` installed

---

## STEP 1 — Set up MongoDB Atlas (Cloud Database)

> **Why?** AWS EC2 doesn't have MongoDB installed. Atlas gives you a free
> hosted MongoDB that works from anywhere.

### 1.1 Create a free cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in.
2. Click **"Build a Database"** → Choose **"M0 Free"** tier.
3. Pick a region close to you (e.g., `AWS / ap-south-1` for South Asia).
4. Give it a name (e.g., `expense-tracker-cluster`) → Click **"Create"**.

### 1.2 Create a database user

1. In the left sidebar → **Database Access** → **"Add New Database User"**.
2. Set **Authentication Method** to **"Password"**.
3. Enter a username (e.g., `expenseuser`) and a strong password. **Save both.**
4. Under **Built-in Role** → choose **"Read and write to any database"**.
5. Click **"Add User"**.

### 1.3 Allow connections from anywhere

> For simplicity, we allow all IPs. In production you'd lock this down.

1. In the left sidebar → **Network Access** → **"Add IP Address"**.
2. Click **"Allow Access from Anywhere"** → it fills in `0.0.0.0/0`.
3. Click **"Confirm"**.

### 1.4 Get your connection string

1. Go back to **Database** → click **"Connect"** on your cluster.
2. Choose **"Drivers"** → Driver: **Node.js**, Version: **5.5 or later**.
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://expenseuser:<password>@expense-tracker-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password.
5. Add your database name before the `?`:
   ```
   mongodb+srv://expenseuser:yourpassword@expense-tracker-cluster.xxxxx.mongodb.net/expense_tracker?retryWrites=true&w=majority
   ```
6. **Save this string** — you'll use it in Step 3.

---

## STEP 2 — Launch an AWS EC2 Instance

### 2.1 Launch the instance

1. Log in to [https://console.aws.amazon.com](https://console.aws.amazon.com).
2. In the top search bar type **"EC2"** → click it → **"Launch Instance"**.
3. Fill in these settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `expense-tracker-server` |
   | **AMI (OS)** | Ubuntu Server 22.04 LTS (Free tier eligible) |
   | **Instance type** | `t2.micro` (Free tier eligible) |
   | **Key pair** | Click **"Create new key pair"** → name it `expense-key` → RSA → `.pem` → Download it |
   | **Network settings** | Keep defaults (VPC, subnet) |

4. Under **"Network settings"** → click **"Edit"** → Add these **Inbound rules**:

   | Type | Protocol | Port | Source |
   |------|----------|------|--------|
   | SSH | TCP | 22 | My IP (or Anywhere for now) |
   | HTTP | TCP | 80 | Anywhere (0.0.0.0/0) |
   | HTTPS | TCP | 443 | Anywhere (0.0.0.0/0) |
   | Custom TCP | TCP | 5001 | Anywhere (for testing) |

5. Click **"Launch Instance"**.

### 2.2 Find your server's IP address

1. Go to **EC2 → Instances** → click your instance.
2. Copy the **"Public IPv4 address"** (e.g., `54.123.45.67`). Keep this handy.

### 2.3 Move and protect your key file

Run these commands on your **local machine**:

```bash
# Move the downloaded key to your .ssh folder
mv ~/Downloads/expense-key.pem ~/.ssh/expense-key.pem

# Set correct permissions (SSH won't work without this)
chmod 400 ~/.ssh/expense-key.pem
```

### 2.4 Connect to your EC2 server

```bash
# Replace YOUR_EC2_IP with your actual IP from step 2.2
ssh -i ~/.ssh/expense-key.pem ubuntu@YOUR_EC2_IP
```

> You are now **inside your AWS server**. All commands below (until noted)
> run on the EC2 server.

---

## STEP 3 — Configure the EC2 Server

### 3.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Node.js (v20 LTS)

```bash
# Download and run the NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node -v   # should print v20.x.x
npm -v    # should print 10.x.x
```

### 3.3 Install PM2 (process manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start automatically when the server reboots
pm2 startup
# PM2 prints a command like: sudo env PATH=... pm2 startup systemd -u ubuntu
# COPY and RUN that exact command it gives you
```

### 3.4 Install Nginx (web server)

```bash
sudo apt install -y nginx

# Start Nginx and enable it to start on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Check it's running
sudo systemctl status nginx
# You should see: Active: active (running)
```

### 3.5 Install Git

```bash
sudo apt install -y git
```

---

## STEP 4 — Deploy the App on EC2 (Manual First Run)

### 4.1 Clone your repository

```bash
# Navigate to the home directory
cd ~

# Clone your GitHub repository (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Go into the project folder
cd YOUR_REPO_NAME/expense-tracker
```

### 4.2 Install server dependencies

```bash
cd server
npm install --production
```

### 4.3 Create the production .env file

> ⚠️ This file is NOT in git (it's in .gitignore). You create it manually
> on the server.

```bash
# While inside the server/ folder:
nano .env
```

Paste this content (replace the Atlas URI with yours from Step 1.4):

```env
PORT=5001
MONGO_URI=mongodb+srv://expenseuser:yourpassword@expense-tracker-cluster.xxxxx.mongodb.net/expense_tracker?retryWrites=true&w=majority
NODE_ENV=production
```

Save and exit: press `Ctrl+X` → `Y` → `Enter`

### 4.4 Start the backend with PM2

```bash
# Start the server using PM2 (from inside server/ folder)
pm2 start server.js --name "expense-api"

# Save the PM2 process list so it restarts after reboot
pm2 save

# Check it's running
pm2 status
# You should see: expense-api | online
```

Test that the API is working:

```bash
curl http://localhost:5001/api/expenses
# Should return: []   (empty array — MongoDB Atlas is connected)
```

### 4.5 Build the React frontend

```bash
# Go to the client folder
cd ~/YOUR_REPO_NAME/expense-tracker/client

# Install dependencies
npm install

# Build for production (creates a dist/ folder)
npm run build
```

### 4.6 Configure Nginx

Nginx will:
- Serve the React `dist/` folder for all regular requests (`/`)
- Forward `/api/` requests to your Node.js server on port 5001

```bash
# Open the Nginx configuration file
sudo nano /etc/nginx/sites-available/expense-tracker
```

Paste this configuration (replace `YOUR_EC2_IP` with your actual IP):

```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;   # or your domain name if you have one

    # Serve the React frontend (static files from dist/)
    root /home/ubuntu/YOUR_REPO_NAME/expense-tracker/client/dist;
    index index.html;

    # For React Router — always serve index.html for unknown routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Forward all /api requests to the Node.js Express server
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable this config (create a symlink to sites-enabled)
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/

# Remove the default Nginx page
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config for syntax errors
sudo nginx -t
# Should print: syntax is ok  |  test is successful

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

### 4.7 Update the React API URL for production

> ⚠️ Since Nginx proxies `/api` to Node.js, the frontend no longer needs
> `localhost:5001` — it just uses `/api/expenses` (a relative path).

On your **local machine**, open `client/src/App.jsx` and change line 15:

```js
// BEFORE (development)
const API_URL = 'http://localhost:5001/api/expenses';

// AFTER (works both locally and on AWS)
const API_URL = `${window.location.origin === 'http://localhost:5173'
  ? 'http://localhost:5001'
  : ''}/api/expenses`;
```

> This checks if you're running locally (Vite dev server on 5173) and uses
> the full URL only in that case. On AWS, it sends requests to the same
> domain which Nginx forwards to Express.

Commit and push this change:

```bash
# On your LOCAL machine:
git add client/src/App.jsx
git commit -m "fix: use relative API URL for production"
git push origin main
```

### 4.8 Test the full app

Open your browser and go to:
```
http://YOUR_EC2_IP
```

You should see the Expense Tracker UI. Try adding an expense — it should
save to MongoDB Atlas and appear in the list. 🎉

---

## STEP 5 — Set Up GitHub Actions CI/CD Pipeline

Now every `git push` to `main` will automatically:
1. SSH into your EC2 server
2. Pull the latest code
3. Reinstall server dependencies
4. Rebuild the React frontend
5. Restart PM2

### 5.1 Add GitHub Secrets

GitHub Actions needs your server credentials. These are stored as encrypted
secrets (never visible in logs).

1. Go to your GitHub repository.
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **"New repository secret"** for each of these:

   | Secret Name | Value |
   |-------------|-------|
   | `EC2_HOST` | Your EC2 public IP (e.g., `54.123.45.67`) |
   | `EC2_USER` | `ubuntu` |
   | `EC2_KEY` | The **full contents** of `~/.ssh/expense-key.pem` (open the file, copy everything including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) |
   | `EC2_REPO_PATH` | Full path on EC2 (e.g., `/home/ubuntu/YOUR_REPO_NAME`) |

> To copy your key file contents on Mac:
> ```bash
> cat ~/.ssh/expense-key.pem | pbcopy
> ```
> Then paste it into the GitHub secret value box.

### 5.2 Create the GitHub Actions workflow file

On your **local machine**, create this file:

```bash
mkdir -p .github/workflows
```

Create the file `.github/workflows/deploy.yml` with this content:

```yaml
# ============================================================
# deploy.yml — GitHub Actions CI/CD Pipeline
# ------------------------------------------------------------
# Triggers: every push to the "main" branch
# What it does: SSHs into the EC2 server and re-deploys the app
# ============================================================

name: Deploy to AWS EC2

# Run this workflow whenever code is pushed to the main branch
on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: SSH & Deploy
    runs-on: ubuntu-latest   # GitHub provides this runner for free

    steps:
      # Step 1: Show which commit triggered this deploy
      - name: Print commit info
        run: echo "Deploying commit ${{ github.sha }} by ${{ github.actor }}"

      # Step 2: SSH into the EC2 server and run all deploy commands
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}       # your server IP
          username: ${{ secrets.EC2_USER }}   # ubuntu
          key: ${{ secrets.EC2_KEY }}         # your .pem file contents
          script: |
            # --- Move into the project directory ---
            cd ${{ secrets.EC2_REPO_PATH }}/expense-tracker

            # --- Pull latest code from GitHub ---
            git pull origin main

            # --- Update server dependencies ---
            cd server
            npm install --production

            # --- Rebuild the React frontend ---
            cd ../client
            npm install
            npm run build

            # --- Restart the backend via PM2 ---
            pm2 restart expense-api

            echo "✅ Deployment complete!"
```

### 5.3 Commit and push the workflow

```bash
# On your LOCAL machine:
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy pipeline"
git push origin main
```

### 5.4 Watch the pipeline run

1. Go to your GitHub repository.
2. Click the **"Actions"** tab.
3. You'll see a workflow called **"Deploy to AWS EC2"** running.
4. Click on it → Click on the **"SSH & Deploy"** job.
5. Watch the steps execute in real time.
6. When you see ✅ next to every step, the deployment is done.

---

## STEP 6 — Verify Everything Works

### Check the backend is running

```bash
# SSH into your server
ssh -i ~/.ssh/expense-key.pem ubuntu@YOUR_EC2_IP

# Check PM2
pm2 status
# expense-api should show: online

# Check the API directly
curl http://localhost:5001/api/expenses
```

### Check Nginx

```bash
sudo systemctl status nginx
# Should show: active (running)

# Check Nginx error logs if something looks wrong
sudo tail -n 50 /var/log/nginx/error.log
```

### Check PM2 logs (Node.js errors)

```bash
# See recent logs from your Express server
pm2 logs expense-api --lines 50
```

### Open in browser

```
http://YOUR_EC2_IP
```

---

## 🔄 How the Pipeline Works (Summary)

```
You run: git push origin main
              │
              ▼
        GitHub receives the push
              │
              ▼
    GitHub Actions starts the job
    (runs on a free Ubuntu container)
              │
              ▼
    Uses appleboy/ssh-action to SSH
    into your EC2 using the .pem key
              │
              ▼
    On EC2, runs these commands:
      1. git pull origin main       ← gets new code
      2. npm install --production   ← updates backend packages
      3. npm install + npm run build← rebuilds React
      4. pm2 restart expense-api    ← reloads the backend
              │
              ▼
    GitHub Actions shows ✅ Done
              │
              ▼
    Your live site is updated! 🎉
```

---

## 🌐 (Optional) Add a Custom Domain

If you buy a domain (e.g., from Namecheap or GoDaddy):

1. In your domain registrar's DNS settings, add an **A record**:
   - **Name**: `@` (or `www`)
   - **Value**: Your EC2 IP address
   - **TTL**: 3600

2. Update your Nginx config:
   ```nginx
   server_name yourdomain.com www.yourdomain.com;
   ```

3. Add free HTTPS with Let's Encrypt:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   # Follow the prompts — it auto-configures Nginx for HTTPS
   ```

---

## 🔧 Useful Commands Cheat Sheet

```bash
# --- On your LOCAL machine ---

# SSH into the server
ssh -i ~/.ssh/expense-key.pem ubuntu@YOUR_EC2_IP

# Push a new deploy (after changing code)
git add .
git commit -m "your message"
git push origin main    # pipeline runs automatically

# --- On the EC2 SERVER (after SSH) ---

# View running processes
pm2 status

# View live backend logs
pm2 logs expense-api

# Restart the backend manually
pm2 restart expense-api

# Stop the backend
pm2 stop expense-api

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx after config changes
sudo systemctl reload nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## ❌ Common Problems & Fixes

### "Permission denied" when SSHing

```bash
# Fix key permissions
chmod 400 ~/.ssh/expense-key.pem
```

### API returns "Cannot connect to MongoDB"

- Double-check your Atlas connection string in `/home/ubuntu/YOUR_REPO_NAME/expense-tracker/server/.env`
- Make sure you added `0.0.0.0/0` to Network Access in Atlas (Step 1.3)

### Website shows "502 Bad Gateway"

The Node.js server crashed. Fix:
```bash
pm2 logs expense-api   # see what error caused the crash
pm2 restart expense-api
```

### GitHub Actions fails at "SSH" step

- Make sure your EC2 Security Group allows port 22 from anywhere
- Double-check the `EC2_KEY` secret contains the complete `.pem` file content

### React shows blank page on EC2

- The `dist/` folder might not exist. Run the build manually:
  ```bash
  cd /home/ubuntu/YOUR_REPO_NAME/expense-tracker/client
  npm install && npm run build
  ```
- Then reload Nginx: `sudo systemctl reload nginx`

---

## 💡 Tips for Your Assignment Submission

1. **Screenshot** the GitHub Actions tab showing the green ✅ pipeline run.
2. **Screenshot** the live app at `http://YOUR_EC2_IP`.
3. **Include** the EC2 IP in your README so the examiner can visit it.
4. **Keep the EC2 running** during your demo / submission period.
5. **Note:** The free tier EC2 gives you 750 hours/month — enough to run
   24/7 for one month without any charge.
