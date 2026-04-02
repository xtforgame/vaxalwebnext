// https://www.shadertoy.com/view/MdXcR7

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    
    float y = mod(-iTime / 4., 1.9) - 0.4;
    float str = -pow((uv.y - y) * 110., 2.) + .8;
    uv.x -= clamp(str * .01, 0., 1.);
    fragColor = texture(iChannel0, uv);
    
    float colorAdd = pow(1. - pow(abs(uv.y - y), .3), 3.);
    fragColor.g += colorAdd * .5;
    fragColor.b += colorAdd * 1.;
}