# GitHub Pages Deployment Guide

## Quick Start

### Step 1: Commit and Push Files

```bash
cd /Users/lasith/Codes/PROJECTS/research-projects/OSMTimeMachine

# Add all new files
git add index.html app.js .nojekyll README.md

# Commit changes
git commit -m "Add static GitHub Pages version"

# Push to GitHub
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/Lasith-Niro/OSMTimeMachine`
2. Click on **Settings** (gear icon)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

### Step 3: Access Your Site

After a few minutes, your site will be live at:
```
https://lasith-niro.github.io/OSMTimeMachine
```

## What Changed?

### Architecture Conversion

**Before (Flask):**
- Backend: Python Flask server
- Frontend: Jinja2 templates
- API calls: Server-side

**After (Static):**
- Backend: None! Runs entirely in browser
- Frontend: Pure HTML/CSS/JavaScript
- API calls: Client-side fetch to Overpass API

### Files Created

1. **`index.html`** - Main HTML file (replaces `templates/map.html`)
2. **`app.js`** - All JavaScript logic (replaces Flask backend)
3. **`.nojekyll`** - Tells GitHub to skip Jekyll processing

### Files Kept (for local development)

- **`app.py`** - Still works for local Flask server
- **`templates/map.html`** - Still works with Flask
- **`requirements.txt`** - Python dependencies

## Testing Locally

### Option 1: Simple HTTP Server

```bash
# Using Python 3
python -m http.server 8000

# Visit http://localhost:8000
```

### Option 2: Flask Server (Original)

```bash
python app.py
# Visit http://localhost:5002
```

Both versions work identically!

## Troubleshooting

### Issue: 404 Error on GitHub Pages

**Solution:** Make sure you:
1. Pushed `index.html` to the repository
2. Selected the correct branch in Settings → Pages
3. Waited 2-5 minutes for deployment

### Issue: Way data not loading

**Solution:** 
- Check browser console for CORS errors
- The Overpass API allows cross-origin requests, so this should work
- If blocked, try using a different browser or clearing cache

### Issue: Styles not loading

**Solution:**
- Make sure all CSS is inline in `index.html`
- Clear browser cache
- Check browser console for errors

## Custom Domain (Optional)

To use a custom domain like `osmtimemachine.yourdomain.com`:

1. Add a `CNAME` file to your repository with your domain
2. Configure DNS with your domain provider
3. Update GitHub Pages settings

See: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Updates

To update your live site:

```bash
# Make changes to index.html or app.js
git add .
git commit -m "Update UI"
git push origin main

# GitHub Pages will auto-deploy in ~2 minutes
```

## Performance

- ✅ No server costs
- ✅ Free hosting on GitHub
- ✅ Fast CDN delivery
- ✅ HTTPS included
- ✅ No scaling concerns

## Limitations

- Cannot add server-side processing
- No database (uses Overpass API directly)
- Rate limited by Overpass API (~10,000 queries/day)

## Support

If you encounter issues:
1. Check GitHub Actions tab for deployment errors
2. View browser console for JavaScript errors
3. Test locally first with `python -m http.server`

---

Happy mapping! 🗺️
