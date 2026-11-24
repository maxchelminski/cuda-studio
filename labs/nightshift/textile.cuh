// Selvedge · ray-cast hosiery over a sectioned ceramic textile-testing last.
// The viewport concatenates common.cuh, this scene, and frame.cu for NVRTC.
#define SCENE_FUNCTION textileScene
extern "C" {
__device__ __constant__ float4 textileMarks[32];
__device__ __constant__ float4 textileGrab;
}
namespace selvedge {
using namespace fw;
constexpr float PI=3.14159265f, TAU=6.28318531f, X0=-2.58f, DX=5.16f/32, Z_SCALE=.90f;
struct Section { float y,z,r; };
struct Bounds {float xmin,xmax,ymin,ymax,zmin,zmax;};
__device__ __constant__ Section profile[33]={
    {0.1474524f,-0.0254108f,0.5350028f},
    {0.0785030f,-0.0393242f,0.5395911f},
    {0.0145882f,-0.0520036f,0.5430557f},
    {-0.0428147f,-0.0630511f,0.5480513f},
    {-0.0924265f,-0.0721202f,0.5575776f},
    {-0.1332250f,-0.0789261f,0.5743167f},
    {-0.1644918f,-0.0832554f,0.5998716f},
    {-0.1858449f,-0.0849722f,0.6340975f},
    {-0.1972569f,-0.0840226f,0.6747577f},
    {-0.1990553f,-0.0804364f,0.7176843f},
    {-0.1919084f,-0.0743262f,0.7574933f},
    {-0.1767940f,-0.0658836f,0.7887083f},
    {-0.1549552f,-0.0553736f,0.8069797f},
    {-0.1278427f,-0.0431261f,0.8100259f},
    {-0.0970493f,-0.0295253f,0.7980031f},
    {-0.0642358f,-0.0149979f,0.7732158f},
    {-0.0310559f,0.0000000f,0.7393141f},
    {0.0009202f,0.0149979f,0.7002910f},
    {0.0302774f,0.0295253f,0.6596174f},
    {0.0558206f,0.0431261f,0.6197540f},
    {0.0766299f,0.0553736f,0.5821046f},
    {0.0921019f,0.0658836f,0.5473383f},
    {0.1019781f,0.0743262f,0.5159674f},
    {0.1063564f,0.0804364f,0.4891098f},
    {0.1056866f,0.0840226f,0.4692496f},
    {0.1007501f,0.0849722f,0.4602507f},
    {0.0926235f,0.0832554f,0.4653539f},
    {0.0826300f,0.0789261f,0.4831705f},
    {0.0722781f,0.0721202f,0.5052208f},
    {0.0631931f,0.0630511f,0.5197307f},
    {0.0570421f,0.0520036f,0.5203456f},
    {0.0554578f,0.0393242f,0.5110842f},
    {0.0599640f,0.0254108f,0.5018833f}
};
__device__ __constant__ Bounds groups[8]={
    {-2.5810000f,-1.9340000f,-0.6510041f,0.6834552f,-0.5749400f,0.4570918f},
    {-1.9360000f,-1.2890000f,-0.8730146f,0.4785008f,-0.6923045f,0.5242593f},
    {-1.2910000f,-0.6440000f,-0.9665023f,0.6530245f,-0.7826554f,0.6719081f},
    {-0.6460000f,0.0010000f,-0.9629349f,0.7099800f,-0.7826554f,0.6896776f},
    {-0.0010000f,0.6460000f,-0.7713700f,0.7092583f,-0.6663827f,0.6663827f},
    {0.6440000f,1.2910000f,-0.5064747f,0.6597345f,-0.4695205f,0.5802678f},
    {1.2890000f,1.9360000f,-0.4339427f,0.5784989f,-0.3835785f,0.5278189f},
    {1.9340000f,2.5810000f,-0.4643035f,0.5839238f,-0.4272842f,0.5318088f},
};

struct Ray {float3 o,d;};
struct Hit {float t; int material,section; float u,v; float3 n;};
__device__ float3 rz(float3 p,float a){float c=cosf(a),s=sinf(a);return v3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
__device__ float3 world(float3 p){return rz(p,.29f)+v3(0,.04f,0);}
__device__ float3 local(float3 p){return rz(p-v3(0,.04f,0),-.29f);}
__device__ float gauss(float x){return expf(-x*x);}
__device__ float periodic(float x){return x-floorf(x+.5f);}
__device__ float hash(float x,float y){return fract(sinf(x*27.329f+y*73.125f)*43758.13f);}
__device__ Ray camera(float u,float v,float aspect,float time,float yaw,float pitch){
    float a=.12f+yaw+.045f*sinf(time*.34f);
    float e=.105f+pitch;
    float3 target=v3(-.05f,-.12f,0);
    float3 o=target+v3(sinf(a)*cosf(e),sinf(e),cosf(a)*cosf(e))*6.72f;
    float3 forward=normalize(target-o),right=normalize(cross(forward,v3(0,1,0))),up=cross(right,forward);
    return {o,normalize(forward+.271f*(right*(u*aspect)+up*v))};
}
__device__ Ray localRay(Ray r){return {local(r.o),rz(r.d,-.29f)};}
__device__ bool slab(float lo,float hi,float o,float d,float &nearT,float &farT){
    if(fabsf(d)<1e-9f)return o>=lo&&o<=hi;
    float a=(lo-o)/d,b=(hi-o)/d;
    nearT=fmaxf(nearT,fminf(a,b)); farT=fminf(farT,fmaxf(a,b));return nearT<=farT;
}
__device__ bool reaches(const Bounds &b,Ray ray,float best){
    float a=0.f,z=best;
    return slab(b.xmin,b.xmax,ray.o.x,ray.d.x,a,z)&&slab(b.ymin,b.ymax,ray.o.y,ray.d.y,a,z)
        &&slab(b.zmin,b.zmax,ray.o.z,ray.d.z,a,z);
}
// STUDENT EDIT: use reaches(box,ray,closest) to reject a group only when its entire
// conservative box lies outside the ray interval. Inspect the work view while editing.
__device__ bool studentVisit(const Bounds &box,Ray ray,float closest){return true;}

__device__ void sectionHit(Ray ray, float x,float span,Section a,Section b,float zScale,
                           int material,int section,Hit &hit){
    float dy=(b.y-a.y)/span,dz=(b.z-a.z)/span,dr=(b.r-a.r)/span;
    float xdelta=ray.o.x-x;
    float oy=ray.o.y-a.y-dy*xdelta,oz=(ray.o.z-a.z-dz*xdelta)/zScale;
    float orad=a.r+dr*xdelta;
    float by=ray.d.y-dy*ray.d.x,bz=(ray.d.z-dz*ray.d.x)/zScale,br=dr*ray.d.x;
    float A=by*by+bz*bz-br*br,B=by*oy+bz*oz-br*orad,C=oy*oy+oz*oz-orad*orad;
    float disc=B*B-A*C;
    if(disc<0)return;
    float root=sqrtf(disc);
    float q=-B-copysignf(root,B);
    float t0=fabsf(A)>1e-10f?q/A:1e20f;
    float t1=fabsf(q)>1e-12f?C/q:1e20f;
    float ts[2]={fminf(t0,t1),fmaxf(t0,t1)};
    for(int side=0;side<2;side++){
        float t=ts[side];
        if(t<.002f||t>=hit.t)continue;
        float param=(xdelta+ray.d.x*t)/span;
        if(param<0||param>1)continue;
        float y=oy+by*t,z=oz+bz*t,rad=orad+br*t;
        if(material==1){
            // Interpolate slopes to remove faceting in the lighting of neighboring rings.
            int i=section,j=max(0,i-1),k=min(32,i+2);
            Section prev=profile[j],next=profile[k];
            dy=mix((b.y-prev.y)/((i+1-j)*DX),(next.y-a.y)/((k-i)*DX),param);
            dz=mix((b.z-prev.z)/((i+1-j)*DX),(next.z-a.z)/((k-i)*DX),param);
            dr=mix((b.r-prev.r)/((i+1-j)*DX),(next.r-a.r)/((k-i)*DX),param);
        }
        hit.t=t; hit.material=material;hit.section=section;
        hit.u=fract(.5f+atan2f(y,z)/TAU);
        hit.v=(ray.o.x+ray.d.x*t-X0)/(32.f*DX);
        hit.n=normalize(v3(-dy*y-dz*z/zScale-dr*rad,y,z/zScale));
        return;
    }
}
__device__ void ferrule(Ray r,float a,float b,float y,float z,float ra,float rb,int material,Hit &h){
    sectionHit(r,a,b-a,{y,z,ra},{y,z,rb},1,material,-1,h);
}
__device__ Hit cast(Ray r,int mode,int &tests){
    Hit hit={100.f,0,-1,0.f,0.f,{0.f,1.f,0.f}};
    for(int g=0;g<8;g++){
        bool visit=mode==0 || (mode==1?reaches(groups[g],r,hit.t):studentVisit(groups[g],r,hit.t));
        if(!visit)continue;
        for(int j=g*4;j<g*4+4;j++){
            tests++;
            sectionHit(r,X0+DX*j,DX,profile[j],profile[j+1],Z_SCALE,1,j,hit);
        }
    }
    for(int side=0;side<2;side++){
        float edge=side?-X0:X0;
        Section s=profile[side?32:0];
        // Brushed end bell, dark insulating gasket, machined tapered hub, and spindle.
        float radius=s.r*1.032f;
        if(side){
            ferrule(r,edge-.02f,edge+.03f,s.y,s.z,radius-.025f,radius,2,hit);
            ferrule(r,edge+.03f,edge+.23f,s.y,s.z,radius,radius,2,hit);
            ferrule(r,edge+.23f,edge+.32f,s.y,s.z,radius,.27f,2,hit);
            ferrule(r,edge+.31f,edge+.39f,s.y,s.z,.27f,.21f,3,hit);
            ferrule(r,edge+.39f,edge+3.f,s.y,s.z,.16f,.16f,2,hit);
        }else{
            ferrule(r,edge-.03f,edge+.02f,s.y,s.z,radius,radius-.025f,2,hit);
            ferrule(r,edge-.23f,edge-.03f,s.y,s.z,radius,radius,2,hit);
            ferrule(r,edge-.32f,edge-.23f,s.y,s.z,.27f,radius,2,hit);
            ferrule(r,edge-.39f,edge-.32f,s.y,s.z,.21f,.27f,3,hit);
            ferrule(r,edge-3.f,edge-.39f,s.y,s.z,.16f,.16f,2,hit);
        }
    }
    return hit;
}
__device__ float3 lights(float3 direction){
    // Finite rectangular studio cards, evaluated after reflection about the material
    // normal. A frosted box stretches into a ribbon on the curved nylon and anodized brass.
    float3 d=normalize(direction);
    float3 key=normalize(v3(-.74f,1.1f,.85f)),rim=normalize(v3(.30f,.62f,-.91f));
    float blueCard=expf(-powf((d.x-key.x)*2.45f,2.f)-powf((d.y-key.y)*5.3f,2.f))
                   *smoothstep(-.34f,.55f,d.z);
    float gold=expf(-powf((d.x-rim.x)*4.0f,2.f)-powf((d.y-rim.y)*2.0f,2.f))
                 *smoothstep(.15f,.67f,-d.z);
    float strip=expf(-powf((d.y+.17f)*13.f,2.f))*smoothstep(-.5f,.6f,d.x);
    float overhead=powf(fw::saturate(d.y),5.f);
    float3 measured=swatch_lightprobe::radiance(d);
    // Tame very bright practicals at this material's fixed roughness before adding the
    // long warm rim card, positioned separately for the textile-testing bench.
    measured=measured/(v3(1.f)+measured*.13f);
    return v3(.04f,.065f,.075f)+measured*.79f+v3(1.24f,1.46f,1.54f)*blueCard+
           v3(3.55f,1.62f,.68f)*gold+v3(1.05f,.70f,.39f)*strip+v3(.49f,.49f,.44f)*overhead;
}
__device__ float3 ceramic(float3 n,float3 vd,float3 p,int flags){
    float3 k=normalize(v3(-.67f,1.1f,.90f)),r=normalize(v3(.46f,.68f,-.75f));
    float grain=.997f+.003f*sinf(485.f*p.x+12.f*sinf(35.f*p.y));
    float value=.18f+.70f*fw::saturate(dot(n,k))+.25f*fw::saturate(dot(n,r));
    float3 col=v3(.65f,.40f,.24f)*value*grain;
    col=col+v3(.05f,.075f,.095f)*fw::saturate(n.y+.45f);
    if(flags&1)col=col+.17f*lights(reflect(-vd,n))+.48f*v3(1.f,.78f,.6f)*powf(fw::saturate(dot(n,normalize(vd+k))),80.f);
    return col;
}
__device__ float3 metal(float3 n,float3 vd,float3 p,float u,int material,int flags){
    if(material==3)return v3(.015f,.021f,.022f)*(.5f+.65f*fw::saturate(n.y))+.075f*lights(reflect(-vd,n));
    float edge=fabsf(p.x)-2.58f;
    float lathe=sinf(p.x*565.f+.45f*sinf(u*TAU*50.f));
    float recess=1.f-.55f*gauss((edge-.069f)*174.f)-.41f*gauss((edge-.194f)*180.f);
    float knurl=1.f;
    if(edge>.09f&&edge<.17f)
        knurl=.63f+.37f*smoothstep(-.95f,.35f,sinf(690.f*p.x+u*TAU*123.f)*sinf(690.f*p.x-u*TAU*123.f));
    float3 env=(flags&1)?lights(reflect(-vd,n)):v3(.52f);
    return (v3(.60f,.35f,.15f)*env+v3(.095f,.073f,.049f))*(.94f+.05f*lathe)*recess*knurl;
}
__device__ float tearSigned(float u,float v,float cx,float cy,float amount,float angle){
    float dx=periodic(u-cx),dy=v-cy,c=cosf(angle),s=sinf(angle);
    float along=(dx*c+dy*s),across=(-dx*s+dy*c);
    float a=.066f*amount,b=.168f*amount;
    if(fabsf(along)>a*1.7f||fabsf(across)>b*1.25f)return 3.f;
    float t=across/(b+.00001f);
    // An asymmetric split follows a wale then jumps to neighboring loops.
    float jog=.115f*sinf(t*8.f+cy*9.f)+.085f*sinf(floorf((t+1.f)*16.f)*2.12f);
    float xx=along/(a+.00001f)-jog;
    float edge=fabsf(xx)*(.89f+.12f*sinf(t*15.f)) + powf(fabsf(t),1.48f);
    return edge-1.f;
}
__device__ float tearField(float u,float v,float control){
    float seeded=smoothstep(.28f,.98f,control);
    float field=3.f;
    if(seeded>.0001f)field=tearSigned(u,v,.54f,.546f,1.23f*sqrtf(seeded),-.37f);
    for(int i=0;i<32;i++){
        float4 m=textileMarks[i];
        if(m.z>0.f)field=fminf(field,tearSigned(u,v,m.x,m.y,m.z,m.w));
    }
    return field;
}
__device__ float motif(float u,float v){
    // A jacquard herringbone panel with small openwork fans along the waist of the sleeve.
    float w=fabsf(periodic((u+.083f)*7.f)), x=periodic(v*4.f);
    float leaf=fabsf(w-(.14f+.24f*cosf(x*TAU)));
    return (1.f-smoothstep(.028f,.078f,leaf))*smoothstep(.27f,.07f,fabsf(x))+
           .50f*(1.f-smoothstep(.015f,.055f,fabsf(w-.35f)-.15f*fabsf(sinf(x*TAU))));
}
// A surviving cross-strand and short snapped ends curve into each tear. Each end has
// its own length, bow and twist phase. Their coordinates are fixed to the garment.
__device__ float fringeAt(float u,float v,float cx,float cy,float size,float angle){
    float dx=periodic(u-cx),dy=v-cy,c=cosf(angle),s=sinf(angle);
    float x=(dx*c+dy*s)/(.066f*size), t=(-dx*s+dy*c)/(.168f*size);
    if(fabsf(x)>1.45f||fabsf(t)>1.05f)return 0.f;
    float field=tearSigned(u,v,cx,cy,size,angle);
    if(field>.18f)return 0.f;
    float best=0;
    int nearest=(int)floorf(t*7.5f);
    for(int j=nearest-1;j<=nearest+1;j++){
        float h=hash(11+j,17.f+floorf(cx*19.f)),side=h>.48f?1.f:-1.f;
        float tail=(j==-2)?2.4f:.18f+.52f*fract(h*7.2f);
        float width=1.f-powf(fminf(1.f,fabsf(j/7.5f)),1.48f);
        float pos=width-side*x;
        if(pos<-.24f||pos>tail)continue;
        float bow=.056f*sinf(pos*4.4f+h*5.f)+.07f*pos*pos*(h-.35f);
        float dist=fabsf(t-(j/7.5f+bow+.038f*h));
        float radius=(j==-2?.0085f:.012f)*fminf(1.4f,1.f/fmaxf(.24f,size));
        best=fmaxf(best,1.f-smoothstep(radius*.45f,radius*1.45f,dist));
    }
    return best;
}
__device__ float fringeField(float u,float v,float control){
    float demo=smoothstep(.28f,.98f,control);
    float out=demo>.0001f?fringeAt(u,v,.54f,.546f,1.23f*sqrtf(demo),-.37f):0.f;
    for(int i=0;i<32;i++){
        float4 m=textileMarks[i];
        if(m.z>0.f)out=fmaxf(out,fringeAt(u,v,m.x,m.y,m.z,m.w));
    }
    return out;
}
__device__ float jacquard(float u,float v){
    // A two-color feather repeat changes which yarn is exposed at the stitch level.
    float cx=periodic(u*5.f+.23f),cy=periodic(v*3.7f+.19f*floorf(u*5.f+.73f));
    float width=.27f*smoothstep(0.f,.30f,.44f-fabsf(cy));
    float ax=fabsf(cx+.22f*cy), body=smoothstep(width+.018f,width-.018f,ax);
    float ribs=1.f-smoothstep(.035f,.095f,fabsf(periodic(cy*10.f-ax*8.f)));
    float spine=1.f-smoothstep(.009f,.027f,ax);
    float rim=1.f-smoothstep(.008f,.027f,fabsf(width-ax));
    return fw::saturate(body*(.19f+.72f*ribs+.70f*spine)+rim*.36f)*smoothstep(.48f,.39f,fabsf(cy));
}
struct Stitch {float coverage,bump,slope,phase;};
__device__ Stitch stitch(float u,float v,float fine,int leg){
    // Two bowed legs in a stitch alternate over and under adjacent rows. The angular
    // pattern repeats seamlessly around the last; wales follow its length.
    float s=u*82.f,t=v*93.f;
    float phase=fract(t);
    float wave=.125f+.215f*(.5f+.5f*cosf(phase*PI));
    float stem=periodic(s+(leg?1.f:-1.f)*wave+.035f*sinf(t*.61f+s*.36f));
    float width=(.108f+.023f*cosf(phase*TAU+(leg?1.f:4.f)))*fine;
    float aa=.050f;
    float cov=1.f-smoothstep(width-aa,width+aa,fabsf(stem));
    float across=clamp(stem/(width+.00001f),-1.f,1.f);
    return {cov,sqrtf(fmaxf(0.f,1.f-across*across)),across,phase};
}
__device__ float3 fabric(Hit hit,float3 p,float3 n,float3 vd,float control,int flags){
    float u=hit.u,v=hit.v;
    float3 tangent=normalize(rz(v3(1.f,.0f,.0f),.29f)-n*dot(n,rz(v3(1,0,0),.29f)));
    float3 circ=normalize(cross(n,tangent));
    float4 grab=textileGrab;
    float ex=periodic(u-grab.x-grab.z),ey=v-grab.y-grab.w;
    float force=sqrtf(grab.z*grab.z+grab.w*grab.w);
    float envelope=expf(-120.f*(ex*ex+ey*ey));
    u=fract(u-grab.z*envelope);v-=grab.w*envelope;
    float field=tearField(u,v,control);
    float mask=smoothstep(-.045f,.10f,field);
    float hem=smoothstep(.010f,.018f,v)*smoothstep(.993f,.982f,v);
    float3 base=ceramic(n,vd,p,flags);
    // Fired-in graduation marks on the ceramic are seen through the knit. Their optical
    // parallax shifts with the camera because they sit below the raised yarn shell.
    float underU=fract(u-.0052f*dot(vd,circ)/fmaxf(.22f,dot(vd,n)));
    float underV=v-.0042f*dot(vd,tangent)/fmaxf(.22f,dot(vd,n));
    float line=1.f-smoothstep(.00045f,.0016f,fabsf(underU-.529f));
    float tickPitch=periodic(underV*108.f);
    int tick=(int)floorf(underV*108.f+.5f);
    float tickLen=tick%10==0?.020f:tick%5==0?.013f:.007f;
    float ticks=(1.f-smoothstep(.028f,.099f,fabsf(tickPitch)))*
             smoothstep(.528f,.530f,underU)*smoothstep(.531f+tickLen,.528f+tickLen,underU);
    base=mix(base,base*v3(.46f,.45f,.40f),fmaxf(line,ticks));

    if(hem<.001f)return base;
    float strain=smoothstep(.38f,1.f,control)*gauss((v-.55f)*5.6f);
    float alongWave=sinf(u*TAU*9.f+.5f*sinf(v*16.f));
    float smallWave=sinf((v+.12f*alongWave)*37.f);
    float folds=(.42f*smallWave+.58f*alongWave)*gauss((v-.15f)*7.3f)+
                .65f*sinf(30.f*v+4.f*sinf(u*TAU*3.f))*gauss((v-.85f)*8.f);
    float edgeFold=gauss((field-.17f)*3.8f);
    if(field>-.20f&&field<.84f){
        float dx=(tearField(fract(u+.00085f),v,control)-tearField(fract(u-.00085f),v,control))/.0017f;
        float dy=(tearField(u,v+.00085f,control)-tearField(u,v-.00085f,control))/.0017f;
        float lip=gauss((field-.11f)/.21f);
        float slope=-.0084f*(field-.11f)/(.21f*.21f)*lip;
        n=normalize(n-circ*clamp(slope*dx/4.1f,-.62f,.62f)-tangent*clamp(slope*dy/5.16f,-.62f,.62f));
    }
    n=normalize(n+tangent*(.105f*folds+.11f*edgeFold*sinf(u*65.f))
                  +circ*(.062f*folds+edgeFold*.074f)+
                  (circ*ex+tangent*ey)*(force*envelope*20.f));
    float rug=mix(.64f,.99f,mask);
    u+=.005f*folds+.0027f*smallWave+.005f*edgeFold;
    v+=.007f*folds+.028f*strain*sinf((v-.55f)*12.f)+.005f*edgeFold*sinf(u*78.f);
    float hemDistance=fminf(v-.018f,.985f-v);
    float welt=1.f-smoothstep(.068f,.078f,hemDistance);
    float goldLine=gauss((hemDistance-.080f)*680.f)+gauss((hemDistance-.089f)*1000.f);
    float embroidery=fw::saturate(motif(u,v));
    float scale=mix(1.13f,.76f,embroidery)*(1.f-.22f*strain);
    Stitch a=stitch(u,v,scale,0),b=stitch(u,v,scale,1);
    bool over=(a.coverage*a.bump+.05f*sinf(a.phase*TAU)>b.coverage*b.bump);
    Stitch front=over?a:b;
    float yarn=fmaxf(a.coverage,b.coverage);
    float3 dyewarp=mix(v3(.009f,.045f,.047f),v3(.032f,.115f,.105f),embroidery);
    float pattern=jacquard((floorf(u*82.f)+.5f)/82.f,(floorf(v*93.f)+.5f)/93.f);
    dyewarp=mix(dyewarp,v3(.145f,.204f,.143f),pattern*.87f);
    float bind=1.f-smoothstep(.12f,.28f,fabsf(periodic(u*98.f)));
    float waveLine=.5f+.5f*sinf(u*TAU*87.f+v*300.f);
    float filling=mix(.48f,.22f,embroidery)*(1.f-.55f*strain);
    float opacity=fw::saturate(filling+(1.f-filling)*yarn*.96f);
    // Last loops remain attached to the lip of the opening, with uneven broken tails.
    float loose=smoothstep(-.36f,-.04f,field)*(1.f-smoothstep(-.08f,.13f,field));
    float tails=loose*(1.f-smoothstep(.035f,.105f,fabsf(periodic(u*98.f+.20f*sinf(v*178.f)+.4f*field))))
                *smoothstep(.20f,.86f,.5f+.5f*sinf(281.f*u+v*92.f));
    float3 plyN=normalize(n+circ*front.slope*.34f*(flags&4?1.f:.3f)+tangent*(over?.08f:-.08f));
    float3 light=normalize(v3(-.64f,1.f,.82f)),kicker=normalize(v3(.60f,.70f,-.76f));
    float diffuse=.31f+.86f*fw::saturate(dot(plyN,light))+.25f*fw::saturate(dot(plyN,kicker));
    float fres=powf(1.f-fw::saturate(dot(plyN,vd)),2.6f);
    float curvature=.86f+.14f*front.bump;
    float3 threadColor=dyewarp*diffuse*curvature;
    if(flags&1){
        float3 env=lights(reflect(-vd,plyN));
        float3 half=normalize(vd+light);
        float tangentDot=dot(normalize(tangent+(over?.28f:-.28f)*circ),half);
        float silk=expf(-19.f*tangentDot*tangentDot)*(.20f+.80f*powf(fw::saturate(dot(plyN,half)),3.f));
        float twist=(flags&4)?.78f+.22f*sinf(v*TAU*180.f+(over?1.f:-1.f)*u*600.f):.85f;
        threadColor=threadColor+(v3(.040f,.10f,.095f)*silk*twist+
                                 env*v3(.024f,.054f,.053f)*(.68f+2.4f*fres))*rug;
    }
    if(!(flags&4)){opacity=filling+(1-filling)*.49f; threadColor=mix(dyewarp*diffuse,threadColor,.5f);}
    float3 dyedBase=(flags&1)?base*v3(.17f,.29f,.26f):dyewarp*diffuse;
    if(flags&2)dyedBase=dyedBase*(.72f+.25f*front.bump);
    float3 sheet=mix(dyedBase,threadColor,opacity);
    // Rolled elastomer welt with two fine brass-colored tracer yarns.
    float hemCrease=.75f+.25f*sinf(v*TAU*238.f+.4f*sinf(u*92.f));
    float hemRibs=.69f+.31f*bind;
    float3 ribColor=threadColor*1.35f+v3(.025f,.037f,.030f)*diffuse;
    sheet=mix(sheet,ribColor*(hemCrease*hemRibs),welt);
    sheet=mix(sheet,v3(.40f,.19f,.058f)*(.45f+.7f*diffuse+.34f*waveLine),fw::saturate(goldLine));
    float3 nearHole=base;
    if(flags&2)nearHole=base*(1.f-.21f*gauss((field+.08f)*9.f));
    float fibers=field<.18f?fringeField(hit.u,hit.v,control):0.f;
    float strandShadow=field<.18f&&(flags&2)?fringeField(fract(hit.u+.0018f),hit.v-.0016f,control):0.f;
    nearHole=nearHole*(1.f-.31f*strandShadow);
    nearHole=mix(nearHole,threadColor*.91f+v3(.032f,.043f,.031f),fibers*.95f);
    return mix(nearHole,sheet,hem*fw::saturate(mask+tails))+
           (flags&1?v3(.026f,.039f,.033f)*edgeFold*mask:v3(0));
}

struct ClampHit {float t; float3 n,q; float w,h; int type;};
__device__ bool hullPlane(float3 q,float3 d,float3 normal,float bound,float &enter,float &leave,float3 &face){
    float h=bound-dot(normal,q),rate=dot(normal,d);
    if(fabsf(rate)<1e-7f)return h>=0;
    float t=h/rate;
    if(rate<0&&t>enter){enter=t;face=normal;}else if(rate>0)leave=fminf(leave,t);
    return enter<=leave;
}
__device__ void mountBlock(Ray r,float3 center,float3 half,int type,ClampHit &hit){
    float a=.002f,b=hit.t; float3 n=v3(0,1,0),q=r.o-center,d=r.d;
    for(int axis=0;axis<3;axis++){
        float3 norm=axis==0?v3(1,0,0):axis==1?v3(0,1,0):v3(0,0,1);
        float bound=axis==0?half.x:axis==1?half.y:half.z;
        if(!hullPlane(q,d,norm,bound,a,b,n)||!hullPlane(q,d,-norm,bound,a,b,n))return;
    }
    const float bevel=.045f;
    for(int side=-1;side<=1;side+=2){
        if(!hullPlane(q,d,v3(side,1,0),half.x+half.y-bevel,a,b,n))return;
        if(!hullPlane(q,d,v3(side,0,1),half.x+half.z-bevel,a,b,n))return;
    }
    if(!hullPlane(q,d,v3(0,1,1),half.y+half.z-bevel,a,b,n))return;
    if(a>=hit.t)return;
    hit={a,normalize(n),q+d*a,half.x,half.y,type};
}
__device__ ClampHit mounts(Ray ray){
    ClampHit hit={100.f,{0,1,0},{0,0,0},0,0,0};
    for(int side=-1;side<=1;side+=2){
        Section s=profile[side<0?0:32];
        float3 joint=world(v3(side*3.22f,s.y,s.z));
        float bottom=-1.42f, top=joint.y-.14f;
        mountBlock(ray,v3(joint.x,(top+bottom)*.5f,joint.z-.10f),v3(.138f,(top-bottom)*.5f,.152f),1,hit);
        mountBlock(ray,v3(joint.x,joint.y-.04f,joint.z),v3(.225f,.275f,.26f),2,hit);
        mountBlock(ray,v3(joint.x,-1.414f,joint.z-.11f),v3(.35f,.076f,.35f),3,hit);
    }
    return hit;
}
__device__ float3 clampColor(ClampHit h,float3 vd,int flags){
    float3 n=h.n, r=reflect(-vd,n);
    float3 e=lights(r);
    float diffuse=.34f+.8f*fw::saturate(dot(n,normalize(v3(-.7f,.8f,.32f))));
    float grain=.95f+.05f*sinf(h.q.y*516.f+.53f*sinf(h.q.x*60.f));
    float3 c=(v3(.033f,.054f,.055f)*diffuse+e*.047f)*grain;
    if(h.type==2&&n.z>.95f){
        // The bearing face and its two recessed machine screws are visible at either end.
        float radius=sqrtf(h.q.x*h.q.x+h.q.y*h.q.y);
        float copper=smoothstep(.187f,.174f,radius)*smoothstep(.111f,.121f,radius);
        c=mix(c,v3(.47f,.30f,.136f)*(.42f+.48f*(h.q.y/.18f+.98f))*grain,copper);
        float screw=sqrtf(h.q.x*h.q.x+(fabsf(h.q.y)-.218f)*(fabsf(h.q.y)-.218f));
        if(screw<.026f){
            c=v3(.35f,.29f,.22f)*(.49f+.28f*grain);
            if(fabsf(h.q.x+.47f*(fabsf(h.q.y)-.218f))<.0035f)c=c*.19f;
        }
    }
    if(h.type==1&&n.z>.95f){
        float rib=gauss((fabsf(h.q.x)-.094f)*114.f);
        c=c*(1.f-.53f*rib);
    }
    return c;
}
__device__ float3 studio(Ray ray,Ray objRay,int flags,int mode,int &tests,float &floorT){
    // Dark blue sweep, warm frosted practicals, and a walnut work surface.
    float dx=ray.d.x,dy=ray.d.y;
    float fan=expf(-powf((dx+.30f)*6.f,2.f)-powf((dy-.20f)*4.f,2.f));
    float3 bg=mix(v3(.009f,.018f,.021f),v3(.046f,.072f,.072f),fw::saturate(.45f+dy*1.6f))+
              v3(.19f,.097f,.052f)*fan;
    float lamp=expf(-10.f*fabsf(dx-.26f+.21f*dy)-4.0f*fabsf(dy-.13f));
    bg=bg+v3(.11f,.067f,.033f)*lamp;
    // Out of focus vertical window mullions and reflected work lamps behind the specimen.
    float blinds=gauss(periodic((dx-.14f*dy)*7.f+.18f)*12.5f);
    bg=bg*(1.f-.24f*blinds);
    float ledges=gauss((dy-.10f)*96.f)+.55f*gauss((dy-.124f)*145.f);
    bg=bg+v3(.10f,.088f,.058f)*ledges*smoothstep(.05f,.42f,dx);
    for(int j=0;j<6;j++){
        float bx=-.42f+.17f*j,by=.05f+.023f*sinf(j*9.2f);
        float r2=(dx-bx)*(dx-bx)+(dy-by)*(dy-by);
        bg=bg+v3(.15f,.088f,.040f)*expf(-r2*4700.f)+v3(.077f,.041f,.023f)*expf(-r2*650.f);
    }
    floorT=100.f;
    if(ray.d.y>=-.015f)return bg;
    float t=(-1.50f-ray.o.y)/ray.d.y;
    if(t<=0.f||t>=90.f)return bg;
    floorT=t;
    float3 p=ray.o+ray.d*t;
    float grain=sinf(p.x*15.f+1.2f*sinf(p.z*1.4f)+.6f*sinf(p.x*7.f))*.02f+
                sinf(p.z*35.f+.25f*sinf(p.x*5.f))*.016f;
    float base=.52f+.16f*fw::saturate(.32f-.56f*p.z);
    float plank=periodic(p.z*.76f);
    float join=expf(-fabsf(plank)*275.f);
    float ribbon=sinf(p.x*3.2f+5.4f*p.z+.58f*sinf(2.0f*p.x)+.28f*sinf(8.f*p.z));
    float3 wood=v3(.112f,.074f,.046f)*(base+grain+.032f*ribbon)*(1.f-.25f*join);
    float gloss=gauss((p.x+1.9f)*.61f)*gauss((p.z+1.2f)*.37f);
    wood=wood+v3(.05f,.037f,.023f)*gloss;
    float3 pl=local(p);
    float contact=expf(-powf((pl.z+.39f)*1.28f,2.f))*gauss(pl.x*.33f);
    if(flags&2){
        wood=wood*(1.f-.57f*contact);
        for(int side=-1;side<=1;side+=2){
            Section section=profile[side<0?0:32];
            float3 foot=world(v3(side*3.22f,section.y,section.z));
            float x=fmaxf(0.f,fabsf(p.x-foot.x)-.27f);
            float z=fmaxf(0.f,fabsf(p.z-foot.z+.11f)-.28f);
            float ambient=expf(-12.f*sqrtf(x*x+z*z));
            float shadow=gauss((p.x-foot.x-.17f)*2.42f)*gauss((p.z-foot.z+.44f)*1.37f);
            wood=wood*(1.f-.76f*ambient)*(1.f-.37f*shadow);
        }
    }
    // A brass measuring rule inset in the foreground has major and minor graduations.
    float rail=fabsf(p.z-1.32f);
    float side=smoothstep(.119f,.109f,rail);
    float tickA=(1.f-smoothstep(.035f,.07f,fabsf(periodic(p.x*5.f))))*smoothstep(1.33f,1.22f,p.z);
    float tickB=(1.f-smoothstep(.043f,.10f,fabsf(periodic(p.x*25.f))))*smoothstep(1.30f,1.255f,p.z);
    float3 brass=v3(.25f,.165f,.079f)*(.46f+.10f*cosf(p.x*45.f)+.12f*gloss);
    brass=brass*(1.f-.67f*fmaxf(tickA,tickB));
    wood=mix(wood,brass,side);
    float far=smoothstep(6.f,19.f,t);
    return mix(wood,bg,far);
}
} // namespace selvedge

extern "C" __global__ void textilePick(float x,float y,float aspect,float time,float yaw,float pitch,float control,float *out){
    using namespace selvedge;
    Ray ray=camera(x,y,aspect,time,yaw,pitch);
    int tests=0; Hit h=cast(localRay(ray),1,tests);
    float floorT=(ray.d.y<-.015f)?(-1.50f-ray.o.y)/ray.d.y:100.f;
    bool onCloth=h.material==1&&h.v>.018f&&h.v<.985f&&h.t<fminf(mounts(ray).t,floorT);
    out[0]=onCloth?h.u:-1.f;out[1]=onCloth?h.v:-1.f;
}
__device__ float3 textileScene(float u,float v,float aspect,float time,float yaw,float pitch,float control,int flags,int mode,int view){
    using namespace selvedge;
    Ray ray=camera(u,v,aspect,time,yaw,pitch),obj=localRay(ray);
    int tests=0;Hit h=cast(obj,mode,tests);
    float floorT;
    float3 bg=studio(ray,obj,flags,mode,tests,floorT);
    ClampHit clampHit=mounts(ray);
    bool isClamp=clampHit.type!=0&&clampHit.t<fminf(h.t,floorT);
    bool visible=h.material!=0&&h.t<floorT;
    if(view==2){
        float g=tests/32.f;
        return mix(v3(.035f,.081f,.105f),v3(.98f,.47f,.16f),g)+v3(.015f,.045f,.045f)*(visible?1.f:0.f);
    }
    float3 n=rz(h.n,.29f),p=obj.o+obj.d*h.t;
    if(isClamp){
        if(view==1)return clampHit.n*.5f+v3(.5f);
        return clampColor(clampHit,-ray.d,flags);
    }
    if(view==1)return visible?n*.5f+v3(.5f):v3(.065f,.082f,.10f);
    if(!visible)return bg;
    if(h.material==1)return fabric(h,p,n,-ray.d,control,flags);
    return metal(n,-ray.d,p,h.u,h.material,flags);
}
