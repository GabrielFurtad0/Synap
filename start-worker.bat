@echo off
title AntiGravity Worker - Synap Autonomous Engine
chcp 65001 > nul
cls

echo ========================================================
echo        ANTIGRAVITY AUTONOMOUS WORKER (SYNAP ENGINE)
echo ========================================================
echo.
echo Iniciando o agente worker em segundo plano...
echo Este processo escuta as tarefas acionadas pelo botao
echo "Executar com AGY" no Synap e opera diretamente no seu PC!
echo.

cd /d "%~dp0"

node scripts/agy-worker.mjs
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O worker encerrou com erro.
    pause
)
