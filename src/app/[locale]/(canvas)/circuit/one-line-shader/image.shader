// https://www.shadertoy.com/view/tsXczj

#define ANIMATION_TIMESCALE 0.5
#define ANIM_FUNC Quart

//https://www.shadertoy.com/view/ltl3DB
//https://www.shadertoy.com/view/4dc3zr

int ANIMATION_TYPE = 3;

float sdLine(in vec2 p, in vec2 a, in vec2 b) 
{
	vec2 pa = p-a, ba = b-a;
	float h = clamp(dot(pa, ba) / dot(ba , ba), 0.0, 1.0);
	return length(pa - ba * h);
}

float sdCircle(in vec2 p, in float r) 
{
    return length(p)-r;
}

float sdRing(vec2 p, vec2 origin, float radius) 
{
	return abs(length(p - origin) - radius);
}

float Quart(float s, float e, float t)
{
    t = clamp((t - s) / (e - s), 0.0, 1.0);
    return 1.0 - pow(1.0 - t, 4.0);
}

float circuit(vec2 p) 
{
	float d = 1e6;
	d = min(d, sdLine(p, vec2(-1.0, -0.1), vec2(-0.1, -0.1)));
	d = min(d, sdLine(p, vec2(-0.1, -0.1), vec2(0.1, 0.1)));
	d = min(d, sdLine(p, vec2(0.1, 0.1), vec2(1, 0.1)));
	d = min(d, sdRing(p, vec2(1.05, 0.1), 0.05));
    return d;
} 

void mainImage(out vec4 fragColor, in vec2 fragCoord) 
{
    float aspectRatio = iResolution.x / iResolution.y;
    vec2 uv = 2.0 * fragCoord / iResolution.xy - 1.0;
    uv.x *= aspectRatio;
    
    vec3 col = vec3(0.0);
    
    //setup timer loop
    float time = iTime * ANIMATION_TIMESCALE;
    time = mod(time, 4.0);
    
    float mask;
    float x = uv.x;
        
    if (ANIMATION_TYPE == 1)
    {
        //setup animation
        float move = ANIM_FUNC(0.0, 1.0, time) - ANIM_FUNC(2.0, 3.0, time);

        //setup mask
        x += 2.0 * aspectRatio * (1.0 - move);
        mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x);
    }
    
    if (ANIMATION_TYPE == 2)
    {
        //setup animation
        float moveIn = ANIM_FUNC(0.0, 1.0, time);
        float fadeOut = ANIM_FUNC(3.0, 2.0, time);

        //setup mask
        x += 2.0 * aspectRatio * (1.0 - moveIn);
        mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x);
        mask *= fadeOut;
    }
    
    if (ANIMATION_TYPE == 3)
    {    
        //setup animation
        float moveIn = ANIM_FUNC(0.0, 1.0, time);
        float moveOut = ANIM_FUNC(2.0, 3.0, time);

        //setup mask
        x += 2.0 * aspectRatio * (1.0 - moveIn - moveOut);
        mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x);
    }
    
    if (ANIMATION_TYPE == 4)
    {    
        //setup animation
        float scale = ANIM_FUNC(0.0, 1.0, time) - ANIM_FUNC(2.0, 3.0, time);
        
        //setup mask     
        x /= scale;
        mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x); 
    }
    
    //draw circuit
    float d = circuit(uv);
    float shade = 0.008 / d;
    col += vec3(1.0, 0.2, 0.0) * shade;
    //col = mix(col, vec3(1.0, 0.2, 0.0), shade);
    
    //apply mask
    col *= mask;
    //col = vec3(mask);
    
    //output
    fragColor = vec4(col, 1.0);
}
