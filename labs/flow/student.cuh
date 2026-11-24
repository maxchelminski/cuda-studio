// Declare how many mathematical sweeps this kernel computes per launch (1 or 2).
// An odd trailing sweep is handled by the baseline when your span is two.
#define STUDENT_SPAN 1
extern "C" __global__ void student(PRESSURE_ARGS) {
    PIXEL;
    // Start by arranging one block's pressure values and a one-cell apron in
    // shared memory. Move the out-of-bounds return below all block barriers.
    out[i]=jacobi(p[i],p[at(x-1,y,w,h)],p[at(x+1,y,w,h)],p[at(x,y-1,w,h)],p[at(x,y+1,w,h)],b[i]);
}
