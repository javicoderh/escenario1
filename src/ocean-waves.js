// One world-space wave field drives both GPU water and CPU buoyancy.
// Amplitudes are meters; deep-water dispersion gives each swell its own rhythm.
export const OCEAN_WAVES = [
  { amplitude: .44, wavelength: 46, direction: [.92, .39], phase: .4 },
  { amplitude: .21, wavelength: 28, direction: [-.43, .90], phase: 1.7 },
  { amplitude: .09, wavelength: 15, direction: [.64, -.77], phase: 3.2 },
].map(wave => {
  const length = Math.hypot(...wave.direction), k = Math.PI * 2 / wave.wavelength;
  return { ...wave, x: wave.direction[0] / length, z: wave.direction[1] / length,
    k, omega: Math.sqrt(9.81 * k) };
});

export const MAX_SWELL_HEIGHT = OCEAN_WAVES.reduce((sum, wave) => sum + wave.amplitude, 0);

export function sampleOcean(x, z, time, result = {}) {
  result.height = 0; result.slopeX = 0; result.slopeZ = 0;
  for (const wave of OCEAN_WAVES) {
    const phase = wave.k * (wave.x * x + wave.z * z) - wave.omega * time + wave.phase;
    const slope = wave.amplitude * wave.k * Math.cos(phase);
    result.height += wave.amplitude * Math.sin(phase);
    result.slopeX += slope * wave.x; result.slopeZ += slope * wave.z;
  }
  return result;
}

export function oceanHeight(x, z, time) {
  let height = 0;
  for (const wave of OCEAN_WAVES)
    height += wave.amplitude * Math.sin(wave.k * (wave.x * x + wave.z * z) - wave.omega * time + wave.phase);
  return height;
}

const glsl = value => value.toFixed(10);
export const OCEAN_GLSL = `
  vec3 oceanSurface(vec2 p, float time) {
    vec3 result = vec3(0.0);
    ${OCEAN_WAVES.map(wave => `{
      vec2 direction = vec2(${glsl(wave.x)}, ${glsl(wave.z)});
      float phase = ${glsl(wave.k)} * dot(direction, p) - ${glsl(wave.omega)} * time + ${glsl(wave.phase)};
      result.x += ${glsl(wave.amplitude)} * sin(phase);
      result.yz += direction * (${glsl(wave.amplitude * wave.k)} * cos(phase));
    }`).join('\n')}
    return result;
  }
`;
