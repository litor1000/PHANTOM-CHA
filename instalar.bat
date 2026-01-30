@echo off
echo ========================================
echo   INSTALANDO DEPENDENCIAS
echo ========================================
echo.

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)
echo.

echo Instalando dependencias do projeto...
echo Isso pode demorar alguns minutos...
echo.

npm install

if %errorlevel% neq 0 (
    echo.
    echo ERRO ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCESSO! Dependencias instaladas.
echo ========================================
echo.
echo Agora voce pode:
echo 1. Dar duplo clique em testar.bat
echo 2. Ou rodar: npm run dev
echo.
pause
