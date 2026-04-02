#define COL (36)
#define ROW (20)
#define DW (1.0 / float(COL))
#define DH (1.0 / float(ROW))

#define LINE_WIDTH 0.012
#define TRAIL_FADE 0.97

#define MAXLIFE 400.
#define MINLIFE 100.

vec2 sdSegment(vec2 p, vec2 d)
{
    float lp = dot(p, d) / dot(d, d);
    return p - d * clamp(lp, 0.0, 1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy;
    vec2 puv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    vec4 col = texelFetch(iChannel1, ivec2(fragCoord), 0);
    col.x *= TRAIL_FADE;
    
    for (int ix = 0; ix < COL; ix++)
    {
        for (int iy = 0; iy < ROW; iy++)
        {
            vec2 gid;
            gid.x = DW * (float(ix) + 0.5);
            gid.y = DH * (float(iy) + 0.5);
            vec4 ppos = texture(iChannel0, gid);
            vec2 dn = sdSegment(puv - ppos.xy, ppos.zw - ppos.xy);
            float a = smoothstep(LINE_WIDTH, 0.0, length(dn));
            col.x = max(col.x, a);
        }
    }
    
    col.x = clamp(col.x, 0.0, 1.0);
    
    if (col.y > -1.0)
    {
        col.y--;
    }
    else
    {
        col.y = hash21(uv);
    	col.y = mix(MINLIFE, MAXLIFE, col.y);
    }
    
    fragColor = col;
}