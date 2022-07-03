@ECHO off
ECHO Preparing...
IF NOT EXIST "./out" (
    mkdir out
    ECHO -^> Out folder created
) ELSE (
    ECHO -^> Out folder already exists
)

ECHO Compiling Server...
CALL tsc
ECHO Compiling Client...
cd ./src/Client
CALL tsc
ECHO Starting...
cd ..
cd ..
npm start