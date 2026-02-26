// 'Hacking the Gibson'
// Thanks to Evvvvil, Flopine, Nusan, BigWings, Iq and a bunch of others for sharing their knowledge!
// Thanks FabriceNeyret2 for the text code: https://www.shadertoy.com/view/llySRh

#define RET(a) uv.y += 1.0; uv.x += a * 0.45
#define SPC uv.x -= 0.45
#define CHR(x)  g += char(uv, x); SPC

float char(vec2 p, int c) {
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0)
        return 0.0;
    vec2 dFdx = dFdx(p / 16.0), dFdy = dFdy(p / 16.0);
	return textureGrad(iChannel0, p / 16.0 + fract(vec2(c, 15 - c / 16) / 16.), dFdx, dFdy).r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;
    uv.y -= 1.0;
    uv *= 16.0;
    uv.y += 1.0;
    
	float g = 0.0;
    CHR(47); CHR(47); SPC; CHR(70); CHR(114); CHR(111); CHR(109); SPC; CHR(68); CHR(101); CHR(97); CHR(110); CHR(84); CHR(104); CHR(101); CHR(67); CHR(111); CHR(100); CHR(101); CHR(114); CHR(46);
    RET(21.0);
    CHR(119); CHR(104); CHR(105); CHR(108); CHR(101); SPC; CHR(40); CHR(49); CHR(41);
    RET(9.0);
    CHR(123);
    RET(1.0); SPC; SPC; CHR(99); CHR(111); CHR(117); CHR(116); SPC; CHR(60); CHR(60); SPC; CHR(34); CHR(89); CHR(111); SPC; CHR(70); CHR(108); CHR(111); CHR(112); CHR(105); CHR(110); CHR(101); CHR(33); CHR(92); CHR(110); CHR(34); CHR(59);
    RET(26.0); SPC; SPC; CHR(105); CHR(110); CHR(105); CHR(116); CHR(95); CHR(69); CHR(118); CHR(118); CHR(118); CHR(118); CHR(105); CHR(108); CHR(40); CHR(34); CHR(66); CHR(114); CHR(111); CHR(115); CHR(107); CHR(105); CHR(34); CHR(41); CHR(59);
    RET(25.0); SPC; SPC; CHR(97); CHR(112); CHR(112); CHR(108); CHR(121); CHR(73); CHR(81); CHR(66); CHR(114); CHR(97); CHR(105); CHR(110); CHR(115); CHR(40); CHR(41); CHR(59);
    RET(18.0);
    SPC; SPC; CHR(65); CHR(114); CHR(116); CHR(79); CHR(102); CHR(67); CHR(111); CHR(100); CHR(101); SPC; CHR(43); CHR(61); SPC; CHR(66); CHR(105); CHR(103); CHR(87); CHR(105); CHR(110); CHR(103); CHR(115); CHR(59);
    RET(24.0);
    CHR(125);
    RET(1.0);
    RET(0.0);
    CHR(118); CHR(111); CHR(105); CHR(100); SPC; CHR(72); CHR(97); CHR(99); CHR(107); CHR(84); CHR(104); CHR(101); CHR(80); CHR(108); CHR(97); CHR(110); CHR(101); CHR(116); CHR(40); CHR(41); SPC; CHR(123);
    RET(22.0);
    SPC; SPC; CHR(47); CHR(47); SPC; CHR(84); CHR(79); CHR(68); CHR(79); SPC; CHR(45); SPC; CHR(87); CHR(97); CHR(116); CHR(99); CHR(104); SPC; CHR(72); CHR(97); CHR(99); CHR(107); CHR(101); CHR(114); CHR(115); CHR(46);
    RET(26.0);
    SPC; SPC; CHR(114); CHR(101); CHR(116); CHR(117); CHR(114); CHR(110); CHR(59);
    RET(9.0);
    CHR(125);
    
	vec3 col = vec3(g);
    fragColor = vec4(col, 1.0);
}