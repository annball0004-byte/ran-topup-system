@echo off
REM ============================================
REM  RAN TOP-UP PRO - Auto Git Backup
REM  Run after every code change
REM ============================================

cd /d C:\Users\P425\Desktop\ran-topup-system

echo [%date% %time%] Auto backup starting...

git add .
git commit -m "auto: backup %date% %time%"

echo [%date% %time%] Backup complete!
git log --oneline -3
