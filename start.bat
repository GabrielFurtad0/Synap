@echo off
title Synap - Neural Task Engine
chcp 65001 > nul
cls

echo ========================================================
echo        SYNAP - Neural Task Engine (Smart Task Manager)
echo ========================================================
echo.
echo Iniciando servidor de desenvolvimento Synap na porta 8090...
echo (Porta 8090 definida para nao colidir com o TotalTrigo nas portas 8080/8085).
echo.

cd /d "%~dp0"

npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    pause
)
