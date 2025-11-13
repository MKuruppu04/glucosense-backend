# ⚡ Quick Deploy Checklist

Follow these steps in order:

## ✅ Step 1: MongoDB Atlas (5 minutes)
1. Go to https://mongodb.com/cloud/atlas/register
2. Create free cluster
3. Add database user with password
4. Allow all IPs (0.0.0.0/0)
5. Copy connection string
6. ✏️ **SAVE**: `mongodb+srv://username:password@cluster...`

---

## ✅ Step 2: Push Backend to GitHub (2 minutes)
```bash
cd c:\Users\User\CascadeProjects\personal-website\backend
git init
git add .
git commit -m "Backend ready for deployment"
```

Then create repo on GitHub and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/glucosense-backend.git
git push -u origin main
```

---

## ✅ Step 3: Deploy Backend on Vercel (5 minutes)

### Option A: Fast Deploy with Vercel CLI
```bash
npm install -g vercel
vercel login
cd c:\Users\User\CascadeProjects\personal-website\backend
vercel --prod
```

### Option B: Deploy from GitHub (No CLI)
1. Go to https://vercel.com/new and sign in with GitHub
2. Click **"Import Project"**, choose your `glucosense-backend` repo
3. When prompted, set:
   - **Framework Preset**: "Other"
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Output Directory**: leave blank
   - **Install Command**: `npm install`
   - **Development Command**: `npm start`
4. Under **Environment Variables**, add (click **"+ Add"** for each):
   ```
   NODE_ENV=production
   MONGODB_URI=<your-atlas-connection-string>
   JWT_SECRET=<random-32-character-string>
   JWT_EXPIRE=7d
   ENABLE_REDIS=false
   ```
5. Click **Deploy** 🚀
6. ✏️ **SAVE** your backend URL: `https://your-project.vercel.app`
7. Test it at: `https://your-project.vercel.app/api/v1/health`

---

## ✅ Step 4: Update Frontend API URLs (3 minutes)

In these files, change `http://localhost:5000/api/v1` to your Vercel URL:
- `register.html`
- `login.html`
- `dashboard.html`
- `admin-login.html`
- `admin-dashboard.html`

**Example:**
```javascript
// OLD:
const API_URL = 'http://localhost:5000/api/v1';

// NEW:
const API_URL = 'https://your-project.vercel.app/api/v1';
```

Replace `your-project` with your actual Vercel project subdomain.

---

## ✅ Step 5: Deploy Frontend on Netlify (2 minutes)

**Option 1: Drag & Drop (Easiest)**
1. Go to https://app.netlify.com/drop
2. Drag your `personal-website` folder
3. ✏️ **SAVE**: Your site URL

**Option 2: GitHub (Better)**
1. Push frontend to GitHub
2. Netlify → New Site → Import from Git
3. Choose repo and deploy

---

## ✅ Step 6: Update CORS in Backend (1 minute)

In Vercel dashboard:
1. Open your project → **Settings** → **Environment Variables**
2. Add:
   ```
   CORS_ORIGIN=https://your-netlify-site.netlify.app
   CLIENT_URL=https://your-netlify-site.netlify.app
   ```
3. Click **Save** (Vercel redeploys automatically)

---

## ✅ Step 7: Test! (1 minute)

Visit your Netlify site and:
1. ✅ Homepage loads
2. ✅ Click "Sign Up" and create account
3. ✅ Login works
4. ✅ Dashboard displays

---

## 🎉 DONE!

Your platform is live at: `https://your-site.netlify.app`

**Share with users:**
- Main site: `https://your-site.netlify.app`
- Sign up: `https://your-site.netlify.app/register.html`
- Login: `https://your-site.netlify.app/login.html`

---

## 📝 Save These URLs

- **Frontend**: _______________________________
- **Backend**: _______________________________
- **MongoDB**: _______________________________
- **Admin Email**: _______________________________
- **Admin Password**: _______________________________

---

Total time: ~20 minutes
Cost: $0 (all free tiers)
