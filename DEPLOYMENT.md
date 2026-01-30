# Sarnies Loyalty App - Deployment Guide

This guide covers deploying the Sarnies Loyalty System, including the Express.js backend API and Next.js frontend application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
   - [Railway (Backend)](#railway-backend)
   - [Vercel (Frontend)](#vercel-frontend)
   - [DigitalOcean App Platform](#digitalocean-app-platform)
   - [Docker Deployment](#docker-deployment)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Security Checklist](#security-checklist)

---

## Prerequisites

### Required Software

- **Node.js 18.x** (LTS recommended)
- **npm 9.x** or higher
- **PostgreSQL 14+** database

### Required Accounts

| Service | Purpose | Required For |
|---------|---------|--------------|
| **Resend** | Email delivery (OTP verification) | Production |
| **Twilio** | SMS delivery (OTP verification) | Production (optional) |
| **Cloudinary** | Image upload/hosting | Optional |

### Recommended

- **Railway** account for backend hosting
- **Vercel** account for frontend hosting
- **Docker** (optional, for containerized deployment)

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `/backend` directory based on `.env.example`:

#### Database (REQUIRED)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/loyalty_db` |

#### JWT Authentication (REQUIRED)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for signing JWTs | Yes | - |
| `JWT_EXPIRES_IN` | Token expiration time | No | `7d` |

**WARNING:** Always change `JWT_SECRET` to a secure, randomly generated value in production.

#### Server Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No | `3000` |
| `NODE_ENV` | Environment mode | No | `development` |
| `FRONTEND_URL` | Frontend application URL | Yes | `http://localhost:3001` |
| `BACKEND_URL` | Backend API URL | No | `http://localhost:3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes | `http://localhost:3000,http://localhost:3001` |

#### Demo Mode

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DEMO_MODE` | Bypasses email/SMS verification | No | `true` |

**WARNING:** Set `DEMO_MODE=false` in production.

#### OTP Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OTP_EXPIRY_MINUTES` | OTP code validity period | No | `5` |

#### Twilio (SMS - Optional in dev)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Production | `ACxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Production | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Production | `+1234567890` |

#### Resend (Email - REQUIRED in production)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `RESEND_API_KEY` | Resend API key | Production | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Sender email address | Production | `noreply@yourdomain.com` |

#### Web Push Notifications (Optional)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VAPID_PUBLIC_KEY` | VAPID public key | No | - |
| `VAPID_PRIVATE_KEY` | VAPID private key | No | - |
| `VAPID_SUBJECT` | VAPID subject (email) | No | `mailto:support@yourdomain.com` |

#### QR Code Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `QR_TOKEN_EXPIRY_SECONDS` | Dynamic QR token validity | No | `120` |

#### Business Logic

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POINTS_PER_100_THB` | Points earned per 100 THB spent | No | `1` |

### Frontend Environment Variables

Create a `.env.local` file in the `/frontend` directory:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `http://localhost:3000/api` |

**Production example:**
```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
```

---

## Database Setup

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Examples:**
```bash
# Local development
DATABASE_URL=postgresql://loyalty_user:loyalty_pass@localhost:5432/loyalty_db

# Railway (provided automatically)
DATABASE_URL=postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway

# Neon/Supabase
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Create Database (Local)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE loyalty_db;
CREATE USER loyalty_user WITH ENCRYPTED PASSWORD 'loyalty_pass';
GRANT ALL PRIVILEGES ON DATABASE loyalty_db TO loyalty_user;
\q
```

### Run Migrations

```bash
cd backend

# Install dependencies first
npm install

# Run migrations to create schema
npm run migrate
```

This executes the schema defined in `src/db/schema.sql`.

### Seed Test Data

```bash
cd backend

# Seed database with sample data
npm run seed
```

This creates:
- Admin user: `admin@sarnies.com` / `admin123`
- Staff user: `staff@sarnies.com` / `staff123`
- Sample vouchers (8 rewards)
- Sample announcements (3 active)
- Test customers (3 users with QR codes)

---

## Local Development

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd loyalty

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your local settings

# Frontend
cd ../frontend
cp .env.local.example .env.local
# Edit .env.local if needed
```

### 3. Setup Database

```bash
cd backend
npm run migrate
npm run seed
```

### 4. Start Backend

```bash
cd backend
npm run dev
```

Backend runs at: **http://localhost:3000**

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:3001** (Next.js default, may vary)

### Default URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000/api |
| Health Check | http://localhost:3000/health |
| Frontend | http://localhost:3001 |
| WebSocket | ws://localhost:3000 |

---

## Production Deployment

### Railway (Backend)

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login
   ```

2. **Create New Project**
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Add PostgreSQL database from the "Add Service" menu

3. **Deploy Backend**
   ```bash
   cd backend

   # Initialize Railway in project
   railway init

   # Link to your project
   railway link

   # Deploy
   railway up
   ```

4. **Set Environment Variables**

   In Railway dashboard, add these variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-secure-random-string>
   DEMO_MODE=false
   FRONTEND_URL=https://your-frontend.vercel.app
   CORS_ORIGINS=https://your-frontend.vercel.app
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

   Note: `DATABASE_URL` is automatically set by Railway.

5. **Run Migrations**
   ```bash
   railway run npm run migrate
   railway run npm run seed  # Optional: for initial data
   ```

### Vercel (Frontend)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend

   # Login
   vercel login

   # Deploy (follow prompts)
   vercel

   # Production deployment
   vercel --prod
   ```

3. **Set Environment Variables**

   In Vercel dashboard or CLI:
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Enter: https://your-backend.railway.app/api
   ```

4. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

### DigitalOcean App Platform

DigitalOcean App Platform provides a fully managed PaaS solution with built-in PostgreSQL, automatic SSL, and simplified deployments.

#### Prerequisites

1. **DigitalOcean Account** - Sign up at [digitalocean.com](https://www.digitalocean.com)
2. **doctl CLI** - Install the DigitalOcean command-line tool:
   ```bash
   # macOS
   brew install doctl

   # Linux
   snap install doctl

   # Windows
   scoop install doctl
   ```
3. **Authenticate doctl**:
   ```bash
   doctl auth init
   # Follow prompts to enter your API token from DO dashboard
   ```

#### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for DigitalOcean deployment"
git push origin main
```

#### Step 2: Create the App Using App Spec

The repository includes a pre-configured `.do/app.yaml` file. Deploy using:

```bash
# Create the app from the spec file
doctl apps create --spec .do/app.yaml

# Or if updating an existing app
doctl apps update <app-id> --spec .do/app.yaml
```

Alternatively, deploy via the DigitalOcean dashboard:
1. Go to **Apps** > **Create App**
2. Connect your GitHub repository
3. Select the repository and branch
4. DigitalOcean will auto-detect the `.do/app.yaml` configuration

#### Step 3: Set Environment Variables (Secrets)

Before deploying, set the required secrets in the DigitalOcean dashboard or via CLI:

```bash
# Get your app ID
doctl apps list

# Set secrets using the dashboard (recommended for sensitive values)
# Go to: Apps > Your App > Settings > App-Level Environment Variables

# Or use doctl to update the app spec with secrets
doctl apps update <app-id> --spec .do/app.yaml
```

**Required Secrets to Configure:**

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `JWT_SECRET` | Secret for JWT signing | Generate: `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for emails | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Sender email address | Your verified domain email |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (optional) | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (optional) | Twilio console |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (optional) | Twilio console |

**Setting secrets via dashboard:**
1. Navigate to **Apps** > **Your App** > **Settings**
2. Click **Edit** next to "App-Level Environment Variables"
3. Add each secret with "Encrypt" checkbox enabled
4. Click **Save**

#### Step 4: Run Database Migrations

After the first deployment, run migrations to set up the database schema:

```bash
# Get your app ID
doctl apps list

# Open a console to the backend component
doctl apps console <app-id> backend

# In the console, run migrations
npm run migrate

# Optionally seed initial data
npm run seed
```

Alternatively, use the DigitalOcean dashboard:
1. Go to **Apps** > **Your App** > **Console**
2. Select the **backend** component
3. Run the migration commands

#### Step 5: Verify Deployment

```bash
# Check deployment status
doctl apps list-deployments <app-id>

# Get app info including URLs
doctl apps get <app-id>

# View logs
doctl apps logs <app-id> --type=run
doctl apps logs <app-id> --type=build
```

Test the health endpoint:
```bash
curl https://your-app.ondigitalocean.app/health
```

#### Connecting to the Managed Database

DigitalOcean automatically provisions and connects the PostgreSQL database. To access it directly:

**Via doctl:**
```bash
# List database clusters
doctl databases list

# Get connection details
doctl databases get <database-id>

# Open a connection pool
doctl databases connection <database-id> --format Host,Port,User,Database
```

**Via psql:**
```bash
# Get the connection string from the dashboard or doctl
# Apps > Your App > Database > Connection Details

psql "postgresql://user:password@host:port/database?sslmode=require"
```

**Via Dashboard:**
1. Go to **Databases** in the DigitalOcean dashboard
2. Select your database cluster
3. Click **Connection Details** to view credentials
4. Use the **Connection String** for direct access

#### Useful doctl Commands

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get <app-id>

# View deployment logs
doctl apps logs <app-id>

# Trigger a new deployment
doctl apps create-deployment <app-id>

# Open console to a component
doctl apps console <app-id> <component-name>

# Delete an app
doctl apps delete <app-id>

# List available regions
doctl apps list-regions

# Validate app spec
doctl apps spec validate .do/app.yaml
```

#### Troubleshooting DigitalOcean Deployment

**Build failures:**
```bash
# Check build logs
doctl apps logs <app-id> --type=build

# Validate your app spec
doctl apps spec validate .do/app.yaml
```

**Runtime errors:**
```bash
# Check runtime logs
doctl apps logs <app-id> --type=run --follow
```

**Database connection issues:**
- Ensure `DATABASE_URL` is using the `${loyalty-db.DATABASE_URL}` reference
- Check that the database component is named correctly in the spec
- Verify SSL mode is enabled (DigitalOcean requires SSL)

**Environment variable issues:**
- Verify secrets are set in the dashboard
- Check that `scope` is set correctly (RUN_TIME vs BUILD_TIME)
- Ensure SECRET type variables are encrypted

---

### Docker Deployment

#### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

#### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

#### Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: loyalty_db
      POSTGRES_USER: loyalty_user
      POSTGRES_PASSWORD: loyalty_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://loyalty_user:loyalty_pass@postgres:5432/loyalty_db
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      DEMO_MODE: "false"
      FRONTEND_URL: http://localhost:3001
      CORS_ORIGINS: http://localhost:3001
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: http://localhost:3000/api
    ports:
      - "3001:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Run migrations
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# Stop services
docker-compose down
```

---

## Post-Deployment Checklist

### 1. Verify Health Endpoint

```bash
# Check backend is running
curl https://your-backend.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### 2. Test Login Flows

- [ ] Customer phone login with OTP
- [ ] Staff email/password login
- [ ] Admin dashboard access
- [ ] Token refresh works correctly

### 3. Test QR Scanning

- [ ] Static QR code generation works
- [ ] Dynamic QR code scanning works
- [ ] Points are awarded correctly
- [ ] Transaction history updates

### 4. Check WebSocket Connection

```javascript
// Browser console test
const socket = io('https://your-backend.railway.app');
socket.on('connect', () => console.log('WebSocket connected'));
socket.on('disconnect', () => console.log('WebSocket disconnected'));
```

- [ ] Real-time notifications work
- [ ] Points balance updates in real-time
- [ ] Transaction confirmations appear

### 5. Test Core Features

- [ ] Voucher redemption flow
- [ ] Points balance display
- [ ] Transaction history
- [ ] Profile updates
- [ ] Announcements display

---

## Security Checklist

### Critical (Must Do)

- [ ] **Change JWT_SECRET** - Generate a secure random string (32+ characters)
  ```bash
  # Generate secure secret
  openssl rand -base64 32
  ```

- [ ] **Set DEMO_MODE=false** - Ensures OTP verification is required

- [ ] **Configure CORS_ORIGINS** - Only allow your frontend domain
  ```
  CORS_ORIGINS=https://your-app.vercel.app
  ```

- [ ] **Enable HTTPS** - Both Railway and Vercel provide this automatically

### Recommended

- [ ] **Use environment-specific secrets** - Different JWT secrets for staging/production

- [ ] **Rotate secrets periodically** - Update JWT_SECRET every 90 days

- [ ] **Monitor rate limiting** - The app includes rate limiters:
  - Auth endpoints: 5 requests/15 min
  - API endpoints: 100 requests/15 min
  - Public endpoints: 30 requests/15 min

- [ ] **Database security**:
  - Use SSL connections (`?sslmode=require`)
  - Restrict database access by IP if possible
  - Use strong passwords

- [ ] **Review Helmet configuration** - Security headers are configured in `src/index.ts`

### Production Environment Variables Summary

```env
# REQUIRED
DATABASE_URL=postgresql://...
JWT_SECRET=<secure-random-string>
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# REQUIRED - Set to false
DEMO_MODE=false

# OPTIONAL but recommended
NODE_ENV=production
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Run `npm run migrate` if tables don't exist

**CORS errors:**
- Verify `CORS_ORIGINS` includes your frontend URL
- Check for trailing slashes (remove them)

**OTP not sending:**
- Check `DEMO_MODE` is `false`
- Verify Resend/Twilio credentials
- Check email/phone format

**WebSocket not connecting:**
- Ensure CORS allows WebSocket origin
- Check firewall/proxy settings
- Verify Socket.IO client version matches server

---

## Support

For deployment issues, check:
1. Railway logs: `railway logs`
2. Vercel logs: Vercel dashboard > Deployments > Functions
3. Browser console for frontend errors
4. Network tab for API request/response details
