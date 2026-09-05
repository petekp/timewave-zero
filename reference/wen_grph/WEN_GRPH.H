//  WEN-GRPH.H
//  Last mod.: 1997-11-29

#ifdef ASSIGN
#define E
#else
#define E extern
#endif

E int closure_1, closure_offset_1;
E int row1, row2, hpix, vpix, color_0, color_1, color_2, do_xor;
E char spaces_79[80];
E int hexseq[65], distance1[65], distance2[65],
    angle_lin[384], angle_tri[384], angle_hex[384], angle_sum[384];
    dist_lin[384], dist_tri[384], dist_hex[384], dist_sum[384], total[384];

//  in GRAPH.C
void labels_1(int row,int col);
void graph_1(int row,int col);
void labels_2(int row,int col,int start);
void graph_2(int row,int col, int start);
void erase_graph_2(int row,int col,int start);
void display_closure_info(int row, int col, int start);

//  in PIXEL.C
void gr_write_pixel(int row, int col, int color, int xor);
void gr_line(int row1, int col1, int row2, int col2, int color, int xor);
void gr_line_to(int row, int col, int color, int xor);

//  in DATA_PTS.C
void calculate_data_points(int revision);
void print_data_points(FILE *output);
void print_data_points_for_twz(FILE *output);
