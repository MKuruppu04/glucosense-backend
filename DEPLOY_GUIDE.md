# 🚀 Complete Deployment Guide - GlucoSense Platform

This guide will help you deploy the full GlucoSense platform with user accounts and backend API.

---

## 📋 Prerequisites

You'll need accounts on these free services:
1. **MongoDB Atlas** - Database (free tier)
2. **Render.com** - Backend hosting (free tier)
3. **Netlify** - Frontend hosting (free tier)
4. **GitHub** - Code repository (free)

---

## Step 1: MongoDB Atlas Setup (Database)

### 1.1 Create Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Complete email verification

### 1.2 Create Cluster
1. Choose **FREE M0 tier**
2. Provider: AWS (or any)
3. Region: Choose closest to you
4. Cluster Name: `glucosense-cluster`
5. Click **Create**

### 1.3 Database User
1. Click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Username: `glucosense-admin`
4. Password: Click **Autogenerate** (SAVE THIS PASSWORD!)
5. Privileges: **Read and write to any database**
6. Click **Add User**

### 1.4 Network Access
1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
4. Click **Confirm**

### 1.5 Get Connection String
1. Click **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string:
   ```
   mongodb+srv://glucosense-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. **SAVE THIS STRING!** You'll need it soon.

---

## Step 2: Push Code to GitHub

### 2.1 Initialize Git (if not done)
```bash
cd c:\Users\User\CascadeProjects\personal-website\backend
git init
git add .
git commit -m "Initial backend commit"
```

### 2.2 Create GitHub Repository
1. Go to: https://github.com/new
2. Repository name: `glucosense-backend`
3. Visibility: **Public** (or Private)
4. Click **Create repository**

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/glucosense-backend.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy Backend to Render.com

### 3.1 Create Render Account
1. Go to: https://render.com/
2. Sign up with GitHub

### 3.2 Create Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub repository: `glucosense-backend`
3. Configure:
   - **Name**: `glucosense-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

### 3.3 Add Environment Variables
Click **Environment** and add these:

```
NODE_ENV=production
PORT=5000
API_VERSION=v1
MONGODB_URI=your-mongodb-connection-string-from-step-1
JWT_SECRET=your-random-secret-at-least-32-characters-long
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
ENABLE_REDIS=false
CORS_ORIGIN=https://your-netlify-site.netlify.app
CLIENT_URL=https://your-netlify-site.netlify.app
```

**Important:**
- Replace `MONGODB_URI` with your Atlas connection string
- Replace `JWT_SECRET` with a random string (use: https://randomkeygen.com/)
- We'll update `CORS_ORIGIN` and `CLIENT_URL` after deploying frontend

### 3.4 Deploy
1. Click **Create Web Service**
2. Wait 5-10 minutes for deployment
3. Your API will be at: `https://glucosense-api.onrender.com`
4. Test it: `https://glucosense-api.onrender.com/health`

---

## Step 4: Deploy Frontend to Netlify

### 4.1 Prepare Frontend Files

Create a new file `_redirects` in the root:
```
/api/* https://glucosense-api.onrender.com/api/:splat 200
/* /index.html 200
```

### 4.2 Update API URL in Frontend

You need to update the API URL in all HTML files:

**Files to update:**
- `register.html`
- `login.html`
- `dashboard.html`
- `admin-login.html`
- `admin-dashboard.html`

**Change:**
```javascript
const API_URL = 'http://localhost:5000/api/v1';
```

**To:**
```javascript
const API_URL = 'https://glucosense-api.onrender.com/api/v1';
```

### 4.3 Deploy to Netlify

**Option A: Drag & Drop**
1. Go to: https://app.netlify.com/drop
2. Drag your entire `personal-website` folder
3. Wait for deployment
4. Your site will be at: `https://random-name.netlify.app`

**Option B: GitHub (Recommended)**
1. Push frontend to GitHub
2. Go to: https://app.netlify.com/
3. Click **Add new site** → **Import an existing project**
4. Connect GitHub
5. Choose your repository
6. Deploy settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.`
7. Click **Deploy**

### 4.4 Custom Domain (Optional)
1. In Netlify, go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Follow instructions

---

## Step 5: Update Backend CORS

Now that you have your Netlify URL, update Render environment variables:

1. Go back to Render dashboard
2. Click your `glucosense-api` service
3. Go to **Environment**
4. Update:
   ```
   CORS_ORIGIN=https://your-actual-site.netlify.app
   CLIENT_URL=https://your-actual-site.netlify.app
   ```
5. Click **Save Changes**
6. Your service will auto-redeploy

---

## Step 6: Create Admin Account

### 6.1 SSH into Render (Not available on free tier)
Or run locally once with production database:

```bash
cd backend
# Update .env to use MongoDB Atlas connection string
npm run seed
```

This creates your admin account.

**Alternative:** Create admin via API call after deployment.

---

## Step 7: Test Your Live Platform!

### 7.1 Test Website
Visit: `https://your-site.netlify.app`

### 7.2 Test Registration
1. Click **Sign Up**
2. Create a user account
3. Should redirect to dashboard

### 7.3 Test Login
1. Click **Login**
2. Enter credentials
3. Access dashboard

### 7.4 Test Admin
1. Go to: `https://your-site.netlify.app/admin-login.html`
2. Login with admin credentials
3. View dashboard

---

## 🎉 You're Live!

Your platform is now publicly accessible!

**Share these links:**
- **Main Site**: `https://your-site.netlify.app`
- **User Sign Up**: `https://your-site.netlify.app/register.html`
- **API Health**: `https://glucosense-api.onrender.com/health`

---

## ⚠️ Important Notes

### Free Tier Limitations:
1. **Render Free Tier**:
   - Spins down after 15 min of inactivity
   - First request after idle takes ~30 seconds
   - 750 hours/month (enough for 1 site)

2. **MongoDB Atlas Free Tier**:
   - 512MB storage
   - Shared CPU
   - Good for thousands of users

3. **Netlify Free Tier**:
   - 100GB bandwidth/month
   - Unlimited sites
   - Custom domain supported

### Upgrading:
- **Render Starter**: $7/month (no spin-down)
- **MongoDB M10**: $9/month (dedicated)
- **Netlify Pro**: $19/month (more bandwidth)

---

## 🔧 Troubleshooting

### Backend won't start:
- Check environment variables in Render
- Verify MongoDB connection string
- Check build logs in Render dashboard

### Frontend can't connect:
- Verify API URL is correct in HTML files
- Check CORS settings in backend
- Test API health endpoint directly

### Database connection failed:
- Check MongoDB Atlas network access (allow 0.0.0.0/0)
- Verify connection string has correct password
- Check database user has proper permissions

---

## 📱 Next Steps

1. **Add Twilio** for SMS alerts
2. **Connect Raspberry Pi** for real sensor data
3. **Custom domain** for professional look
4. **SSL Certificate** (automatic with Netlify)
5. **Monitor usage** and upgrade tiers as needed

---

**Need help?** Check the logs:
- **Render**: Dashboard → Logs tab
- **Netlify**: Site → Deploys → Deploy log
- **MongoDB**: Atlas → Metrics

Good luck! 🚀
