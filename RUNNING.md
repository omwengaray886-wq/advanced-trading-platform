# Running the Platform

The platform requires **two servers** to run simultaneously:

## 1. Proxy Server (Backend)
```powershell
node server.js
```
- **Port**: 3001
- **Purpose**: Handles API proxying for Binance, CoinGecko, NewsAPI, and Gemini AI
- **Why needed**: Bypasses CORS restrictions and secures API keys

## 2. Frontend (Vite Dev Server)
```powershell
npm run dev
```
- **Port**: 5173  
- **Purpose**: Serves the React app
- **Access**: http://localhost:5173

## Startup Script (Run Both)
Create a npm script to launch both automatically:

**package.json:**
```json
"scripts": {
  "dev": "vite",
  "server": "node server.js",
  "start:all": "concurrently \"npm run server\" \"npm run dev\""
}
```

Then install `concurrently`:
```powershell
npm install --save-dev concurrently
```

And run:
```powershell
npm run start:all
```

## Already Running
Both servers are currently active. The platform should now load live data correctly.
