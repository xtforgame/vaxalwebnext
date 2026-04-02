// https://www.shadertoy.com/view/dsKGzK

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy;
    vec2 puv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    vec3 col = vec3(0.0);
    col += texelFetch(iChannel0, ivec2(fragCoord), 0).x;
    col.rg += curl_noise(puv).xy * 0.5;
    //col.rg += texture(iChannel1, uv).rg * 0.5 + 0.5;
    
    fragColor = vec4(col, 1.0);
}