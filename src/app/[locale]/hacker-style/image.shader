// FBM function by @patriciogv
// http://patriciogonzalezvivo.com
#define NUM_OCTAVES 3
#ifdef FBM
float fbm (in vec2 uv) {
    float v = 0.0;
    float a = 0.55;
    vec2 shift = vec2(10.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.001 * iTime), tan(0.005),
                    -sin(0.005), cos(0.001 * iTime));
    for (int i=0; i<NUM_OCTAVES; ++i) {
        v += a * noise(uv);
        uv = rot * uv * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}
#endif

void mainImage (out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    
    // Mouse coords
    vec2 mc = (iMouse.xy - 0.5*iResolution.xy)/iResolution.y;
    if (length(iMouse.xy) < 20.0) 
    {
        mc = vec2(0.0);
    }
    
    // Background noise
    vec3 blue = vec3(0.3, 0.35, 0.4);
    float n = noise((uv.xx+iTime*0.02) * 20.0) * max(-uv.x, 0.0);
    n += noise((uv.xx+iTime*-0.02) * 20.0) * max(uv.x, 0.0);
    
    float frbm = 0.4;
#ifdef FBM
    frbm = fbm(uv*6.0 + vec2(0.0, iTime*0.2));
#endif
    float s = max((uv.y/abs(uv.x)+0.5) * abs(uv.x), 0.0);
    vec3 col = mix(vec3(0.0), blue, (n+frbm)*s);
    
    // Characters     
    for (float i=0.0; i<GRID_X; i++) 
    {
        float coord = ((i*iResolution.x + 0.5)/(GRID_X-1.0));
        vec2 t = texelFetch(iChannel0, ivec2(coord, iResolution.y-0.5), 0).xw;
        
        // Scale
        vec2 stuv = uv * (2.0 - t.y*2.0) *
            vec2(GRID_Y, GRID_X)/(GRID_X > GRID_Y ? GRID_Y : GRID_X) + 0.5;
            
        // Position
        vec2 st = vec2(stuv.x + i/GRID_X - 0.5, stuv.y - 0.5);
        vec2 epos = vec2(random(vec2(i+t.x))*0.6 - 0.3, random(vec2(i+t.x+0.1))+0.3);
        
        st += mix(epos * vec2(0.5, 3.0) - vec2(0.0, 3.0), epos, t.y);
        st += mc * 0.25;

        float sbox = step(sdBox(
                        st - vec2((i+0.5)/GRID_X, 0.5),
                        vec2(0.5/GRID_X, 0.5)),
                     0.0);
                     
        float fade = min(t.y*2.0, 1.0) * clamp((1.0-t.y)*10.0, 0.0, 1.0);
        
        vec3 tex = texture(iChannel0, st).rgb;
        tex.r = 0.3*(tex.g + tex.b);
        col += tex * sbox * fade;
    }
    
    // Debug
    //col = texture(iChannel0, fragCoord/iResolution.xy).rgb;

    fragColor = vec4(col, 1.0);
}