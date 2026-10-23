@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  echo Starting Hanmo Lord at http://127.0.0.1:8765/
  start "" "http://127.0.0.1:8765/"
  py -m http.server 8765 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting Hanmo Lord at http://127.0.0.1:8765/
  start "" "http://127.0.0.1:8765/"
  python -m http.server 8765 --bind 127.0.0.1
  goto :eof
)

echo Python was not found. Opening the game directly instead.
start "" "%~dp0index.html"
