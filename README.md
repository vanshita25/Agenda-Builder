# Runsheet Builder

An AI-powered event runsheet generator. Enter your event details and get a complete run of show with timings, buffer slots, AV notes, and MC scripts in seconds.

## Files

```
runsheet-app/
├── index.html   — Main page
├── style.css    — Stylesheet
├── app.js       — App logic
├── server.js    — Express proxy server for API requests
├── .env         — Environment variables (store API key here)
└── README.md    — This file
```

## How to run locally

1. Install dependencies: `npm install`
2. Create a `.env` file in the root directory and add your Groq API key:
   `GROQ_API_KEY=your_groq_api_key_here`
3. Start the server: `npm start`
4. Open your browser and navigate to `http://localhost:3000`

## API Key

The API key is securely stored in the `.env` file and handled by the Node.js backend. Users no longer need to enter it manually in the frontend.

## Customisation

- To change the model, edit the `model` field in `server.js` (currently `llama-3.3-70b-versatile`)
- To add your own branding, edit the `.nav-logo` text and colors in `style.css`
