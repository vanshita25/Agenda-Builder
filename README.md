# Runsheet Builder

An AI-powered event runsheet generator. Enter your event details and get a complete run of show with timings, buffer slots, AV notes, and MC scripts in seconds.

## Files

```
runsheet-app/
├── index.html   — Main page
├── style.css    — Stylesheet
├── app.js       — App logic + Anthropic API calls
└── README.md    — This file
```

## How to host (pick one)

### Option 1 — Netlify (recommended, free)
1. Go to https://app.netlify.com
2. Drag and drop the `runsheet-app` folder onto the Netlify dashboard
3. Your site is live instantly at a `.netlify.app` URL
4. Add a custom domain in Site Settings → Domain management

### Option 2 — Vercel (free)
1. Install Vercel CLI: `npm i -g vercel`
2. Inside the `runsheet-app` folder run: `vercel`
3. Follow the prompts — live in ~30 seconds

### Option 3 — GitHub Pages (free)
1. Create a new GitHub repo
2. Upload all three files to the repo root
3. Go to Settings → Pages → Source: Deploy from branch (main)
4. Your site is live at `https://yourusername.github.io/repo-name`

### Option 4 — Any static host
Upload `index.html`, `style.css`, and `app.js` to any static file host:
- Cloudflare Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Render (static sites are free)

## API Key

Users provide their own Anthropic API key at https://console.anthropic.com  
The key is stored in `sessionStorage` only — never sent anywhere except directly to Anthropic's API.

## Customisation

- To change the model, edit the `model` field in `app.js` (currently `claude-opus-4-5`)
- To add your own branding, edit the `.nav-logo` text and colors in `style.css`
- To pre-fill the API key for your team, set `document.getElementById('apiKey').value = 'YOUR_KEY'` at the top of `app.js` (only do this on a private/internal deployment)
