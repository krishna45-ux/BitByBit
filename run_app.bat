@echo off
echo Starting Autonomous Boss...

echo Cleaning up previous instances...
taskkill /F /IM node.exe > NUL 2>&1

:: Move into the backend folder relative to where this script is placed
cd /d "%~dp0backend"

echo Checking Backend Dependencies...
call npm install --silent

echo Launching App Server...
start "Autonomous Boss - App Host" cmd /k "title Autonomous Boss Engine && node index.js"

echo Waiting for Server to start...
timeout /t 3 /nobreak > NUL

echo Opening Application...
start http://localhost:5000

echo Application launched successfully! 
echo You can safely close this launcher window.
exit
