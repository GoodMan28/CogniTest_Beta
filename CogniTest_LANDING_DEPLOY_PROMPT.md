# CogniTest — Landing Page, Password Change & Deployment Audit Prompt

> **Target Agent**: Any LLM coding assistant (designed to be followed step-by-step by even a low-parameter model)  
> **Project Root**: `c:\Users\Abhineet Anand\Desktop\CogniTest_Beta_Python`  
> **Tech Stack**: Vite + React 18 + TailwindCSS v4 (frontend), Express 5 + TypeScript + MongoDB (backend), FastAPI + Python (analysis_service)

---

## TABLE OF CONTENTS

1. [PART A — Landing Page](#part-a--landing-page)
2. [PART B — Change Password Feature](#part-b--change-password-feature)
3. [PART C — Deployment Audit & Readiness](#part-c--deployment-audit--readiness)
4. [PART D — Post-Deployment Smoke Tests](#part-d--post-deployment-smoke-tests)

---

## PART A — Landing Page

### A.1 — Context & Design Direction

CogniTest is a premium AI-powered exam analytics platform for JEE coaching institutes. The landing page is the **first thing** any visitor sees. It must feel world-class — on par with Linear, Vercel, or Stripe landing pages.

**Design Constraints:**
- **Primary Color Palette**: Turquoise/Teal (`#0D9488`, `#14B8A6`, `#2DD4BF`) blended with the existing Vercel-inspired neutral palette (see `frontend/src/index.css` — Geist font, `#FAFAFA` bg, `#171717` text)
- **Background**: Animated turquoise dot-grid or wireframe grid (CSS-only or lightweight canvas). The grid should subtly pulse or shimmer on scroll.
- **Typography**: Use the existing `Geist` font family already imported in `index.css`. Bold hero text with heavy negative letter-spacing (already defined in CSS).
- **Animations**: Use CSS `@keyframes` and `IntersectionObserver` for scroll-triggered fade-in/slide-up animations. No heavy JS animation libraries.
- **Responsive**: Must look perfect on 1920px desktop, 1440px laptop, 768px tablet, and 375px mobile.

### A.2 — File Structure to Create

```
frontend/src/
├── pages/
│   └── LandingPage.tsx          ← [NEW] The main landing page component
├── components/
│   └── landing/
│       ├── HeroSection.tsx      ← [NEW] Hero with CTA buttons
│       ├── FeaturesGrid.tsx     ← [NEW] Feature cards with icons
│       ├── TestimonialsCarousel.tsx ← [NEW] Coaching testimonials
│       ├── TurquoiseGrid.tsx    ← [NEW] Animated background grid
│       └── Footer.tsx           ← [NEW] Footer with links
```

### A.3 — Step-by-Step Implementation

#### Step 1: Create `TurquoiseGrid.tsx`

Create `frontend/src/components/landing/TurquoiseGrid.tsx`.

This is a full-viewport animated background. It renders a CSS grid of faint turquoise dots that subtly pulse. Implementation:

```tsx
const TurquoiseGrid = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      {/* CSS dot grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #14B8A6 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Animated glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[120px] animate-pulse" />
    </div>
  );
};
export default TurquoiseGrid;
```

#### Step 2: Create `HeroSection.tsx`

Create `frontend/src/components/landing/HeroSection.tsx`.

**Requirements:**
- A large badge/pill at top: `"AI-Powered Exam Analytics"` with a subtle turquoise glow border
- Headline: `"Transform Exam Results Into Actionable Intelligence"` (or similar)
- Subheading: 1-2 lines describing CogniTest
- Two CTA buttons side-by-side:
  1. **"Student Portal →"** — Links to `/student/login` — Uses a filled turquoise/teal gradient button (`from-teal-500 to-cyan-500`)
  2. **"Admin Dashboard →"** — Links to `/admin/login` — Uses a transparent bordered button with white text
- Below the buttons: a floating, semi-transparent mock dashboard screenshot (use CSS perspective transform for a 3D tilt effect). You can use a placeholder `<div>` styled to look like a dashboard card with fake stats.
- All text should be white since the background is dark.
- Add scroll-triggered fade-in animation using `IntersectionObserver` or CSS `animation-delay`.

#### Step 3: Create `FeaturesGrid.tsx`

Create `frontend/src/components/landing/FeaturesGrid.tsx`.

Show 6 feature cards in a responsive 3-column grid (3 on desktop, 2 on tablet, 1 on mobile). Each card:
- Has a turquoise-gradient icon circle at top
- Feature title (bold, white)
- Feature description (gray-400, 2 lines max)
- Subtle glass-morphism card style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Hover effect: card lifts up (`hover:-translate-y-1`) and border glows turquoise

**Features to list:**
1. **OMR Sheet Processing** — "Upload scanned OMR sheets and get instant digital evaluation with 99.9% accuracy."
2. **AI-Powered Analytics** — "Deep chapter-wise, topic-wise performance breakdown with AI-generated insights."
3. **Personalized Reports** — "Beautiful PDF report cards with radar charts, strength maps, and improvement roadmaps."
4. **Smart Practice Engine** — "AI recommends practice questions targeting each student's exact weak spots."
5. **Real-Time Dashboards** — "Live leaderboards, batch comparisons, and trend tracking for administrators."
6. **WhatsApp Integration** — "Automatically broadcast PDF report cards to parents via WhatsApp."

Use Google Material Symbols icons: `scanner`, `psychology`, `analytics`, `target`, `dashboard`, `chat`.

#### Step 4: Create `TestimonialsCarousel.tsx`

Create `frontend/src/components/landing/TestimonialsCarousel.tsx`.

**Requirements:**
- Section title: `"Trusted by Leading Coaching Institutes"` (white text, centered)
- A horizontal scrolling row of coaching institute logos. Use `<img>` tags with placeholder `src` attributes. **The user will provide the actual logo files later.** For now, use placeholder boxes with institute names:
  - Newton Tutorials
  - Aakash Institute
  - Allen Career Institute  
  - FIITJEE
  - Resonance
  - Physics Wallah
  - Motion Education
  - Vedantu
- Below the logos: 2-3 testimonial cards in a carousel/slider. Each card has:
  - A quote (in italics)
  - The name and designation of the person
  - The institute name
  - A star rating (5 stars, turquoise colored)
- Cards use glass-morphism styling matching the features grid
- Auto-scroll the logos horizontally using CSS `@keyframes` marquee animation (infinite loop, `translateX` based)

**Placeholder Testimonials:**
1. *"CogniTest has completely transformed how we track student progress. The AI analytics save us 20+ hours per week."* — **Dr. Rajesh Sharma**, Director, Newton Tutorials
2. *"The personalized report cards and WhatsApp integration have dramatically improved parent engagement."* — **Priya Nair**, Academic Head, Pinnacle Academy
3. *"We went from manual OMR checking to automated AI analysis in one week. Game changer."* — **Amit Verma**, Founder, Excel Coaching

#### Step 5: Create `Footer.tsx`

Create `frontend/src/components/landing/Footer.tsx`.

Simple dark footer with:
- CogniTest logo/name on the left
- Links: "Student Login", "Admin Login", "Features", "Contact"
- Copyright: `© 2026 CogniTest. All rights reserved.`
- Subtle turquoise accent line at top of footer

#### Step 6: Create `LandingPage.tsx`

Create `frontend/src/pages/LandingPage.tsx`.

Compose all sections:
```tsx
import TurquoiseGrid from '../components/landing/TurquoiseGrid';
import HeroSection from '../components/landing/HeroSection';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel';
import Footer from '../components/landing/Footer';

const LandingPage = () => (
  <div className="min-h-screen text-white">
    <TurquoiseGrid />
    <HeroSection />
    <FeaturesGrid />
    <TestimonialsCarousel />
    <Footer />
  </div>
);
export default LandingPage;
```

#### Step 7: Update `App.tsx` Routing

**File:** `frontend/src/App.tsx`

Make the following changes:
1. Import `LandingPage`:
   ```tsx
   import LandingPage from './pages/LandingPage';
   ```
2. Change the root route from:
   ```tsx
   <Route path="/" element={<Navigate to="/admin/login" replace />} />
   ```
   To:
   ```tsx
   <Route path="/" element={<LandingPage />} />
   ```

This makes `/` show the landing page instead of redirecting to admin login.

#### Step 8: Verify

1. Run `npm run dev` in the `frontend/` directory.
2. Open `http://localhost:5173/` in the browser.
3. Verify:
   - [ ] Turquoise grid background renders and pulses
   - [ ] Hero section displays with both CTA buttons
   - [ ] "Student Portal" button navigates to `/student/login`
   - [ ] "Admin Dashboard" button navigates to `/admin/login`
   - [ ] Features grid renders 6 cards in 3 columns on desktop
   - [ ] Testimonials section shows logos and quotes
   - [ ] Footer renders
   - [ ] Page is responsive on mobile viewport (375px)
   - [ ] Scroll animations trigger correctly

---

## PART B — Change Password Feature

### B.1 — Context

The app currently has a "Security" tab in `StudentSettings.tsx` (at `frontend/src/pages/StudentSettings.tsx`, lines 202-223) with password input fields, but the "Update Password" button does **nothing** — it has no `onClick` handler and there is no backend API endpoint for changing passwords.

Similarly, the admin panel (`AdminSettings.tsx`) has no password change capability.

**We need to build the full stack: backend API + frontend integration for both student and admin password changes.**

### B.2 — Backend: Create Password Change API Endpoints

#### Step 1: Add `changeStudentPassword` to `authController.ts`

**File:** `backend/src/controllers/authController.ts`

Add a new exported async function `changeStudentPassword`:

```typescript
export const changeStudentPassword = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const student = await Student.findById(studentId);
    if (!student || !student.password) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    student.password = hashedPassword;
    await student.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

Make sure `bcrypt` and `Student` model are already imported at the top of the file (they should be — verify).

#### Step 2: Add `changeAdminPassword` to `authController.ts`

Same file, add:

```typescript
export const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin || !admin.password) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    admin.password = hashedPassword;
    await admin.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change admin password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
```

Make sure the `Admin` model is imported. Check the top of `authController.ts` — it should have:
```typescript
import Admin from '../models/Admin';
```

#### Step 3: Register Routes in `authRoutes.ts`

**File:** `backend/src/routes/authRoutes.ts`

1. Import the new functions:
   ```typescript
   import { signup, login, getMe, adminLogin, adminGetMe, changeStudentPassword, changeAdminPassword } from '../controllers/authController';
   ```

2. Add two new routes **before** `export default router;`:
   ```typescript
   // Password change
   router.put('/student/:studentId/change-password', changeStudentPassword);
   router.put('/admin/:adminId/change-password', changeAdminPassword);
   ```

#### Step 4: Rebuild and Test Backend

```bash
cd backend
npm run build
# Check for TypeScript compilation errors
# If dev server is running, restart it
npm run dev
```

Test with curl or Postman:
```bash
# Student password change (replace IDs with real ones)
curl -X PUT http://localhost:5000/api/v1/auth/student/<STUDENT_ID>/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"password123","newPassword":"newtest456"}'
```

### B.3 — Frontend: Wire Up Student Password Change

#### Step 1: Update `StudentSettings.tsx`

**File:** `frontend/src/pages/StudentSettings.tsx`

The security tab (lines 202-223) currently has static input fields. Make these changes:

1. Add state variables at the top of the component (after line 15):
   ```tsx
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordError, setPasswordError] = useState('');
   const [passwordSuccess, setPasswordSuccess] = useState('');
   const [changingPassword, setChangingPassword] = useState(false);
   ```

2. Add the password change handler function (after `handleImageUpload`):
   ```tsx
   const handleChangePassword = async () => {
     setPasswordError('');
     setPasswordSuccess('');
     
     if (!currentPassword || !newPassword || !confirmPassword) {
       setPasswordError('All fields are required');
       return;
     }
     if (newPassword.length < 6) {
       setPasswordError('New password must be at least 6 characters');
       return;
     }
     if (newPassword !== confirmPassword) {
       setPasswordError('New passwords do not match');
       return;
     }
     
     setChangingPassword(true);
     try {
       await axios.put(`/api/v1/auth/student/${studentId}/change-password`, {
         currentPassword,
         newPassword,
       });
       setPasswordSuccess('Password changed successfully!');
       setCurrentPassword('');
       setNewPassword('');
       setConfirmPassword('');
     } catch (err: any) {
       setPasswordError(err.response?.data?.message || 'Failed to change password');
     } finally {
       setChangingPassword(false);
     }
   };
   ```

3. Replace the security tab JSX (lines 202-223) to wire up the inputs:
   - Bind `value` and `onChange` to the state variables
   - Show `passwordError` in a red alert box
   - Show `passwordSuccess` in a green alert box
   - Wire the button's `onClick` to `handleChangePassword`
   - Disable the button while `changingPassword` is true

### B.4 — Frontend: Wire Up Admin Password Change

#### Step 1: Update `AdminSettings.tsx`

**File:** `frontend/src/pages/AdminSettings.tsx`

Add a "Security" section or tab (if one doesn't already exist) with the same pattern as the student settings. The admin's ID can be obtained from the `AdminAuthContext`.

1. Import `useAdminAuth` from the admin auth context
2. Get `adminId` from the context
3. Add the same state variables and handler as in StudentSettings, but POST to:
   ```
   /api/v1/auth/admin/${adminId}/change-password
   ```
4. Add input fields for Current Password, New Password, Confirm Password
5. Add the "Update Password" button wired to the handler

### B.5 — Verify Password Change

1. Log in as student (enrollment `0000000031`, password `password123`)
2. Go to Settings → Security tab
3. Enter current password: `password123`
4. Enter new password: `newtest456`
5. Confirm: `newtest456`
6. Click "Update Password"
7. Verify success message appears
8. Log out and log back in with `newtest456` — should succeed
9. **IMPORTANT**: Change the password back to `password123` after testing!
10. Repeat the same flow for the admin panel

---

## PART C — Deployment Audit & Readiness

### C.1 — Architecture Overview

CogniTest has **3 separate deployable services**:

| Service | Tech | Local Port | Deployment Target |
|---------|------|------------|-------------------|
| **Frontend** | Vite + React + TailwindCSS v4 | `:5173` | Vercel (Static/SPA) |
| **Backend** | Express 5 + TypeScript | `:5000` | Vercel (Serverless Functions) |
| **Analysis Service** | FastAPI + Python | `:8000` | Render / Railway / Fly.io |

**Database**: MongoDB Atlas (already cloud-hosted at `cluster0.vs7flpi.mongodb.net`)

### C.2 — Pre-Deployment Checklist

Run through **every single item** below. Mark each as PASS or FAIL.

#### C.2.1 — Frontend Checks

- [ ] **Build succeeds**: Run `cd frontend && npm run build`. Must exit with code 0. Fix any TypeScript errors.
- [ ] **No hardcoded localhost URLs**: Search the entire `frontend/src/` directory for any hardcoded `localhost` references (especially in API calls). The Vite proxy only works in dev mode; in production, API calls must go to the deployed backend URL.
  ```bash
  grep -rn "localhost" frontend/src/
  ```
  If any are found (other than in comments), they must be replaced with environment variables.
- [ ] **Environment variables configured**: The frontend uses `import.meta.env.VITE_*` variables. Check for:
  - `VITE_API_URL` — Must point to the deployed backend URL (e.g., `https://cognitest-backend.vercel.app`)
  - `VITE_USE_DEMO` — Should be `false` for production
  - `VITE_ANALYSIS_API_URL` — Must point to the deployed analysis service URL
- [ ] **API base URL abstraction**: All `axios` calls in the frontend must use a base URL from environment variables, not hardcoded paths. Check if there's an axios instance configured:
  ```bash
  grep -rn "axios.create" frontend/src/
  grep -rn "axios.get\|axios.post\|axios.put\|axios.delete" frontend/src/ | head -20
  ```
  If API calls use relative paths like `/api/v1/...`, you need to configure axios with a base URL:
  ```typescript
  // frontend/src/lib/api.ts
  import axios from 'axios';
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    withCredentials: true,
  });
  export default api;
  ```
  Then replace all `axios.get(...)` calls with `api.get(...)` across the codebase.
- [ ] **`vercel.json` is correct**: The file `frontend/vercel.json` must have SPA rewrites:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
  Already correct.
- [ ] **No console.log pollution**: Remove or guard debug `console.log` statements:
  ```bash
  grep -rn "console.log" frontend/src/ | wc -l
  ```
  Wrap them in `if (import.meta.env.DEV)` or remove them.
- [ ] **Favicon and meta tags**: Verify `frontend/index.html` has:
  - Proper `<title>` tag
  - Meta description
  - Favicon
  - Open Graph tags for social sharing

#### C.2.2 — Backend Checks

- [ ] **Build succeeds**: Run `cd backend && npm run build`. Must exit with code 0.
- [ ] **`vercel.json` is correct**: Currently points `src/index.ts` to `@vercel/node`. This is correct for Vercel serverless. Already correct.
- [ ] **`export default app`**: The `backend/src/index.ts` file already exports `app` and conditionally listens (line 61-65). Correct for Vercel.
- [ ] **Environment variables**: The following must be set in Vercel dashboard under the backend project's Environment Variables:
  ```
  PORT=5000  (may not be needed on Vercel)
  MONGO_URI=mongodb+srv://anandabhineet66_db_user:...
  JWT_SECRET=eaf6e6f21df967836c...
  PINECONE_API_KEY=pcsk_2b54C8_...
  PINECONE_ENVIRONMENT=Recommendations
  GROQ_API_KEY_NEW=gsk_iKZM...
  VISION_BASE_URL=https://api.groq.com/openai/v1
  VISION_MODEL=llama-3.2-11b-vision-preview
  ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
  ADMIN_INSTITUTE_ID=6a8a24a2dc736a46251dfa75
  ```
- [ ] **CORS configuration**: `backend/src/index.ts` line 28 uses `origin: true` which reflects the incoming origin. This is permissive — for production, consider restricting to exact frontend domain:
  ```typescript
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true
  }));
  ```
- [ ] **No hardcoded secrets**: Verify `.env` is in `.gitignore`:
  ```bash
  grep ".env" .gitignore
  ```
- [ ] **Database connection works from cloud**: The MongoDB Atlas URI uses `cluster0.vs7flpi.mongodb.net`. Verify that the Atlas cluster allows connections from anywhere (`0.0.0.0/0`) in the Network Access settings, since Vercel serverless functions have dynamic IPs.
- [ ] **File uploads**: The backend uses `multer` with `memoryStorage()` (line 12 in `studentRoutes.ts`). Memory storage works on serverless, but uploaded files are ephemeral. If profile pictures are being saved to disk (`/uploads`), this will NOT work on Vercel. Check if `uploadProfilePicture` saves to disk or returns a base64/URL. If disk-based, switch to a cloud storage solution (e.g., Cloudinary, AWS S3).
- [ ] **Cold start optimization**: Vercel serverless functions have cold starts. The DB connection middleware (lines 42-45) runs `await connectDB()` on every request. Verify that `connectDB()` caches the connection (only connects if not already connected).

#### C.2.3 — Analysis Service (Python FastAPI) Checks

- [ ] **Health check works**: `GET /health` endpoint exists. Already present.
- [ ] **Deployment platform chosen**: Since Vercel does not natively support Python long-running servers, deploy this to Render, Railway, or Fly.io.
- [ ] **`requirements.txt` is up-to-date**: Already has all deps.
- [ ] **Entry point is correct**: `app/main.py` defines `app = FastAPI(...)`. The deployment platform should run:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- [ ] **Environment variables**: Set in deployment dashboard:
  ```
  MONGODB_URI=mongodb+srv://anandabhineet66_db_user:...
  JWT_SECRET=<same as backend or a separate one>
  INSTITUTE_ID=6aa70c122d7b8807b8d82e35
  ALLOWED_ORIGINS=["https://your-frontend-domain.vercel.app"]
  ```
- [ ] **CORS is configured**: Check if FastAPI has CORS middleware. If not, add:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(
      CORSMiddleware,
      allow_origins=json.loads(os.environ.get("ALLOWED_ORIGINS", '["*"]')),
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### C.3 — Step-by-Step Deployment

#### C.3.1 — Deploy Backend to Vercel

1. Install Vercel CLI if not already installed:
   ```bash
   npm i -g vercel
   ```
2. Navigate to `backend/` directory:
   ```bash
   cd backend
   ```
3. Run `vercel` and follow the prompts:
   - Link to a new project or existing
   - Set the root directory to `./` (the backend folder)
   - Framework: "Other"
   - Build command: `npm run build`
   - Output directory: leave blank
4. Set environment variables:
   ```bash
   vercel env add MONGO_URI
   vercel env add JWT_SECRET
   vercel env add PINECONE_API_KEY
   # ... etc for all env vars listed in C.2.2
   ```
5. Deploy to production:
   ```bash
   vercel --prod
   ```
6. Note the production URL (e.g., `https://cognitest-backend-xxxx.vercel.app`)
7. Verify: `curl https://cognitest-backend-xxxx.vercel.app/` should return `"CogniTest Backend is running properly!"`

#### C.3.2 — Deploy Frontend to Vercel

1. Navigate to `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Create/update `.env.production`:
   ```env
   VITE_API_URL=https://cognitest-backend-xxxx.vercel.app
   VITE_USE_DEMO=false
   VITE_ANALYSIS_API_URL=https://cognitest-analysis-xxxx.onrender.com
   ```
3. Run `vercel` and follow prompts:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set environment variables in Vercel dashboard
5. Deploy:
   ```bash
   vercel --prod
   ```
6. Note the production URL

#### C.3.3 — Deploy Analysis Service to Render

1. Push code to GitHub (if not already)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect the GitHub repo
4. Set:
   - Root Directory: `analysis_service`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as C.2.3)
6. Deploy and note the URL

### C.4 — Post-Deployment Configuration

After all 3 services are deployed:

1. **Update CORS**: Go to the backend Vercel project → Environment Variables → Update `ALLOWED_ORIGINS` to include the frontend URL
2. **Update Frontend API URLs**: Go to the frontend Vercel project → Environment Variables → Ensure `VITE_API_URL` and `VITE_ANALYSIS_API_URL` point to the correct deployed URLs
3. **Redeploy frontend** after updating env vars:
   ```bash
   cd frontend && vercel --prod
   ```
4. **Update MongoDB Atlas Network Access**: Ensure `0.0.0.0/0` is allowed (or add Vercel and Render IP ranges)

---

## PART D — Post-Deployment Smoke Tests

### D.1 — Health Checks

Run these immediately after deployment:

```bash
# Backend health
curl -s https://YOUR_BACKEND_URL/ 
# Expected: "CogniTest Backend is running properly!"

# Analysis service health
curl -s https://YOUR_ANALYSIS_URL/health
# Expected: {"status":"ok","database_ready":true}

# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://YOUR_FRONTEND_URL/
# Expected: 200
```

### D.2 — Functional Tests (Browser)

Open the deployed frontend URL in a browser and run through each test:

#### Test 1: Landing Page
- [ ] Landing page loads at `/`
- [ ] Turquoise grid background is visible
- [ ] "Student Portal" button navigates to `/student/login`
- [ ] "Admin Dashboard" button navigates to `/admin/login`
- [ ] Features section renders 6 cards
- [ ] Testimonials section renders
- [ ] Page is responsive on mobile

#### Test 2: Student Login & Dashboard
- [ ] Navigate to `/student/login`
- [ ] Login with enrollment `0000000031` and password `password123`
- [ ] Dashboard loads with data (radar charts, stats)
- [ ] Radar charts do NOT shake when hovering

#### Test 3: Reports
- [ ] Navigate to "My Reports" in sidebar
- [ ] Click on "PINNACLE-28 Periodic Test"
- [ ] Report detail page loads with all sections (Score Overview, Subject Breakdown, Radar Charts, Question Breakdown)
- [ ] Expand Q62 → Option A shows GREEN highlight with checkmark
- [ ] Expand a numerical question (Q71 or Q73) → Shows "Your Answer" and "Correct Answer" blocks with proper color coding
- [ ] "Practice Similar Questions" button works on incorrect questions

#### Test 4: Password Change
- [ ] Navigate to Settings → Security tab
- [ ] Enter current password, new password, confirm password
- [ ] Click "Update Password" → success message appears
- [ ] Log out and log back in with new password → succeeds
- [ ] Change password back to original

#### Test 5: Admin Portal
- [ ] Navigate to `/admin/login`
- [ ] Login with admin credentials
- [ ] Admin dashboard loads with student directory, tests, reports
- [ ] Admin password change works (if implemented)

#### Test 6: Cross-Origin Requests
- [ ] Open browser DevTools → Network tab
- [ ] Verify API calls to the backend return `200` (not CORS errors)
- [ ] Verify API calls to the analysis service return `200`

#### Test 7: Mobile Responsiveness
- [ ] Open Chrome DevTools → Device Toolbar → iPhone 14 Pro
- [ ] Landing page renders correctly
- [ ] Student login form is usable
- [ ] Dashboard is scrollable and readable
- [ ] Reports are readable

### D.3 — Performance Checks

- [ ] Lighthouse score on landing page: Aim for 90+ on Performance, 95+ on Accessibility
- [ ] Backend cold start time: First request after idle should respond within 5 seconds
- [ ] API response times: Reports endpoint should respond within 2 seconds

### D.4 — Security Checks

- [ ] No API keys or secrets visible in frontend source (View Source or DevTools → Sources)
- [ ] JWT tokens are stored securely (httpOnly cookies or localStorage with proper expiry)
- [ ] Password change requires current password (cannot be bypassed)
- [ ] Backend rejects requests with invalid/expired tokens

---

> **Remember**: After deployment, update the `.env` files and `ALLOWED_ORIGINS` to match the production domains. Always test the full login → dashboard → reports flow end-to-end on the deployed version before sharing with users.
