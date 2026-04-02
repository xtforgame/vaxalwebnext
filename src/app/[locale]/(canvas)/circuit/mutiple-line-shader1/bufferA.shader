void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy;
    vec2 puv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    if (iFrame == 0)
    {
        fragColor = puv.xyxy;
    }
    else
    {
        vec2 p0 = texelFetch(iChannel0, ivec2(fragCoord), 0).xy;

        vec2 v0 = curl_noise(p0*2.).xy;
        float len = length(v0);
        
        v0 = normalize(v0)*1.99;
        v0 = vec2(float(int(v0.x)),float(int(v0.y)));
        
        if (iMouse.z > 0.0)
        {
            vec2 ms = (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y;
            vec2 mv = (ms - p0) * 0.5;
            mv /= dot(mv, mv) + 0.04;
            mv = vec2(mv.y, -mv.x);
            v0 += mv * 0.2;
        }
        
        vec2 p1 = p0 + v0 * iTimeDelta;
        
        vec4 c = texelFetch(iChannel1, ivec2(fragCoord), 0);
        
        if (c.y <= 0.0)
        {
            fragColor = puv.xyxy;
        }
        else
        {
            fragColor = vec4(p1, p0);
        }
        
    }
}