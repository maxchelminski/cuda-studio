// Beauty samples stay in linear light until resolve. Diagnostic passes use display-space values.
__device__ inline float displayChannel(float linear) {
    float x=fmaxf(0.f,linear);
    float fit=fw::saturate(x*(2.51f*x+.03f)/(x*(2.43f*x+.59f)+.14f));
    return fit<=.0031308f ? 12.92f*fit : 1.055f*powf(fit,1.f/2.4f)-.055f;
}
__device__ inline unsigned char displayByte(float x) { return (unsigned char)(255.f*fw::saturate(x)+.5f); }

extern "C" __global__ void renderFrame(unsigned char *rgba,int w,int h,float phase,
        float yaw,float pitch,float control,int features,int mode,int view,int side,float exposure) {
    const int x=blockIdx.x*blockDim.x+threadIdx.x, y=blockIdx.y*blockDim.y+threadIdx.y;
    if(x>=w || y>=h) return;
    float3 sum=fw::v3(0.f);
    for(int j=0;j<side;j++) for(int i=0;i<side;i++) {
        float u=2.f*(x+(i+.5f)/side)/w-1.f, v=1.f-2.f*(y+(j+.5f)/side)/h;
        sum=sum+SCENE_FUNCTION(u,v,float(w)/h,phase,yaw,pitch,control,features,mode,view);
    }
    float3 c=sum/float(side*side);
    int addr=4*(y*w+x);
    bool finite=isfinite(c.x) && isfinite(c.y) && isfinite(c.z);
    if(view==0) c={displayChannel(c.x*exposure),displayChannel(c.y*exposure),displayChannel(c.z*exposure)};
    rgba[addr]=displayByte(c.x); rgba[addr+1]=displayByte(c.y); rgba[addr+2]=displayByte(c.z);
    // Alpha doubles as a write/finite sentinel in the numerical comparisons.
    rgba[addr+3]=finite?255:0;
}
