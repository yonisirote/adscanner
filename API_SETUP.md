# API Setup Guide

This guide shows you how to get real API keys for production use of Ad Scanner.

## 🆓 Free Tier Summary

| Service | Free Requests | Sufficient For |
|---------|---------------|----------------|
| **VirusTotal** | 500/day | Testing & light personal use |
| **Google Safe Browsing** | 10,000/day | Production use for small user base |

Both services offer generous free tiers perfect for development and moderate production use.

---

## 🔑 VirusTotal API Setup

VirusTotal aggregates 80+ security vendors and is our **primary threat detection service**.

### Step 1: Create Account
1. Go to: **https://www.virustotal.com/gui/join-us**
2. Sign up with email or Google account
3. Verify your email

### Step 2: Get API Key
1. Log in to VirusTotal
2. Go to your profile: **https://www.virustotal.com/gui/my-apikey**
3. Copy your API key (long alphanumeric string)

### Step 3: Add to Server
```bash
cd server
cp .env.example .env
# Edit .env and paste your key:
# VIRUSTOTAL_API_KEY=your_actual_key_here
```

### Limits & Features
- **Free Tier**: 500 requests/day, 4 requests/minute
- **What it checks**: Malware, phishing, suspicious domains
- **Response includes**: Detection count from 80+ engines, threat categories
- **Upgrade**: $10/month for 15,000 requests/day (optional)

---

## 🛡️ Google Safe Browsing API Setup

Google Safe Browsing provides **secondary validation** using Google's threat intelligence.

### Step 1: Create Google Cloud Project
1. Go to: **https://console.cloud.google.com/**
2. Sign in with Google account
3. Click "Select a project" → "New Project"
4. Name it (e.g., "ad-scanner")
5. Click "Create"

### Step 2: Enable Safe Browsing API
1. In your project, go to **APIs & Services** → **Library**
2. Search for: **"Safe Browsing API"**
3. Click on it → Click "Enable"

### Step 3: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → **API Key**
3. Copy the generated API key
4. (Optional) Click "Edit" → Restrict key:
   - API restrictions: Select "Safe Browsing API"
   - Application restrictions: HTTP referrers (optional)

### Step 4: Add to Server
```bash
# Edit server/.env and add:
GOOGLE_SAFE_BROWSING_API_KEY=your_google_api_key_here
```

### Limits & Features
- **Free Tier**: 10,000 requests/day (very generous!)
- **What it checks**: Malware, phishing, unwanted software
- **Response includes**: Threat types, platform types
- **Upgrade**: Contact Google for higher quotas (rarely needed)

---

## ✅ Verify Setup

### 1. Check Environment File
```bash
cd server
cat .env
# Should show both API keys (not the placeholder text)
```

### 2. Start Server
```bash
bun run src/index.ts
```

**With API keys configured**, you should see:
```
[startup] Enabled services: VirusTotal, Google Safe Browsing
[startup] Server running on http://localhost:3000
```

**Without API keys**, you'll see:
```
[startup] VirusTotal API key not configured - using mock data
[startup] Google Safe Browsing API key not configured - using mock data
```

### 3. Test Real API Calls
```bash
# Test with a known malicious domain
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com"}'
```

Check the server logs - you should see API calls to VirusTotal and Google:
```
[VirusTotal] example.com -> 0/88 detections (score: 0.0)
[Safe Browsing] example.com -> 0 threats, trust: 90, risk: 10.0
```

---

## 🚨 Troubleshooting

### "Authentication failed" or "Invalid API key"
- ✅ Check for typos in `.env` file
- ✅ Ensure no extra spaces around the `=` sign
- ✅ VirusTotal key should be 64 characters (alphanumeric)
- ✅ Restart the server after editing `.env`

### "Rate limit exceeded"
- ✅ VirusTotal: 4 requests/minute limit
- ✅ Wait a minute and try again
- ✅ Server automatically caches results for 24 hours

### "403 Forbidden" (Google Safe Browsing)
- ✅ Make sure you enabled the Safe Browsing API in Google Cloud Console
- ✅ Wait 1-2 minutes after enabling (propagation delay)
- ✅ Check API restrictions on the key

---

## 💡 Development vs Production

### Development (Current Setup)
- **No API keys needed**
- Uses mock data (deterministic results)
- Perfect for testing extension features
- No costs, no rate limits

### Production (With API Keys)
- **Real threat detection**
- Required for actual malware/phishing detection
- Monitor quotas in respective dashboards:
  - VirusTotal: https://www.virustotal.com/gui/user/[username]/apikey
  - Google Cloud: https://console.cloud.google.com/apis/dashboard

---

## 📊 Monitoring Usage

### VirusTotal
1. Go to: https://www.virustotal.com/gui/my-apikey
2. View "Daily quota" and "Hourly quota"

### Google Safe Browsing
1. Go to: https://console.cloud.google.com/apis/dashboard
2. Select "Safe Browsing API"
3. View metrics and quotas

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** to git (already in `.gitignore`)
2. **Rotate keys** if accidentally exposed
3. **Use API restrictions** in Google Cloud Console
4. **Monitor quotas** to detect unusual activity

---

## Need Help?

- **VirusTotal API Docs**: https://developers.virustotal.com/reference/overview
- **Google Safe Browsing Docs**: https://developers.google.com/safe-browsing/v4
- **Project Issues**: https://github.com/yonisirote/adscanner/issues
