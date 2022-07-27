@ECHO off
ECHO Preparing...
IF NOT EXIST "./out" (
    mkdir out
    ECHO -^> Out folder created
) ELSE (
    ECHO -^> Out folder already exists
)

@REM ECHO Compiling Server...
@REM CALL tsc
@REM ECHO Compiling Client...
@REM cd ./src/Client
@REM CALL tsc
ECHO Compiling...
CALL gulp
ECHO Starting...
cd ..
cd ..
electron .
@REM npm start