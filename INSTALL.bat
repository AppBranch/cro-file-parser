@echo off

echo Checking Node.js installation...

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Installing Node.js...
    
    :: Path to the Node.js installer - update this to the path where you've placed your MSI installer
    set INSTALLER_PATH=.\dependencies\node-v21.5.0-x64.msi

    :: Silently install Node.js
    msiexec /i "%INSTALLER_PATH%" /qn /norestart

    :: Check if installation was successful
    where node >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo Failed to install Node.js.
        pause
         exit /b
    )
)

echo Node.js installation detected.

:: Change to your project directory
cd "data"

:: Install dependencies and start the project
echo Installing dependencies...
npm install