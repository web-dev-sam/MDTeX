@echo off
SET PROJECT_PATH=%cd%
winpty docker run --env-file ./.env -it -v "%PROJECT_PATH%:/usr/src/app" --entrypoint //bin//sh luatexmdx:latest
