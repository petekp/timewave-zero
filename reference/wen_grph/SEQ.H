//  SEQ.H
//  Created: 1993-09-30
//  Last mod.: 1997-11-29

#ifndef _DOLPHIN_TYPEDEFS

typedef   unsigned char        Uchar;
typedef   unsigned int         Uint;
typedef   unsigned long        Ulong;
typedef   unsigned char *      Str_ptr;
typedef   unsigned char far *  Far_str_ptr;
typedef   unsigned char huge * Huge_str_ptr;
typedef   void *               Ptr;
typedef   void far *           Far_ptr;
typedef   void huge *          Huge_ptr;

#ifndef TRUE
#define TRUE 1
#endif

#ifndef FALSE
#define FALSE 0
#endif

#define _DOLPHIN_TYPEDEFS
#endif

#ifdef ASSIGN
#define E
#else
#define E extern
#endif

FILE *ofile;
E int odd, even, closure, closure_offset, overlap, closure_sum;
E long trial, seed;
E Uchar hexagram[65][7];    //  First hexagram is hexagram[1].
E Uchar used[64];   //  Hexagrams are 0 ... 63.
E Uchar scratch[16], filename[81], hg[7];
E int diff1[65];    //  First-order differences
                    //  Number of lines changed from hexagram i-1 to hexagram i.
E int diff2[65];    //  Second-order differences
E int freq[7];      //  Frequencies of line differences in a hexagram sequence.
E Uchar kwseq[65][7]
#ifdef ASSIGN
 =  {     "",
    "111111", "000000", "010001", "100010", "010111", "111010", "000010",
    "010000", "110111", "111011", "000111", "111000", "111101", "101111",
    "000100", "001000", "011001", "100110", "000011", "110000", "101001",
    "100101", "100000", "000001", "111001", "100111", "100001", "011110",
    "010010", "101101", "011100", "001110", "111100", "001111", "101000",
    "000101", "110101", "101011", "010100", "001010", "100011", "110001",
    "011111", "111110", "011000", "000110", "011010", "010110", "011101",
    "101110", "001001", "100100", "110100", "001011", "001101", "101100",
    "110110", "011011", "110010", "010011", "110011", "001100", "010101",
    "101010" }
#endif
;

//  in SEQAUX.C
void pair_reverse_hexagram_sequence(void);
void reverse_hexagram_sequence(void);
void complement_hexagram_sequence(void);
int complement_hexagram(int i, Uchar *hg);
int invert_hexagram(int i, Uchar *hg);
int derive_second_hexagram(int i, Uchar *hg);
void generate_differences(void);
int line_diffs(int h2, int h1);
int analyze_sequence(void);
int get_overlap(int cl_off);
int locate_kws_num(int i);
int is_kwseq(void);
void make_king_wen_sequence(void);
