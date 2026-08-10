# BIOSSA-UL Digital Portal - Deployment Guide

## Overview
This guide walks you through deploying the BIOSSA-UL Digital Portal to Vercel with a Google Apps Script backend, and setting up Google Search Console for SEO.

## Architecture
- **Frontend**: Static HTML/CSS/JS hosted on Vercel
- **Backend**: Google Apps Script (existing Code.gs and Portal.gs)
- **Communication**: Vercel serverless function (`/api/proxy`) securely forwards requests to Apps Script
- **Security**: Shared secret between Vercel and Apps Script prevents unauthorized access

## Prerequisites
- Google account with access to the existing Apps Script project
- GitHub account (for Vercel deployment)
- Vercel account (sign up at vercel.com)

## Step 1: Set Up Apps Script Router

1. **Open your existing Apps Script project** (Code.gs, Portal.gs, etc.)

2. **Add the Router.gs file**:
   - Create a new script file named `Router.gs`
   - Copy the contents of the `Router.gs` file from this package
   - Paste it into the new file

3. **Configure the shared secret**:
   - In `Router.gs`, find the line: `var PROXY_SHARED_SECRET_ = "CHANGE_THIS_TO_A_RANDOM_SECRET_STRING";`
   - Replace `CHANGE_THIS_TO_A_RANDOM_SECRET_STRING` with a secure random string
   - Example: `var PROXY_SHARED_SECRET_ = "xK9mP2vQ8rT4wN7zJ1fL5hG3sD6cY0bA";`
   - **Save this secret** - you'll need it for Vercel configuration

4. **Review the function allowlist**:
   - Check the `ALLOWED_FUNCTIONS_` array in Router.gs
   - Add any additional functions from your Portal.gs/Code.gs that need to be accessible
   - Remove any functions that shouldn't be accessible via the proxy

5. **Deploy the Apps Script Web App**:
   - In Apps Script editor, click **Deploy** → **New deployment**
   - Select type: **Web app**
   - Description: "Vercel Proxy Backend"
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - **Copy the Web App URL** (ends with `/exec`) - you'll need this for Vercel

6. **Test the Apps Script deployment**:
   - Open the Web App URL in a browser
   - You should see: "BIOSSA-UL API Router. Access the portal via the Vercel frontend."

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Create a GitHub repository**:
   - Go to github.com and create a new repository
   - Upload all files from the `biossa-vercel` folder:
     - `public/` folder (index.html, gas-shim.js, robots.txt, sitemap.xml)
     - `api/` folder (proxy.js)
     - `package.json`, `vercel.json`, `.gitignore`, `.env.example`
     - `Router.gs` (for reference)

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
   - Click **Add New** → **Project**
   - Select your GitHub repository
   - Keep default settings (Framework: Other, no build command needed)
   - Click **Deploy**

3. **Configure environment variables**:
   - After deployment, go to your project → **Settings** → **Environment Variables**
   - Add these variables:
     - `APPS_SCRIPT_URL` = your Apps Script Web App URL (from Step 1)
     - `PROXY_SHARED_SECRET` = the same secret you set in Router.gs
   - **Redeploy** after adding variables (Deployments → Redeploy)

### Option B: Deploy via Command Line

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Navigate to project directory
cd "c:\Users\guest_\Downloads\MUSARA TECH Hub\biossa-vercel"

# Login to Vercel
vercel login

# Deploy (first time - follow prompts)
vercel

# Add environment variables
vercel env add APPS_SCRIPT_URL production
vercel env add PROXY_SHARED_SECRET production

# Deploy to production
vercel --prod
```

## Step 3: Test the Deployment

1. **Open your Vercel URL** (e.g., `https://biossa-ul.vercel.app`)

2. **Test the proxy connection**:
   - Open browser DevTools (F12) → Network tab
   - Navigate through the portal
   - Verify all requests go to `/api/proxy` (not to script.google.com)
   - Check that responses are successful

3. **Test key functionality**:
   - Try submitting an application
   - Check if admin login works
   - Verify announcements load correctly
   - Test file uploads (if applicable)

## Step 4: Google Search Console Setup

### Step 4.1: Add Property to Google Search Console

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Click **Add a property**
3. Choose **URL prefix** and enter your Vercel URL (e.g., `https://biossa-ul.vercel.app/`)
4. Click **Continue**

### Step 4.2: Verify Ownership

**Option A: HTML Meta Tag (Recommended)**
1. Google will provide a meta tag like: `<meta name="google-site-verification" content="YOUR_CODE">`
2. Open `public/index.html` and uncomment line 29
3. Replace `YOUR_VERIFICATION_CODE_HERE` with your actual verification code
4. Save and redeploy your site
5. Click **Verify** in Google Search Console

**Option B: Google Analytics (if using GA)**
- If you have Google Analytics set up, you can verify through that

**Option C: DNS Verification**
- Add a TXT record to your domain's DNS configuration

### Step 4.3: Submit Sitemap

1. In Google Search Console, go to **Sitemaps** in the left sidebar
2. Enter your sitemap URL: `https://your-domain.com/sitemap.xml`
3. Click **Submit**

Since this is a single-page application, the sitemap only includes the homepage. If you add more pages later, update the sitemap accordingly.

### Step 4.4: Request Indexing

1. In Google Search Console, use the **URL Inspection** tool
2. Enter your homepage URL
3. Click **Request Indexing**
4. This helps Google discover and index your site faster

## Step 5: Custom Domain Setup (Optional)

If you have a custom domain (e.g., `biossa.ul.edu.lr`):

1. In Vercel project → **Settings** → **Domains**
2. Add your custom domain
3. Vercel will provide DNS records to add at your domain registrar
4. Common setup:
   - **A Record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
5. After DNS propagates, update URLs in:
   - `public/index.html` (canonical URL, Open Graph tags)
   - `public/robots.txt` (sitemap URL)
   - `public/sitemap.xml` (page URLs)
   - Redeploy after changes

## Step 6: Post-Deployment Checklist

- [ ] Apps Script Router.gs added and deployed
- [ ] Shared secret configured in both Router.gs and Vercel
- [ ] Apps Script Web App deployed and URL copied
- [ ] Vercel project deployed successfully
- [ ] Environment variables configured in Vercel
- [ ] Proxy connection tested (Network tab shows `/api/proxy` calls)
- [ ] Key functionality tested (applications, login, announcements)
- [ ] Google Search Console property added
- [ ] Site verified with Google Search Console
- [ ] Sitemap submitted to Google Search Console
- [ ] Homepage indexing requested
- [ ] Custom domain configured (if applicable)
- [ ] All URLs updated if using custom domain

## Troubleshooting

**Proxy returns 403 Unauthorized:**
- Verify `PROXY_SHARED_SECRET` matches exactly in both Router.gs and Vercel
- Check for extra spaces or typos in the secret
- Ensure environment variables are set in the correct Vercel environment (production)

**Proxy returns 500 error:**
- Verify `APPS_SCRIPT_URL` is correct and ends with `/exec`
- Check Apps Script deployment is set to "Anyone" access
- Review Apps Script execution logs for errors

**Functions not found:**
- Check the `ALLOWED_FUNCTIONS_` array in Router.gs
- Ensure function names match exactly (case-sensitive)
- Verify functions exist in Portal.gs or Code.gs

**Site not indexed by Google:**
- Verify robots.txt allows crawling
- Check sitemap is accessible at `/sitemap.xml`
- Use URL Inspection tool to request indexing
- Ensure no `noindex` meta tags are present

**File uploads fail:**
- Vercel serverless functions have a ~4.5MB request body limit
- If you need larger uploads, consider:
  - Reducing `MAX_UPLOAD_BYTES` in your code
  - Implementing direct-to-Drive uploads
  - Using a different upload mechanism

## Security Considerations

1. **Shared Secret**: Keep the `PROXY_SHARED_SECRET` secure and never commit it to git
2. **Function Allowlist**: Only include functions that need to be accessible via the proxy
3. **Apps Script Access**: Keep Web App access as "Anyone" but rely on the shared secret for security
4. **Environment Variables**: Never commit `.env` files or expose secrets in client-side code
5. **Rate Limiting**: Consider implementing rate limiting in the proxy if needed

## Local Testing

To test locally before actual deployment:

```bash
cd "c:\Users\guest_\Downloads\MUSARA TECH Hub\biossa-vercel"

# Install dependencies (if any)
npm install

# Create .env file with your credentials
cp .env.example .env
# Edit .env with your actual Apps Script URL and secret

# Start local development server
npm install -g vercel
vercel dev
```

The site will be available at `http://localhost:3000`.

## Maintenance

- **Monitor Apps Script quotas**: Watch execution time and API usage
- **Update function allowlist**: Add new functions as you add features
- **Rotate secrets**: Periodically update the shared secret
- **Review logs**: Check both Vercel and Apps Script logs regularly
- **Update SEO**: Refresh sitemap and meta tags as content changes

## Support

For issues related to:
- **Apps Script**: Check the Apps Script dashboard execution logs
- **Vercel**: Check Vercel deployment logs and function logs
- **Google Search Console**: Use the URL Inspection tool for debugging

## File Structure Reference

```
biossa-vercel/
├── api/
│   └── proxy.js              # Vercel serverless function
├── public/
│   ├── index.html            # Main portal HTML (with gas-shim.js)
│   ├── gas-shim.js           # google.script.run replacement
│   ├── robots.txt            # Search engine directives
│   └── sitemap.xml           # Sitemap for SEO
├── package.json              # Node.js dependencies
├── vercel.json               # Vercel configuration
├── .gitignore                # Git ignore rules
├── .env.example              # Environment variable template
├── Router.gs                 # Apps Script router (add to your Apps Script project)
└── DEPLOYMENT_GUIDE.md       # This file
```

## Next Steps

After successful deployment:
1. Monitor the site for the first few days
2. Check Google Search Console for indexing status
3. Gather user feedback and fix any issues
4. Consider adding analytics (Google Analytics, etc.)
5. Plan for regular backups and maintenance
