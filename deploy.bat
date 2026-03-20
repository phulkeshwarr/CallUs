@echo off
git init
git add .
git commit -m "Complete Redesign with Online/Busy and Chat Features"
git branch -M main
git remote add origin https://github.com/phulkeshwarmahto/Call.io
git push -f -u origin main
