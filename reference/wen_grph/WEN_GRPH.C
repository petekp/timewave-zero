//  WEN_GRPH.C
//  Takes a representation of a hexagram sequence,
//  constructs the intermediate graphs
//  then calculates the 384 data points.
//  Author: Peter Meyer
//  Last mod.: 1998-01-01

#include <STDIO.H>
#include <STDLIB.H>
#include <STRING.H>
#include <CONIO.H>
#include <PROCESS.H>

#include <L_FILE.H>
#include <L_VIDEO.H>
#include <L_STR.H>
#include <L_KEY.H>
#include <L_KEYDEF.H>
#include <L_BEEP.H>

//  This program reads from a file a hexagram sequence
//  (consisting of some permutation of the numbers 1 through 64
//  which are the numbers of the hexagrams in the King Wen sequence)
//  and does the following:
//  Tests that it is a Wen sequence of type 1.
//  Calculates the hexagram differences.
//  Tests for 5s, closure, etc.
//  Graphs the differences.
//  Calculates the 384 data points and writes them to a file.

#define ASSIGN
#include "SEQ.H"
#include "WEN_GRPH.H"

Uchar  input_filename[81]; 
Uchar output_filename[81];
   
Str_ptr copyright = "WEN_GRPH.EXE, Version 2.1, Copyright 1994,1998 Peter Meyer";  

Str_ptr usage = 
    "Use: WEN_GRPH Z hexagram_sequence_file\n"
    " or: WEN_GRPH X hexagram_sequence_file\n"
    " or: WEN_GRPH Z\n"
    " or: WEN_GRPH X\n"
    " or: WEN_GRPH\n"
    " or: WEN_GRPH /h\n\n"
    "If no hexagram file is specified then the hexagram\n"
    "sequence file is assumed to be \"KING_WEN.SEQ\".\n"
    "Z means include the \"half-twist\", X means exclude it.\n"; 
    
void display_help(void);    

/*------------------------------*/
void main (int argc, char *argv[])
{
int i, j, half_twist, err_flag, result, show_sequence=TRUE;
int col, start, mode, tbl_written=FALSE, twz_written=FALSE;
Uint ch;

set_bios_video(TRUE);
printf("%s\n",copyright); 

for ( i=1; i<argc; i++ )
    strupr(argv[i]); 
    
if ( argc > 1 )
    {
    ch = argv[1][0];
    if ( ch != 'X' && ch != 'Z' && ch != '/' ) 
        {
        printf("\n%s\n",usage);  
        exit(1);
        }         
    }    

if ( argc == 1 )
    {
    half_twist = 1;
    strcpy(input_filename,"KING_WEN.SEQ");
    }
else if ( argc == 2 )
    {
    if ( !strcmp(argv[1],"/H") )
        half_twist = -1;
    else
        {        
        half_twist = (argv[1][0] == 'Z'); 
        strcpy(input_filename,"KING_WEN.SEQ");
        }
    }                        
else if ( argc == 3 )  
    { 
    half_twist = (argv[1][0] == 'Z'); 
    strcpy(input_filename,argv[2]);
    if ( strstr(input_filename,".SEQ") == NULL )
        {
        printf("\nHexagram sequence file must have .SEQ extension.\n");
        half_twist = -1;
        }     
    }
else 
    half_twist = -1;      
     
if ( half_twist < 0 ) 
    {
    printf("\n%s\n",usage);  
    exit(1);
    }         
    
printf("Using %shalf_twist and hexagram sequence file \"%s\".\n",
    ( half_twist ? "" : "no "),input_filename);
    
strcpy(output_filename,input_filename);
*strchr(output_filename,'.') = 0;

hpix =  8;       
mode = 16;  
vpix = 14;
color_0 =  3;
color_1 = 13;
color_2 =  2;
do_xor = TRUE;

i = atoi_array(input_filename,NULL,&err_flag);
if ( err_flag )
    {
    switch ( err_flag )
        {
        case -1: 
            printf("\nError opening file %s.\n",input_filename);
            printf("\n%s\n",usage);  
            break;
        case -2: 
            printf("\nInvalid input from file %s.\n",input_filename);  
            break;
        case -3: 
            printf("\nOverflow error for file %s.",input_filename);  
            break;
        }
    exit(2);
    }

if ( i != 64 )
    {
    printf("\nHexagram sequence in file %s contains"
           "\n%d hexagram numbers.  There must be 64.\n",input_filename,i);
    exit(3);
    }

//  Read 'em in.
atoi_array(input_filename,&hexseq[1],&err_flag);
if ( hexseq[1] != 1 )
    {
    printf("\nFirst hexagram must be #1.\n");
    exit(4);
    }

for ( i=2; i<=64; i++ )
    {
    if ( hexseq[i] < 1 || hexseq[i] > 64 )
        {
        printf("\nHexagram sequence in file %s contains an "
               "\ninvalid hexagram number, %d at position %d.",
               input_filename,hexseq[i],i);
        printf("\nHexagram numbers must be in the range 1 through 64.\n");
        exit(5);
        }
    }

for ( i=0; i<64; i++ )
    {
    for ( j=i+1; j<=64; j++ )
        {
        if ( hexseq[i] == hexseq[j] )
            {
            printf("\nHexagram number %d, at position %d, "
                "occurs also at position %d.\n",hexseq[i],i,j);
            exit(6);
            }
        }
    }

//  Convert the input to a computation-friendly form.
for ( i=1; i<=64; i++ )
    {
    for ( j=1; j<=6; j++ )
        hexagram[i][j] = kwseq[hexseq[i]][j-1]-'0';
    }

//  Check that this is a Wen sequence of type 1.
for ( i=2; i<=64; i+=2 )
    {
    //  Is this hexagram the inverse of the previous one?
    result = derive_second_hexagram(i-1,hg);
    if ( ( result == -1 ) || memcmp(&hexagram[i][1],&hg[1],6) )
        {
        printf("\nHexagram %d is not paired with hexagram %d"
               "\nas required in a Wen sequence of type 1.\n",i,i-1);
        exit(7);
        }
    }

generate_differences();

analyze_sequence();     //  This sets, closure, closure_offset and overlap.

if ( show_sequence )
    {
    printf("\nHexagrams and transition values:\n");
    for ( i=1; i<=64; i++ )
        {
        printf("%2d:",hexseq[i]);
        for ( j=1; j<=6; j++ )
            printf("%d",hexagram[i][j]);
        printf(" %d> ",diff1[i]);
        if ( !(i%6) )
            printf("\n");
        }
    printf("\nclosure = %d, closure_offset = %d, overlap = %d, closure_sum = %d",
    closure,closure_offset,overlap,closure_sum);
    printf("\nPress a key for graphical display ...");
    getch();
    }

spaces(spaces_79,79);
start = ( closure ? 64-closure_offset : 64 );
row1 = 0;

//  Set value of row2 so closure is displayed.
row2 = row1 + diff1[64] + diff1[start] - 5;
col = 0;

set_mode(mode);
labels_1(row1,col);
graph_1(row1,col);
graph_2(row2,col,start);
labels_2(row2,col,start);
display_help();

while ( TRUE )
    {
    if ( ( ch = getkey() ) == ESCAPE )
        break;
    if ( ch == ENTER )
        break;
    switch ( ch )
        {
        case UP_ARROW:
            if ( row2 == row1+2 )
                Beep;
            else
                {
                erase_graph_2(row2,col,start);
                graph_1(row1,col);
                graph_2(--row2,col,start);
                display_help();
                labels_2(row2,col,start);
                }
            break;
        case DOWN_ARROW:
            if ( row2 == row1+7 )
                Beep;
            else
                {
                erase_graph_2(row2,col,start);
                graph_1(row1,col);
                graph_2(++row2,col,start);
                labels_2(row2,col,start);
                }
            break;
        case LEFT_ARROW:
            erase_graph_2(row2,col,start);
            if ( ++start > 64 )
                start = 1;
            graph_1(row1,col);
            graph_2(row2,col,start);
            labels_2(row2,col,start);
            break;
        case RIGHT_ARROW:
            erase_graph_2(row2,col,start);
            if ( --start < 1 )
                start = 64;
            graph_1(row1,col);
            graph_2(row2,col,start);
            labels_2(row2,col,start);
            break;
        }
    }

if ( ch != ENTER )
    set_25x80_text_mode(TRUE);
else
    {
    //  Now calculate the 384 numbers.
    for ( i=0; i<=7; i++ )
        {
        at(17+i,0);
        printf(spaces_79);
        }
    sprintf(filename,"%s.TB%c",output_filename, (half_twist ? 'Z' : 'X' ));
    at(17,0);
    printf("Now calculating the 384 data points and writing to file %s.",
        filename);
    calculate_data_points(half_twist);        //  in DATA_PTS.C

    at(18,0);
    if ( ( ofile = fopen(filename,"wt") ) == NULL )
        {
        printf("Can't open %s.\n",filename);
        getch();
        }
    else
        {
        print_data_points(ofile);
        fclose(ofile);
        tbl_written = TRUE;
        set_25x80_text_mode(TRUE);
        spawnlp(P_WAIT,"DFR.EXE","DFR.EXE",filename,NULL);
        }

    //  sprintf(output_filename,"DATA.TW%c",( half_twist ? 'Z': 'X' ) ); 
    strcat(output_filename,".TW");
    i = strlen(output_filename);
    output_filename[i] =  ( half_twist ? 'Z': 'X' );
    output_filename[i+1] = 0;
    
    if ( ( ofile = fopen(output_filename,"wt") ) == NULL )
        {
        printf("Can't open %s.\n",output_filename);
        getch();
        }
    else
        {
        print_data_points_for_twz(ofile);
        fclose(ofile);
        twz_written = TRUE;
        set_25x80_text_mode(TRUE);
        spawnlp(P_WAIT,"DFR.EXE","DFR.EXE",output_filename,NULL);
        }

    set_25x80_text_mode(TRUE);
    if ( !( closure_offset_1 = 64-start ) )
        closure_offset_1 = 64;
    printf("\nClosure offset = %d",closure_offset_1);

    if ( !closure_1 )
        printf("  No closure\n");
    else
        printf("  Closure = %d\n",closure_1);

    if ( tbl_written )
        printf("\nTable of intermediate and final values is in file %s.\n",
            filename);

    if ( twz_written )
        printf("\nThe 384 numbers have been written to file %s.",output_filename);
    }
}

/*-------------------*/
void display_help(void)
{
at(21,0);
printf(
  "Closure occurs when the end-points of the two graphs coincide and there are"
"\none or more overlapping segments at the left or at the right.  You may use"
"\nthe up- and down-arrows and the left- and right-arrows to move the lower"
"\ngraph.  Press Enter to calculate the 384 data points (or Escape to quit).");
}
