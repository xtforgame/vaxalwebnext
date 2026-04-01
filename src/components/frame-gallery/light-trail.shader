// https://www.shadertoy.com/view/4d2BDm
#define RED vec3(1.0,0.0,0.0)
#define GREEN vec3(0.0,1.0,0.0)
#define BLUE vec3(0.0,0.05,1.0)
#define YELLOW vec3(1.0,1.0,0.0)
#define WHITE vec3(1.0,1.0,1.0)
#define PI 3.141592653
vec2 rotatevec2(vec2 vec, float ang)
{
    
    return vec2(vec.x * cos(ang) - vec.y * sin(ang),
                vec.x * sin(ang) + vec.y * cos(ang));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy / iResolution.x;
    uv -= vec2(.5,.5*(iResolution.y/iResolution.x));
	uv *= 4.6;
    
    /// fun values to edit
    const float numParticles = 6.;
    float moBlurStrength = 900.;
    float tangentStrength = 1.6;
    float timeSpeed = 0.003;
    
    
    float texHeight = 256.;//float(textureSize(iChannel0,0).y);
    float time = iTime*timeSpeed;
    float timeB = iTime*timeSpeed-0.0002;
    
    ///// particles
    vec3 particles = vec3(0.0,0.0,0.0);
    vec2 p1, p2, t1, t2;
    vec2 p1B, p2B, t1B, t2B;
    
    for (float i = 0.; i<1.0; i+=1./numParticles)
    {
        time += i*16.6516;
        timeB += i*16.6516;
        p1 = texture(iChannel0,vec2(i,0.)+vec2(fract(((time/texHeight)/2.)*2.),fract(time))).xy-vec2(.5);
        p2 = texture(iChannel0,vec2(i,0.)+vec2(fract(((time/texHeight)/2.)*2.),fract(time+1./texHeight))).xy-vec2(.5);
        t1 = texture(iChannel0,vec2(i,0.)+vec2(fract(((time/texHeight)/2.)*2.+1./texHeight),fract(time))).xy-vec2(.5);
        t2 = texture(iChannel0,vec2(i,0.)+vec2(fract(((time/texHeight)/2.)*2.+1./texHeight),fract(time+1./texHeight))).xy-vec2(.5);

        p1B = texture(iChannel0,vec2(i,0.)+vec2(fract(((timeB/texHeight)/2.)*2.),fract(timeB))).xy-vec2(.5);
        p2B = texture(iChannel0,vec2(i,0.)+vec2(fract(((timeB/texHeight)/2.)*2.),fract(timeB+1./texHeight))).xy-vec2(.5);
        t1B = texture(iChannel0,vec2(i,0.)+vec2(fract(((timeB/texHeight)/2.)*2.+1./texHeight),fract(timeB))).xy-vec2(.5);
        t2B = texture(iChannel0,vec2(i,0.)+vec2(fract(((timeB/texHeight)/2.)*2.+1./texHeight),fract(timeB+1./texHeight))).xy-vec2(.5);

        t1 = normalize(p1-t1)*tangentStrength;
        t2 = normalize(p2-t2)*tangentStrength;

        t1B = normalize(p1B-t1B)*tangentStrength;
        t2B = normalize(p2B-t2B)*tangentStrength;

        /*
        particles += RED*vec3(smoothstep(0.02,0.004,length(uv+p1))); // p1
        particles += GREEN*vec3(smoothstep(0.02,0.004,length(uv+p2))); // p2
        particles += BLUE*vec3(smoothstep(0.02,0.004,length(uv+p1+t1))); // t1
        particles += YELLOW*vec3(smoothstep(0.02,0.004,length(uv+p2+t2))); // t2
		*/
        
        vec2 p3, p4;
        vec2 p3B, p4B;
        if (mod(floor(time*texHeight),2.)==1.0)
        {
            p3 = mix(p1,p1-t1,fract(time*texHeight));
            p4 = mix(p2-t2,p2,fract(time*texHeight));
        }
        else
        {
            p3 = mix(p1,p1+t1,fract(time*texHeight));
            p4 = mix(p2+t2,p2,fract(time*texHeight));
        }
        if (mod(floor(timeB*texHeight),2.)==1.0)
        {
            p3B = mix(p1B,p1B-t1B,fract(timeB*texHeight));
            p4B = mix(p2B-t2B,p2B,fract(timeB*texHeight));
        }
        else
        {
            p3B = mix(p1B,p1B+t1B,fract(timeB*texHeight));
            p4B = mix(p2B+t2B,p2B,fract(timeB*texHeight));
        }

        //particles += RED*vec3(smoothstep(0.06,0.0,length(uv+p3)));
        //particles += GREEN*vec3(smoothstep(0.06,0.0,length(uv+p4)));
        //particles *= 0.6;
        //particles += WHITE*vec3(smoothstep(0.06,0.0,length(uv+mix(p1,p2,fract(time*texHeight)))));

        vec2 finPos = uv+mix(p3,p4,smoothstep(0.0,1.0,fract(time*texHeight)));
        vec2 finPos2 = uv+mix(p3B,p4B,smoothstep(0.0,1.0,fract((timeB)*texHeight)));

        vec2 finSpeed = finPos2-finPos;
        
        finPos += (texture(iChannel0, vec2(i)).xy-vec2(.5))*vec2(2.6,1.0);
        
        float pSize = 1.0+3.*(texture(iChannel0,vec2(0.,i)).x);

        //particles += .2*(RED+YELLOW)*vec3(smoothstep(0.05,0.0,pSize*length(finPos)));
        
        particles += .012*(YELLOW)*vec3(0.18/(pSize*length(finPos)));
        
        finPos = rotatevec2(finPos,atan(finSpeed.x/finSpeed.y));
        finPos.y *= 1.-clamp(length(abs(finSpeed))*moBlurStrength*timeSpeed,0.0,0.8);
		
        //particles += .2*(RED+YELLOW)*vec3(smoothstep(0.14,0.0,pSize*length(finPos)));
        
        finPos.y *= 1.-clamp(length(abs(finSpeed))*moBlurStrength*pSize*timeSpeed,0.0,0.8);
        
        //particles += .2*(RED+YELLOW)*vec3(smoothstep(0.05,0.0,pSize*length(finPos)));
        particles += vec3(smoothstep(0.03,0.004,pSize*length(finPos)));
        //\\\ END particles
    }
    fragColor = vec4(particles.xyz,1.)+texture(iChannel1,(fragCoord.xy / iResolution.xy))*0.97;
    //fragColor = vec4(0.3,0.,0.3,1.0)+(1.-gradient.y)*vec4(0.6,0.3,0.0,1.0)+vec4(particles,1.);
    //fragColor += .6*vec4(abs(finSpeed),0.,1.0);
}