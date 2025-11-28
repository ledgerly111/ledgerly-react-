@echo off
echo Backing up your project...
git add .
set /p commit_msg="Enter a description for this backup: "
git commit -m "%commit_msg%"
echo.
echo Backup complete!
pause
