//  SEQAUX.C
//  Last mod.: 1994-04-24

#include <STDIO.H>
#include <STDLIB.H>
#include <STRING.H>
#include <TIME.H>

#define DEBUG 0

#if DEBUG
#include <L_PRINT.H>
#endif

#include "SEQ.H"

//  Complementation means changing each line into its opposite.
//  Returns 0 if complementation produces new hexagram, -1 otherwise.
/*--------------------------*/
int complement_hexagram(int i,
                        Uchar *hg)
{
int j;

hg[0] = 0;

for ( j=1; j<=6; j++ )
    hg[j] = 1 - hexagram[i][j];

for ( j=1; j<=6; j++ )
    if ( hg[j] != hexagram[i][j] )
        return( 0 );       //  since different

return ( -1 );
}

//  Inversion means turning upside down.
//  Returns 0 if inversion produces new hexagram, -1 otherwise.
/*----------------------*/
int invert_hexagram(int i,
                    Uchar *hg)
{
int j;

hg[0] = 0;

for ( j=1; j<=6; j++ )
    hg[j] = hexagram[i][7-j];

for ( j=1; j<=6; j++ )
    if ( hg[j] != hexagram[i][j] )
        return ( 0 );       // since different

return ( -1 );
}

/*-----------------------------*/
int derive_second_hexagram(int i,
                           Uchar *hg)
{
int result=0;

//  Invert previous hexagram.
if ( invert_hexagram(i,hg) == -1 )
    //  New hexagram is the same as previous one, so complement.
    result = complement_hexagram(i,hg);

return ( result );
}

/*---------------------------*/
void generate_differences(void)
{ 
int i;

for ( i=1; i<64; i++ )
    diff1[i] = line_diffs(i,i+1);

diff1[64] = line_diffs(64,1);
}

/*--------------------------*/
int line_diffs(int h2, int h1)
{ 
int j, diffs = 0;

for ( j=1; j<=6; j++ )
    diffs += ( hexagram[h2][j] != hexagram[h1][j] );
    
return ( diffs );
}

/*  Returns: 0 if no error
 *  otherwise -1 if sum of transition frequencies is not 64.
 *  This ascertains values for odd, even and closure.
 *  Closure is the maximum closure for this sequence.
 */
/*----------------------*/
int analyze_sequence(void)
{
int i, j, t=0, m;

//  Ascertain transition frequencies.
memset(freq,0,sizeof(freq));

for ( i=1; i<=64; i++ ) 
    freq[diff1[i]]++;

for ( j=0; j<=6; j++ )
    t += freq[j];

if ( t != 64 )
    return ( -1 );

//  Check number of odd and even transitions.    
odd = freq[1] + freq[3] + freq[5];
even = freq[2] + freq[4] + freq[6];

//  Now calculate maximum closure.
//  First calculate difference of differences
for ( i=1; i<64; i++ )
    diff2[i] = diff1[i+1] - diff1[i];

diff2[64] = diff1[1] - diff1[64];

//  Now find m (0<=m<64) with maximal i, j such that
//  diff2[64] == diff2[63-m] and
//  diff2[1] == diff2[63-m-1], ..., diff2[i] == diff2[63-m-i] (i>=1)
//  diff2[63] == diff2[63-m+1], diff[62] == diff[63-m+2],
//      diff[61] == diff[63-m+3], ..., diff2[64-j] == diff2[63-m+j] (j>=1)
//  If there exists such an m with i,j>=1 then closure = i + j + 1.

closure = 0;
for ( m=0; m<64; m++ )
    {
    if ( diff2[64] == diff2[63-m>=1?63-m:64] )
        {
        i = 1;
        while ( diff2[i] == diff2[63-m-i>=1?63-m-i:127-m-i] )
            i++;
        i--;
        j = 1;
        while ( diff2[64-j] == diff2[63-m+j<=64?63-m+j:-1-m+j] )
            j++;
        j--;
        //  The generation of a fractal wave is possible only if j >= 1.
        if ( j > 1 )
            {
            closure = i + j + 1;
            closure_offset = m;
            }
        }
    }

closure_sum = diff1[64] + diff1[63-closure_offset+1];
#if DEBUG
set_printer_to_text_mode();
fprintf(stdprn,"\nclosure = %d, closure_offset = %d",closure,closure_offset);
fprintf(stdprn,"\nclosure_sum = diff1[64] + diff1[63-closure_offset+1]"
               "\n            = diff1[64] + diff1[%d] = %d + %d = %d\n",
               63-closure_offset+1,diff1[64],diff1[63-closure_offset+1],
               diff1[64]+diff1[63-closure_offset+1]);
#endif

//  Check for overlapping segments not contained in closure.
overlap = ( closure ? get_overlap(closure_offset) : 0 );

return ( 0 );
}

/*-----------------------*/
int get_overlap(int cl_off)
{
int i, j, k, ol=0;
int cl_sum = diff1[64] + diff1[63-cl_off+1];

for ( i=1; i<=64; i++ )
    {
    j = 63 - cl_off - i;
    if ( j < -63 )
        j += 128;
    else if ( j < 1 )
        j += 64;
    if ( ( k = j+1 ) > 64 )
        k = 1;
    ol += ( ( diff2[i] == diff2[j] )
              && ( diff1[i] + diff1[k] == cl_sum ) );
    #if DEBUG
    fprintf(stdprn,"\ndiff2[%2d] = %2d   diff2[%2d] = %2d"
                   "\ndiff1[%2d] = %2d   diff1[%2d] = %2d   "
                   "diff1[%2d] + diff1[%2d] = %2d"
                   "\noverlap = %2d\n",
                   i,diff2[i],j,diff2[j],
                   i,diff1[i],k,diff1[k],
                   i,k,diff1[i]+diff1[k],
                   k);
    #endif
    }

return ( ol );
}

/*---------------------*/
int locate_kws_num(int i)
{
int k, j;

for ( k=1; k<=64; k++ )
    {
    for ( j=1; j<=6; j++ )
        {
        if ( hexagram[i][j] != (Uchar)(kwseq[k][6-j]&1) )
            break;
        }
    if ( j == 7 )
        return ( k );
    }
}

/*--------------*/
int is_kwseq(void)
{
int k, j;

for ( k=1; k<=64; k++ )
    {
    for ( j=1; j<=6; j++ )
        {
        if ( hexagram[k][j] != (Uchar)(kwseq[k][6-j]&1) )
            return ( FALSE );
        }
    }

return ( TRUE );
}

/*-----------------------------*/
void make_king_wen_sequence(void)
{
int k, j;

for ( k=1; k<=64; k++ )
    {
    for ( j=1; j<=6; j++ )
        hexagram[k][j] = (Uchar)(kwseq[k][6-j]&1);
    }
}

//  These functions are used only when ALTERNATE is non-zero.

/*-------------------------------------*/
void pair_reverse_hexagram_sequence(void)
{
int i;

for ( i=1; i<64; i+=2 )
    {
    memcpy(hg,hexagram[i],7);
    memcpy(hexagram[i],hexagram[i+1],7);
    memcpy(hexagram[i+1],hg,7);
    }
}

/*--------------------------------*/
void reverse_hexagram_sequence(void)
{
int i;

for ( i=1; i<=32; i++ )
    {
    memcpy(hg,hexagram[i],7);
    memcpy(hexagram[i],hexagram[65-i],7);
    memcpy(hexagram[65-i],hg,7);
    }
}

//  This produces complement of hexagram[][].
//  A complemented hexagram sequence produces the same graphs.
/*-----------------------------------*/
void complement_hexagram_sequence(void)
{
int i;

for ( i=1; i<=64; i++ )
    {
    complement_hexagram(i,hg);
    memcpy(hexagram[i],hg,7);
    }
}

