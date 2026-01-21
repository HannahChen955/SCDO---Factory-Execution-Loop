# OpenAI Backend Proxy Setup

This guide explains how to set up and use the OpenAI API backend proxy for the SCDO Factory Execution Loop demo.

## Overview

The application supports two AI modes:
- **Mock Mode** (default): Uses pre-defined responses for demonstration
- **Real API Mode**: Calls OpenAI GPT-4 via a secure backend proxy

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `dotenv` - Environment variable management
- `openai` - Official OpenAI SDK
- `cors` - Cross-origin resource sharing

### 2. Configure OpenAI API Key

Edit the `.env` file and replace the placeholder with your actual OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
PORT=3000
NODE_ENV=development
```

**Important**: Never commit your `.env` file to version control. It's already added to `.gitignore`.

### 3. Start the Backend Server

```bash
npm start
```

You should see:
```
🚀 SCDO Factory Execution Loop server running on http://localhost:3000
📊 API endpoint: http://localhost:3000/api/openai
🔑 OpenAI API Key configured: true
```

### 4. Enable Real AI Mode

Edit `ai_system.js` and change the configuration:

```javascript
const AI_CONFIG = {
  useRealAPI: true,  // Change from false to true
  apiEndpoint: 'http://localhost:3000/api/openai',
  fallbackToMock: true
};
```

### 5. Open the Application

Open `index_v2.html` in your browser:
```bash
open index_v2.html
```

Or navigate to: `http://localhost:3000/index_v2.html`

## Architecture

```
Frontend (Browser)
    ↓ (Click AI button)
ai_system.js → openAIDrawer(action, params)
    ↓ (if useRealAPI=true)
    ↓ POST /api/openai
Backend (server.js)
    ↓ (API key from .env)
OpenAI API (GPT-4)
    ↓ (response)
Backend → Frontend
    ↓ (display in AI Drawer)
User sees AI response
```

## Security Features

✅ **API Key Protection**: API key stored server-side in `.env`, never exposed to browser
✅ **CORS Enabled**: Controlled cross-origin access
✅ **Automatic Fallback**: Falls back to mock responses if API fails
✅ **Error Handling**: Graceful error messages without exposing sensitive data

## AI Actions Supported

All 12 AI actions are supported:

**Portfolio Page:**
- `portfolio_exec_summary` - Generate executive summary

**Home/Delivery Command Center:**
- `home_diagnose_commit` - Diagnose commit health
- `home_recovery_plan` - Generate recovery plan
- `home_leadership_ask` - Draft leadership escalation

**Signals Page:**
- `signals_ingest` - Analyze signal updates

**Risk Radar Page:**
- `radar_interpret_scores` - Interpret risk scores
- `radar_explain_risk` - Explain specific risks

**Actions Page:**
- `actions_generate_playbook` - Generate recovery playbook
- `actions_draft_message` - Draft team message

**Reports Page:**
- `reports_exec_email` - Generate executive briefing email

**Simulation Mode:**
- `simulation_create_scenario` - Create simulation scenario
- `simulation_explain_tradeoffs` - Explain trade-offs

## Configuration Options

### AI_CONFIG (in ai_system.js)

```javascript
const AI_CONFIG = {
  useRealAPI: false,           // true = OpenAI API, false = mock responses
  apiEndpoint: 'http://localhost:3000/api/openai',  // Backend endpoint
  fallbackToMock: true         // Auto-fallback if API fails
};
```

### OpenAI Model (in server.js)

```javascript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',  // Change model here
  temperature: 0.7,              // Adjust creativity (0-1)
  max_tokens: 1000               // Max response length
});
```

Available models:
- `gpt-4-turbo-preview` (recommended for production)
- `gpt-4` (higher quality, slower)
- `gpt-3.5-turbo` (faster, lower cost)

## Cost Estimation

With `gpt-4-turbo-preview`:
- ~$0.01-0.03 per AI action call
- ~100 calls = $1-3
- Production usage: monitor via OpenAI dashboard

## Troubleshooting

### "OpenAI API key not configured" warning

✅ **Solution**: Edit `.env` and set your actual API key:
```env
OPENAI_API_KEY=sk-your-key-here
```

### AI responses still showing "Mock Response (Demo Mode)"

✅ **Solution**: Change `useRealAPI: true` in `ai_system.js` line 8

### "Failed to fetch" error in browser console

✅ **Solution**: Make sure backend server is running:
```bash
npm start
```

### Port 3000 already in use

✅ **Solution**: Change port in `.env`:
```env
PORT=3001
```

Then update `apiEndpoint` in `ai_system.js`:
```javascript
apiEndpoint: 'http://localhost:3001/api/openai'
```

### CORS errors

✅ **Solution**: Make sure you're accessing the app via the server URL:
- ✅ `http://localhost:3000/index_v2.html`
- ❌ `file:///Users/.../index_v2.html`

## Production Deployment

For production deployment:

1. **Use environment variables** for all configuration
2. **Add rate limiting** to prevent abuse
3. **Add authentication** to protect API endpoints
4. **Enable HTTPS** for secure communication
5. **Monitor costs** via OpenAI dashboard
6. **Set up logging** for debugging and analytics

## Testing

Test the backend endpoint directly:

```bash
curl -X POST http://localhost:3000/api/openai \
  -H "Content-Type: application/json" \
  -d '{
    "action": "home_diagnose_commit",
    "context": {
      "product": "Product A",
      "week": "2026-W04",
      "commitHealth": "YELLOW"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "action": "home_diagnose_commit",
  "response": "...",
  "timestamp": "2026-01-21T..."
}
```

## Support

For issues or questions:
- Check browser console for error messages
- Check server console for API errors
- Review OpenAI API status: https://status.openai.com/
