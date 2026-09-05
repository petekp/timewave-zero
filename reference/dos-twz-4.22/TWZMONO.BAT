@ECHO OFF
REM TWZMONO.BAT
REM Timewave Zero 4.21 startup batch file for systems
REM with monochrome monitors without a graphics card
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

IF EXIST GRAPHICS.COM GRAPHICS
IF EXIST SIMCGA.COM GOTO INSTALL

IF EXIST LIESMICH.TXT GOTO GER2
ECHO           Timewave Zero requires either a graphics adaptor
ECHO                        or a CGA simulator.
GOTO END

:GER2
ECHO       Timewave Zero ben”tigt entweder ein Graphikadaptor
ECHO                     oder einen CGA-Simulator.
GOTO END

:INSTALL
SIMCGA>NUL

TWZERO%1

REM IF ERRORLEVEL 1 PAUSE
IF EXIST RMVCGA.COM RMVCGA>NUL

:END
