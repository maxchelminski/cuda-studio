// RAIN TERMINAL 04. Metres, Y up, station tracks parallel to Z.
// Scene 1 / station walkthrough. Edit studentVisitBay(), reload and compare.
namespace terminal {
using namespace fw;

enum Material { SKY, PAVING, TRACK, WALL, GIRDER, PAINT, CONCRETE, COPPER, LAMP,
                SIGN, TRAIN, GLASS, PLACARD, SEAT, RAIL, CITY, TUBE, CLOCK,
                JACKET, TROUSER, SKIN, LUGGAGE, SIGNAL };
struct Ray { float3 o, d, inv; };
struct Hit { float t; float3 n; int id, bay, visits; };
struct Surface { float3 color, glow; float gloss, shine; };

__device__ float sm(float a, float b, float x) { return smoothstep(a,b,x); }
__device__ float band(float a, float b, float x, float edge=.012f) {
    return sm(a-edge,a+edge,x)*(1.f-sm(b-edge,b+edge,x));
}
__device__ float hash2(int x,int y) {
    unsigned int n=(unsigned int)x*0x165667b1u^(unsigned int)y*0x9e3779b9u;
    n^=n>>15; n*=0x85ebca6bu; n^=n>>13;
    return (n&0x00ffffffu)*(1.f/16777216.f);
}
__device__ float noise2(float x,float y) {
    int i=(int)floorf(x), j=(int)floorf(y);
    float u=fract(x),v=fract(y); u=u*u*(3-2*u);v=v*v*(3-2*v);
    return mix(mix(hash2(i,j),hash2(i+1,j),u),mix(hash2(i,j+1),hash2(i+1,j+1),u),v);
}
__device__ Ray ray(float3 o,float3 d) {
    // Finite reciprocals also allow rays parallel to a slab boundary.
    return {o,d,v3(1.f/copysignf(fmaxf(fabsf(d.x),1e-12f),d.x),
                   1.f/copysignf(fmaxf(fabsf(d.y),1e-12f),d.y),
                   1.f/copysignf(fmaxf(fabsf(d.z),1e-12f),d.z))};
}
__device__ float max3(float3 p) {return fmaxf(p.x,fmaxf(p.y,p.z));}
__device__ float min3(float3 p) {return fminf(p.x,fminf(p.y,p.z));}
__device__ float3 absv(float3 a) {return v3(fabsf(a.x),fabsf(a.y),fabsf(a.z));}
__device__ float3 positive(float3 a){return v3(fmaxf(a.x,0.f),fmaxf(a.y,0.f),fmaxf(a.z,0.f));}
__device__ bool interval(Ray r,float3 a,float3 b,float &lo,float &hi) {
    float3 p=(a-r.o)*r.inv,q=(b-r.o)*r.inv;
    lo=fmaxf(fminf(p.x,q.x),fmaxf(fminf(p.y,q.y),fminf(p.z,q.z)));
    hi=fminf(fmaxf(p.x,q.x),fminf(fmaxf(p.y,q.y),fmaxf(p.z,q.z)));
    return hi>=fmaxf(lo,.001f);
}
__device__ void block(Ray r,Hit &h,float3 a,float3 b,int id,int bay=-1) {
    float t,t1;
    if(!interval(r,a,b,t,t1)||t<=.001f||t>=h.t) return;
    float3 p=(r.o+r.d*t)-(a+b)*.5f, edge=absv(p)-(b-a)*.5f;
    float m=max3(edge);
    h.n=m==edge.x?v3(copysignf(1.f,p.x),0,0):m==edge.y?v3(0,copysignf(1.f,p.y),0):v3(0,0,copysignf(1.f,p.z));
    h.t=t;h.id=id;h.bay=bay;
}
__device__ void beam(Ray r,Hit &h,float3 a,float3 b,float radius,int id,int bay=-1) {
    // Finite round structural member. Butt ends are covered by the brackets.
    float3 v=b-a,oa=r.o-a;float vv=dot(v,v),vd=dot(v,r.d),vo=dot(v,oa);
    float aa=vv-vd*vd,bb=vv*dot(r.d,oa)-vo*vd,cc=vv*(dot(oa,oa)-radius*radius)-vo*vo;
    float disc=bb*bb-aa*cc;
    if(disc<0||aa<1e-7f) return;
    float t=(-bb-sqrtf(disc))/aa;
    if(t<=.001f||t>=h.t) return;
    float y=vo+t*vd;
    if(y<0||y>vv) return;
    h.t=t;h.id=id;h.bay=bay;h.n=normalize(oa+r.d*t-v*(y/vv));
}
__device__ void oval(Ray r,Hit &h,float3 centre,float3 scale,int id) {
    float3 o=(r.o-centre)/scale,d=r.d/scale;
    float aa=dot(d,d),bb=dot(o,d),cc=dot(o,o)-1.f,disc=bb*bb-aa*cc;
    if(disc<0)return;
    float t=(-bb-sqrtf(disc))/aa;
    if(t<=.001f||t>=h.t)return;
    h.t=t;h.id=id;h.bay=-1;h.n=normalize((o+d*t)/scale);
}
__device__ void passenger(Ray r,Hit &h,float x,float z) {
    float a,b;
    if(!interval(r,v3(x-.56f,0,z-.72f),v3(x+.44f,1.86f,z+.39f),a,b)||a>h.t+.002f)return;
    auto p=[=](float dx,float y,float dz){return v3(x+dx,y,z+dz);};
    beam(r,h,p(-.105f,.11f,-.13f),p(-.09f,.83f,.025f),.076f,TROUSER);
    beam(r,h,p(.105f,.11f,.12f),p(.095f,.83f,-.02f),.084f,TROUSER);
    oval(r,h,p(-.12f,.08f,-.09f),v3(.098f,.079f,.17f),TROUSER);
    oval(r,h,p(.11f,.083f,.16f),v3(.098f,.081f,.17f),TROUSER);
    oval(r,h,p(0,1.04f,0),v3(.225f,.48f,.175f),JACKET);
    oval(r,h,p(0,1.36f,0),v3(.258f,.234f,.173f),JACKET);
    oval(r,h,p(-.025f,1.64f,0),v3(.135f,.171f,.142f),SKIN);
    oval(r,h,p(-.013f,1.72f,-.017f),v3(.143f,.128f,.149f),TROUSER);
    beam(r,h,p(.225f,1.39f,0),p(.28f,1.13f,-.045f),.086f,JACKET);
    beam(r,h,p(.28f,1.13f,-.045f),p(.28f,.93f,-.15f),.069f,JACKET);
    oval(r,h,p(.28f,.91f,-.16f),v3(.062f,.073f,.061f),SKIN);
    beam(r,h,p(-.19f,1.42f,0),p(-.285f,1.12f,.04f),.082f,JACKET);
    beam(r,h,p(-.285f,1.12f,.04f),p(-.22f,.86f,-.10f),.068f,JACKET);
    block(r,h,p(.17f,.07f,-.65f),p(.40f,.59f,-.33f),LUGGAGE);
    beam(r,h,p(.235f,.55f,-.46f),p(.235f,.87f,-.19f),.014f,RAIL);
    beam(r,h,p(.336f,.55f,-.46f),p(.336f,.87f,-.19f),.014f,RAIL);
    beam(r,h,p(.23f,.87f,-.19f),p(.34f,.87f,-.19f),.023f,TROUSER);
}
__device__ float trainPosition(float time) {
    // A slow arrival and departure. The rounded cab carries its two headlights.
    return 4.9f+4.5f*(1.f-cosf(time*.35f));
}
__device__ float trainDistance(float3 p,float front) {
    float z=p.z-front;
    float taper=.29f*(1.f-sm(.0f,2.25f,z));
    float3 q=absv(v3(p.x+3.02f,p.y-1.34f,z-16.f))-v3(1.36f-taper,1.19f,15.62f);
    float shell=length(positive(q))+fminf(max3(q),0.f)-.34f;
    float wind=(.49f*(p.y-1.42f)-z+.145f)*.895f;
    float jaw=(.33f*(.75f-p.y)-z+.035f)*.94f;
    return fmaxf(shell,fmaxf(wind,jaw));
}
__device__ void rollingStock(Ray r,Hit &h,float front) {
    float near,far;
    if(!interval(r,v3(-4.74f,-.22f,front-.12f),v3(-1.29f,2.9f,front+32.05f),near,far))return;
    float t=fmaxf(.002f,near);far=fminf(far,h.t);
    for(int i=0;i<72 && t<far;i++) {
        float3 p=r.o+r.d*t;float d=trainDistance(p,front);
        if(d<.0011f) {
            float e=.0015f;
            h.n=normalize(v3(trainDistance(p+v3(e,0,0),front)-trainDistance(p-v3(e,0,0),front),
                             trainDistance(p+v3(0,e,0),front)-trainDistance(p-v3(0,e,0),front),
                             trainDistance(p+v3(0,0,e),front)-trainDistance(p-v3(0,0,e),front)));
            h.t=t;h.id=TRAIN;h.bay=-1;return;
        }
        t+=d*.88f;
    }
}
__device__ bool bayIntersects(Ray r,float z,float maximum) {
    float a,b;
    // Each station bay contains its canopy, signs, seat, posts and luminaires.
    return interval(r,v3(-7.f,-.1f,z-.60f),v3(7.7f,5.55f,z+5.60f),a,b) && a<=maximum+.002f;
}
__device__ bool studentVisitBay(Ray r,float z,float closest) {
    // Start with the reference. Exercise: use the conservative bay bounds.
    return true;
}
__device__ void stationBay(Ray r,Hit &h,int i,float z) {
    const float bottom=4.78f, top=5.08f;
    // I-beams, their lower flanges and a bolted base, cast real shadows.
    block(r,h,v3(-6.8f,bottom,z-.095f),v3(7.6f,top,z+.095f),GIRDER,i);
    block(r,h,v3(-6.83f,bottom-.055f,z-.16f),v3(7.60f,bottom,z+.16f),PAINT,i);
    block(r,h,v3(5.86f,0,z-.22f),v3(6.38f,.23f,z+.22f),CONCRETE,i);
    block(r,h,v3(6.04f,.22f,z-.11f),v3(6.19f,4.80f,z+.11f),GIRDER,i);
    block(r,h,v3(5.93f,.22f,z-.15f),v3(6.29f,4.80f,z-.09f),PAINT,i);
    block(r,h,v3(5.93f,.22f,z+.09f),v3(6.29f,4.80f,z+.15f),PAINT,i);
    beam(r,h,v3(6.11f,3.31f,z),v3(4.12f,4.78f,z),.091f,GIRDER,i);
    beam(r,h,v3(-6.42f,.04f,z),v3(-6.42f,4.8f,z),.14f,GIRDER,i);
    beam(r,h,v3(-6.42f,3.38f,z),v3(-4.60f,4.79f,z),.079f,GIRDER,i);
    // Pairs of varying fluorescent tracks, plus the enclosed amber wall lamps.
    block(r,h,v3(.17f,4.55f,z+.35f),v3(.64f,4.67f,z+4.65f),GIRDER,i);
    block(r,h,v3(.23f,4.52f,z+.47f),v3(.33f,4.558f,z+4.53f),TUBE,i);
    block(r,h,v3(.46f,4.52f,z+.47f),v3(.56f,4.558f,z+4.53f),TUBE,i);
    block(r,h,v3(6.64f,2.61f,z+.76f),v3(7.24f,2.92f,z+1.04f),COPPER,i);
    block(r,h,v3(6.59f,2.48f,z+.79f),v3(6.90f,2.65f,z+1.01f),LAMP,i);
    if(i%3==1) {
        // Board is physically suspended; the printed faces are shaded from local coordinates.
        float s=z+1.32f;
        block(r,h,v3(.42f,3.06f,s-.11f),v3(3.87f,3.97f,s+.11f),SIGN,i);
        beam(r,h,v3(.65f,3.97f,s),v3(.65f,5.18f,s),.026f,COPPER,i);
        beam(r,h,v3(3.62f,3.97f,s),v3(3.62f,5.18f,s),.026f,COPPER,i);
    }
    if(i%3!=0) {
        block(r,h,v3(5.41f,.48f,z+1.40f),v3(6.05f,.55f,z+3.57f),SEAT,i);
        block(r,h,v3(5.99f,.60f,z+1.40f),v3(6.06f,1.02f,z+3.57f),SEAT,i);
        for(int k=0;k<2;k++){float s=z+1.64f+1.69f*k;
            block(r,h,v3(5.59f,0,s),v3(5.91f,.50f,s+.07f),GIRDER,i);}
    }
    if(i%3==2) {
        block(r,h,v3(7.12f,.89f,z+1.24f),v3(7.24f,2.44f,z+3.05f),PLACARD,i);
    }
    // A thin cable tray with iron hangers under the outboard side of the roof.
    beam(r,h,v3(-4.97f,4.27f,z+.04f),v3(-4.97f,4.27f,z+5.04f),.045f,COPPER,i);
    beam(r,h,v3(-5.19f,4.37f,z+.04f),v3(-5.19f,4.37f,z+5.04f),.028f,GIRDER,i);
    beam(r,h,v3(-4.97f,4.25f,z+.46f),v3(-4.97f,5.18f,z+.46f),.027f,GIRDER,i);
    beam(r,h,v3(5.43f,4.17f,z+.06f),v3(5.43f,4.17f,z+5.06f),.070f,GIRDER,i);
}
__device__ Hit trace(Ray r,float front,int mode,float limit=112.f) {
    Hit h={limit,v3(0.f),SKY,-1,0};
    // Track-bed is lower than the terrazzo platform. Face and top share one box.
    block(r,h,v3(-.72f,-.67f,-12.f),v3(7.6f,0,55.f),PAVING);
    block(r,h,v3(-7.8f,-.74f,-12.f),v3(-.72f,-.55f,55.f),TRACK);
    block(r,h,v3(-6.82f,5.17f,-5.5f),v3(7.6f,5.35f,53.05f),CONCRETE);
    block(r,h,v3(7.22f,-.02f,-8.f),v3(7.53f,4.83f,53.f),WALL);
    block(r,h,v3(7.05f,.13f,-8.f),v3(7.23f,.25f,53.f),GIRDER);
    // Track, conductor ducts and longitudinal canopy ribs remain visible between bays.
    for(int i=0;i<2;i++) {
        float x=-3.76f+1.47f*i;
        block(r,h,v3(x-.07f,-.56f,-12.f),v3(x+.07f,-.29f,55.f),RAIL);
        block(r,h,v3(x-.11f,-.32f,-12.f),v3(x+.11f,-.26f,55.f),RAIL);
    }
    for(int i=0;i<4;i++) {
        float x=-5.78f+3.65f*i;
        block(r,h,v3(x-.082f,4.94f,-5.5f),v3(x+.082f,5.18f,53.f),PAINT);
    }
    rollingStock(r,h,front);
    // The buffer, coupler and lower frame break up the outline below the cab.
    block(r,h,v3(-3.80f,-.15f,front-.16f),v3(-2.23f,.23f,front+.50f),GIRDER);
    block(r,h,v3(-3.17f,-.13f,front-.40f),v3(-2.86f,.08f,front-.08f),COPPER);
    if(r.o.y<4.8f || r.d.y<0) {
        for(int bogie=0;bogie<3;bogie++){
            float z=front+2.1f+bogie*8.6f;
            block(r,h,v3(-4.20f,-.19f,z-.55f),v3(-1.66f,.19f,z+1.02f),GIRDER);
            oval(r,h,v3(-1.96f,-.135f,z-.28f),v3(.19f,.29f,.29f),TROUSER);
            oval(r,h,v3(-1.96f,-.135f,z+.69f),v3(.19f,.29f,.29f),TROUSER);
        }
    }
    passenger(r,h,2.79f,8.92f);
    passenger(r,h,4.37f,27.6f);
    beam(r,h,v3(-5.34f,-.55f,5.95f),v3(-5.34f,2.18f,5.95f),.060f,GIRDER);
    block(r,h,v3(-5.55f,1.78f,5.80f),v3(-5.13f,2.54f,6.12f),GIRDER);
    oval(r,h,v3(-5.34f,2.34f,5.80f),v3(.119f,.119f,.04f),SIGNAL);
    block(r,h,v3(7.04f,.90f,3.25f),v3(7.23f,2.84f,5.91f),PLACARD,-2);
    for(int i=0;i<11;i++) {
        float z=-3.f+5.f*i;
        if(mode==1&&!bayIntersects(r,z,h.t)) continue;
        if(mode==2&&!studentVisitBay(r,z,h.t)) continue;
        h.visits++;
        stationBay(r,h,i,z);
    }
    return h;
}

// Original small-station lettering. Each decimal digit below packs a three-bit row.
__device__ int glyph(char c) {
    switch(c) {
    case 'A':return 27555;case 'B':return 65656;case 'C':return 34443;case 'D':return 65556;
    case 'E':return 74647;case 'F':return 74644;case 'G':return 34553;case 'H':return 55755;
    case 'I':return 72227;case 'J':return 11152;case 'K':return 55655;case 'L':return 44447;
    case 'M':return 57755;case 'N':return 57775;case 'O':return 25552;case 'P':return 65644;
    case 'Q':return 25573;case 'R':return 65655;case 'S':return 34216;case 'T':return 72222;
    case 'U':return 55557;case 'V':return 55552;case 'W':return 55775;case 'X':return 55255;
    case 'Y':return 55222;case 'Z':return 71247;case '0':return 75557;case '1':return 26227;
    case '2':return 71247;case '3':return 71317;case '4':return 55711;case '5':return 74617;
    case '6':return 34757;case '7':return 71122;case '8':return 75757;case '9':return 75713;
    default:return 0;}
}
__device__ float lettering(float x,float y,float pixel,const char *words,int count) {
    float px=x/pixel, py=y/pixel;int cx=(int)floorf(px*.25f), row=(int)floorf(py);
    if(cx<0||cx>=count||row<0||row>=5) return 0;
    int col=(int)floorf(px)-4*cx;
    if(col>=3) return 0;
    int divisor=row==0?10000:row==1?1000:row==2?100:row==3?10:1;
    return (((glyph(words[cx])/divisor)%10)>>(2-col))&1;
}
__device__ unsigned displayRow(char c,int row) {
    // Five-diode characters on the destination board. Store seven rows per letter.
    const unsigned long long n=(17ull<<30)|(25ull<<25)|(25ull<<20)|(21ull<<15)|(19ull<<10)|(19ull<<5)|17ull;
    const unsigned long long o=(14ull<<30)|(17ull<<25)|(17ull<<20)|(17ull<<15)|(17ull<<10)|(17ull<<5)|14ull;
    const unsigned long long rr=(30ull<<30)|(17ull<<25)|(17ull<<20)|(30ull<<15)|(20ull<<10)|(18ull<<5)|17ull;
    const unsigned long long t=(31ull<<30)|(4ull<<25)|(4ull<<20)|(4ull<<15)|(4ull<<10)|(4ull<<5)|4ull;
    const unsigned long long h=(17ull<<30)|(17ull<<25)|(17ull<<20)|(31ull<<15)|(17ull<<10)|(17ull<<5)|17ull;
    const unsigned long long l=(16ull<<30)|(16ull<<25)|(16ull<<20)|(16ull<<15)|(16ull<<10)|(16ull<<5)|31ull;
    const unsigned long long p=(30ull<<30)|(17ull<<25)|(17ull<<20)|(30ull<<15)|(16ull<<10)|(16ull<<5)|16ull;
    unsigned long long glyph=c=='N'?n:c=='O'?o:c=='R'?rr:c=='T'?t:c=='H'?h:c=='L'?l:c=='P'?p:0ull;
    return (unsigned)((glyph>>(5*(6-row)))&31ull);
}
__device__ float destinationBoard(float x,float y) {
    float gx=x/.0398f,gy=y/.046f;
    int ch=(int)floorf(gx/6.f),row=(int)floorf(gy),col=(int)floorf(gx)-6*ch;
    if(ch<0||ch>=10||col>=5||row<0||row>6)return 0;
    return (displayRow("NORTH LOOP"[ch],row)>>(4-col))&1;
}
__device__ float3 atmosphere(float3 d) {
    float horizon=expf(-fabsf(d.y)*6.f);
    return mix(v3(.008f,.018f,.048f),v3(.079f,.154f,.241f),horizon);
}
__device__ float3 citySky(float3 p,float3 d) {
    float3 sky=atmosphere(d);
    // Distant procedural skyline on two planes, with floor-by-floor windows.
    for(int layer=0;layer<2;layer++){
        float horizon=layer==0?100.f:77.f;
        float t=d.z>.01f?(horizon-p.z)/d.z:1e5f;
        float side=d.x<-.01f?((-60.f+layer*13.f)-p.x)/d.x:1e5f;
        t=fminf(t,side);if(t<=0||t>600)continue;
        float3 hit=p+d*t;float along=t==side?hit.z:hit.x;
        float step=layer==0?8.4f:6.1f;
        int cell=(int)floorf(along/step);
        float height=3.f+hash2(cell,layer+70)*(layer==0?20.f:10.f);
        if(hit.y<height && fract(along/step)>.04f) {
            sky=layer==0?v3(.034f,.063f,.105f):v3(.017f,.037f,.063f);
            float window=band(.23f,.71f,fract(along*.86f),.04f)*band(.29f,.65f,fract(hit.y*.96f),.04f);
            float lit=hash2((int)floorf(along*.86f),(int)floorf(hit.y*.96f));
            if(lit>.77f)sky=sky+mix(v3(.056f,.19f,.29f),v3(.81f,.35f,.081f),lit)*window;
        }
    }
    return sky;
}
__device__ Surface material(Hit h,float3 p,float front,int features,float control) {
    bool detail=(features&4)!=0;float3 c=v3(.17f),e=v3(0);float k=.22f,s=.1f;
    float x=p.x,y=p.y,z=p.z;float grime=1;
    if(detail) grime=.80f+.26f*noise2(x*3.f+z*.48f,y*7.f+z*.19f)+.07f*noise2(x*44.f+y,z*25.f);
    if(h.id==PAVING) {
        float row=floorf(z/1.55f), ux=(x+.61f*fmodf(fabsf(row),2.f))/1.16f;
        float seam=band(.008f,.992f,fract(ux),.004f)*band(.009f,.991f,fract(z/1.55f),.004f);
        c=mix(v3(.050f,.063f,.075f),v3(.16f,.17f,.175f),hash2((int)floorf(ux),(int)row));
        if(detail)c=c*(.68f+.37f*seam)*(.79f+.37f*noise2(x*34,z*34));
        if(x<-.12f&&x>-.58f) {
            c=v3(.89f,.48f,.065f)*(.75f+.25f*seam);
            if(detail)c=c*(.72f+.40f*band(.2f,.73f,fract(x*12.f),.07f)*band(.15f,.74f,fract(z*10.f),.07f));
        }
        if(x>-.055f && x<-.020f)c=v3(.64f,.57f,.35f);
        if(x>3.82f&&x<4.035f&&detail){
            float openings=band(.22f,.78f,fract(z*16.f),.04f)*band(3.845f,4.01f,x,.004f);
            c=mix(v3(.18f,.17f,.14f),v3(.014f,.022f,.025f),openings);
        }
        if(x>.12f&&x<.60f&&detail){
            float mark=lettering(fmodf(z+18.0f,9.f),x-.24f,.045f,"STAND CLEAR",11);
            c=mix(c,v3(.57f,.49f,.27f),mark*(.45f+.45f*noise2(x*81,z*66)));
        }
        k=.72f+control*.2f;s=.29f+.25f*control;
        if(h.n.y<.4f){c=v3(.13f,.14f,.13f);s=.10f;}
    } else if(h.id==TRAIN) {
        float lx=x+3.02f,lz=z-front;
        bool cab=lz<1.45f&&h.n.z<-.27f;
        c=v3(.37f,.42f,.40f);k=.73f;s=.19f;
        if(y<.53f)c=v3(.085f,.105f,.108f);
        if(y>2.63f)c=v3(.12f,.17f,.17f);
        if(cab){
            float w=1.09f-.28f*fw::saturate((y-1.48f)/1.05f);
            float wind=band(1.49f,2.51f,y)*band(-w,w,lx);
            float glass=wind*(1.f-band(-.035f,.035f,lx));
            float mask=band(1.36f,2.56f,y)*band(-w-.08f,w+.08f,lx);
            c=mix(c,v3(.014f,.023f,.028f),mask);
            c=mix(c,v3(.023f,.068f,.087f)*(.75f+.32f*noise2(lx*3.f,y*6.f)),glass);
            if(wind>.5f){
                k=.90f;s=.40f;
                float wiper=fabsf(y-(1.55f+.32f*(lx+.68f)));
                if(wiper<.012f&&lx>-.76f&&lx<.65f)c=v3(.009f,.012f,.016f);
            }
            float lampHousing=band(.53f,1.125f,fabsf(lx),.035f)*band(1.02f,1.245f,y,.037f);
            c=mix(c,v3(.024f,.035f,.042f),lampHousing);
            float head=expf(-40.f*(fabsf(fabsf(lx)-.79f)+1.9f*fabsf(y-1.16f)));
            float strip=band(.60f,1.025f,fabsf(lx)) * band(1.095f,1.18f,y,.012f);
            e=e+v3(8.8f,4.7f,1.15f)*(strip*(.70f+.3f*sm(.1f,.4f,fract(lx*29.f)))+head*.39f);
            float plate=band(-.41f,.41f,lx)*band(2.27f,2.46f,y);
            c=mix(c,v3(.012f,.015f,.015f),plate);
            e=e+v3(4.1f,1.24f,.15f)*lettering(lx+.335f,2.422f-y,.021f,"R04",3);
            float vmark=band(.0f,.078f,fabsf(lx)-(.68f-y)*.74f);
            if(y>.39f&&y<.67f)c=mix(c,v3(.93f,.52f,.14f),vmark);
            if(y>.70f&&y<.95f)c=mix(c,v3(.023f,.042f,.052f),band(.03f,.90f,fract(y*33.f))*
                                     band(-.55f,.55f,lx));
            if(y>.48f&&y<.64f&&fabsf(lx)>.72f)c=v3(.74f,.27f,.055f);
            float logo=lettering(lx+.27f,1.32f-y,.025f,"MTR",3);c=mix(c,v3(.05f,.091f,.10f),logo);
            if(y<.91f&&detail)c=c*(.84f+.19f*noise2(lx*27.f,y*2.f));
        }else {
            float local=fmodf(fmaxf(0.f,lz-1.35f),8.6f),pane=fract((lz-1.60f)/1.39f);
            float window=band(.09f,.89f,pane,.018f)*band(1.52f,2.42f,y,.033f)*sm(1.7f,1.95f,lz);
            float glass=band(1.39f,2.50f,y)*sm(.92f,1.45f,lz);c=mix(c,v3(.025f,.053f,.067f),glass);
            c=mix(c,v3(.06f,.12f,.13f),window);
            float shadow=1.f-.58f*noise2(floorf((lz-1.6f)/1.39f)*4.f,pane*5.f);
            float furnishing=1.f-.71f*band(1.53f,1.93f+.045f*sinf(lz*4.f),y,.04f)*band(.14f,.62f,pane);
            e=e+v3(.99f,.51f,.19f)*window*shadow*furnishing*(.39f+.61f*sm(1.56f,2.36f,y));
            if(local>6.23f&&local<7.62f&&y>.41f&&y<2.55f){
                c=c*.78f;
                if(fabsf(local-6.91f)<.024f||local<6.27f||local>7.58f)c=v3(.015f,.030f,.039f);
            }
            if(local>8.29f&&lz>2.f){e=v3(0);c=v3(.051f)*(.6f+.45f*cosf(local*142.f));}
            float rise=.23f*sm(.84f,2.69f,lz);
            if(y>.694f+rise&&y<.84f+rise)c=v3(.79f,.28f,.057f);
            if(y>.89f&&y<.94f)c=v3(.065f,.21f,.21f);
            if(y<.68f&&detail)c=c*(.85f+.1f*cosf(y*131.f));
            if(y>.95f&&y<1.39f&&detail){
                float tail=lettering(local-2.2f,1.30f-y,.035f,"NORTH LOOP",10);
                c=mix(c,v3(.038f,.091f,.11f),tail);
            }
        }
    } else if(h.id==SIGN) {
        c=v3(.021f,.033f,.039f);s=.09f;k=.45f;
        if(fabsf(h.n.z)>.8f){
            float u=x-.42f,v=3.97f-y;
            float border=band(.06f,3.39f,u)*band(.055f,.86f,v);
            c=mix(v3(.20f,.25f,.25f),v3(.013f,.029f,.032f),border);
            float route=band(.12f,.75f,u)*band(.13f,.78f,v);
            e=e+v3(2.10f,.64f,.053f)*route*(1.f-.965f*lettering(u-.215f,v-.27f,.073f,"4",1));
            float name=destinationBoard(u-.94f,v-.154f);
            float caption=lettering(u-.99f,v-.63f,.022f,"PLATFORM 04",11);
            e=e+v3(1.86f,2.62f,2.40f)*name+v3(.75f,1.08f,.99f)*caption;
            e=e+v3(.90f,.44f,.1f)*band(.98f,3.18f,u)*band(.54f,.55f,v,.003f);
            if(detail)e=e*(.96f+.04f*cosf(v*820));
        }
    } else if(h.id==WALL){
        float tx=fract(z*.71f+.5f*fmodf(floorf(y*2.52f),2.f)),ty=fract(y*2.52f);
        float joint=band(.012f,.988f,tx,.012f)*band(.023f,.978f,ty,.012f);
        c=mix(v3(.042f,.050f,.055f),v3(.17f,.23f,.235f),detail?joint:1.f);
        if(y>.58f&&y<.73f)c=v3(.92f,.39f,.075f)*(.6f+.4f*joint);
        if(detail) {
            float run=sm(.46f,.68f,noise2(z*6.1f,y*.31f));
            c=c*(1.f-.27f*run*(.35f+.65f*sm(2.4f,.10f,y)));
            if(y>3.12f&&y<3.66f) {
                c=v3(.041f,.071f,.080f)*(.84f+.16f*joint);
                float label=lettering(fract((-z+1.5f)*.10f)*10.f,3.53f-y,.048f,"NORTH LOOP  04",14);
                c=mix(c,v3(.70f,.70f,.57f),label);
            }
        }
        k=.57f;s=.14f;
    } else if(h.id==TRACK){
        float sl=band(.03f,.39f,fract(z*1.28f));
        c=mix(v3(.08f,.10f,.116f),v3(.19f,.13f,.10f),sl)*(.72f+.48f*noise2(x*26,z*26));s=.12f;k=.38f;
    } else if(h.id==JACKET){c=v3(.14f,.086f,.044f);k=.31f;s=.068f;}
    else if(h.id==SKIN){c=v3(.33f,.17f,.093f);k=.31f;s=.042f;}
    else if(h.id==TROUSER){c=v3(.020f,.032f,.041f);k=.25f;s=.061f;}
    else if(h.id==LUGGAGE){c=v3(.087f,.131f,.133f)*(.66f+.34f*sm(.18f,.34f,fract(z*31.f+x*25.f)));k=.60f;s=.21f;}
    else if(h.id==SIGNAL){c=v3(.70f,.028f,.007f);e=v3(8.0f,.23f,.032f);}
    else if(h.id==LAMP){c=v3(.8f,.45f,.2f);e=v3(6.0f,2.42f,.47f);}
    else if(h.id==TUBE){c=v3(.8f);e=v3(2.61f,4.83f,4.68f);}
    else if(h.id==GIRDER||h.id==PAINT){
        c=h.id==PAINT?v3(.13f,.245f,.23f):v3(.106f,.15f,.158f);s=.21f;k=.54f;
        if(y<.52f)c=v3(.34f,.235f,.09f);
        if(detail&&y<2.7f)c=c*(.81f+.29f*noise2(x*16+z*5,y*.6f));
    } else if(h.id==COPPER){c=v3(.35f,.21f,.09f);s=.28f;k=.60f;}
    else if(h.id==CONCRETE){
        c=v3(.12f,.14f,.15f);
        if(y>4.5f && detail){
            float rib=.68f+.32f*sm(.10f,.32f,fract(x*2.85f));
            c=c*rib*(.75f+.30f*noise2(x*.30f,z*.75f));
        }
    } else if(h.id==PLACARD){
        bool hero=h.bay==-2;
        float u=hero?(5.91f-z)/2.66f:1.f-fract((z-(-3.f+5.f*h.bay+1.24f))/1.81f);
        float vv=hero?(2.84f-y)/1.94f:fw::saturate((2.44f-y)/1.55f);
        float margin=band(.028f,.972f,u,.002f)*band(.038f,.962f,vv,.002f);
        c=mix(v3(.17f,.20f,.19f),v3(.07f,.27f,.28f),margin);
        float dx=u-.68f,dy=(vv-.38f)*.83f;
        float sun=sm(.259f,.25f,sqrtf(dx*dx+dy*dy))*margin;
        c=mix(c,v3(.95f,.38f,.125f),sun);
        float first=.69f-.31f*expf(-fabsf(u-.28f)*3.7f)+.032f*sinf(u*14.f);
        float ridge=.79f-.23f*expf(-fabsf(u-.69f)*5.f)+.04f*sinf(u*17.f);
        if(vv>first && margin>.5f)c=v3(.092f,.17f,.22f);
        if(vv>ridge && margin>.5f)c=v3(.039f,.068f,.091f);
        float title=lettering(u-.13f,vv-.096f,.018f,"NIGHT LINE",10);
        float sub=lettering(u-.11f,vv-.858f,.009f,"NORTH DISTRICT",14);
        c=mix(c,v3(.95f,.82f,.62f),fmaxf(title,sub));
        s=.08f;e=c*.32f;
    } else if(h.id==RAIL){c=v3(.36f,.38f,.38f);s=.55f;k=.82f;}
    else if(h.id==SEAT){c=v3(.40f,.22f,.088f);s=.19f;k=.55f;if(detail)c=c*(.73f+.27f*band(.05f,.94f,fract(x*11.1f+y*12.f)));}
    return {c*grime,e,k,s};
}

__device__ float3 sourceLight(float3 p,float3 n,float3 eye,Surface m,float3 pos,
                              float3 power,float front,int mode,bool shadows) {
    float3 delta=pos-p;float distance=length(delta);float3 l=delta/distance;
    float nl=dot(n,l);
    if(nl<.001f) return v3(0);
    float vis=1;
    if(shadows){
        Ray shadow=ray(p+n*.014f,l);
        Hit o=trace(shadow,front,mode,distance-.13f);
        vis=o.id==SKY?1.f:.045f;
    }
    float3 halfVector=normalize(l+eye);
    float spec=powf(fmaxf(dot(n,halfVector),0.f),10.f+145.f*m.gloss*m.gloss);
    float atten=vis/(2.1f+distance*distance);
    return (m.color*nl+v3(spec*m.shine*(2.5f+5.f*m.gloss)))*power*atten;
}
__device__ float3 shade(Ray incoming,Hit h,Surface m,float3 n,float front,int mode,
                       bool shadows) {
    float3 p=incoming.o+incoming.d*h.t,eye=-incoming.d;
    float bay=floorf((p.z+3.f)*.20f);
    float z=-3.f+5.f*fminf(10.f,fmaxf(bay,0.f));
    float ceilingSky=.66f+.34f*n.y;
    float3 ambient=v3(.116f,.172f,.231f)*ceilingSky;
    float contact=fminf(fabsf(p.x-7.23f),fabsf(p.x-6.13f)+fminf(fabsf(p.z-z),fabsf(p.z-z-5.f)));
    if(h.id==PAVING)ambient=ambient*(.52f+.48f*sm(0.f,.92f,contact));
    if(h.id==TRACK)ambient=ambient*.72f;
    // Shaded window panes and self-luminous signs both contribute to a secondary image.
    float3 col=m.glow+m.color*ambient;
    float fixtureZ=z+2.5f;
    float power=.73f+.27f*cosf(z*.66f);
    col=col+sourceLight(p,n,eye,m,v3(.39f,4.44f,fixtureZ),v3(7.7f,16.f,16.9f)*power,front,mode,shadows);
    int side=p.z>fixtureZ?1:-1;
    if(bay+side>=0 && bay+side<=10)
        col=col+sourceLight(p,n,eye,m,v3(.39f,4.44f,fixtureZ+5.f*side),v3(4.8f,8.5f,9.f),front,mode,false);
    float lampZ=z+.90f;
    col=col+sourceLight(p,n,eye,m,v3(6.49f,2.50f,lampZ),v3(18.f,5.8f,1.38f),front,mode,shadows);
    // The cab headlight illuminates the sleepers and the edge of the platform.
    if(p.z<front+1.f&&p.z>front-14.f){
        float3 lamp=v3(-2.10f,1.13f,front-.05f);
        float3 away=p-lamp;
        float cone=sm(.68f,.94f,-away.z/(length(away)+.001f));
        col=col+sourceLight(p,n,eye,m,lamp,v3(30.f,16.f,4.8f)*cone,front,mode,false);
    }
    return col;
}
__device__ float pavementWater(float3 p,float control) {
    float pooled=sm(.29f,.70f,noise2(p.x*.79f+4.2f,p.z*.51f));
    return fw::saturate(.07f+.57f*control+.48f*pooled-.08f*noise2(p.x*2.4f,p.z*1.15f));
}
__device__ float3 pavementNormal(float3 p,float time,float wet) {
    // Broad puddle disturbances and expanding splash rings. Tangent normal displaces
    // the actual secondary ray in world space, so reflected signage follows the camera.
    float rip=cosf(p.z*13.5f+1.7f*sinf(p.x*4.2f)+time*1.4f);
    float dx=.006f*sinf(p.x*7.2f+p.z*.76f+time*.83f);
    float dz=.008f*rip+.003f*cosf(p.z*41.f-p.x*2.0f-time*.72f);
    float gx=p.x*.98f,gy=p.z*.98f;
    int i=(int)floorf(gx),j=(int)floorf(gy);
    float x=fract(gx)-(.20f+.60f*hash2(i,j)), y=fract(gy)-(.20f+.60f*hash2(j,i+13));
    float radius=sqrtf(x*x+y*y+.00001f),age=fract(time*.58f+hash2(i+60,j));
    float edge=radius-age*.63f;
    float ring=cosf(111.f*edge)*expf(-fabsf(edge)*30.f)*(1.f-age)*.038f;
    float micro=.48f+.64f*wet;
    return normalize(v3((dx+ring*x/radius)*micro,1.f,(dz+ring*y/radius)*micro));
}
__device__ float3 veil(float3 col,float t,float3 d) {
    float fog=1.f-expf(-.0065f*t);
    return mix(col,atmosphere(d)*.78f,fog);
}
__device__ float3 glowPoint(Ray r,float limit,float3 light,float3 color,float radius){
    float3 to=light-r.o;
    float t=dot(to,r.d);
    if(t<=.01f || t>limit+.28f) return v3(0);
    float dst=length(to-r.d*t);
    return color*(expf(-dst*dst/(radius*radius))+.13f*expf(-dst/(radius*1.85f)));
}
__device__ float rain(Ray r,float limit,float time){
    if(r.d.x>-.01f)return 0;
    float drops=0;
    for(int layer=0;layer<3;layer++){
        float plane=-6.45f-2.85f*layer;
        float t=(plane-r.o.x)/r.d.x;
        if(t<=0||t>limit)continue;
        float3 p=r.o+r.d*t;
        float s=p.z*3.1f+p.y*.42f;
        int strip=(int)floorf(s);
        float y=p.y*(.85f+.45f*hash2(strip,layer))+time*(4.1f+.76f*layer)+hash2(strip,3);
        float trace=sm(.036f,.004f,fabsf(fract(s)-(.2f+.59f*hash2(strip,layer+7))));
        float streak=band(.18f,.42f,fract(y),.023f);
        if(hash2(strip,(int)floorf(y)+layer*233)>.57f)drops+=trace*streak;
    }
    return drops;
}
__device__ float3 render(float u,float v,float aspect,float time,float yaw,float pitch,
                         float control,int features,int mode,int view) {
    float3 camera=v3(2.05f+.85f*sinf(yaw),1.46f+pitch*.22f,-4.4f+.30f*sinf(yaw));
    float angle=-.10f+yaw, tilt=.050f+pitch;
    float3 f=v3(sinf(angle)*cosf(tilt),sinf(tilt),cosf(angle)*cosf(tilt));
    float3 right=v3(cosf(angle),0,-sinf(angle)),up=cross(f,right);
    Ray r=ray(camera,normalize(f+right*(u*aspect*.47f)+up*(v*.47f)));
    float front=trainPosition(time);Hit h=trace(r,front,mode);
    // Actual number of detailed station bays visited by the primary ray. Divide by
    // eleven so the reference is uniformly hot and a successful cull reveals cool tiles.
    if(view==2) {
        float count=float(h.visits)/11.f;
        return mix(v3(.046f,.14f,.23f),v3(.98f,.58f,.15f),count);
    }
    if(h.id==SKY) return view?v3(.07f,.12f,.16f):
        citySky(r.o,r.d)*.68f+v3(.10f,.14f,.18f)*((features&4)?rain(r,h.t,time):0.f);
    float3 p=r.o+r.d*h.t,n=h.n;
    Surface m=material(h,p,front,features,control);
    bool floor=h.id==PAVING&&n.y>.8f;
    float wet=floor?pavementWater(p,control):0;
    if(floor&&(features&4)) n=pavementNormal(p,time,wet);
    if(view==1) return n*.5f+v3(.5f);
    float3 col=shade(r,h,m,n,front,mode,(features&2)!=0);
    bool reflective=floor||h.id==TRAIN||h.id==RAIL||h.id==WALL;
    if((features&1)&&reflective){
        Ray rr=ray(p+h.n*.017f,reflect(r.d,n));Hit bounced=trace(rr,front,mode);
        float3 returned;
        if(bounced.id==SKY) returned=citySky(rr.o,rr.d);
        else{
            float3 q=rr.o+rr.d*bounced.t;
            Surface coating=material(bounced,q,front,features,control);
            returned=veil(shade(rr,bounced,coating,bounced.n,front,mode,false),bounced.t,rr.d);
        }
        float grazing=powf(1.f-fw::saturate(-dot(n,r.d)),3.f);
        float fresnel=m.shine*(.20f+.80f*grazing);
        if(floor)fresnel=wet*(.28f+.64f*grazing);
        col=mix(col,returned,fw::saturate(fresnel));
    }
    col=veil(col,h.t,r.d);
    if(features&4){
        for(int j=0;j<6;j++){
            float z=-2.1f+j*5.f;
            col=col+glowPoint(r,h.t,v3(6.66f,2.56f,z),v3(.27f,.105f,.022f),.18f);
        }
        for(int side=-1;side<=1;side+=2)
            col=col+glowPoint(r,h.t,v3(-3.02f+side*.80f,1.14f,front+.19f),v3(.82f,.40f,.086f),.17f);
        col=col+glowPoint(r,h.t,v3(-5.34f,2.34f,5.74f),v3(.93f,.065f,.013f),.22f);
        col=col+v3(.10f,.14f,.18f)*rain(r,h.t,time);
    }
    float vignette=fmaxf(.76f,1.f-.105f*(u*u+.72f*v*v));
    return col*(.66f*vignette);
}
} // namespace terminal
#define SCENE_FUNCTION lightingScene
__device__ float3 lightingScene(float u,float v,float aspect,float time,float yaw,float pitch,
                               float control,int features,int mode,int view) {
    return terminal::render(u,v,aspect,time,yaw,pitch,control,features,mode,view);
}
