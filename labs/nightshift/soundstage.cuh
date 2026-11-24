// Signal / Soundstage. The 6,036 real glTF triangles, four maps and HDR light are loaded once.
namespace sound {
using namespace fw;
__device__ const float *vertices, *nodes, *environment;
__device__ const int *triangles;
__device__ const unsigned char *maps;
const float pi=3.141592654f;
__device__ float3 at3(const float *p) {return v3(p[0],p[1],p[2]);}
__device__ float max3(float3 p){return fmaxf(p.x,fmaxf(p.y,p.z));}
__device__ float min3(float3 p){return fminf(p.x,fminf(p.y,p.z));}
__device__ float slab(const float *node,float3 ro,float3 inv,float limit){
    float3 a=(at3(node)-ro)*inv, b=(at3(node+4)-ro)*inv;
    float enter=fmaxf(0.f,max3(v3(fminf(a.x,b.x),fminf(a.y,b.y),fminf(a.z,b.z))));
    float leave=min3(v3(fmaxf(a.x,b.x),fmaxf(a.y,b.y),fmaxf(a.z,b.z)));
    return enter<=leave && enter<=limit ? enter : 1e25f;
}
struct Hit { float t,b,c; int id; };

// Exercise: visit the closer child first. Both children have already passed their bounds test.
__device__ bool studentNearFirst(float leftEntry,float rightEntry) { return false; }

__device__ Hit trace(float3 ro,float3 rd,float limit,int mode,int &tests,bool any=false) {
    Hit hit={limit,0,0,-1};
    float3 inv=v3(1.f/copysignf(fmaxf(fabsf(rd.x),1e-12f),rd.x),
                  1.f/copysignf(fmaxf(fabsf(rd.y),1e-12f),rd.y),
                  1.f/copysignf(fmaxf(fabsf(rd.z),1e-12f),rd.z));
    int stack[24]; float distances[24]; int top=0;
    float root=slab(nodes,ro,inv,limit);
    if(root>limit) return hit;
    stack[top]=0; distances[top++]=root;
    while(top){
        --top; if(distances[top]>hit.t) continue;
        const float *box=nodes+8*stack[top]; int left=int(box[3]),right=int(box[7]);
        if(left>=0){
            float a=slab(nodes+8*left,ro,inv,hit.t), b=slab(nodes+8*right,ro,inv,hit.t);
            bool reverse=mode==1?b<a:mode==2&&studentNearFirst(a,b);
            if(reverse){int t=left; left=right; right=t; float f=a;a=b;b=f;}
            if(b<=hit.t){stack[top]=right;distances[top++]=b;}
            if(a<=hit.t){stack[top]=left;distances[top++]=a;}
            continue;
        }
        int first=-left-1;
        for(int i=first;i<first+right;i++){
            ++tests;
            const int *idx=triangles+3*i;
            float3 p=at3(vertices+12*idx[0]),e1=at3(vertices+12*idx[1])-p,e2=at3(vertices+12*idx[2])-p;
            float3 h=cross(rd,e2); float d=dot(e1,h); if(fabsf(d)<1e-9f) continue;
            float3 s=ro-p; float b=dot(s,h)/d; if(b<0.f||b>1.f) continue;
            float3 q=cross(s,e1); float c=dot(rd,q)/d; if(c<0.f||b+c>1.f) continue;
            float t=dot(e2,q)/d;
            if(t>.00015f && (t<hit.t||(t==hit.t&&i<hit.id))){
                hit={t,b,c,i}; if(any) return hit;
            }
        }
    }
    return hit;
}
__device__ float3 rgbaTexel(int slot,int x,int y) {
    const unsigned char *p=maps+3*(slot*1024*1024+(y&1023)*1024+(x&1023));
    return v3(float(p[0]),float(p[1]),float(p[2]))*(1.f/255.f);
}
__device__ float3 texture(int slot,float u,float v){
    float x=fract(u)*1024-.5f,y=fract(v)*1024-.5f;int ix=(int)floorf(x),iy=(int)floorf(y);
    return mix(mix(rgbaTexel(slot,ix,iy),rgbaTexel(slot,ix+1,iy),fract(x)),
               mix(rgbaTexel(slot,ix,iy+1),rgbaTexel(slot,ix+1,iy+1),fract(x)),fract(y));
}
__device__ float linear(float x){return x<=.04045f?x/12.92f:powf((x+.055f)/1.055f,2.4f);}
__device__ float3 linear(float3 c){return v3(linear(c.x),linear(c.y),linear(c.z));}
__device__ float3 envTap(int w,int h,int start,int x,int y){
    y=max(0,min(h-1,y)); return at3(environment+3*(start+y*w+(x&(w-1))));
}
__device__ float3 envLevel(float u,float v,int level){
    int w=1024,h=512,start=0;
    for(int i=0;i<level;i++){start+=w*h;w/=2;h/=2;}
    float x=u*w-.5f,y=v*h-.5f;int ix=(int)floorf(x),iy=(int)floorf(y);
    return mix(mix(envTap(w,h,start,ix,iy),envTap(w,h,start,ix+1,iy),fract(x)),
               mix(envTap(w,h,start,ix,iy+1),envTap(w,h,start,ix+1,iy+1),fract(x)),fract(y));
}
__device__ float3 lightMap(float3 d,float lod,float rotation){
    float u=fract(atan2f(d.z,d.x)/(2*pi)+.5f+rotation),v=acosf(clamp(d.y,-1,1))/pi;
    lod=clamp(lod,0.f,8.99f);
    float3 softbox=mix(envLevel(u,v,(int)lod),envLevel(u,v,(int)lod+1),fract(lod));
    float3 gel=mix(v3(.62f,.88f,1.15f),v3(1.20f,.84f,.59f),fw::smoothstep(-.8f,.8f,d.x));
    return softbox*gel;
}
struct Mat {float3 n,base,emission;float rough,metal,ao;};
__device__ Mat materialAt(Hit hit,float3 rd,int flags,float control){
    const int *ix=triangles+3*hit.id;
    const float *a=vertices+12*ix[0],*b=vertices+12*ix[1],*c=vertices+12*ix[2];
    float w=1-hit.b-hit.c;
    float u=w*a[6]+hit.b*b[6]+hit.c*c[6],v=w*a[7]+hit.b*b[7]+hit.c*c[7];
    float3 n=normalize(w*at3(a+3)+hit.b*at3(b+3)+hit.c*at3(c+3));
    if(flags&4){
        float3 t=w*at3(a+8)+hit.b*at3(b+8)+hit.c*at3(c+8);
        t=normalize(t-n*dot(t,n));
        float3 bit=cross(n,t)*copysignf(1.f,w*a[11]+hit.b*b[11]+hit.c*c[11]);
        float3 map=2.f*texture(2,u,v)-v3(1.f);
        n=normalize(t*map.x+bit*map.y+n*map.z);
    }
    if(dot(n,rd)>0) n=-n;
    float3 orm=texture(1,u,v);
    return {n,linear(texture(0,u,v)),linear(texture(3,u,v))*2.3f,
            clamp(orm.y+(control-.5f)*1.3f,.055f,1.f),orm.z,orm.x};
}
__device__ float3 fresnel(float3 f0,float angle){return mix(f0,v3(1),powf(1-fw::saturate(angle),5.f));}
__device__ float3 direct(Mat m,float3 v,float3 l,float3 radiance){
    float nl=fw::saturate(dot(m.n,l)),nv=fmaxf(.001f,dot(m.n,v));
    if(nl<=0) return v3(0);
    float3 h=normalize(l+v);float nh=fw::saturate(dot(m.n,h)),vh=fw::saturate(dot(v,h));
    float a=m.rough*m.rough,a2=a*a,k=(m.rough+1)*(m.rough+1)/8;
    float d=nh*nh*(a2-1)+1,distribution=a2/(pi*d*d);
    float visibility=1.f/(4*(nl*(1-k)+k)*(nv*(1-k)+k));
    float3 f=fresnel(mix(v3(.04f),m.base,m.metal),vh);
    return radiance*nl*((v3(1)-f)*m.base*((1-m.metal)/pi)+f*(distribution*visibility));
}
__device__ float3 shade(Hit hit,float3 ro,float3 rd,int flags,int mode,float control,float spin,int &tests){
    Mat m=materialAt(hit,rd,flags,control);float3 p=ro+rd*hit.t,v=-rd;
    float3 diffuse=lightMap(m.n,7.7f,spin)*m.base*((1-m.metal)*m.ao*.48f);
    float3 col=diffuse+m.emission;
    if(flags&1) col=col+lightMap(reflect(rd,m.n),1.f+6.5f*m.rough,spin)*
          fresnel(mix(v3(.04f),m.base,m.metal),dot(m.n,v))*(.9f-.33f*m.rough)*m.ao;
    for(int i=0;i<2;i++){
        float3 light=i?v3(2.6f,2.05f,-2.4f):v3(-2.4f,3.6f,3.5f);
        float3 dir=normalize(light-p);
        if(dot(dir,m.n)<=0) continue;
        if((flags&2)&&trace(p+m.n*.002f,dir,length(light-p),mode,tests,true).id>=0)continue;
        col=col+direct(m,v,dir,i?v3(1.05f,.42f,.18f):v3(1.7f,1.84f,2.1f));
    }
    return col;
}
__device__ float3 stage(float3 ro,float3 rd,int flags,int mode,int view,float control,float spin,int &tests){
    float3 bg=mix(v3(.009f,.016f,.028f),v3(.045f,.069f,.088f),fw::saturate(.35f+rd.y*.9f));
    bg=bg+v3(.095f,.049f,.023f)*expf(-8.f*(rd.x+.55f)*(rd.x+.55f)-5.f*(rd.y-.15f)*(rd.y-.15f));
    if(rd.y>=-.0001f)return view==1?v3(0):bg;
    float t=(-.012f-ro.y)/rd.y;float3 p=ro+t*rd;
    bool plinth=p.x*p.x+p.z*p.z<2.65f;
    if(!plinth){t=(-.13f-ro.y)/rd.y;p=ro+t*rd;}
    if(t<0||t>100)return view==1?v3(0):bg;
    if(view==1)return v3(.5f,1,.5f);
    float r=sqrtf(p.x*p.x+p.z*p.z);
    float3 base=plinth?v3(.055f,.069f,.078f):v3(.022f,.034f,.043f);
    float shadow=1.f;
    if(flags&2){
        for(int j=0;j<12;j++){
            float a=j*2.399963f,radius=1.05f*sqrtf((j+.5f)/12);
            float3 light=v3(-1.45f+radius*cosf(a),4.f+radius*sinf(a),1.95f+.7f*radius*sinf(a));
            if(trace(p+v3(0,.001f,0),normalize(light-p),length(light-p),mode,tests,true).id>=0)shadow-=.048f;
        }
    }
    base=base*(shadow*(.77f+.23f*fw::saturate(r*.8f)));
    if(plinth)base=base*(.96f+.04f*cosf(r*395.f));
    else {
        float2 bands={fw::fract(p.x*.45f),fw::fract(p.z*.45f)};
        float score=fminf(fminf(bands.x,1-bands.x),fminf(bands.y,1-bands.y));
        base=base*(.86f+.14f*fw::smoothstep(0.f,.006f,score));
    }
    if(plinth&&flags&1){
        float3 dir=reflect(rd,v3(0,1,0)),origin=p+v3(0,.001f,0);
        Hit bounce=trace(origin,dir,15,mode,tests);
        float3 reflected=bounce.id>=0?shade(bounce,origin,dir,flags,mode,control,spin,tests):lightMap(dir,5.5f,spin)*.40f;
        base=mix(base,reflected, .20f+.32f*powf(1-fw::saturate(-rd.y),3.f));
    }
    return mix(base,bg,fw::saturate(t/40.f));
}
}
extern "C" __global__ void setSoundstage(const float *v,const int *t,const float *n,const unsigned char *m,const float *e){
    sound::vertices=v;sound::triangles=t;sound::nodes=n;sound::maps=m;sound::environment=e;
}
__device__ float3 soundstageScene(float u,float v,float aspect,float time,float yaw,float pitch,float control,int flags,int mode,int view){
    using namespace fw; using namespace sound;
    float angle=.42f+yaw+.14f*sinf(time*.36f), elev=fw::clamp(.18f+pitch,-.12f,.65f);
    float3 target=v3(0,.91f,0),ro=target+v3(sinf(angle)*cosf(elev),sinf(elev),cosf(angle)*cosf(elev))*4.7f;
    float3 forward=normalize(target-ro),right=normalize(cross(forward,v3(0,1,0))),up=cross(right,forward);
    float3 rd=normalize(forward+.355f*(u*aspect*right+v*up));
    int tests=0;float spin=.20f+.045f*time;
    Hit h=trace(ro,rd,1e5f,mode,tests);
    float3 color;
    if(h.id<0)color=stage(ro,rd,flags,mode,view,control,spin,tests);
    else if(view==1) color=materialAt(h,rd,flags,control).n*.5f+v3(.5f);
    else color=shade(h,ro,rd,flags,mode,control,spin,tests);
    if(view==2){float k=fw::saturate(tests/110.f);return mix(v3(.018f,.031f,.062f),v3(1,.42f,.06f),sqrtf(k));}
    return color;
}
#define SCENE_FUNCTION soundstageScene

// A small laboratory probe. Each supplied ray gets its hit ID, hit distance and triangle-test count.
extern "C" __global__ void inspectRadio(const float *rays,int count,int mode,float *answers) {
    int i=blockIdx.x*blockDim.x+threadIdx.x;
    if(i>=count)return;
    const float *r=rays+6*i;
    int tests=0;
    sound::Hit hit=sound::trace(sound::at3(r),sound::at3(r+3),100.f,mode,tests);
    answers[3*i]=float(hit.id);
    answers[3*i+1]=hit.t;
    answers[3*i+2]=float(tests);
}
