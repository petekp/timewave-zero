/*  TW_EN.C
 *  by Peter Meyer
 *  last revision: 1993-03-09
 */

#include <MATH.H>
#include <ERRNO.H>
#include <FCNTL.H>
#include <SYS\TYPES.H>
#include <SYS\STAT.H>
#include <IO.H>
#include <STDIO.H>
#include <CONIO.H>
#include <STDLIB.H>

#define TRUE  1
#define FALSE 0
#define MAX_DATA_POINTS  400
#define MAX_INPUT_LENGTH  14
#define NUM_POWERS        20
#define CALC_PREC         10
/*  precision in calculation of wave values  */

/*  function declarations  */
void main(void);
double f(double x);
double v(double y);
double mult_power(double x, int i);
double div_power(double x, int i);
int read_data_points(void);

/*  storage allocation  */
int wave_factor = 64;       /*  the usual value  */
int num_data_points;
int w[MAX_DATA_POINTS];     /*  array holding the values  */
                            /*  of the data points  */
char datafile[65] = "DATA.TWZ";
char buffer[2048];          /*  input buffer  */
double powers[NUM_POWERS];          /*  powers of wave_factor  */

/*-----------*/
void main(void)
{
int i;
double days;

if ( read_data_points() )
    {
    printf("\nError when reading data file.");
    exit(1);
    }
else
    printf("\nNumber of data points = %d\n",num_data_points);

if ( num_data_points < 4 )
    {
    printf("Not enough values in data file.\n");
    exit(2);
    }

/*  put powers[i] = wave_factor^i  */
powers[0] = (double)1;
for ( i=1; i<NUM_POWERS; i++ )
    powers[i] = wave_factor*powers[i-1];

printf("\nThis program calculates the value of the timewave\n");
printf("for a given number of days prior to the zero point.\n");
printf("\nTo quit, press Enter.");

while ( TRUE )
    {
    printf("\n\nDays to zero date: ");
    buffer[0] = MAX_INPUT_LENGTH + 1;
    cgets(buffer);
    printf("\n");
    if ( !buffer[1] )
        break;
    days = atof(&buffer[2]);
    if ( days < 0 )
        printf("Number of days must not be negative.");
    else
        printf("Value = %.14f",f(days));
    }
}

/*  x is number of days to zero date  */
/*--------------*/
double f(double x)
{
register i;
double sum = 0.0;

if ( x )
    {
    for ( i=0; x>=powers[i]; i++ )
        sum += mult_power(v(div_power(x,i)),i);

    i = 0;
    do
        {
        if ( ++i > CALC_PREC+2 )
            break;
        sum += div_power(v(mult_power(x,i)),i);
        } while ( sum < powers[CALC_PREC-i+2] );
    /*  sum < powers[CALC_PREC-i+2] if and only if
     *  wave_factor^2/powers[i] > sum/powers[CALC_PREC]
     *  CALC_PREC defined as 10 in TWZ_DEF.H
     */
    }

/*  dividing by 64^3 gives values consistent with the Apple // version
 *  and provides more convenient y-axis labels
 */
return ( div_power(sum,3) );
}

/*--------------*/
double v(double y)
{
register int i = (int)(fmod(y,(double)num_data_points));
register j = (i+1)%num_data_points;
double z = y - floor(y);

return ( z==0.0 ? (double)w[i] : ( w[j] - w[i] )*z + w[i] );
}

/*  in order to speed up the calculation, if wave factor = 64
 *  then instead of using multiplication or division operation
 *  we act directly on the floating point representation;
 *  multiplying by 64^i is accomplished by adding i*0x60
 *  to the exponent (the last 2 bytes of the 8-byte representation);
 *  dividing by 64^i is accomplished by subtracting i*0x60
 *  from the exponent
 */

/*-----------------------*/
double mult_power(double x,
                  int i)
{
int *exponent = (int *)&x + 3;

if ( wave_factor == 64 )
    *exponent += i*0x60;            /*  measurably faster  */
else
    x *= powers[i];

return ( x );
}

/*----------------------*/
double div_power(double x,
                  int i)
{
int *exponent = (int *)&x + 3;

if ( ( wave_factor == 64 ) && ( *exponent > i*0x60 ) )
    *exponent -= i*0x60;
else
    x /= powers[i];

return ( x );
}

/*  read integer values from the data file
 *  (normally DATA.TWZ) into the array w[];
 *  all values must be non-negative
 *  returns 0 if data read ok, otherwise an error code:
 *  -1 = file not found,
 *  -2 = error when opening file,
 *  -3 = error when reading file
 */
/*----------------------*/
int read_data_points(void)
{
int fh, result=0, i=-1, k;
int length, reading_number=FALSE;
char b;

num_data_points = 0;

if ( ( fh = open(datafile,O_RDONLY|O_BINARY) ) == - 1 )
    result = -1;
else
    {
    length = (unsigned int)filelength(fh);
    if ( ( read(fh,buffer,length) ) == -1 )
        result = -2;
    else
        {
        while ( ++i < length && num_data_points < MAX_DATA_POINTS )
            {
            b = buffer[i];
            if ( b >= '0' && b <= '9' )
                {
                if ( !reading_number )
                    {
                    reading_number = TRUE;
                    k = b-'0';
                    }
                else
                    k = 10*k + b-'0';
                }
            else
                {
                if ( reading_number )
                    {
                    reading_number = FALSE;
                    w[num_data_points++] = k;
                    }
                }
            }
        }
    close ( fh );
    }
return ( result );
}

