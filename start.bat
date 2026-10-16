@echo off
title Synap - Neural Task Engine
chcp 65001 > nul
cls

echo ========================================================
echo        SYNAP - Neural Task Engine (Smart Task Manager)
echo ========================================================
echo.
echo Iniciando servidor de desenvolvimento...
echo Caso a porta 8080 esteja ocupada (ex: TotalTrigo),
echo o Vite selecionara a proxima porta livre automaticamente (8081, 8082...).
echo.

cd /d "%~dp0"

npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    pause
)
