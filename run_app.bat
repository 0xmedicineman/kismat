@echo off
echo Starting KiSMAT - Smart Mobility and Transport...
echo.
echo Trying to run with different Python commands...

REM Try python command
echo Attempting with 'python'...
python app.py
if %ERRORLEVEL% EQU 0 goto success

REM Try py command
echo Attempting with 'py'...
py app.py
if %ERRORLEVEL% EQU 0 goto success

REM Try python3 command
echo Attempting with 'python3'...
python3 app.py
if %ERRORLEVEL% EQU 0 goto success

REM Try with Microsoft Store Python
echo Attempting with Microsoft Store Python...
%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe app.py
if %ERRORLEVEL% EQU 0 goto success

echo.
echo ===============================================
echo Python was not found on your system. To fix this:
echo.
echo Option 1: Install Python from the Microsoft Store
echo   - Open Microsoft Store and search for "Python"
echo   - Install the latest version
echo.
echo Option 2: Install Python from python.org
echo   - Download from https://www.python.org/downloads/
echo   - IMPORTANT: Check "Add Python to PATH" during installation
echo.
echo Option 3: Create a static HTML version of the app
echo   - This would allow you to run the app without Python
echo   - Type "static" to create this version
echo ===============================================
echo.

set /p choice="Enter 'static' to create a static version or press any key to exit: "
if /i "%choice%"=="static" (
    echo Creating static version of the app...
    copy templates\index.html index.html
    echo Static version created! Open index.html in your browser.
) else (
    echo Exiting...
)
goto end

:success
echo.
echo Application is running! Open your browser and go to http://127.0.0.1:5000/

:end
pause
