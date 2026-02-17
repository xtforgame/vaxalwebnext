// https://www.shadertoy.com/view/tfyXRz
/*
Run the following in console to get the wallpaper
gShaderToy.SetTexture(0, {mSrc:'https://i.ibb.co/5x98k2K4/image.png', mType:'texture', mID:1, mSampler:{ filter: 'mipmap', wrap: 'repeat', vflip:'true', srgb:'false', internal:'byte' }});
*/
const float AIR_IOR = 1.0003;
const float GLASS_IOR = 1.5;
const float REFRACT_RT_DISTANCE = 250.0;
const float REFLECT_RT_DISTANCE = 250.0;
const float CIRCLE_SIZE = 200.0;
const float EDGE_FRACTION = 0.7;
const float EDGE_POWER = 4.0;
const float NORMAL_JITER = 0.02;

#define CHROMATIC_ABBERATION_STRENGTH 1

#define BLUR_LOD_BIAS 0.5
// Use this if using the wallpaper
//#define BLUR_LOD_BIAS 2.5

#define PI 3.14159265358979323846
#define RCP_PI 1.0 / PI

// TextureNice by IQ
// The MIT License
// Copyright © 2013 Inigo Quilez
// https://www.youtube.com/c/InigoQuilez
// https://iquilezles.org/
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
vec4 textureNice( sampler2D sam, vec2 uv, int level)
{
    float textureResolution = float(textureSize(sam, level).x);
    uv = uv * textureResolution + 0.5;
    vec2 iuv = floor( uv );
    vec2 fuv = fract( uv );
    uv = iuv + fuv * fuv * (3.0-2.0 * fuv);
    uv = (uv - 0.5) / textureResolution;
    return pow(textureLod(sam, uv, float(level)), vec4(2.2));
}

vec4 textureNiceTrilinear( sampler2D sam, vec2 uv, float lod) {
    float interpo = fract(lod);
    int floorLod = int(floor(lod));
    vec4 base = textureNice(sam, uv, floorLod);
    vec4 higher = textureNice(sam, uv, floorLod + 1);
    return mix(base, higher, interpo);
}

float rand_IGN(vec2 v, uint frame) {
    frame = frame % 64u;
    v = v + 5.588238 * float(frame);
    return fract(52.9829189 * fract(0.06711056 * v.x + 0.00583715 * v.y));
}

float pow2(float x) { return x * x; }
float pow5(float x) {
    float x2 = x * x;
    return x2 * x2 * x;
}
    
#define rcp(x) (1.0 / (x))
#define saturate(x) clamp(x, 0.0, 1.0)

float linearStep(float edge0, float edge1, float x) { return saturate((x - edge0) / (edge1 - edge0)); }


float fresnel_iorToF0(float ior) {
    return pow2((ior - AIR_IOR) / (ior + AIR_IOR));
}

float fresnel_schlick(float cosTheta, float f0) {
    return f0 + (1.0 - f0) * pow5(1.0 - cosTheta);
}


float _bsdf_g_Smith_Schlick_denom(float cosTheta, float k) {
    return cosTheta * (1.0 - k) + k;
}

float bsdf_ggx(float roughness, float NDotL, float NDotV, float NDotH) {
    if (NDotL <= 0.0) return 0.0;
    float NDotH2 = pow2(NDotH);
    float a2 = pow2(roughness);
    float d = a2 / (PI * pow2(NDotH2 * (a2 - 1.0) + 1.0));
    float k = roughness * 0.5;
    float v = rcp(_bsdf_g_Smith_Schlick_denom(NDotL, k) * _bsdf_g_Smith_Schlick_denom(saturate(NDotV), k));
    return NDotL * d * v;
}

const vec3 INCIDENT_VECTOR = vec3(0.0, 0.0, 1.0);

float glassIorCA(float wavelength) {
    const float abberation = float(CHROMATIC_ABBERATION_STRENGTH) * 0.1;
    float glassIor = mix(GLASS_IOR + abberation, GLASS_IOR - abberation, 1.0 - pow(1.0 - linearStep(450.0, 650.0, wavelength), 4.0));
    return glassIor;
}

vec3 sampleRefraction(vec2 fragCoord, float sdfValue, vec3 normal, float glassIor) {
    vec3 refractVector = refract(INCIDENT_VECTOR, normal, AIR_IOR / glassIor);
    refractVector /= abs(refractVector.z / (REFRACT_RT_DISTANCE));
    vec2 refractedUV = (fragCoord + refractVector.xy) / iResolution.xy;
    vec3 refractedColor = textureNiceTrilinear(iChannel0, refractedUV, sdfValue * 2.0 + BLUR_LOD_BIAS).rgb;
    return refractedColor;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    vec3 bg = textureNice(iChannel0, uv, 0).rgb;
    vec3 color = bg;
    
    float randV = rand_IGN(fragCoord, uint(iFrame));
    float randAngle = randV * PI * 2.0;
    
    vec2 circleCenter = all(equal(iMouse.xy, vec2(0.0))) ? vec2(iResolution.xy * 0.5) : iMouse.xy;
    float circleDist = distance(fragCoord, circleCenter);
    float sdfValue = pow(linearStep(CIRCLE_SIZE * EDGE_FRACTION, CIRCLE_SIZE, circleDist), EDGE_POWER);
    vec3 normal = mix(normalize(vec3(sin(randAngle), cos(randAngle), -rcp(NORMAL_JITER))), vec3(normalize(fragCoord - circleCenter), 0.0), sdfValue);
    normal = normalize(normal);
    
    #if CHROMATIC_ABBERATION_STRENGTH
    vec3 refractedColor = sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(611.4)) * vec3(1.0, 0.0, 0.0);
    refractedColor += sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(570.5)) * vec3(1.0, 1.0, 0.0);
    refractedColor += sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(549.1)) * vec3(0.0, 1.0, 0.0);
    refractedColor += sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(491.4)) * vec3(0.0, 1.0, 1.0);
    refractedColor += sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(464.2)) * vec3(0.0, 0.0, 1.0);
    refractedColor += sampleRefraction(fragCoord, sdfValue, normal, glassIorCA(374.0)) * vec3(1.0, 0.0, 1.0);
    refractedColor /= 3.0;
    #else
    vec3 refractedColor = sampleRefraction(fragCoord, sdfValue, normal, GLASS_IOR);
    #endif
    
    const vec3 V = vec3(0.0, 0.0, -1.0);
    float NDotV = saturate(dot(V, normal));
    
    float fresnelV = fresnel_schlick(NDotV, fresnel_iorToF0(GLASS_IOR));
    
    vec3 reflectVector = reflect(INCIDENT_VECTOR, normal);
    vec3 L = reflectVector;
    vec3 H = normalize(L + V);
    reflectVector /= abs(reflectVector.z / (REFLECT_RT_DISTANCE));
    
    vec2 reflectedUV = (fragCoord + reflectVector.xy) / iResolution.xy;
    vec3 reflectedColor = textureNiceTrilinear(iChannel0, reflectedUV, 2.5 + BLUR_LOD_BIAS).rgb;
    
    float NDotL = dot(normal, L);
    float NDotH = dot(normal, H);
    
    float ggx = bsdf_ggx(0.5, NDotL, NDotV, NDotH);
    reflectedColor *= ggx;
    
    vec3 glassColor = mix(refractedColor, reflectedColor, fresnelV);
    
    color = mix(color, vec3(glassColor), smoothstep(CIRCLE_SIZE, CIRCLE_SIZE - 2.0, circleDist));
    
    color = pow(color, vec3(1.0 / 2.2));

    // Output to screen
    fragColor = vec4(color,1.0);
}
