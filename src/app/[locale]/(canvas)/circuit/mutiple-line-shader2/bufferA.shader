// particle movement buffer
// -------------------------
// instantiate particles and
// calculate direction and life of particles
//
// fragColor xy = direction vector
// fragColor z  = particle life
// fragColor w  = probability of particle being 'electric'

const float psr  = 1e-6;     // spawn rate
const float lr   = 0.99;     // life rate
const float blrd = 0.00;     // electric life rate diff
const float lbt  = 0.1;     // life branch threshold
const float pi   = 3.14159;  // pi
const float o    = -1.;      // orientation
const float sp   = 1e-4;

#define BRANCH 1
#define ONLY_BRANCH_BG_TRAILS 0

// https://mathworld.wolfram.com/RotationMatrix.html
mat2 rot(float t){
    return mat2(
        cos(t), sin(t),
        -sin(t), cos(t)
    );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 r = iResolution.xy;
    vec2 uv = fragCoord/r;
    
    
    vec3 h = hash33(vec3(fragCoord, 1.));
    vec4 c;
    vec4 p = texture(iChannel0, uv);
    
    // initialize points
    if (iFrame < 10) {
        // initial direction
        float angle = -0.3;//floor(h.y*8.)/8. * 2.*pi;//h.y < 0.5 ? -0.9 : -0.3;
        p = vec4(0);

        vec2 axis = vec2(1.0);//h.y < 0.5 ? vec2(1,0) : vec2(0,1); // axis
        if (h.x < psr) { p.xy = round(axis*rot(angle)); p.z = 1.; p.w = hash12(fragCoord); }
    }
    else {
        
        vec2 d = vec2(0);
        float ww = 0.0;
        int split = 0;
        
        for (int x = -1; x <= 1; ++x) {
            for (int y = -1; y <= 1; ++y) {
                vec4 n = texture(iChannel0, uv + vec2(x, y)/r);
                if (n.xy == o*vec2(x,y)) {
                    if (n.xy != vec2(0))  { d = n.xy; ww = n.w; }
                }
                if (n.xy == -1.*o*vec2(x,y) && h.x < sp) {
                    if (n.xy != vec2(0)) split += 1;
                }
            }
        }
        bool bbgt = ONLY_BRANCH_BG_TRAILS == 1 ? ww < br : true;
        
        // trail
        if (p.z > 0.0) {
            p.xy *= 0.0;
            p.z *= p.w < br ? lr : min(p.w,lr-blrd);
        }
        
        if (d != vec2(0)) {
            if (BRANCH == 1 && p.z > lbt && bbgt) d = round(d*rot(pi/(h.x<.5?4.:-4.)));
            p.xy = d;
            p.z = 1.0;
            p.w = ww;
        }
        
        if (BRANCH == 1 && split == 1 && bbgt){                            
            d = round(d*rot(pi/(h.x<1e-3?-4.:4.))); 
            p.xy = d;    
            p.z = 1.;                             
        }
    }
    
    
    c = p;
    fragColor = c;
}
