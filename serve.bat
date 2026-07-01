@echo off
cd /d "%~dp0"
echo.
echo Investment Portfolio - local server
echo.
echo NOTE: http:// on your phone does NOT support Share or encrypted backup.
echo       Safari on iPhone requires HTTPS for those features.
echo       Use Netlify or GitHub Pages for phone testing (see netlify.toml).
echo.
echo Phone must be on the same Wi-Fi as this PC (UI testing only):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo   http://%%a:8080
echo.
echo Press Ctrl+C to stop.
echo.
py -m http.server 8080 --bind 0.0.0.0
