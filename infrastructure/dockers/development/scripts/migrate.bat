@echo off
REM Token Town — Local Database Migration Manager (Windows)
REM This script helps manage database migrations for local development

setlocal enabledelayedexpansion

set MIGRATIONS_DIR=..\..\..\apps\servers\go-app\internal\db\migrations
set DB_NAME=tokentown
set DB_USER=postgres
set CONTAINER_NAME=tokentown-postgres

set COMMAND=%1

if "%COMMAND%"=="up" goto :up
if "%COMMAND%"=="down" goto :down
if "%COMMAND%"=="seed" goto :seed
if "%COMMAND%"=="reset" goto :reset
if "%COMMAND%"=="status" goto :status
if "%COMMAND%"=="connect" goto :connect
goto :usage

:up
echo [Green]Running all pending migrations...[NC]
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%MIGRATIONS_DIR%\001_initial.sql" 2>nul || echo 001_initial.sql already applied or failed
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%MIGRATIONS_DIR%\002_agents.sql" 2>nul || echo 002_agents.sql already applied or failed
echo [+] Migrations completed
goto :end

:down
echo [Yellow]Rolling back migrations...[NC]
echo [Red]Warning: This will drop tables![NC]
set /p CONFIRM="Are you sure? (yes/no): "
if "!CONFIRM!"=="yes" (
    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%MIGRATIONS_DIR%\002_agents.sql" | findstr "DROP TABLE" >nul 2>&1
    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%MIGRATIONS_DIR%\001_initial.sql" | findstr "DROP TABLE" >nul 2>&1
    echo [+] Rollback completed
) else (
    echo [Yellow]Rollback cancelled[NC]
)
goto :end

:seed
echo [Green]Seeding database with furniture data...[NC]
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < ..\services\postgres\furniture_seeds.sql
echo [+] Seed data inserted
goto :end

:reset
echo [Yellow]Resetting database...[NC]
echo [Red]Warning: This will delete all data![NC]
set /p CONFIRM="Are you sure? (yes/no): "
if "!CONFIRM!"=="yes" (
    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < ..\services\postgres\init.sql
    docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < ..\services\postgres\furniture_seeds.sql
    echo [+] Database reset completed
) else (
    echo [Yellow]Reset cancelled[NC]
)
goto :end

:status
echo [Green]Database status:[NC]
docker exec -it %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -c "\dt"
goto :end

:connect
echo [Green]Connecting to PostgreSQL...[NC]
docker exec -it %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME%
goto :end

:usage
echo Token Town — Local Database Migration Manager
echo.
echo Usage: migrate.bat ^<command^>
echo.
echo Commands:
echo   up       - Run all pending migrations
echo   down     - Rollback migrations (requires confirmation)
echo   seed     - Insert seed data
echo   reset    - Drop and recreate database (requires confirmation)
echo   status   - Show database tables
echo   connect  - Open psql shell
echo.
exit /b 1

:end
