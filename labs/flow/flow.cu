// Unit grid spacing. Cells, rightward faces and downward faces each form a
// periodic w-by-h lattice. A face array stores one face per cell.
__device__ int wrap(int x, int n) { int r = x % n; return r < 0 ? r + n : r; }
__device__ int at(int x, int y, int w, int h) { return wrap(y, h) * w + wrap(x, w); }

__device__ float field(const float* a, float x, float y, int w, int h) {
    int i = (int)floorf(x), j = (int)floorf(y);
    float fx = x - i, fy = y - j;
    float top = a[at(i,j,w,h)] * (1-fx) + a[at(i+1,j,w,h)] * fx;
    float bot = a[at(i,j+1,w,h)] * (1-fx) + a[at(i+1,j+1,w,h)] * fx;
    return top * (1-fy) + bot * fy;
}
__device__ float2 velocity(const float* u, const float* v, float x, float y, int w, int h) {
    return make_float2(field(u, x-0.5f, y, w, h), field(v, x, y-0.5f, w, h));
}
__device__ float splat(float x, float y, float cx, float cy, int w, int h, float r) {
    float dx = fabsf(x-cx), dy = fabsf(y-cy);
    dx = fminf(dx, w-dx); dy = fminf(dy, h-dy);
    return expf(-(dx*dx + dy*dy)/(2*r*r));
}
__device__ float divergence(const float* u, const float* v, int x, int y, int w, int h) {
    int i = y*w+x;
    return (u[i] - u[at(x-1,y,w,h)]) + (v[i] - v[at(x,y-1,w,h)]);
}
#define XY int x=blockIdx.x*blockDim.x+threadIdx.x, y=blockIdx.y*blockDim.y+threadIdx.y
#define PIXEL XY; if (x>=w || y>=h) return; int i=y*w+x

// Sample a periodic stream function on cell corners. Its discrete curl adds
// swirling motion whose discrete divergence cancels exactly in real arithmetic.
__device__ float stream(int i, int j, int w, int h) {
    float x=wrap(i,w)+0.5f, y=wrap(j,h)+0.5f, r=0.09f*min(w,h);
    return r*(3.1f*splat(x,y,.24f*w,.36f*h,w,h,r) - 3.8f*splat(x,y,.72f*w,.53f*h,w,h,1.2f*r)
               +2.7f*splat(x,y,.53f*w,.78f*h,w,h,r) - 2.8f*splat(x,y,.39f*w,.20f*h,w,h,.8f*r)
               +3.5f*splat(x,y,.78f*w,.18f*h,w,h,.7f*r));
}
extern "C" __global__ void seed(float* u,float* v,float* rose,float* aqua,int w,int h) {
    PIXEL;
    const float tau = 6.283185307f;
    float a = tau*x/w, b = tau*y/h;
    float c=stream(x,y,w,h);
    u[i] = 0.60f*sinf(b) + c-stream(x,y-1,w,h) + 0.32f*sinf(4*(a+0.5f*tau/w));
    v[i] = 0.60f*sinf(a) - c+stream(x-1,y,w,h) + 0.21f*cosf(3*(b+0.5f*tau/h));
    float r = (y/(float)h - 0.33f - 0.10f*sinf(2*a)) / 0.028f;
    float s = (y/(float)h - 0.66f - 0.075f*cosf(3*a)) / 0.025f;
    float threads=cosf(5*b+0.85f*sinf(2*a)), veins=cosf(5*b+2.8f+0.6f*cosf(3*a));
    rose[i] = 0.85f*expf(-r*r)+0.52f*expf(-16.f*(1-threads));
    aqua[i] = expf(-s*s)+0.46f*expf(-15.f*(1-veins));
}

extern "C" __global__ void advect_velocity(const float* u,const float* v,float* us,float* vs,
                       int w,int h,float dt,float mx,float my,float ix,float iy) {
    PIXEL;
    float2 a = velocity(u,v,x+0.5f,y,w,h), b = velocity(u,v,x,y+0.5f,w,h);
    float radius = 0.045f*min(w,h);
    us[i] = 0.999f*field(u,x-dt*a.x,y-dt*a.y,w,h);
    vs[i] = 0.999f*field(v,x-dt*b.x,y-dt*b.y,w,h);
    if (mx >= 0) {
        us[i] += ix*splat(x+0.5f,y,mx,my,w,h,radius);
        vs[i] += iy*splat(x,y+0.5f,mx,my,w,h,radius);
    }
}

extern "C" __global__ void right_hand_side(const float* us,const float* vs,float* b,float* p,int w,int h) {
    PIXEL;
    b[i] = divergence(us,vs,x,y,w,h);
    p[i] = 0;
}

__device__ float jacobi(float p,float l,float r,float t,float bot,float b) {
    // Damped Jacobi: p + (2/3)/4 * (L p - b). Damping attenuates checkerboards.
    return p + (1.f/6.f)*(((l+r)+(t+bot))-4.f*p-b);
}
#define PRESSURE_ARGS const float* p,const float* b,float* out,int w,int h
extern "C" __global__ void baseline(PRESSURE_ARGS) {
    PIXEL;
    out[i]=jacobi(p[i],p[at(x-1,y,w,h)],p[at(x+1,y,w,h)],p[at(x,y-1,w,h)],p[at(x,y+1,w,h)],b[i]);
}

// Two Jacobi sweeps per launch. A radius-two apron supplies valid first-sweep
// values for the radius-one halo consumed by the second sweep.
extern "C" __global__ void fused(PRESSURE_ARGS) {
    XY;
    const int tile=16, big=20, mid=18;
    __shared__ float old[big*big], first[mid*mid];
    int lane=threadIdx.y*tile+threadIdx.x, left=blockIdx.x*tile, top=blockIdx.y*tile;
    for (int j=lane;j<big*big;j+=tile*tile)
        old[j]=p[at(left+j%big-2,top+j/big-2,w,h)];
    __syncthreads();
    for (int j=lane;j<mid*mid;j+=tile*tile) {
        int tx=j%mid, ty=j/mid, k=(ty+1)*big+tx+1;
        first[j]=jacobi(old[k],old[k-1],old[k+1],old[k-big],old[k+big],b[at(left+tx-1,top+ty-1,w,h)]);
    }
    __syncthreads();
    if (x<w && y<h) {
        int k=(threadIdx.y+1)*mid+threadIdx.x+1, i=y*w+x;
        out[i]=jacobi(first[k],first[k-1],first[k+1],first[k-mid],first[k+mid],b[i]);
    }
}

extern "C" __global__ void project(const float* us,const float* vs,const float* p,float* u,float* v,int w,int h) {
    PIXEL;
    u[i]=us[i]-(p[at(x+1,y,w,h)]-p[i]);
    v[i]=vs[i]-(p[at(x,y+1,w,h)]-p[i]);
}

extern "C" __global__ void advect_dye(const float* u,const float* v,const float* r,const float* a,
                     float* nr,float* na,int w,int h,float dt,float time,float mx,float my) {
    PIXEL;
    float2 vel=velocity(u,v,x,y,w,h);
    float bx=x-dt*vel.x, by=y-dt*vel.y, rad=0.025f*min(w,h);
    float sr=splat(x,y,w*(0.27f+0.08f*sinf(time*0.017f)),h*0.37f,w,h,rad);
    float sa=splat(x,y,w*0.72f,h*(0.55f+0.12f*cosf(time*0.015f)),w,h,rad);
    if (mx>=0) {
        float brush=splat(x,y,mx,my,w,h,1.5f*rad);
        sr+=brush*(0.5f+0.5f*sinf(time*0.13f));
        sa+=brush*(0.5f-0.5f*sinf(time*0.13f));
    }
    nr[i]=fminf(2.f,0.998f*field(r,bx,by,w,h)+0.16f*sr);
    na[i]=fminf(2.f,0.998f*field(a,bx,by,w,h)+0.16f*sa);
}

extern "C" __global__ void diagnostics(const float* b,const float* u,const float* v,const float* p,
                                        float4* out,int w,int h) {
    XY;
    __shared__ float4 s[256];
    int lane=threadIdx.y*16+threadIdx.x;
    float4 q=make_float4(0,0,0,0);
    if (x<w && y<h) {
        int i=y*w+x; float before=b[i], after=divergence(u,v,x,y,w,h);
        float lap=(p[at(x-1,y,w,h)]+p[at(x+1,y,w,h)])+(p[at(x,y-1,w,h)]+p[at(x,y+1,w,h)])-4.f*p[i];
        float residual=before-lap;
        q=make_float4(before*before,after*after,residual*residual,fabsf(after-residual));
    }
    s[lane]=q;
    __syncthreads();
    for (int d=128;d>0;d/=2) {
        if (lane<d) {
            float4 a=s[lane], b=s[lane+d];
            s[lane]=make_float4(a.x+b.x,a.y+b.y,a.z+b.z,fmaxf(a.w,b.w));
        }
        __syncthreads();
    }
    if (lane==0) out[blockIdx.y*gridDim.x+blockIdx.x]=s[0];
}
__device__ unsigned char channel(float v) {return (unsigned char)fminf(255.f,fmaxf(0.f,v));}
extern "C" __global__ void shade(const float* r,const float* a,const float* b,const float* u,const float* v,
                                 unsigned char* rgb,int w,int h,int view) {
    PIXEL;
    float red,green,blue;
    if (view) {
        float d=view==1 ? b[i] : divergence(u,v,x,y,w,h);
        float intensity=1-expf(-18*fabsf(d)); // shared scale before and after
        red=12+(d>0 ? 235 : 48)*intensity; green=19+(d>0 ? 80 : 155)*intensity;
        blue=29+(d>0 ? 58 : 211)*intensity;
    } else {
        float warm=1-expf(-2*r[i]), cool=1-expf(-2*a[i]);
        red=10+228*warm+29*cool; green=18+74*warm+195*cool; blue=30+72*warm+164*cool;
    }
    rgb[3*i]=channel(red);rgb[3*i+1]=channel(green);rgb[3*i+2]=channel(blue);
}
