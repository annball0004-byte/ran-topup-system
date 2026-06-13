# ============================================
#  RAN TOP-UP PRO - Auto Git Backup
#  PowerShell version - more flexible
# ============================================

param(
    [string]$message = ""
)

$projectRoot = "C:\Users\P425\Desktop\ran-topup-system"
Set-Location $projectRoot

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = if ($message) { "auto: $message" } else { "auto: backup $timestamp" }

Write-Host "[$timestamp] Auto backup starting..." -ForegroundColor Cyan

git add .
$changes = git diff --cached --stat

if ($changes) {
    git commit -m $commitMsg
    Write-Host "[$timestamp] Backup complete!" -ForegroundColor Green
    git log --oneline -3
} else {
    Write-Host "[$timestamp] No changes to backup" -ForegroundColor Yellow
}
