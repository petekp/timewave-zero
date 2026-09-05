//  DATA_PTS.C
//  This is where the 384 numbers are generated.
//  Last mod.: 1997-12-01

#include <STDIO.H>
#include <STDLIB.H>

#include "WEN_GRPH.H"

/*--------------------------------------*/
void calculate_data_points(int half_twist)
{
int j;

for ( j=0; j<64; j++ )
    {
    dist_lin[j] = distance1[64-j];
    angle_lin[j] = distance2[64-j];
    }

if ( half_twist )
    {
    //  And now the mysterious "half-twist".
    for ( j=1; j<=32; j++ )
        angle_lin[j] = -angle_lin[j];
    }

for ( j=64; j<384; j++ )
    {
    dist_lin[j] = dist_lin[j%64];
    angle_lin[j] = angle_lin[j%64];
    }

for ( j=0; j<192; j++ )
    {
    dist_tri[j+192] = dist_tri[j] = 3*dist_lin[j/3];
    angle_tri[j+192] = angle_tri[j] = 3*angle_lin[j/3];
    }

for ( j=0; j<384; j++ )
    {
    dist_hex[j] = 6*dist_lin[j/6];
    angle_hex[j] = 6*angle_lin[j/6];
    }

for ( j=0; j<384; j++ )
    {
    angle_sum[j] = angle_lin[j] + angle_tri[j] + angle_hex[j];
    dist_sum[j]  = dist_lin[j] + dist_tri[j] + dist_hex[j];
    total[j] = abs(angle_sum[j]) + abs(dist_sum[j]);
    }
}

/*--------------------------------*/
void print_data_points(FILE *output)
{
int j;
int m=6, k=0;

fprintf(output,"                          Angles"
               "                Distances\n");
fprintf(output,"%*s%*s%*s%*s%*s%*s%*s%*s%*s%*s%*s\n",
    9,"",m,"Pos",m,"Lin",m,"Tri",m,"Hex",m,"Sum",
    m,"Lin",m,"Tri",m,"Hex",m,"Sum",m,"Total");
for ( j=383; j>=0; j-- )
    {
    fprintf(output,"%*d%*d%*d%*d%*d%*d%*d%*d%*d%*d%*d\n",
        9,384-j,m,j,m,angle_lin[j],m,angle_tri[j],m,angle_hex[j],
        m,angle_sum[j],m,dist_lin[j],m,dist_tri[j],
        m,dist_hex[j],m,dist_sum[j],m,total[j]);
    if ( !(++k%32) )
        fprintf(output,"\n");
    }

fprintf(output,"\f");
fflush(output);
}

/*----------------------------------------*/
void print_data_points_for_twz(FILE *output)
{
int j, k=18;

fprintf(output,"\n%*s",k,"");
for ( j=0; j<384; j++ )
    {
    fprintf(output,"%3d",total[j]);
    if ( j < 383 )
        fprintf(output,",");
    if ( !((j+1)%10) )
        fprintf(output,"\n%*s",k,"");
    }

fflush(output);
}
