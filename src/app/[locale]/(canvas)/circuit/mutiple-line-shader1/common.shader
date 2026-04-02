float hash21(vec2 p)
{
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
	return fract(p.x * p.y);
}

// noise function from https://www.shadertoy.com/view/Msf3WH
vec2 hash( vec2 p ) // replace this by something better
{
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float simplex_noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

	vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
	vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

#define NSIZE 1.25
#define NSPEED 0.12
vec3 curl_noise(vec2 p)
{
    const float dt = .001;//1e-4;
    vec2 ds = vec2(dt, 0.0);
    
    p /= NSIZE;
    float n0 = simplex_noise(p);
    float n1 = simplex_noise(p + ds.xy);
    float n2 = simplex_noise(p + ds.yx);
    
    vec2 grad = vec2(n1 - n0, n2 - n0) / ds.x;
    vec2 curl = vec2(grad.y, -grad.x);
    return vec3(curl, n0) * NSIZE * NSPEED;
}
