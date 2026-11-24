// Shared camera-space vector math. The viewer concatenates this file before one scene.
__device__ inline float3 operator+(float3 a, float3 b) { return {a.x+b.x,a.y+b.y,a.z+b.z}; }
__device__ inline float3 operator-(float3 a, float3 b) { return {a.x-b.x,a.y-b.y,a.z-b.z}; }
__device__ inline float3 operator-(float3 a) { return {-a.x,-a.y,-a.z}; }
__device__ inline float3 operator*(float3 a, float3 b) { return {a.x*b.x,a.y*b.y,a.z*b.z}; }
__device__ inline float3 operator*(float3 a, float b) { return {a.x*b,a.y*b,a.z*b}; }
__device__ inline float3 operator*(float a, float3 b) { return b*a; }
__device__ inline float3 operator/(float3 a, float b) { return {a.x/b,a.y/b,a.z/b}; }
__device__ inline float3 operator/(float3 a, float3 b) { return {a.x/b.x,a.y/b.y,a.z/b.z}; }

namespace fw {
__device__ inline float3 v3(float x,float y,float z) { return {x,y,z}; }
__device__ inline float3 v3(float s) { return {s,s,s}; }
__device__ inline float dot(float3 a,float3 b) { return a.x*b.x+a.y*b.y+a.z*b.z; }
__device__ inline float3 cross(float3 a,float3 b) {
    return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};
}
__device__ inline float length(float3 a) { return sqrtf(dot(a,a)); }
__device__ inline float3 normalize(float3 a) { return a*rsqrtf(fmaxf(dot(a,a),1e-25f)); }
__device__ inline float3 mix(float3 a,float3 b,float t) { return a+(b-a)*t; }
__device__ inline float mix(float a,float b,float t) { return a+(b-a)*t; }
__device__ inline float clamp(float x,float lo,float hi) { return fminf(hi,fmaxf(lo,x)); }
__device__ inline float saturate(float x) { return clamp(x,0.f,1.f); }
__device__ inline float smoothstep(float a,float b,float x) {
    float t=saturate((x-a)/(b-a)); return t*t*(3.f-2.f*t);
}
__device__ inline float3 reflect(float3 d,float3 n) { return d-2.f*dot(d,n)*n; }
__device__ inline float fract(float x) { return x-floorf(x); }
}
