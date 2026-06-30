@echo off
cd /d "%~dp0"
echo.
echo Investment Portfolio - local server
echo Phone must be on the same Wi-Fi as this PC.
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo Open on your phone:  http://%%a:8080
echo.
echo Press Ctrl+C to stop.
echo.
py -m http.server 8080 --bind 0.0.0.0
