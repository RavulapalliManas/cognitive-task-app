# Quick Start Guide

## Prerequisites
- Python 3.8+ with FastAPI, uvicorn, numpy, scipy, shapely installed
- Node.js 18+ with npm
- All dependencies installed (`npm install` already done)

## Step-by-Step Launch

### Terminal 1: Start Python Backend
```bash
cd "cognitive backend"
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2: Start Next.js Frontend
```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x
- Local:        http://localhost:3000
```

## Using the Application

1. **Open browser**: http://localhost:3000

2. **Fill user info**: Navigate to `/name` page
   - Enter name, age, country, sex
   - Click "Begin Assessment"

3. **Start a test**: You'll see three options
   - **Level 1 (Blue)**: Basic polygon tracing
   - **Level 2 (Purple)**: Memory test with hidden labels
   - **Level 3 (Green)**: Attention test with drift

4. **Complete the test**:
   - Click points in sequence (follow the numbers/letters)
   - Watch for visual cues (pulses, flashes, colors)
   - Track your progress in the top HUD
   - Click "Finish Test" when done

5. **View results**: Results page shows your scores

## Troubleshooting

### Backend not starting?
```bash
# Install dependencies
pip install fastapi uvicorn numpy scipy shapely

# Or with conda
conda install -c conda-forge fastapi uvicorn numpy scipy shapely
```

### Frontend errors?
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### CORS errors in browser?
- Make sure backend is running on port 8000
- Check backend console for CORS middleware logs
- Backend already has CORS configured for all origins

### Navigation crashes?
- Path has been fixed to `/tests/assessment%20` (note the space)
- Make sure folder structure is correct
- Check browser console for errors

## Testing Individual Levels

### Test Level 1 (Basic)
- Should show all numbered points
- No drift, no flashing
- Simple click-in-order task

### Test Level 2 (Memory)
- 75% of labels hidden (shows "?")
- Yellow flashing points indicate what to remember
- Countdown notification for next flash

### Test Level 3 (Attention)
- Points drift in circular patterns
- Random highlights grab attention
- All previous features enabled

## Performance Check

Open browser DevTools (F12) → Performance tab:
- Should maintain 60 FPS during rendering
- No long tasks blocking the main thread
- Smooth animations without jank

## Expected Behavior

✅ **Correct clicks**: Point turns green, shows sequence number
✅ **Wrong clicks**: Point flashes red briefly, mistake counter increments
✅ **Next expected**: Point pulses blue
✅ **Hover**: Point grows slightly, changes color
✅ **Timer**: Updates continuously in MM:SS.MS format
✅ **Progress**: Bar fills as you complete the sequence

## Data Flow

1. User submits name form → localStorage
2. Click "Start Level X" → API call to backend
3. Backend generates polygon → Returns points + metadata
4. User clicks points → Tracked locally with timestamps
5. Click "Finish" → Send all data to `/grade` endpoint
6. Backend calculates scores → Returns grading response
7. Frontend shows completion screen

## Files Modified

- ✅ `/app/name/page.tsx` - Fixed navigation route
- ✅ `/lib/backend.ts` - Added generatePartial and generateAttention
- ✅ `/app/tests/assessment /page.tsx` - Complete rewrite with HUD
- ✅ `/app/tests/assessment /canvas.tsx` - 60fps canvas renderer
- ✅ `/app/tests/assessment /useassessment.ts` - State management

## No Changes Needed

- ✅ `cognitive backend/main.py` - Already has all necessary endpoints
- ✅ Backend CORS - Already configured
- ✅ Backend models - All Pydantic models ready

Enjoy testing! 🎯
I want you to execute the following requests while keeping in mind the following things, Dont make unnecessary readme files, write code in a human readable form use proper grammer and formatting, I want you to also keep in mind the fact that dont hallucinate, and break down huge tasks into smaller tasks bite sized, Dont pick too much big tasjs and fail. 
1. Remove the highlighting of the next point before choosing it also make the points bigger size as well as making lines between them bigger and thicker, 

Q64GN2


EF6R58