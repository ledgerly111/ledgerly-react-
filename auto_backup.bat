@echo off
title Ledgerly Auto-Backup
echo Starting automatic backup service...
echo Press Ctrl+C to stop.
echo.

:loop
echo [%time%] Checking for changes...
git add .
git commit -m "Auto-backup: %date% %time%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [%time%] Backup created successfully!
) else (
    echo [%time%] No changes to backup.
)

:: Wait for 30 minutes (1800 seconds)
timeout /t 1800 >nul
goto loop
