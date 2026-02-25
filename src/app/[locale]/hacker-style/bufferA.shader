// Get character
float getChar 
(
    vec2 uvid,
    vec2 uvst,
    vec2 uv,
    vec2 id,
    float dmult,
    float gmip,
    float gmult
)
{
    vec2 dx = (dFdx(uv)*vec2(GRID_X, GRID_Y)/16.0) * dmult;
    vec2 dy = (dFdy(uv)*vec2(GRID_X, GRID_Y)/16.0) * dmult;
    vec2 s = (uvst-0.5)/16.0 + 1.0/32.0 + id/16.0;
    float char = textureGrad(iChannel0, s, dx, dy).r;
    
    char = max(char, textureLod(iChannel0, s, gmip).r * gmult
            * smoothstep(0.1, 0.0, sdBox(uvst-0.5, vec2(0.36))));
    char *= step(sdBox(uvst-0.5, vec2(1.0)), 0.0);
    
    return char;
}

void mainImage (out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord/iResolution.xy;

    vec2 uvid = floor(uv * vec2(GRID_X, GRID_Y));
    vec2 uvst = fract(uv * vec2(GRID_X, GRID_Y));
    
    float randX = random(uvid.xx)*3.0;
    float progress = iTime*(randX*0.3 + 0.4) + randX * (GRID_Y-0.01) + 1.0;
    float rowLength = floor(progress);
    float iter = floor(rowLength / (GRID_Y+2.0));
    rowLength = mod(rowLength, GRID_Y+2.0);
    
    float char = 0.0;
    float time = 0.0;
    float glowMip = 3.0;
    float glowMult= 1.0; 
    
    // Timer
    float timer = mod(progress, GRID_Y+2.0) / (GRID_Y+2.0);
    
    // Character grid
    if (uvid.y > GRID_Y - rowLength - 1.0) 
    {
        if (uvid.y == GRID_Y - rowLength)
        {
            time = floor(mod(iTime*26.0, 260.0));
            glowMip = 3.6;
            glowMult= 2.6;
        }
        uvid /= vec2(GRID_X, GRID_Y);
        vec2 cid = vec2(
                        floor(random(uvid+iter)*14.0 + 1.0),
                        floor(random(uvid+0.5 + time)*5.0 + 8.0)
                    );
                    
        float dmult = clamp((GRID_Y - timer*GRID_Y*2.0), 1.0, 6.0);
                    
        char = getChar(uvid, uvst, uv, cid, dmult, glowMip, glowMult);
    }
    
    // Color mix
    vec3 blue = vec3(0.0, 0.8, 1.0);
    vec3 green= vec3(0.0, 1.0, 0.8);
    vec3 col = mix(blue, green, random(uvid + iter)) * char;
    
    // Iter counter
    col.r = mod(iter*0.01 + random(uvid.xx), 1.0);
    
    fragColor = vec4(col, timer);
}