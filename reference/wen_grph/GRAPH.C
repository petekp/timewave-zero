//  GRAPH.C
//  The graphical functions
//  Last mod.: 1994-04-24

#include <STDIO.H>

#include <L_VIDEO.H>

#include "SEQ.H"
#include "WEN_GRPH.H"

#define DISPLAY_DISTANCES TRUE
#define DEBUG FALSE

#if DEBUG
#include <L_PRINT.H>
#endif

//  Draw labels for first graph.
/*------------------*/
void labels_1(int row,
              int col)
{
int i;

for ( i=1; i<=64; i++ )
    {
    if ( i>=10 )
        {
        at(row,66+col-i);
        printf("%d",i/10);
        }
    at(row+1,66+col-i);
    printf("%d",i%10);
    }

at(row,66+col);
printf("6");
at(row+1,66+col);
printf("4",i%10);

for ( i=1; i<=6; i++ )
    {
    at(row+1+i,col+67);
    printf("%d",i);
    }
}

//  Draw axes and first graph.
/*-----------------*/
void graph_1(int row,
             int col)
{
int i;

gr_line((row+2)*vpix+vpix/2,(col+2)*hpix+hpix/2,
    (row+2)*vpix+vpix/2,(col+66)*hpix+hpix/2,color_0,FALSE);
gr_line_to((row+2+5)*vpix+vpix/2,(col+66)*hpix+hpix/2,color_0,FALSE);

gr_write_pixel((row+1+diff1[64])*vpix+vpix/2,(col+66)*hpix+hpix/2-1,color_1,FALSE);
for ( i=1; i<64; i++ )
    gr_line_to((row+1+diff1[i])*vpix+vpix/2,(col+66-i)*hpix+hpix/2-1,color_1,FALSE);

gr_line_to((row+1+diff1[64])*vpix+vpix/2,(col+2)*hpix+hpix/2,color_1,FALSE);
}

//  Draw labels for second graph.
/*------------------*/
void labels_2(int row,
              int col,
              int start)
{
int i, j, k;

closure_1 = 0;

for ( i=1; i<=6; i++ )
    {
    at(row+6-i,col+1);
    printf("%d",i);
    }

#if DEBUG
set_printer_to_text_mode();
fprintf(stdprn,"\nclosure_offset = %d, start = %d\n\n",closure_offset,start);
#endif

for ( i=row+13; i<=row+14; i++ )
    {
    at(i,col);
    printf("%s",spaces_79);
    }

for ( i=0; i<=64; i++ )
    {
    if ( ( j = start - i ) < 1 )
        j += 64;
    if ( j >= 10 )
        {
        at(row+6,col+66-i);
        printf("%d",j/10);
        }
    at(row+7,col+66-i);
    printf("%d",j%10);

    k = ( row+6-diff1[j] ) -  ( row1+1+diff1[i?i:64] );
    distance1[i] = k;

    #if DISPLAY_DISTANCES
    sprintf(scratch,"%3d",k);
    for ( k=0; k<3; k++ )
        {
        at(row+9+k,col+66-i);
        printf("%c",scratch[k]);
        }
    #endif

    if ( ( j = start - i - 1 ) < 1 )
        j += 64;
    if ( j < 1 )
        j += 64;
    k = -diff2[j] + diff2[i?i:64];
    distance2[i] = k;

    #if DISPLAY_DISTANCES
    sprintf(scratch,"%3d",k);
    for ( k=0; k<3; k++ )
        {
        at(row+12+k,col+66-i);
        printf("%c",scratch[k]);
        }
    #endif

    #if DEBUG
    fprintf(stdprn,"diff2[%2d] = %2d, diff2[%2d] = %2d, difference = %2d\n",
        j,diff2[j],i,diff2[i?i:64],diff2[j]-diff2[i?i:64]);
    #endif
    }

if ( distance1[0] == 0 )
    {
    i = 0;
    while ( distance1[++i] == 0 )
        closure_1++;
    i = 64;
    while ( distance1[--i] == 0 )
        closure_1++;
    }

at(row+9,0);
if ( !( closure_offset_1 = 64-start ) )
    closure_offset_1 = 64;
printf("Closure offset = %d",closure_offset_1);

if ( !closure_1 )
    printf("  No closure");
else
    printf("  Closure = %d",closure_1);
}

//  Draw axes and second graph.
/*-----------------*/
void graph_2(int row,
             int col,
             int start)
{
int i, j;

gr_write_pixel((row+6-diff1[start])*vpix+vpix/2,(col+2)*hpix+hpix/2,
    color_2,do_xor);
for ( i=1; i<=64; i++ )
    {
    j = ((start+i-1)%64)+1;
    gr_line_to((row+6-diff1[j])*vpix+vpix/2,(col+2+i)*hpix+hpix/2,
        color_2,do_xor);
    }

gr_line((row+5)*vpix+vpix/2,(col+66)*hpix+hpix/2,
    (row+5)*vpix+vpix/2,(col+2)*hpix+hpix/2,color_0,FALSE);
gr_line_to(row*vpix+vpix/2,(col+2)*hpix+hpix/2,color_0,FALSE);

}

/*-----------------------*/
void erase_graph_2(int row,
                   int col,
                   int start)
{
int i, j;

gr_line((row+5)*vpix+vpix/2,(col+66)*hpix+hpix/2,
    (row+5)*vpix+vpix/2,(col+2)*hpix+hpix/2,0,FALSE);
gr_line_to(row*vpix+vpix/2,(col+2)*hpix+hpix/2,0,FALSE);

gr_write_pixel((row+6-diff1[start])*vpix+vpix/2,(col+2)*hpix+hpix/2,0,FALSE);
for ( i=1; i<=64; i++ )
    {
    j = ((start+i-1)%64)+1;
    gr_line_to((row+6-diff1[j])*vpix+vpix/2,(col+2+i)*hpix+hpix/2,0,FALSE);
    }

//  Erase axes and labels
for ( i=0; i<=5; i++ )
    {
    at(row+i,col+1);
    printf(" ");
    }

for ( i=row+6; i<=row+14; i++ )
    {
    at(i,col);
    printf("%s",spaces_79);
    }
}

