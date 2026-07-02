@echo off
echo Starting ForReal Application (Server and Client)

echo Starting Backend Server...
cd server
start cmd /k "node server.js"

echo Starting Frontend Client...
cd ../client
start cmd /k "npm run dev"
