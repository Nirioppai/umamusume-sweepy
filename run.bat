@echo off
setlocal

set "ROOT=%~dp0"
set "VENV=%ROOT%.venv"

if not exist "%VENV%\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv "%VENV%"
    if errorlevel 1 (
        echo.
        echo Failed to create virtual environment.
        echo Make sure Python is installed and added to PATH.
        echo Download from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

echo Installing dependencies...
"%VENV%\Scripts\pip" install -r "%ROOT%requirements.txt" --prefer-binary --quiet
if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo Starting Sweepy...
start "" "%ROOT%log_viewer.html"
start /B cmd /c "ping -n 5 127.0.0.1 > nul & start http://127.0.0.1:1616"
"%VENV%\Scripts\python" "%ROOT%main.py"
pause
