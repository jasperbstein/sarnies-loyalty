# Sarnies Loyalty - Project Instructions

## CRITICAL: Read This First

This project uses GitHub for version control. **NEVER deploy directly without committing first.**

---

## GitHub Workflow (MANDATORY)

**Repository:** https://github.com/jasperbstein/sarnies-loyalty

### Making Changes

```bash
# 1. Create feature branch (NEVER work directly on main)
git checkout main
git pull origin main
git checkout -b feature/your-feature

# 2. Make changes and commit
git add <specific-files>
git commit -m "feat: description"

# 3. Push branch
git push origin feature/your-feature

# 4. Create PR
gh pr create --title "Title" --body "Description"

# 5. Merge (squash to keep history clean)
gh pr merge --squash --delete-branch

# 6. Deploy
ssh root@152.42.209.198 "/var/www/loyalty/deploy.sh"
```

### Quick Deploy (after merge to main)

```bash
ssh root@152.42.209.198 "/var/www/loyalty/deploy.sh"
```

### Manual Deploy (if script fails)

```bash
ssh root@152.42.209.198
cd /var/www/loyalty
git pull origin main
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

## Server Details

| Item | Value |
|------|-------|
| IP | 152.42.209.198 |
| App Directory | /var/www/loyalty |
| Frontend URL | https://loyalty.sarnies.tech |
| API URL | https://loyalty.sarnies.tech/api |
| Frontend Port | 3001 (PM2: loyalty-frontend) |
| Backend Port | 5001 (PM2: loyalty-backend) |

### PM2 Commands

```bash
pm2 list                    # Show processes
pm2 logs loyalty-backend    # Backend logs
pm2 logs loyalty-frontend   # Frontend logs
pm2 restart all             # Restart everything
```

### Backend Environment

The backend uses `ecosystem.config.js` for PM2 with all environment variables baked in:
- DATABASE_URL (127.0.0.1 - NOT localhost, to avoid IPv6 issues)
- FRONTEND_URL=https://loyalty.sarnies.tech
- RESEND_API_KEY (for magic link emails)
- All other secrets

**NEVER use `pm2 start npm` directly** - always use `pm2 start ecosystem.config.js`

---

## User Types & Routes

| User Type | Home Route | Access |
|-----------|------------|--------|
| customer | /app/home | Points, rewards, vouchers |
| employee | /app/home | Perks view (discount, no points) |
| staff | /staff/scan | POS scanning |
| admin | /admin/dashboard | Full admin access |

### Employee vs Customer

- **Employee**: Registered via company invite (YAWKU8SH for Sarnies), sees `EmployeeHome` component with discount/perks
- **Customer**: Regular user or via customer invite (GT34MYZN), sees full points/rewards view

The distinction is made by:
1. `user.user_type` field in database
2. `isPerksOnlyUser()` function in `lib/authUtils.ts`
3. `/app/home/page.tsx` renders `EmployeeHome` if `perksOnly` is true

---

## Company Invite Codes (Sarnies)

| Code | Type | Purpose |
|------|------|---------|
| YAWKU8SH | Employee | Team members get 50% discount |
| GT34MYZN | Customer | Regular loyalty membership |
| 25G445 | Access Code | Alternative verification |

---

## Common Issues

### "localhost" in emails
- Check `FRONTEND_URL` in ecosystem.config.js
- Must be `https://loyalty.sarnies.tech`

### Database connection refused (::1:5432)
- Use `127.0.0.1` not `localhost` in DATABASE_URL
- IPv6 vs IPv4 issue with Docker postgres

### User type wrong after registration
- Check `register/page.tsx` uses `updatedUser.user_type` not hardcoded 'customer'
- Check backend returns correct `user_type` in response

### PM2 not picking up env changes
- Delete and recreate: `pm2 delete loyalty-backend && pm2 start ecosystem.config.js`
- Or use `--update-env` flag

---

## File Structure

```
/loyalty
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── db/migrations/   # Database migrations
│   │   └── utils/           # Helpers (email, jwt, etc)
│   └── ecosystem.config.js  # PM2 config with env vars
├── frontend/
│   ├── app/                 # Next.js pages
│   │   ├── app/            # Customer/employee app
│   │   ├── staff/          # Staff portal
│   │   └── admin/          # Admin dashboard
│   ├── components/
│   │   ├── employee/       # EmployeeHome, etc
│   │   └── customer/       # CustomerHome components
│   └── lib/
│       ├── authUtils.ts    # isEmployeeUser, isPerksOnlyUser
│       └── store.ts        # Zustand auth store
└── CLAUDE.md               # THIS FILE
```
