// River shader with north-south flow and natural frequencies
export const riverVertexShader = `
    uniform float time;
    uniform float flowSpeed;
    uniform float waveHeight;
    varying vec2 vUv;
    varying float vElevation;
    varying float vDistortion;
    
    // Simple noise function
    float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // River flows north-south (along Y coordinate in plane space)
        // Create meandering path
        float meander = sin(position.y * 0.08 + 0.5) * 1.2;
        float meander2 = sin(position.y * 0.05 - 0.3) * 0.8;
        
        // Slow wave frequencies moving north-south
        float wave1 = sin(position.y * 0.6 - time * flowSpeed + meander * 0.2) * 0.4;
        float wave2 = cos(position.y * 0.4 - time * flowSpeed * 0.8 + position.x * 0.1) * 0.3;
        float wave3 = sin(position.y * 0.8 - time * flowSpeed * 0.6 + meander2 * 0.15) * 0.2;
        
        // Add gentle turbulence
        float turbulence = noise(vec2(position.y * 0.15 - time * 0.02, position.x * 0.1)) * 0.2;
        float edgeTurbulence = noise(vec2(position.x * 0.4, position.y * 0.2 - time * 0.01)) * 0.25;
        
        // Asymmetric flow - stronger on west side
        float westBias = 1.0 - (position.x + 4.0) / 8.0; // Stronger current on negative X
        float distFromCenter = abs(position.x) / 4.0;
        float flowStrength = (1.0 - distFromCenter * distFromCenter) * (0.6 + westBias * 0.4);
        
        // Combine waves naturally
        float totalWave = (wave1 + wave2 + wave3) * flowStrength + turbulence * 0.08;
        pos.z = totalWave * waveHeight + edgeTurbulence * waveHeight * 0.4;
        vElevation = pos.z;
        vDistortion = turbulence + edgeTurbulence;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const riverFragmentShader = `
    uniform vec3 color;
    uniform float opacity;
    uniform float time;
    uniform float flowSpeed;
    varying vec2 vUv;
    varying float vElevation;
    varying float vDistortion;
    
    float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
        // Create foam patterns flowing north-south
        float foam1 = step(0.94, sin((vUv.y * 3.0 - time * flowSpeed * 1.5) + vDistortion));
        float foam2 = step(0.96, sin((vUv.y * 2.0 - time * flowSpeed * 2.0) + vUv.x * 0.5));
        float foamStreaks = step(0.95, sin((vUv.y * 4.0 - time * flowSpeed) + noise(vUv * 3.0) * 0.5));
        float foam = max(foam1, max(foam2, foamStreaks)) * (0.5 + noise(vUv * 8.0) * 0.5);
        
        // Water color variation
        vec3 deepColor = color * 0.7;
        vec3 shallowColor = color * 1.15;
        vec3 mudColor = vec3(0.3, 0.25, 0.2);
        
        // Mix based on depth
        float depthFactor = clamp(vElevation * 10.0 + 0.5, 0.0, 1.0);
        vec3 waterColor = mix(deepColor, shallowColor, depthFactor + vDistortion * 0.3);
        
        // Add muddy edges (along X axis since flow is north-south)
        float edgeFactor = smoothstep(0.6, 0.9, abs(vUv.x - 0.5) * 2.0);
        waterColor = mix(waterColor, mudColor, edgeFactor * 0.3);
        
        // Add foam
        waterColor = mix(waterColor, vec3(0.9, 0.92, 0.95), foam * 0.3);
        
        // Natural shimmer - slower
        float shimmer = 0.92 + sin(vUv.y * 15.0 - time * 0.3) * 0.04 
                      + cos(vUv.x * 10.0 + time * 0.2) * 0.04;
        waterColor *= shimmer;
        
        gl_FragColor = vec4(waterColor, opacity * (0.65 + depthFactor * 0.35));
    }
`;