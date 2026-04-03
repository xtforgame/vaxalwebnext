
// https://www.shadertoy.com/view/XtSfDD


// ---------------------------------------------------------
// BUF A: SURFACE RAYMARCHING AND FIRE
// BUF B: MEDIUM RAYMARCHING AND NORMAL ESTIMATION
// IMAGE: RENDERING AND COMPOSITION
// TEXTURE: public/images/texture001.jpg
// ---------------------------------------------------------
#define saturate(x) clamp(x, 0.0, 1.0)
#define PI 3.14159265
#define TAU (2*PI)
#define PHI (sqrt(5)*0.5 + 0.5)

#define MAX_STEPS 30
#define MAX_STEPS_F float(MAX_STEPS)

#define FIXED_STEP_SIZE .05

#define MAX_DISTANCE 30.0
#define MIN_DISTANCE 15.0
#define EPSILON .02
#define EPSILON_NORMAL .05

#define MATERIAL_NONE -1
#define MATERIAL_CRYSTAL 1

// ---------------------------------------------------------

// hg
float vmax(vec3 v) {
	return max(max(v.x, v.y), v.z);
}

// hg
float fBox(vec3 p, vec3 b) {
	vec3 d = abs(p) - b;
	return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
} 

// hg
float vmax(vec2 v) {
	return max(v.x, v.y);
}

// hg
float fBox(vec3 p) {
    vec3 d = abs(p) - .5;
    return length(max(d, 0.0)) + vmax(min(d, 0.0));
}

// hg
float fBox2Cheap(vec2 p, vec2 b) {
	return vmax(abs(p)-b);
}

float fBox2(vec2 p, vec2 b) {
	vec2 d = abs(p) - b;
	return length(max(d, vec2(0))) + vmax(min(d, vec2(0)));
}

// hg
float fCapsule(vec3 p, float r, float c) {
	return mix(length(p.xz) - r, length(vec3(p.x, abs(p.y) - c, p.z)) - r, step(c, abs(p.y)));
}

// iq
vec3 palette( float t, vec3 a, vec3 b, vec3 c, vec3 d)
{
    return saturate(a + b * cos(6.28318 * (c * t + d)));
}

// iq
float gain(float x, float k) 
{
    float a = 0.5*pow(2.0*((x<0.5)?x:1.0-x), k);
    return (x<0.5)?a:1.0-a;
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

float hash31(vec3 uv) {
    float f = fract(sin(dot(uv, vec3(.09123898, .0231233, .0532234))) * 1e5);
    return f;
}

vec2 csqr( vec2 a )  { return vec2( a.x*a.x - a.y*a.y, 2.*a.x*a.y  ); }


vec3 domainRepeat(vec3 p, vec3 size)
{
    return mod(abs(p) + size * .5, size) - size * .5;
}

float domainRepeat1D(float p, float size)
{
    return mod(abs(p) + size * .5, size) - size * .5;
}

// hg
vec2 pModPolar(vec2 p, float repetitions) {
	float angle = 2.0 * 3.1415 / repetitions;
	float a = atan(p.y, p.x) + angle/2.;
	float r = length(p);
	float c = floor(a/angle);
	a = mod(a,angle) - angle/2.;
	return vec2(cos(a), sin(a))*r;
}

// ---------------------------------------------------------

struct Intersection
{
    float totalDistance;
    float mediumDistance;
    float sdf;
    float density;
    int materialID;
};
    
struct Camera
{
	vec3 origin;
    vec3 direction;
    vec3 left;
    vec3 up;
};
    
// ---------------------------------------------------------
    
float frPlane(vec3 p)
{
    return p.y + (clamp(p.x, 0.0, 2.0) * 0.05 + clamp(p.z + .5, 0.0, 1.0) * .1);
}

const mat4 tr[45] = mat4[45](
	mat4(.999, .0, .055, .0, .0, 1.0, .0, .0, -.055, .0, .999, .0, -1.509, .14, .498, 1.0),
	mat4(.795, .934, 2.28, .0, -.491, 1.642, -1.25, .0, -1.401, -.045, 1.732, .0, -.397, -.911, -7.876, 1.0),
	mat4(.5, .0, .0, .0, .0, .137, -.104, .0, .0, .029, .489, .0, -.8, -.064, .867, 1.0),
	mat4(1.128, .386, .417, .0, -.926, .053, 1.543, .0, 1.235, -.313, .775, .0, -.769, -1.532, -2.843, 1.0),
	mat4(-1.008, .237, -1.253, .0, -1.259, .149, 1.228, .0, 1.027, .415, .275, .0, 4.273, -.714, -.96, 1.0),
	mat4(-1.633, -.219, .498, .0, .244, .173, 1.651, .0, -.964, .415, -.425, .0, 3.007, -.072, -3.193, 1.0),
	mat4(-.526, -.46, -.495, .0, -1.791, .161, -.242, .0, .411, .112, -1.689, .0, 5.514, .189, 1.112, 1.0),
	mat4(.788, .097, .425, .0, -.135, .792, .022, .0, -.418, -.073, .795, .0, 1.929, -6.665, -.972, 1.0),
	mat4(.203, .084, .048, .0, -.057, .293, -.032, .0, -.028, .013, .407, .0, -.895, .281, 1.418, 1.0),
	mat4(.149, .025, -.291, .0, .07, .222, .18, .0, .135, -.143, .228, .0, -.128, .448, .615, 1.0),
	mat4(.163, -.007, .238, .0, -.015, .102, .035, .0, -.23, -.012, .166, .0, -.815, .176, -.268, 1.0),
	mat4(1.68, -.01, .848, .0, -.871, .133, 1.509, .0, -.276, -.482, .4, .0, -5.624, -1.2, .976, 1.0),
	mat4(-1.288, -.085, -1.277, .0, -1.377, .184, 1.044, .0, .314, .457, -.658, .0, 2.367, .783, 2.615, 1.0),
	mat4(-.526, -.46, -.495, .0, -1.791, .161, -.242, .0, .411, .112, -1.689, .0, 1.346, .968, -.74, 1.0),
	mat4(.649, .468, -.157, .0, -1.578, .171, .798, .0, .862, -.04, 1.579, .0, .804, -1.56, 3.123, 1.0),
	mat4(-.446, -.32, 1.219, .0, -1.751, .078, -.321, .0, .016, -.369, -1.124, .0, -1.128, -.361, -6.142, 1.0),
	mat4(1.533, .154, .696, .0, -.87, .377, .718, .0, -.329, -.281, 1.342, .0, -4.104, -1.442, -.118, 1.0),
	mat4(1.853, -.102, -.211, .0, .221, -.014, 1.757, .0, -.392, -.489, -.008, .0, -1.772, -1.406, 6.376, 1.0),
	mat4(-.556, -.453, -.525, .0, -.17, -.141, 1.687, .0, -1.815, .152, .003, .0, -1.992, -.067, 6.05, 1.0),
	mat4(-.943, -.128, .043, .0, -.107, 1.049, .137, .0, -.059, .146, -.94, .0, 1.858, .33, -1.42, 1.0),
	mat4(.7, .065, .111, .0, -.117, .263, -.261, .0, -.161, .092, .671, .0, -1.761, -.553, -.067, 1.0),
	mat4(1.676, .466, 1.232, .0, -1.862, .058, 1.912, .0, 1.213, -.556, 1.231, .0, -3.822, -1.844, -6.583, 1.0),
	mat4(-1.467, .491, -1.337, .0, -1.788, .06, 1.971, .0, 1.549, .534, 1.009, .0, 6.023, -1.973, -.383, 1.0),
	mat4(-2.494, -.141, 1.034, .0, .951, .2, 2.324, .0, -.79, .686, -.467, .0, 6.624, -.322, -6.471, 1.0),
	mat4(-1.116, -.568, -1.242, .0, -2.513, .31, .163, .0, .432, .334, -2.263, .0, 7.905, .708, 4.921, 1.0),
	mat4(-.025, -.278, 1.937, .0, -.454, 1.573, .319, .0, -1.912, -.37, -.101, .0, .038, -4.893, -1.369, 1.0),
	mat4(.326, .111, .293, .0, -.106, .197, -.236, .0, -.365, .042, .33, .0, -1.141, -.145, -1.004, 1.0),
	mat4(1.01, .023, 1.506, .0, -1.623, .004, .939, .0, .032, -.499, .078, .0, -4.952, -.781, -2.879, 1.0),
	mat4(-1.354, .304, -.64, .0, -.774, .034, 1.62, .0, 1.106, .396, .35, .0, 2.953, -1.14, 2.649, 1.0),
	mat4(-1.462, -.104, 1.084, .0, .892, .238, 1.325, .0, -.851, .427, -.474, .0, 6.541, .212, -.951, 1.0),
	mat4(-1.166, -.349, -.663, .0, -1.442, .328, .007, .0, .463, .142, -1.648, .0, 3.098, 1.04, 2.74, 1.0),
	mat4(.024, .494, .28, .0, -1.723, -.028, .764, .0, .829, -.074, 1.579, .0, .498, -2.115, -.172, 1.0),
	mat4(.795, .0, -.714, .0, .302, 3.241, .336, .0, .647, -1.512, .721, .0, -.378, -3.143, .939, 1.0),
	mat4(.28, .504, 2.966, .0, -.047, 1.821, -.83, .0, -1.66, .033, .523, .0, 1.505, 4.294, -7.819, 1.0),
	mat4(.5, .0, .0, .0, .0, .137, -.104, .0, .0, .029, .489, .0, -.805, -.247, .582, 1.0),
	mat4(1.128, .386, .417, .0, -.926, .053, 1.543, .0, 1.235, -.313, .775, .0, -.769, -1.532, -2.843, 1.0),
	mat4(-1.008, .237, -1.253, .0, -1.259, .149, 1.228, .0, 1.027, .415, .275, .0, 4.273, -.714, -.96, 1.0),
	mat4(-1.633, -.219, .498, .0, .244, .173, 1.651, .0, -.964, .415, -.425, .0, 3.007, -.072, -3.193, 1.0),
	mat4(-.526, -.46, -.495, .0, -1.791, .161, -.242, .0, .411, .112, -1.689, .0, 5.514, .189, 1.112, 1.0),
	mat4(1.43, -.088, -1.481, .0, -.092, 1.769, -.567, .0, .828, .35, 2.494, .0, -1.382, -4.146, -2.058, 1.0),
	mat4(.461, .046, -.065, .0, -.193, .102, -.182, .0, -.02, .084, .259, .0, -.378, -.212, .663, 1.0),
	mat4(1.128, .386, .417, .0, -.926, .053, 1.543, .0, 1.235, -.313, .775, .0, -.769, -1.532, -2.843, 1.0),
	mat4(-1.008, .237, -1.253, .0, -1.259, .149, 1.228, .0, 1.027, .415, .275, .0, 4.057, -.994, -1.057, 1.0),
	mat4(-1.633, -.219, .498, .0, .244, .173, 1.651, .0, -.964, .415, -.425, .0, 3.007, -.072, -3.193, 1.0),
	mat4(-.526, -.46, -.495, .0, -1.791, .161, -.242, .0, .411, .112, -1.689, .0, 5.374, .102, 1.328, 1.0)
);

// Generated with a toy tool I'm developing: https://github.com/mmerchante/sdf-gen-unity
// It may take some time to compile, sorry about that!
float sdf_simple(vec3 p)
{
	vec3 wsPos = vec3(.0,.0,.0);
	float stack[12];
	vec4 pStack[12];
	pStack[0] = vec4(p, 1.0);
	pStack[0] = (pStack[0] * vec4(1.0,.98,1.0,1.0));
	pStack[1] = pStack[0];
	pStack[2] = (tr[0] * pStack[1]);
	pStack[2].xz = pModPolar(pStack[2].xz , 8.0);
	pStack[3] = (tr[1] * pStack[2]);
	wsPos = (tr[2] * pStack[3]).xyz;
	stack[3] = fBox(wsPos);
	wsPos = (tr[3] * pStack[3]).xyz;
	stack[3] = max(stack[3],frPlane(wsPos));
	wsPos = (tr[4] * pStack[3]).xyz;
	stack[3] = max(stack[3],frPlane(wsPos));
	wsPos = (tr[5] * pStack[3]).xyz;
	stack[3] = max(stack[3],frPlane(wsPos));
	wsPos = (tr[6] * pStack[3]).xyz;
	stack[3] = max(stack[3],frPlane(wsPos));
	stack[2] = stack[3];
	pStack[4] = (tr[7] * pStack[1]);
	pStack[5] = pStack[4];
	pStack[6] = pStack[5];
	wsPos = (tr[8] * pStack[6]).xyz;
	stack[6] = fBox(wsPos);
	wsPos = (tr[9] * pStack[6]).xyz;
	stack[6] = min(stack[6],fBox(wsPos));
	wsPos = (tr[10] * pStack[5]).xyz;
	stack[5] = max(-stack[6],fBox(wsPos));
	wsPos = (tr[11] * pStack[4]).xyz;
	stack[4] = max(stack[5],frPlane(wsPos));
	wsPos = (tr[12] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[13] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[14] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[15] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[16] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[17] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	wsPos = (tr[18] * pStack[4]).xyz;
	stack[4] = max(stack[4],frPlane(wsPos));
	stack[1] = min(stack[2],stack[4]);
	pStack[7] = (tr[19] * pStack[1]);
	pStack[7].xz = pModPolar(pStack[7].xz , 10.0);
	wsPos = (tr[20] * pStack[7]).xyz;
	stack[7] = fBox(wsPos);
	wsPos = (tr[21] * pStack[7]).xyz;
	stack[7] = max(stack[7],frPlane(wsPos));
	wsPos = (tr[22] * pStack[7]).xyz;
	stack[7] = max(stack[7],frPlane(wsPos));
	wsPos = (tr[23] * pStack[7]).xyz;
	stack[7] = max(stack[7],frPlane(wsPos));
	wsPos = (tr[24] * pStack[7]).xyz;
	stack[7] = max(stack[7],frPlane(wsPos));
	stack[1] = min(stack[1],stack[7]);
	pStack[8] = (tr[25] * pStack[1]);
	pStack[8].xz = pModPolar(pStack[8].xz , 5.0);
	wsPos = (tr[26] * pStack[8]).xyz;
	stack[8] = fBox(wsPos);
	wsPos = (tr[27] * pStack[8]).xyz;
	stack[8] = max(stack[8],frPlane(wsPos));
	wsPos = (tr[28] * pStack[8]).xyz;
	stack[8] = max(stack[8],frPlane(wsPos));
	wsPos = (tr[29] * pStack[8]).xyz;
	stack[8] = max(stack[8],frPlane(wsPos));
	wsPos = (tr[30] * pStack[8]).xyz;
	stack[8] = max(stack[8],frPlane(wsPos));
	wsPos = (tr[31] * pStack[8]).xyz;
	stack[8] = max(stack[8],frPlane(wsPos));
	stack[1] = min(stack[1],stack[8]);
	pStack[9] = (tr[32] * pStack[1]);
	pStack[9].xz = pModPolar(pStack[9].xz , 6.0);
	pStack[10] = (tr[33] * pStack[9]);
	wsPos = (tr[34] * pStack[10]).xyz;
	stack[10] = fBox(wsPos);
	wsPos = (tr[35] * pStack[10]).xyz;
	stack[10] = max(stack[10],frPlane(wsPos));
	wsPos = (tr[36] * pStack[10]).xyz;
	stack[10] = max(stack[10],frPlane(wsPos));
	wsPos = (tr[37] * pStack[10]).xyz;
	stack[10] = max(stack[10],frPlane(wsPos));
	wsPos = (tr[38] * pStack[10]).xyz;
	stack[10] = max(stack[10],frPlane(wsPos));
	stack[9] = stack[10];
	stack[1] = min(stack[1],stack[9]);
	pStack[11] = (tr[39] * pStack[1]);
	wsPos = (tr[40] * pStack[11]).xyz;
	stack[11] = fBox(wsPos);
	wsPos = (tr[41] * pStack[11]).xyz;
	stack[11] = max(stack[11],frPlane(wsPos));
	wsPos = (tr[42] * pStack[11]).xyz;
	stack[11] = max(stack[11],frPlane(wsPos));
	wsPos = (tr[43] * pStack[11]).xyz;
	stack[11] = max(stack[11],frPlane(wsPos));
	wsPos = (tr[44] * pStack[11]).xyz;
	stack[11] = max(stack[11],frPlane(wsPos));
	stack[1] = min(stack[1],stack[11]);
	stack[0] = max(stack[1],dot(pStack[0].xyz - vec3(1.24,.07,2.43), vec3(-.129,-.864,.486)));
	stack[0] = max(stack[0],dot(pStack[0].xyz - vec3(-.2,-1.41,1.48), vec3(.107,-.943,-.314)));
    // ...as if millions of drivers suddenly cried out in terror, and were suddenly silenced
	return stack[0];
}

// https://www.shadertoy.com/view/Xts3WM
float curv(in vec3 p, in float w)
{
    vec2 e = vec2(-1., 1.) * w;
    
    float t1 = sdf_simple(p + e.yxx), t2 = sdf_simple(p + e.xxy);
    float t3 = sdf_simple(p + e.xyx), t4 = sdf_simple(p + e.yyy);
    
    return .25/e.y*(t1 + t2 + t3 + t4 - 4.0 * sdf_simple(p));
}

Camera GetCamera(vec2 uv, float zoom)
{
    float dist = 7.0 / zoom;
    float time = 2.9 + sin(iTime) * .1;
    
    vec3 target = vec3(0.0, 4.45 + sin(iTime * 2.0) * .25, 0.0);
    vec3 p = vec3(0.0, 10.5, 0.0) + vec3(cos(time), 0.0, sin(time)) * dist;
        
    vec3 forward = normalize(target - p);
    vec3 left = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(forward, left));

    Camera cam;   
    cam.origin = p;
    cam.direction = normalize(forward - left * uv.x * zoom - up * uv.y * zoom);
    cam.up = up;
    cam.left = left;
        
    return cam;
}

vec3 triplanar(vec3 P, vec3 N)
{   
    vec3 Nb = abs(N);
    
    float b = (Nb.x + Nb.y + Nb.z);
    Nb /= vec3(b);
    
    vec3 c0 = textureLod(iChannel1, P.xy, 3.0).rgb * Nb.z;
    vec3 c1 = textureLod(iChannel1, P.yz, 3.0).rgb * Nb.x;
    vec3 c2 = textureLod(iChannel1, P.xz, 3.0).rgb * Nb.y;
    
    return c0 + c1 + c2;
}

vec3 Render(Camera camera, Intersection isect, vec2 uv, vec3 normal)
{
    vec3 p = camera.origin + camera.direction * isect.totalDistance;
    
    if(isect.materialID > 0)
    {        
        vec3 lPos = camera.origin - camera.left * 6.0 - camera.up * 15.0;
       // vec3 normal = sdfNormal(p, EPSILON_NORMAL);
        vec3 toLight = normalize(lPos - p);
        vec3 lightColor = vec3(.85, .9, 1.0);

        float fakeAO = saturate(sdf_simple(p - camera.direction)  + sdf_simple(p + normal * .25) / .5);
                
        vec3 tx = triplanar(p * .6 - p.zzz * .3, normal);
        tx.r = gain(tx.r, 5.0);
        
        float cWidth = mix(.2, .9, saturate(p.y * .125 - .3) * tx.r);
        float c = saturate(curv(p, cWidth));
        normal = normalize(normal - vec3(c * .5) + (tx * .25 - .1));
        
        float rim = pow(smoothstep(0.0, 1.0, 1.0 - dot(normal, -camera.direction)), 7.0);
        vec3 H = normalize(toLight - camera.direction);        
        float specular = pow(max(0.0, dot(H, normal)), 15.0 + tx.r * 7.0);        
                
        vec3 glow = mix(vec3(2.5, .15, .15), vec3(1.7, .65, .15), (isect.density) * .05) * (isect.density) * .04;        
        glow *= smoothstep(.5, 1.0, c) * 1.5 + 1.0;
        
        // Fake transmission
        glow *= 1.0 + pow(exp(-isect.mediumDistance), 2.0) * 4.0;        
        
        // Some more noise
        glow *= gain(fakeAO, 5.0) * tx.r * saturate((.25 - c) / .25);
        
        
        float diffuse = dot(normal, toLight) * (c * .65 + .01) * tx.r; // Very dark        
        
        vec3 outColor = lightColor * diffuse * fakeAO;
        
        outColor += lightColor * (specular * fakeAO * 2.0 + rim * rim * .1);
        
        return outColor + glow;
    }
    
    float vignette = 1.0 - pow(length(uv + hash31(p) * .2) / 2., 2.0);
    return vec3(.15, .175, .25) * vignette * vignette * .25;
}

Intersection LoadIntersection(vec2 uv)
{
    vec4 d = texture(iChannel2, uv);
        
    Intersection isect;
    isect.totalDistance = d.x;
    isect.materialID = int(d.y);
    isect.density = d.z;
    isect.mediumDistance = d.w;
    return isect;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 rawUV = fragCoord / iResolution.xy;
	vec2 uv = (-iResolution.xy + (fragCoord*2.0)) / iResolution.y;
    
    Camera camera = GetCamera(uv, .45);
    Intersection isect = LoadIntersection(rawUV);
        
    vec4 medium = texture(iChannel3, rawUV);
    vec3 color = Render(camera, isect, uv, medium.yzw);
    
    color += vec3(.85, .9, 1.0) * medium.x;
    
    uv.y += .45;
    uv.x -= .1;
    uv.y += sin(iTime * 2.0) * .035; // synced to cam position, super fake
 	vec3 glowColor = vec3(1.3, .7, .15);
    uv *= .5;
    vec3 fx = glowColor * pow(saturate(1.0 - length(uv * vec2(.75, .9))), 2.0);
    fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.5, 1.0))), 2.0);
    fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.25, 7.0))), 2.0) * .25;
    fx += glowColor * pow(saturate(1.0 - length(uv * vec2(.1, 7.0))), 2.0) * .15;
    
    float intensity = pow(texture(iChannel1, vec2(iTime * .03)).r, 4.0);
    color += fx * fx * fx * intensity * .05;
    
    color *= 1.0 + rand(uv) * .1;
    
	fragColor = vec4(color, 1.0);
}