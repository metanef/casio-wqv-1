# Casio WQV-1 Emulator

A web-based emulator for the classic **Casio WQV-1 Wrist Camera** (the first watch with a built-in digital camera!). This app recreates the retro 120x120 pixelated grayscale aesthetic directly in your browser.

## Features

- **Live Camera Feed**: Access your webcam and apply a real-time retro dithered filter.
- **Image Import**: Upload any image from your device to see how it would look through the lens of a WQV-1.
- **Take Photos**: Snap photos in the app which are saved to a bottom gallery.
- **Gallery & Modal View**: Click on any photo in the gallery to view it enlarged in a modal.
- **Download**: Download your retro photos to your device.
- **Adjustments**:
  - **BRIGHT**: Cycle through different brightness levels.
  - **INV**: Invert the colors for a negative effect.

## How to Run

Since the application uses your device's webcam and JavaScript modules, it needs to be run in a secure context (HTTPS or localhost). 

**Option 1: Using a local server (Recommended)**
If you have Node.js installed, you can serve the directory using `npx serve` or any other local web server:
```bash
npx serve .
```

**Option 2: Live Server Extension**
If you use VS Code, install the "Live Server" extension, right-click `index.html`, and select "Open with Live Server".

## Technologies Used

- **HTML5** for structure
- **CSS3 / Tailwind CSS** for styling the retro Casio watch interface
- **Vanilla JavaScript** for camera logic, image processing (Ordered Dithering via Bayer Matrix), and UI interactions
- **Canvas API** for applying the real-time retro filters

## Structure

- `index.html`: Main interface and layout.
- `style.css`: Custom CSS for the retro watch casing, LCD screen, and modal overlays.
- `script.js`: Core logic for webcam access, canvas drawing, and UI handling.
