# Phosphor Pit Snake

A browser-based **Snake** arcade game built with **Vite + vanilla JavaScript + Canvas** and styled like a dusty CRT cabinet from a fictional 1984 basement arcade.

## Why this aesthetic?
I aimed for a specific look: **phosphor-green monitor glow + amber cabinet trim + scanline texture**, with pixel fonts (`Silkscreen` + `VT323`) to avoid generic modern UI patterns.

## Gameplay
- Move with **Arrow keys** or **WASD**
- Press **Space** or **Enter** to start/restart
- Eat glowing fruit to gain score
- Speed increases every few points (level goes up)
- Game ends if you hit a wall or your own body
- Optional **sound toggle** for retro synth blips
- Mobile-friendly with on-screen D-pad controls

## Scripts
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Tech Stack
- Vite
- Vanilla JavaScript
- HTML5 Canvas
- CSS (custom properties, scanline effects, responsive layout)

## Notes
- High score is stored in `localStorage`
- Fully static app, no backend/API/auth required
