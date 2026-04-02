// https://www.shadertoy.com/view/XcjyDK
// output final colored result (buffer B)

const vec2 offset = vec2(0.5);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord+offset)/iResolution.xy;
    vec4 c = texture(iChannel0, uv);
    
    fragColor = c;
}
