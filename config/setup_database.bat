@echo off
echo Creating and setting up the database...
"C:\xampp\mysql\bin\mysql.exe" -u root < "%~dp0schema.sql"
if %errorlevel% equ 0 (
    echo Database setup completed successfully!
) else (
    echo Error setting up the database. Make sure XAMPP MySQL service is running.
)
