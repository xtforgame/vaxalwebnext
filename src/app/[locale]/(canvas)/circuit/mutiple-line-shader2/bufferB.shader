// color buffer
// -------------------------
// remap direction and life data from buffer A
// to desired color / look of the simulation

const vec3 pc  = vec3(1,1,1);             // particle color
const vec3 ctc  = vec3(26, 21, 54)/255.0; // trail color
const vec3 btc = vec3(0, 255, 242)/255.0; // electric trail color
const vec3 bgc = (vec3(7, 3, 33)/255.0);  // bg color
const float lum = 4.;                     // brightness

// vignette settings
#define INNER_RADIUS 0.5f
#define OUTER_RADIUS 0.85f
#define MIX_RATE 0.4f

// https://www.shadertoy.com/view/wd3cDf
vec3 vig (vec2 uv) {
    vec2 center = vec2(iResolution.x / 2.f, iResolution.y / 2.f) / iResolution.xy;
    float dist = 1.f-distance(uv, center);
    float vig = smoothstep(INNER_RADIUS, OUTER_RADIUS, dist);
    vec3 col = vec3(0.5f,0.5f,0.5f);
    return mix(col, col * vig, MIX_RATE);
}

vec3 dir_to_col(vec4 p, vec2 uv) {
    vec2 dir = p.xy;
    float life = p.z;
    float h = p.w; // use to determine if particle is 'electric'
    // create gradient/vignette effect with bg color
    vec3 bg = bgc * (vig(uv)); 
    
    vec3 result;
    if (vec3(dir, life) == vec3(0)) {       // BG
        result = bg;
    }
    else if (dir == vec2(0)) {              // Trails
        vec3 tc = h < br ? ctc : btc*2.;       // Determine if electric or regular
        result = mix(tc, bg, 1.-life);      // Fade the trail towards the bg color based on life
    }
    else if (dir != vec2(0)) result = pc;   // Particle
    
    return result * lum;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    
    vec4 pmap = texture(iChannel0,uv);
    
    fragColor = vec4(dir_to_col(pmap, uv), 1.);
}
