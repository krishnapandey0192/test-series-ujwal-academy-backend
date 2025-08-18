# Port Management Guide

## Current Configuration

- **Server Port**: 8000
- **Health Check**: http://localhost:8000/api/health

## If Port is Already in Use

### Check what's using the port:

```bash
netstat -ano | findstr :8000
```

### Kill the process (replace PID with actual process ID):

```bash
taskkill /PID <PROCESS_ID> /F
```

### Alternative: Change Port

Edit `.env` file and change `PORT=8000` to a different port like:

- `PORT=3000`
- `PORT=5000`
- `PORT=8080`
- `PORT=9000`

## Quick Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Check current port usage
npm run check-ports

# Test server health
curl http://localhost:8000/api/health
```

## Available Ports (commonly free)

- 3000, 3001, 3002
- 5000, 5001, 5002
- 8000, 8001, 8080
- 9000, 9001
