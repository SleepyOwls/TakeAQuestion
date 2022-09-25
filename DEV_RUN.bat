@ECHO off
ECHO Preparing...
IF NOT EXIST "./out" (
    mkdir out
    ECHO -^> Out folder created
) ELSE (
    ECHO -^> Out folder already exists
)

ECHO Compiling...
SET DEV_ENV=false
CALL gulp
ECHO Starting...
electron .
@REM npm start