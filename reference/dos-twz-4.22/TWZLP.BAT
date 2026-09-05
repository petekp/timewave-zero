@ECHO OFF
REM TWZ.BAT
REM Timewave Zero 4.21 startup batch file for systems
REM with a graphics adaptor and with a laser printer
REM Last modified: 1993-03-11

CLS
IF EXIST LIESMICH.TXT GOTO GER1
ECHO One moment please ...
GOTO CHECK87

:GER1
ECHO Einen Moment bitte ...
INST_GT>NUL
IF NOT ERRORLEVEL 1 GOTO CHECK87
ECHO GRAFTABL nicht installiert.
PAUSE

:CHECK87
IF "%1"=="87" SET TWZ=87
IF NOT "%1"=="87" SET TWZ=
IF EXIST GRAPHICS.COM GRAPHICS graphics

TWZERO%1
