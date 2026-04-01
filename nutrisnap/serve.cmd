@echo off
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File serve.ps1
