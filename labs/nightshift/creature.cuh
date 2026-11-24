// Sluice 09. World coordinates use metres, with Y up and the hatch at Z=-1.30.
// The three traversal modes share geometry, hit order, animation and all shading.
#define SCENE_FUNCTION creatureScene
extern "C" { __device__ uchar4 sluiceConcrete[512*512]; }
namespace sluice {
using namespace fw;
constexpr int shells=49, feeders=11, arms=16, worms=shells+feeders+arms;
constexpr int segments=20, groupSize=5, groups=segments/groupSize;
constexpr float pi=3.14159265359f;
struct Bounds {float3 lo,hi;};
struct Link {float3 a, axis; float len, radius, arc;};
struct Ray {float3 o,d,inv;};
struct Hit {float t; float3 n; int mat, id; float arc;};
enum Surface {air, floorMat, concrete, shutter, rail, stripe, brass, pipe, lampAmber,
              lampCold, grille, dial, rubber, wheel, flesh, drain, signMat};
__device__ Link links[worms][segments];
__device__ Bounds spans[worms][groups], whole[worms], colony;
__device__ float opening(float c){return .44f+.89f*c;}
__device__ float hash(unsigned k){
    k ^= k>>16; k *= 0x7feb352du; k ^= k>>15; k *= 0x846ca68bu; k ^= k>>16;
    return (k>>8)*(1.f/16777216.f);
}
__device__ float3 minimum(float3 a,float3 b){return v3(fminf(a.x,b.x),fminf(a.y,b.y),fminf(a.z,b.z));}
__device__ float3 maximum(float3 a,float3 b){return v3(fmaxf(a.x,b.x),fmaxf(a.y,b.y),fmaxf(a.z,b.z));}
__device__ Bounds emptyBounds(){return {v3(1e9f),v3(-1e9f)};}
__device__ Bounds merge(Bounds a,Bounds b){return {minimum(a.lo,b.lo),maximum(a.hi,b.hi)};}
__device__ float nz(float d){return copysignf(1.f/fmaxf(fabsf(d),1e-12f),d);}
__device__ Ray ray(float3 o,float3 d){return {o,d,v3(nz(d.x),nz(d.y),nz(d.z))};}
__device__ bool interval(Ray r,Bounds b,float upper,float& nearT,float& farT){
    float3 a=(b.lo-r.o)*r.inv,z=(b.hi-r.o)*r.inv;
    float3 mn=minimum(a,z),mx=maximum(a,z);
    nearT=fmaxf(mn.x,fmaxf(mn.y,mn.z)); farT=fminf(mx.x,fminf(mx.y,mx.z));
    return farT>=fmaxf(.0005f,nearT) && nearT<=upper;
}
__device__ bool meets(Ray r,Bounds b,float upper){float n,f;return interval(r,b,upper,n,f);}

__device__ float3 strandPoint(int id,float s,float time,float gate){
    unsigned seed=91u+id*17u;
    float phase=2*pi*hash(seed), w=hash(seed+1), j=hash(seed+2), k=hash(seed+3);
    float t=time*.77f, motion=sinf(t*.7f);
    float3 p;
    if(id<shells){
        // Spiral routes lie on different depth shells; latitude also folds back on itself.
        float spin=(id%2?1.f:-1.f), a=phase+spin*((2.6f+2.25f*j)*(s-.5f)+.12f*sinf(t+phase+3*s));
        float lat=.28f+.64f*w + (.33f+.45f*k)*sinf(pi*2*s*(.60f+.45f*j)+phase*.87f+
                    .21f*sinf(t*.73f+phase)) + .13f*sinf(7*s+t*.82f+phase);
        lat=clamp(lat,.045f,1.55f);
        float radius=.76f+.29f*hash(seed+4)+.08f*sinf(3*a+phase+1.1f*s);
        float x=1.33f*radius*cosf(lat)*cosf(a);
        float z=.10f+1.37f*radius*cosf(lat)*sinf(a);
        p=v3(x+.20f*sinf(1.8f*z+.18f*t), .04f+1.20f*radius*sinf(lat), z);
    }else if(id<shells+feeders){
        float x=(w-.5f)*2.50f;
        float z=-2.27f+s*3.20f;
        p=v3(x+.26f*sinf(s*7.f+phase+.45f*t), (.12f+.64f*j)*(.80f+.20f*cosf(s*8+phase+t*.38f)),z);
    }else{
        int arm=id-shells-feeders;
        float dir=-1.96f+3.92f*(arm+.23f+.54f*j)/arms;
        float reach=.48f+s*(1.36f+1.14f*w);
        float side=(.12f+.31f*k)*sinf(7.4f*s+phase+.62f*t)+.22f*s*sinf(11*s+phase+t*.86f);
        bool feeler=arm==5||arm==9||arm==12;
        float loft=(arm%4==1?.45f:.12f)*s*s*(.55f+.45f*sinf(5*s+phase+t));
        if(feeler)loft+=.37f*expf(-30.f*(s-.79f)*(s-.79f))+.13f*s+1.85f*fmaxf(0.f,s-.79f);
        if(feeler){reach-=.28f*s;side+=.12f*sinf(9*s+t*.7f)*s;}
        p=v3(sinf(dir)*reach+cosf(dir)*side,
             .071f+.34f*(1-s)*(1-s)+.09f*(1.f+sinf(8*s+phase+t))*(1-s)+loft,
             .09f+cosf(dir)*reach-sinf(dir)*side);
    }
    // The colony emerges and recoils over one twelve-second pressure cycle.
    // Upper curves compress near the slot while unconstrained front feelers keep their shape.
    float advance=.5f+.5f*sinf(time*.52f+.44f);
    p.z+=-1.84f*(1.f-advance)+.08f*motion;
    float nearDoor=expf(-3.f*(p.z+1.31f)*(p.z+1.31f));
    p.x*=1.f+nearDoor*(1.f-fw::saturate(gate/1.38f))*.09f;
    float cap=gate-.105f+fmaxf(0.f,p.z+1.05f)*1.33f;
    p.y=fminf(p.y,cap-.035f*sinf(p.x*9+phase));
    return p;
}
__device__ void makeStrand(int id,float t,float c){
    float base=(id<shells?.067f:.052f)+.048f*hash(244u+19u*id);
    float3 previous=strandPoint(id,0,t,opening(c));
    Bounds bound=emptyBounds(), group=emptyBounds(); float arc=0;
    for(int i=0;i<segments;i++){
        float mid=(i+.5f)/segments,s=(i+1.f)/segments;
        float tip=.13f+.87f*powf(fmaxf(0.f,sinf(pi*mid)),.55f);
        int arm=id-shells-feeders;
        if(arm==5||arm==9||arm==12){
            tip+=.77f*smoothstep(.84f,1.f,mid);
            base=fmaxf(base,.078f);
        }
        float rad=base*tip*(1+.066f*sinf(mid*22.f+id+t));
        float3 next=strandPoint(id,s,t,opening(c)); float3 d=next-previous;
        float len=fmaxf(.00001f,length(d));
        links[id][i]={previous,d/len,len,rad,arc};
        float3 margin=v3(rad+.0007f);
        Bounds b={minimum(next,previous)-margin,maximum(next,previous)+margin};
        group=merge(group,b); bound=merge(bound,b);
        if((i+1)%groupSize==0){spans[id][i/groupSize]=group;group=emptyBounds();}
        arc+=len;previous=next;
    }
    whole[id]=bound;
}
__device__ float sphereRoot(float3 offset,float3 dir,float rad){
    float b=dot(offset,dir), c=dot(offset,offset)-rad*rad, discr=b*b-c;
    if(discr<0)return 1e8f;
    float h=sqrtf(discr),nearT=-b-h;return nearT>.0005f?nearT:1e8f;
}
__device__ void intersectLink(Ray r,const Link& s,int id,Hit& hit){
    // Reject outside of the axial interval when testing the cylinder; caps cover both ends.
    float3 p=r.o-s.a;
    float da=dot(r.d,s.axis),oa=dot(p,s.axis);
    float A=1.f-da*da,B=dot(p,r.d)-oa*da,C=dot(p,p)-oa*oa-s.radius*s.radius;
    float discr=B*B-A*C, t=1e8f, y=0;
    if(discr>=0 && A>1.e-8f){
        float cand=(-B-sqrtf(discr))/A, ay=oa+cand*da;
        if(cand>.0005f&&ay>=0&&ay<=s.len){t=cand;y=ay;}
    }
    float start=sphereRoot(p,r.d,s.radius);
    if(start<t){t=start;y=0;}
    float end=sphereRoot(p-s.axis*s.len,r.d,s.radius);
    if(end<t){t=end;y=s.len;}
    if(t<hit.t){hit={t,normalize(p+t*r.d-y*s.axis),flesh,id,s.arc+y};}
}

// STUDENT EXERCISE: intersect the ray with the conservative five-link group box
// before visiting its links. For a missed box no link in the group can beat the current hit.
__device__ bool studentVisitsGroup(Ray r,Bounds bounds,float closest){
    return true;
}
__device__ void traceStrands(Ray r,Hit& hit,int mode,int& tested,bool any=false){
    if(!meets(r,colony,hit.t))return;
    for(int w=0;w<worms;w++){
        if(!meets(r,whole[w],hit.t))continue;
        for(int g=0;g<groups;g++){
            bool visit=mode==1?meets(r,spans[w][g],hit.t):mode==2?studentVisitsGroup(r,spans[w][g],hit.t):true;
            if(!visit)continue;
            for(int j=0;j<groupSize;j++){
                int index=g*groupSize+j;
                tested++;intersectLink(r,links[w][index],w*segments+index,hit);
                if(any&&hit.mat==flesh)return;
            }
        }
    }
}
__device__ void box(Ray r,float3 lo,float3 hi,int material,Hit& hit,int id=0){
    float n,f;if(!interval(r,{lo,hi},hit.t,n,f))return;
    float t=n>.0005f?n:f;if(t<=.0005f||t>=hit.t)return;
    float3 p=r.o+r.d*t, center=(hi+lo)*.5f;
    float3 q=(p-center)/((hi-lo)*.5f);
    float3 norm=fabsf(q.x)>fabsf(q.y)&&fabsf(q.x)>fabsf(q.z)?v3(copysignf(1.f,q.x),0,0):
                fabsf(q.y)>fabsf(q.z)?v3(0,copysignf(1.f,q.y),0):v3(0,0,copysignf(1.f,q.z));
    hit={t,norm,material,id,0};
}
__device__ void cylinder(Ray r,float3 a,float3 b,float rad,int material,Hit& h){
    float3 d=b-a; float len=length(d);
    Hit temp={h.t,v3(0),air,0,0};
    intersectLink(r,{a,d/len,len,rad,0},0,temp);
    if(temp.mat!=air){h=temp;h.mat=material;}
}
__device__ void setPlane(float t,float3 n,int mat,Hit& h){
    if(t>.0005f&&t<h.t)h={t,n,mat,0,0};
}
__device__ void frontDisc(Ray r,float3 center,float radius,int material,Hit& h){
    float t=(center.z-r.o.z)*r.inv.z;
    if(t>.0005f&&t<h.t){
        float3 p=r.o+r.d*t-center;
        if(p.x*p.x+p.y*p.y<radius*radius)h={t,v3(0,0,1),material,0,0};
    }
}
__device__ Hit room(Ray r,float gate){
    Hit h={45.f,v3(0,1,0),air,0,0};
    setPlane(-r.o.y*r.inv.y,v3(0,1,0),floorMat,h);
    setPlane((-4.3f-r.o.x)*r.inv.x,v3(1,0,0),concrete,h);
    setPlane((4.7f-r.o.x)*r.inv.x,v3(-1,0,0),concrete,h);
    setPlane((-3.65f-r.o.z)*r.inv.z,v3(0,0,1),grille,h);
    setPlane((4.5f-r.o.y)*r.inv.y,v3(0,-1,0),concrete,h);
    box(r,v3(-4.35f,0,-1.72f),v3(-1.80f,4.50f,-1.35f),concrete,h);
    box(r,v3(1.80f,0,-1.72f),v3(4.72f,4.50f,-1.35f),concrete,h);
    box(r,v3(-1.80f,2.92f,-1.72f),v3(1.80f,4.50f,-1.35f),concrete,h);
    box(r,v3(-1.83f,gate,-1.52f),v3(1.83f,3.00f,-1.32f),shutter,h);
    box(r,v3(-1.86f,gate-.027f,-1.53f),v3(1.86f,gate+.126f,-1.265f),stripe,h);
    for(int side=-1;side<=1;side+=2){
        float x=1.92f*side;
        box(r,v3(x-.108f,0,-1.57f),v3(x+.108f,3.03f,-1.20f),rail,h);
        box(r,v3(x-.141f,.0f,-1.44f),v3(x+.141f,.18f,-1.11f),brass,h);
        cylinder(r,v3(x,.30f,-1.18f),v3(x,2.86f,-1.18f),.041f,pipe,h);
        // Recessed amber source sits behind the door frame at the height of the aperture.
        box(r,v3(x*.87f-.034f,.08f,-2.35f),v3(x*.87f+.034f,1.44f,-2.24f),lampAmber,h);
    }
    box(r,v3(-2.08f,2.93f,-1.54f),v3(2.08f,3.13f,-1.16f),rail,h);
    box(r,v3(-1.26f,3.16f,-1.53f),v3(1.26f,3.30f,-1.13f),rubber,h);
    box(r,v3(-1.14f,3.18f,-1.14f),v3(1.14f,3.23f,-1.10f),lampCold,h);
    // Cyan tube on the service-side wall, orange caged work lamps on the opposite jamb.
    box(r,v3(2.50f,.44f,-1.38f),v3(2.67f,2.80f,-1.17f),rail,h);
    box(r,v3(2.54f,.54f,-1.18f),v3(2.61f,2.69f,-1.15f),lampCold,h);
    box(r,v3(-3.07f,.76f,-1.43f),v3(-2.52f,1.77f,-1.12f),rubber,h);
    box(r,v3(-2.98f,.83f,-1.16f),v3(-2.61f,1.69f,-1.07f),lampAmber,h);
    for(int i=0;i<5;i++){float y=.87f+.19f*i;box(r,v3(-3.03f,y,-1.085f),v3(-2.56f,y+.022f,-1.045f),rail,h);}
    for(int i=0;i<2;i++){float x=-2.91f+i*.23f;box(r,v3(x,.80f,-1.08f),v3(x+.018f,1.72f,-1.04f),rail,h);}
    for(int i=0;i<3;i++){
        float x=3.04f+i*.225f,rad=.052f+i*.012f;
        cylinder(r,v3(x,.01f,-1.15f),v3(x,3.84f,-1.15f),rad,pipe,h);
        for(int j=0;j<3;j++){float y=.39f+j*1.35f; cylinder(r,v3(x,y,-1.15f),v3(x,y+.029f,-1.15f),rad+.025f,brass,h);}
    }
    box(r,v3(-3.73f,.20f,-1.43f),v3(-3.22f,2.66f,-1.23f),grille,h);
    box(r,v3(2.22f,2.93f,-1.38f),v3(3.75f,3.71f,-1.29f),signMat,h);
    // Drain relief, pressure gauge and the manual shutoff handwheel all have physical depth.
    box(r,v3(-2.47f,.001f,-1.18f),v3(-2.06f,.027f,4.1f),drain,h);
    if(meets(r,{v3(-3.24f,1.75f,-1.46f),v3(-2.16f,2.92f,-.84f)},h.t)){
        cylinder(r,v3(-2.66f,1.77f,-1.22f),v3(-2.66f,2.61f,-1.22f),.037f,brass,h);
        cylinder(r,v3(-2.65f,2.52f,-1.39f),v3(-2.65f,2.52f,-1.325f),.194f,rail,h);
        frontDisc(r,v3(-2.65f,2.52f,-1.12f),.178f,brass,h);
        frontDisc(r,v3(-2.65f,2.52f,-1.116f),.157f,dial,h);
        float3 hub=v3(-3.03f,2.05f,-1.048f);
        cylinder(r,hub-v3(0,0,.22f),hub+v3(0,0,.018f),.046f,brass,h);
        for(int i=0;i<12;i++){
            float a=2*pi*i/12, b=2*pi*(i+1)/12;
            float3 pa=hub+.173f*v3(cosf(a),sinf(a),0),pb=hub+.173f*v3(cosf(b),sinf(b),0);
            cylinder(r,pa,pb,.021f,wheel,h);
            if(i%4==0)cylinder(r,hub,pa,.013f,wheel,h);
        }
    }
    return h;
}
__device__ float noise(float x,float y){
    int i=(int)floorf(x),j=(int)floorf(y); float a=fract(x),b=fract(y);
    a=a*a*(3-2*a);b=b*b*(3-2*b);unsigned n=unsigned(i)*0x83da1033u+unsigned(j)*0x2a20cf7bu;
    return mix(mix(hash(n),hash(n+0x83da1033u),a),mix(hash(n+0x2a20cf7bu),hash(n+0xadfadfaeu),a),b);
}
__device__ float terrain(float x,float y){
    return .57f*noise(x,y)+.28f*noise(2.13f*x+11,2.13f*y)+.15f*noise(5.4f*x,5.4f*y-8);
}
__device__ float segmentDistance(float x,float y,float ax,float ay,float bx,float by){
    float dx=bx-ax,dy=by-ay, s=fw::saturate(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));
    return hypotf(x-ax-s*dx,y-ay-s*dy);
}
__device__ float number09(float x,float y){
    // Weathered industrial stencil, in local glyph coordinates.
    float d0=fabsf(powf(powf(fabsf((x-.43f)/.34f),3.5f)+powf(fabsf((y-.52f)/.40f),3.5f),1.f/3.5f)-1.f)*.34f;
    float xx=x-1.04f;
    float ring=fabsf(hypotf((xx-.34f)/.27f,(y-.69f)/.23f)-1.f)*.24f;
    float tail=segmentDistance(xx,y,.59f,.70f,.45f,.27f);
    tail=fminf(tail,segmentDistance(xx,y,.45f,.27f,.23f,.13f));
    float glyph=1-smoothstep(.052f,.068f,fminf(d0,fminf(ring,tail)));
    return glyph*smoothstep(.014f,.027f,fabsf(y-.55f));
}
} // namespace sluice

extern "C" __global__ void prepareCreature(float time,float control){
    using namespace sluice;
    int i=threadIdx.x;
    if(i<worms)makeStrand(i,time,control);
    __syncthreads();
    if(i==0){Bounds all=emptyBounds();for(int w=0;w<worms;w++)all=merge(all,whole[w]);colony=all;}
}

namespace sluice {
struct Material {float3 base,n,emission; float shine,gloss,wet;};
struct ConcreteSample {float albedo,rough,nx,ny;};
__device__ ConcreteSample scan(float u,float v){
    float x=512.f*fract(u),y=512.f*fract(-v);
    int i=(int)x,j=(int)y;
    float fx=fract(x),fy=fract(y),w[4]={(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy};
    float result[4]={0,0,0,0};
    for(int k=0;k<4;k++){
        uchar4 p=sluiceConcrete[((j+(k>>1))&511)*512+((i+(k&1))&511)];
        result[0]+=w[k]*p.x;result[1]+=w[k]*p.y;result[2]+=w[k]*p.z;result[3]+=w[k]*p.w;
    }
    return {result[0]/93.f,result[1]/255.f,result[2]/127.5f-1.f,result[3]/127.5f-1.f};
}
__device__ Material surface(Hit h,float3 p,int features,float gate){
    bool detail=features&4;
    float ax=fabsf(h.n.x),az=fabsf(h.n.z);
    float u=ax>.65f?p.z:p.x, v=ax>.65f||az>.65f?p.y:p.z;
    float grain=detail?terrain(u*3.2f,v*3.2f):.5f;
    float micro=detail?noise(u*121.f,v*121.f):.5f;
    float streak=detail?terrain(8.f*u,.65f*v):.5f;
    float3 base=v3(.13f,.17f,.17f),n=h.n,emission=v3(0.f);
    float shine=.18f,gloss=45.f,wet=0.f;
    if(h.mat==flesh){
        int worm=h.id/segments,section=h.id%segments;
        float tint=hash(6327u+worm*19u);
        float3 skin=mix(v3(.12f,.030f,.039f),v3(.38f,.132f,.087f),hash(734u+worm*31u));
        if(tint>.80f)skin=mix(skin,v3(.52f,.29f,.19f),.61f);
        if(tint<.24f)skin=mix(skin,v3(.095f,.077f,.092f),.65f);
        float ringFreq=13.f+8.f*hash(worm+612u);
        float phase=2*pi*h.arc*ringFreq+.60f*sinf(3*p.x+4*p.z)+.29f*sinf(23.f*h.arc+worm*.4f);
        float band=detail?(.5f+.5f*cosf(phase)):1.f;
        float collar=expf(-powf((h.arc-(.55f+.52f*tint))/.13f,4.f));
        float groove=(1.f-band)*(1.f-band)*(1.f-.88f*collar);
        float3 axis=links[worm][section].axis;
        if(detail)n=normalize(n-.143f*sinf(phase)*(1.f-collar)*(axis-n*dot(n,axis)));
        float stripe=detail?expf(-6.f*fabsf(n.y-.72f-.12f*sinf(1.1f*h.arc+worm))):0.f;
        base=skin*(1.f-.26f*groove)*(1.f-.19f*stripe)*(.87f+.23f*grain);
        base=mix(base,v3(.43f,.183f,.134f),.34f*collar);
        float mottled=detail?terrain(12.f*h.arc+worm,n.y*5.f+n.x*2.f):.5f;
        base=base*(.75f+.52f*mottled);
        shine=features&1?.31f:.055f;gloss=features&1?48.f+24.f*mottled:24.f;
        int arm=worm-shells-feeders;
        if((arm==5||arm==9||arm==12)&&section==segments-1){
            // Project local folds onto the end cap. Its axis stays attached to the moving head.
            float frontal=dot(h.n,axis);
            if(frontal>.36f){
                float3 tangent=normalize(cross(axis,v3(0,1,0)));
                float theta=atan2f(dot(h.n,cross(axis,tangent)),dot(h.n,tangent));
                float ring=sqrtf(fmaxf(0.f,1-frontal*frontal));
                float rim=expf(-powf((ring-.77f)/.100f,2.f));
                float papilla=powf(fmaxf(0.f,cosf(13.f*theta+.5f*sinf(3.f*theta))),3.f);
                float inner=(1-smoothstep(.57f,.75f,ring));
                float teeth=smoothstep(.26f,.56f,ring)*papilla*inner;
                base=mix(base,v3(.013f,.004f,.009f),inner)+v3(.29f,.109f,.079f)*rim;
                base=mix(base,v3(.50f,.326f,.235f),teeth*.78f);
                shine*=1.f-.77f*inner;
            }
        }
    }else if(h.mat==floorMat){
        float x=p.x+.041f*p.z, z=p.z;
        float a=fminf(fract(x/1.23f),1-fract(x/1.23f))*1.23f;
        float b=fminf(fract(z/1.88f),1-fract(z/1.88f))*1.88f;
        float seams=detail?1.f-smoothstep(.003f,.010f,fminf(a,b)):0;
        ConcreteSample tile=detail?scan(.45f*x,.45f*z):ConcreteSample{1.f,.75f,0,0};
        float damp=detail?smoothstep(.30f,.62f,.70f*terrain(.66f*x,.76f*z)+.30f*(1.35f-tile.rough)):.55f;
        wet=(features&1)?damp:0;
        base=mix(v3(.084f,.084f,.076f),v3(.044f,.056f,.058f),damp)
              *(.61f+.67f*grain)*clamp(.27f+.69f*tile.albedo,.4f,1.75f)*(1-.74f*seams);
        // Scuffed ochre exclusion stripe painted on the slab outside the hatch.
        float line=1.f-smoothstep(.021f,.033f,fabsf(fabsf(x)-2.18f));
        base=mix(base,v3(.33f,.215f,.064f),detail?line*smoothstep(.21f,.63f,grain)*.75f:0);
        if(detail){
            float sx=noise(x*22.f,z*3.7f)*2-1,sz=noise(x*2.1f,z*17.f)*2-1;
            n=normalize(n+v3(sx*.022f,0,sz*.017f)+v3(tile.nx,0,tile.ny)*(.31f-.19f*wet));
        }
        shine=.19f+.45f*wet;gloss=25.f+90.f*wet;
    }else if(h.mat==concrete){
        float seam=fminf(fminf(fract((u+.3f)/1.50f),1-fract((u+.3f)/1.50f))*1.50f,
                        fminf(fract((v+.17f)/1.30f),1-fract((v+.17f)/1.30f))*1.30f);
        float joint=detail?1-smoothstep(.006f,.015f,seam):0;
        ConcreteSample tile=detail?scan(u*.49f,v*.49f):ConcreteSample{1.f,.75f,0,0};
        base=mix(v3(.098f,.139f,.127f),v3(.183f,.175f,.134f),streak)*(.68f+.46f*grain)*
             clamp(.15f+.83f*tile.albedo,.32f,2.f)*(1-.57f*joint);
        float darkBand=1-smoothstep(.017f,.047f,fabsf(v-.60f)-.097f);
        base=mix(base,v3(.16f,.107f,.063f),.70f*darkBand);
        if(detail)n=normalize(n+.68f*(ax>.65f?v3(0,tile.ny,tile.nx):v3(tile.nx,tile.ny,0)));
        shine=.16f*(1.07f-.55f*tile.rough);
    }else if(h.mat==shutter){
        // Each corrugated slat throws a lip into the highlight; grime and lettering move with the door.
        v-=gate-.885f;
        float ripple=fract(6.8f*v);
        float bevel=expf(-powf((ripple-.80f)/.12f,2.f))-expf(-powf((ripple-.1f)/.10f,2.f));
        n=normalize(n+v3(0,(detail?.36f:0)*bevel,0));
        base=mix(v3(.107f,.145f,.142f),v3(.187f,.185f,.136f),grain);
        base=base*(.69f+.41f*streak)*(.77f+.26f*smoothstep(.02f,.24f,ripple));
        float stencil=number09((u+.96f)/.90f,(v-1.29f)/.80f);
        base=mix(base,v3(.54f,.51f,.37f),detail?stencil*smoothstep(.12f,.51f,grain)*.86f:0);
        if(detail){
            // Bolt rows along the door edges and a second oxidized line at each lap joint.
            float bx=fabsf(fabsf(u)-1.62f),by=fabsf(fract(v*2.05f+.23f)-.50f)/2.05f;
            float fastener=hypotf(bx,by);
            base=mix(base,v3(.045f,.058f,.056f),1-smoothstep(.021f,.028f,fastener));
            base=mix(base,v3(.19f,.21f,.184f),1-smoothstep(.011f,.018f,fastener));
        }
        shine=.17f;
    }else if(h.mat==stripe){
        float mark=smoothstep(.47f,.50f,fract((u-1.15f*v)*3.2f));
        base=mix(v3(.036f,.039f,.036f),v3(.57f,.36f,.068f),mark)*(.60f+.65f*grain);
        shine=.20f;
    }else if(h.mat==signMat){
        base=v3(.082f,.119f,.113f);
        float symbol=number09((u-2.52f)*2.23f,(v-3.02f)*1.62f);
        base=mix(base,v3(.67f,.68f,.44f),symbol);
    }else if(h.mat==pipe||h.mat==brass||h.mat==rail){
        float rust=detail?smoothstep(.55f,.78f,.35f*streak+.65f*grain):0;
        base=h.mat==brass?v3(.40f,.23f,.088f):h.mat==pipe?v3(.128f,.174f,.169f):v3(.105f,.14f,.14f);
        base=mix(base,v3(.24f,.086f,.033f),rust)*(.78f+.44f*micro);
        shine=h.mat==pipe?.49f:.32f;gloss=62;
    }else if(h.mat==drain){
        float edge=fminf(fabsf(u+2.47f),fabsf(u+2.06f));
        float grate=(1-smoothstep(.34f,.44f,fabsf(fract(v*14.0f)-.5f)))*smoothstep(.032f,.043f,edge);
        base=mix(v3(.139f,.151f,.14f),v3(.009f,.014f,.015f),grate)*(.65f+.57f*grain);
        shine=.41f*(1.f-.93f*grate);
    }else if(h.mat==wheel){
        base=mix(v3(.27f,.061f,.035f),v3(.107f,.065f,.043f),grain);shine=.31f;
    }else if(h.mat==dial){
        float x=p.x+2.65f,y=p.y-2.52f,rad=hypotf(x,y);
        float angle=atan2f(y,x),ticks=smoothstep(.91f,.99f,cosf(angle*30))*smoothstep(.120f,.14f,rad);
        float needle=1-smoothstep(.0025f,.007f,segmentDistance(x,y,0,0,-.079f,.089f));
        base=mix(v3(.49f,.53f,.47f),v3(.035f,.045f,.043f),fmaxf(ticks,needle));shine=.25f;
    }else if(h.mat==grille){
        float slot=detail?smoothstep(.17f,.26f,fract(v*13.4f))*(1-smoothstep(.67f,.77f,fract(v*13.4f))):.30f;
        base=v3(.092f,.13f,.12f)*(1-.87f*slot)*(.65f+.72f*grain);
        shine=.13f;
    }else if(h.mat==lampAmber){base=v3(.62f,.22f,.044f);emission=v3(4.3f,1.12f,.17f);shine=.08f;
    }else if(h.mat==lampCold){base=v3(.4f,.60f,.63f);emission=v3(1.9f,4.8f,5.2f);shine=.08f;
    }else{base=v3(.041f,.053f,.053f)*(.7f+.4f*grain);shine=.14f;}
    return {base,n,emission,shine,gloss,wet};
}
__device__ bool occluded(float3 p,float3 dir,float distance,int mode,float gate){
    Ray s=ray(p,dir); Hit h={distance,v3(0),air,0,0};
    box(s,v3(-1.84f,gate,-1.54f),v3(1.84f,3.02f,-1.30f),shutter,h);
    if(h.mat!=air)return true;
    int unused=0;traceStrands(s,h,mode,unused,true);return h.mat==flesh;
}
__device__ float3 illuminate(Ray r,Hit h,Material m,float time,int mode,int features,float gate,bool shadowPass){
    float3 p=r.o+r.d*h.t,eye=-r.d;
    float floorAO=.57f+.43f*fw::saturate(p.y*1.34f);
    if(h.mat==floorMat)floorAO=1.f-.56f*expf(-.7f*p.x*p.x-.57f*(p.z-.02f)*(p.z-.02f));
    float hemi=fw::saturate(m.n.y*.5f+.5f);
    float3 light=m.emission+m.base*mix(v3(.021f,.030f,.036f),v3(.13f,.146f,.159f),hemi)*floorAO;
    for(int i=0;i<3;i++){
        float3 pos=i==0?v3(-2.67f,1.77f,-.62f):i==1?v3(2.46f,2.52f,-.68f):v3(-1.10f,3.65f,3.3f);
        float3 tint=i==0?v3(9.5f,3.10f,.83f):i==1?v3(1.22f,4.9f,6.25f):v3(2.37f,2.58f,2.96f);
        float3 delta=pos-p;float d2=dot(delta,delta),d=sqrtf(d2);float3 l=delta/d;
        float nl=dot(m.n,l), diffuse=fmaxf(0.f,nl);
        // A forward-scattering wrap gives the thin skin a restrained amber terminator.
        if(h.mat==flesh)diffuse=.86f*diffuse+.14f*fw::saturate((nl+.49f)/1.49f);
        if(diffuse<=.0001f)continue;
        float vis=1.f;
        if((features&2)&&shadowPass&&i!=2 && h.mat!=lampAmber&&h.mat!=lampCold){
            if(occluded(p+h.n*.006f,l,d-.02f,mode,gate))vis=.13f;
        }
        float3 halfVec=normalize(l+eye);
        float spec=powf(fw::saturate(dot(m.n,halfVec)),m.gloss);
        float fres=.28f+.72f*powf(1.f-fw::saturate(dot(halfVec,eye)),5.f);
        float specular=m.shine*spec*(m.gloss*.18f+1.f)*fres;
        light=light+(m.base*diffuse+v3(specular))*tint*(vis/(.85f+.57f*d2));
    }
    if(h.mat==flesh&&(features&1)){
        float fres=powf(1.f-fw::saturate(dot(m.n,eye)),3.f);
        light=light+fres*v3(.032f,.052f,.064f)*(.35f+.65f*hemi);
    }
    return light;
}
__device__ float3 airlight(Ray r,float maxT,float3 src,float span,float3 tint,float width){
    // Depth-tested screen-visible halo surrounding the physical strip light.
    float3 rel=src-r.o;
    float y=clamp((r.o.y+dot(rel,r.d)*r.d.y)-src.y,-span,span);
    float3 to=rel+v3(0,y,0);float t=dot(to,r.d);
    if(t<=0 || t>maxT+.05f)return v3(0);
    float3 off=to-t*r.d; float d=length(off);
    return tint*(.07f*expf(-d/width)+.30f*expf(-d/(width*.20f)));
}
__device__ Ray cameraRay(float u,float v,float aspect,float yaw,float pitch){
    float angle=.32f+yaw, elevation=.245f+pitch;
    float3 target=v3(-.05f,.73f,.12f);
    float3 eye=target+6.05f*v3(sinf(angle)*cosf(elevation),sinf(elevation),cosf(angle)*cosf(elevation));
    // Keep the orbit inside the room when the viewer drags to its extremes.
    eye.x=clamp(eye.x,-4.09f,4.48f);eye.y=clamp(eye.y,.24f,4.24f);
    float3 forward=normalize(target-eye),right=normalize(cross(forward,v3(0,1,0))),up=cross(right,forward);
    return ray(eye,normalize(forward+(.365f*u*aspect)*right+(.365f*v)*up));
}
__device__ float3 draw(float u,float v,float aspect,float time,float yaw,float pitch,float control,int features,int mode,int view){
    float gate=opening(control);
    Ray r=cameraRay(u,v,aspect,yaw,pitch);
    Hit h=room(r,gate); int tested=0;traceStrands(r,h,mode,tested);
    if(view==1)return h.n*.5f+v3(.5f);
    if(view==2){
        float work=fw::saturate(log2f(1.f+tested)/log2f(1.f+worms*segments));
        return mix(mix(v3(.018f,.036f,.052f),v3(.08f,.64f,.67f),fw::saturate(work*1.9f)),
                   v3(1.f,.39f,.09f),smoothstep(.38f,.90f,work));
    }
    float3 p=r.o+r.d*h.t;
    Material m=surface(h,p,features,gate);
    float3 rgb=illuminate(r,h,m,time,mode,features,gate,true);
    if(h.mat==floorMat&&m.wet>.01f){
        Ray mirror=ray(p+h.n*.008f,reflect(r.d,m.n));
        Hit rh=room(mirror,gate);int secondary=0;traceStrands(mirror,rh,mode,secondary);
        Material rm=surface(rh,mirror.o+rh.t*mirror.d,features,gate);
        float3 reflection=illuminate(mirror,rh,rm,time,mode,features,gate,false);
        float fres=.15f+.63f*powf(1.f-fw::saturate(dot(m.n,-r.d)),4.f);
        rgb=mix(rgb,reflection,m.wet*fres*.78f);
    }
    float haze=1.f-expf(-.019f*fminf(h.t,30.f));
    rgb=mix(rgb,v3(.07f,.088f,.092f),haze);
    rgb=rgb+airlight(r,h.t,v3(-2.79f,1.27f,-1.065f),.45f,v3(1.8f,.39f,.058f),.27f)
           +airlight(r,h.t,v3(2.575f,1.59f,-1.145f),1.08f,v3(.17f,.84f,.99f),.17f);
    return rgb*(1.f-.13f*fw::saturate(.54f*u*u+.62f*v*v));
}
} // namespace sluice

__device__ float3 creatureScene(float u,float v,float aspect,float time,float yaw,float pitch,float control,int features,int mode,int view){
    return sluice::draw(u,v,aspect,time,yaw,pitch,control,features,mode,view);
}

// One pixel-centre primary ray in each lane. Both sides of this diagnostic use the same
// camera and geometry as the visible image. This pass is separate from the timed renderer.
extern "C" __global__ void creatureTraversalCounts(uint4 *out,int w,int h,float yaw,float pitch,float control){
    using namespace sluice;
    int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;
    if(x>=w||y>=h)return;
    Ray r=cameraRay(2.f*(x+.5f)/w-1.f,1.f-2.f*(y+.5f)/h,float(w)/h,yaw,pitch);
    Hit roomHit=room(r,opening(control)),reference=roomHit;
    unsigned counts[3],flags=0;
    for(int mode=0;mode<3;mode++){
        Hit h=roomHit;int tested=0;traceStrands(r,h,mode,tested);
        counts[mode]=tested;
        if(mode==0){reference=h;flags=h.mat==flesh?4u:0u;}
        else if(h.mat!=reference.mat||h.id!=reference.id||h.t!=reference.t||h.arc!=reference.arc||
                h.n.x!=reference.n.x||h.n.y!=reference.n.y||h.n.z!=reference.n.z) flags|=1u<<(mode-1);
    }
    out[y*w+x]={counts[0],counts[1],counts[2],flags};
}
