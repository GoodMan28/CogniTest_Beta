import mongoose from 'mongoose';
import { PhysicsQuestion } from '../models/Question';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const instituteId = new mongoose.Types.ObjectId("64a1b2c3d4e5f6a7b8c9d0e1");

const mockQuestions = [
  // KINEMATICS
  {
    instituteId, subject: 'Physics', chapter: 'Kinematics', topic: ['Projectile Motion'],
    questionIntent: 'Testing concept of 2D motion and projectile trajectories',
    questionText: 'A projectile is fired with initial velocity $u$ at an angle $\\theta$ to the horizontal. What is the equation of its trajectory?',
    options: ['$$y = x \\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}$$', '$$y = x \\sin\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}$$', '$$y = x \\tan\\theta - \\frac{gx^2}{u^2\\sin^2\\theta}$$', '$$y = x \\cos\\theta - \\frac{gx^2}{2u^2\\sin^2\\theta}$$'],
    correctOption: '$$y = x \\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}$$',
    solutionText: 'The standard equation of trajectory for a projectile is derived by eliminating $t$ from $x = u\\cos\\theta \\cdot t$ and $y = u\\sin\\theta \\cdot t - \\frac{1}{2}gt^2$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Kinematics', topic: ['Relative Motion'],
    questionIntent: 'Calculate relative velocity in 2D',
    questionText: 'Rain is falling vertically with a speed of $30 \\text{ m/s}$. A woman rides a bicycle with a speed of $10 \\text{ m/s}$ in the north to south direction. What is the direction in which she should hold her umbrella?',
    options: ['At an angle of $\\tan^{-1}(1/3)$ with the vertical towards the south', 'At an angle of $\\tan^{-1}(3)$ with the vertical towards the north', 'At an angle of $\\tan^{-1}(1/3)$ with the vertical towards the north', 'Vertically downwards'],
    correctOption: 'At an angle of $\\tan^{-1}(1/3)$ with the vertical towards the south',
    solutionText: 'Velocity of rain $\\vec{v}_r = -30\\hat{j}$. Velocity of woman $\\vec{v}_w = -10\\hat{i}$. Relative velocity of rain w.r.t woman is $\\vec{v}_{rw} = \\vec{v}_r - \\vec{v}_w = -30\\hat{j} + 10\\hat{i}$. The angle $\\tan\\theta = 10/30 = 1/3$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Kinematics', topic: ['1D Motion', 'Calculus'],
    questionIntent: 'Using integration to find displacement from acceleration',
    questionText: 'The acceleration of a particle is increasing linearly with time $t$ as $b t$. The particle starts from origin with an initial velocity $v_0$. The distance travelled by the particle in time $t$ will be:',
    options: ['$v_0 t + \\frac{1}{3} b t^2$', '$v_0 t + \\frac{1}{2} b t^2$', '$v_0 t + \\frac{1}{6} b t^3$', '$v_0 t + \\frac{1}{3} b t^3$'],
    correctOption: '$v_0 t + \\frac{1}{6} b t^3$',
    solutionText: '$a = bt \\implies \\frac{dv}{dt} = bt \\implies v = v_0 + \\frac{bt^2}{2}$. Displacement $x = \\int v dt = v_0 t + \\frac{bt^3}{6}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Kinematics', topic: ['Projectile Motion', 'Maximum Range'],
    questionIntent: 'Maximize range of projectile',
    questionText: 'A ball whose kinetic energy is $E$, is projected at an angle of $45^\\circ$ to the horizontal. The kinetic energy of the ball at the highest point of its flight will be:',
    options: ['$E$', '$E/\\sqrt{2}$', '$E/2$', 'Zero'],
    correctOption: '$E/2$',
    solutionText: 'Initial $KE = \\frac{1}{2}mu^2 = E$. At the highest point, velocity is $u\\cos(45^\\circ) = u/\\sqrt{2}$. $KE_{top} = \\frac{1}{2}m(u/\\sqrt{2})^2 = \\frac{1}{4}mu^2 = E/2$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Kinematics', topic: ['Circular Motion'],
    questionIntent: 'Relate linear and angular acceleration',
    questionText: 'A particle is moving in a circular path of radius $r$. The velocity of the particle $v$ depends on distance $s$ as $v = k\\sqrt{s}$. The acceleration of the particle is:',
    options: ['$\\frac{k^2}{2}$', '$\\sqrt{\\frac{k^4}{4} + \\frac{k^4s^2}{r^2}}$', '$\\frac{k^2 s}{r}$', '$\\sqrt{k^4 + \\frac{k^4s^2}{r^2}}$'],
    correctOption: '$\\sqrt{\\frac{k^4}{4} + \\frac{k^4s^2}{r^2}}$',
    solutionText: 'Tangential acceleration $a_t = v \\frac{dv}{ds} = (k\\sqrt{s}) \\cdot \\frac{k}{2\\sqrt{s}} = \\frac{k^2}{2}$. Radial acceleration $a_r = \\frac{v^2}{r} = \\frac{k^2 s}{r}$. Total acceleration $a = \\sqrt{a_t^2 + a_r^2}$.',
    isEmbedded: false
  },

  // THERMODYNAMICS
  {
    instituteId, subject: 'Physics', chapter: 'Thermodynamics', topic: ['First Law of Thermodynamics'],
    questionIntent: 'Calculate work done in isobaric and isochoric processes',
    questionText: 'A thermodynamic system undergoes cyclic process ABCDA as shown in the p-V diagram. The work done by the system in the cycle is:',
    options: ['$p_0 V_0$', '$2 p_0 V_0$', '$\\frac{1}{2} p_0 V_0$', 'Zero'],
    correctOption: '$p_0 V_0$',
    solutionText: 'The work done in a cyclic p-V diagram is the area enclosed by the cycle. Area = base $\\times$ height = $(2V_0 - V_0) \\times (2p_0 - p_0) = p_0 V_0$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Thermodynamics', topic: ['Carnot Engine'],
    questionIntent: 'Calculate efficiency of Carnot engine',
    questionText: 'A Carnot engine has an efficiency of $1/6$. When the temperature of the sink is reduced by $62^\\circ\\text{C}$, its efficiency is doubled. The temperatures of the source and the sink are, respectively,',
    options: ['$99^\\circ\\text{C}, 37^\\circ\\text{C}$', '$124^\\circ\\text{C}, 62^\\circ\\text{C}$', '$37^\\circ\\text{C}, 99^\\circ\\text{C}$', '$62^\\circ\\text{C}, 124^\\circ\\text{C}$'],
    correctOption: '$99^\\circ\\text{C}, 37^\\circ\\text{C}$',
    solutionText: '$\\eta = 1 - T_2/T_1 = 1/6 \\implies T_2/T_1 = 5/6$. When $T_2$ is reduced by 62K, $\\eta = 1/3 \\implies 1 - (T_2-62)/T_1 = 1/3 \\implies (T_2-62)/T_1 = 2/3$. Solving gives $T_1 = 372\\text{K} = 99^\\circ\\text{C}$ and $T_2 = 310\\text{K} = 37^\\circ\\text{C}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Thermodynamics', topic: ['Kinetic Theory of Gases'],
    questionIntent: 'Relate rms speed to temperature',
    questionText: 'At what temperature will the rms speed of oxygen molecules become just sufficient for escaping from the Earth\'s atmosphere? (Given: Mass of oxygen molecule $m = 2.76 \\times 10^{-26} \\text{ kg}$, Boltzmann\'s constant $k_B = 1.38 \\times 10^{-23} \\text{ J/K}$)',
    options: ['$8.36 \\times 10^4 \\text{ K}$', '$5.01 \\times 10^4 \\text{ K}$', '$2.50 \\times 10^4 \\text{ K}$', '$1.25 \\times 10^4 \\text{ K}$'],
    correctOption: '$8.36 \\times 10^4 \\text{ K}$',
    solutionText: 'Escape velocity $v_e = 11.2 \\text{ km/s} = 11200 \\text{ m/s}$. $v_{rms} = \\sqrt{\\frac{3k_BT}{m}} = v_e$. Solving for $T$: $T = \\frac{m v_e^2}{3k_B} = \\frac{(2.76 \\times 10^{-26})(11200)^2}{3 \\times 1.38 \\times 10^{-23}} \\approx 8.36 \\times 10^4 \\text{ K}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Thermodynamics', topic: ['Specific Heat'],
    questionIntent: 'Calculate final temperature in calorimetry',
    questionText: 'Two rigid boxes containing different ideal gases are placed on a table. Box A contains one mole of nitrogen at temperature $T_0$, while Box B contains one mole of helium at temperature $7T_0/3$. The boxes are then put into thermal contact with each other. The final temperature of the gases will be:',
    options: ['$T_0$', '$3T_0/2$', '$5T_0/3$', '$7T_0/5$'],
    correctOption: '$3T_0/2$',
    solutionText: 'By conservation of energy: $n_1 C_{v1} (T_f - T_0) + n_2 C_{v2} (T_f - 7T_0/3) = 0$. Nitrogen is diatomic ($C_{v1} = 5R/2$), Helium is monatomic ($C_{v2} = 3R/2$). $(5R/2)(T_f - T_0) + (3R/2)(T_f - 7T_0/3) = 0 \\implies 5T_f - 5T_0 + 3T_f - 7T_0 = 0 \\implies 8T_f = 12T_0 \\implies T_f = 1.5T_0$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Thermodynamics', topic: ['Adiabatic Process'],
    questionIntent: 'Use PV^gamma = constant',
    questionText: 'An ideal gas at $27^\\circ\\text{C}$ is compressed adiabatically to $8/27$ of its original volume. If $\\gamma = 5/3$, then the rise in temperature is:',
    options: ['$450 \\text{ K}$', '$375 \\text{ K}$', '$225 \\text{ K}$', '$300 \\text{ K}$'],
    correctOption: '$375 \\text{ K}$',
    solutionText: '$T_1 V_1^{\\gamma - 1} = T_2 V_2^{\\gamma - 1} \\implies T_2 = T_1 (V_1/V_2)^{\\gamma - 1} = 300 \\times (27/8)^{2/3} = 300 \\times (9/4) = 675 \\text{ K}$. Rise in temperature $\\Delta T = 675 - 300 = 375 \\text{ K}$.',
    isEmbedded: false
  },

  // ELECTROMAGNETISM
  {
    instituteId, subject: 'Physics', chapter: 'Electromagnetism', topic: ['Gauss Law'],
    questionIntent: 'Apply Gauss Law to a cube',
    questionText: 'A charge $q$ is placed at the center of the open face of a hemispherical surface. The flux through the hemispherical surface is:',
    options: ['$q/\\epsilon_0$', '$q/2\\epsilon_0$', '$q/4\\epsilon_0$', 'Zero'],
    correctOption: '$q/2\\epsilon_0$',
    solutionText: 'By symmetry, if we complete the sphere, the total flux is $q/\\epsilon_0$. Since the hemisphere is exactly half of the complete sphere, the flux through it is $q/2\\epsilon_0$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Electromagnetism', topic: ['Capacitance'],
    questionIntent: 'Calculate equivalent capacitance',
    questionText: 'A parallel plate capacitor is made of two dielectric blocks in series. One block has thickness $d_1$ and dielectric constant $K_1$, and the other has thickness $d_2$ and dielectric constant $K_2$. The equivalent capacitance is:',
    options: ['$\\frac{\\epsilon_0 A}{d_1/K_1 + d_2/K_2}$', '$\\frac{\\epsilon_0 A(K_1 + K_2)}{d_1 + d_2}$', '$\\frac{\\epsilon_0 A K_1 K_2}{d_1 K_2 + d_2 K_1}$', '$\\frac{\\epsilon_0 A(K_1 d_1 + K_2 d_2)}{d_1^2 + d_2^2}$'],
    correctOption: '$\\frac{\\epsilon_0 A}{d_1/K_1 + d_2/K_2}$',
    solutionText: 'The system can be viewed as two capacitors in series: $C_1 = \\frac{K_1 \\epsilon_0 A}{d_1}$ and $C_2 = \\frac{K_2 \\epsilon_0 A}{d_2}$. $1/C_{eq} = 1/C_1 + 1/C_2 = \\frac{d_1}{K_1 \\epsilon_0 A} + \\frac{d_2}{K_2 \\epsilon_0 A}$. Thus $C_{eq} = \\frac{\\epsilon_0 A}{d_1/K_1 + d_2/K_2}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Electromagnetism', topic: ['Magnetic Field of Current'],
    questionIntent: 'Use Biot-Savart Law for circular coil',
    questionText: 'A long wire carrying a steady current is bent into a circular loop of one turn. The magnetic field at the center of the loop is $B$. It is then bent into a circular coil of $n$ turns. The magnetic field at the center of this coil of $n$ turns will be:',
    options: ['$n B$', '$n^2 B$', '$B / n$', '$B / n^2$'],
    correctOption: '$n^2 B$',
    solutionText: 'For 1 turn: $B = \\frac{\\mu_0 I}{2R}$. Total length $L = 2\\pi R$. For $n$ turns: length $L = n(2\\pi r) \\implies r = R/n$. Magnetic field for $n$ turns: $B\' = \\frac{\\mu_0 n I}{2r} = \\frac{\\mu_0 n I}{2(R/n)} = n^2 \\frac{\\mu_0 I}{2R} = n^2 B$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Electromagnetism', topic: ['Electromagnetic Induction'],
    questionIntent: 'Calculate motional emf',
    questionText: 'A metal rod of length $l$ rotates about one of its ends with uniform angular velocity $\\omega$ in a uniform magnetic field $B$ perpendicular to the plane of rotation. The emf induced between its ends is:',
    options: ['$B \\omega l^2$', '$\\frac{1}{2} B \\omega l^2$', '$\\frac{1}{2} B \\omega^2 l$', '$B \\omega^2 l$'],
    correctOption: '$\\frac{1}{2} B \\omega l^2$',
    solutionText: 'The emf induced in a small element $dx$ at a distance $x$ from the axis is $dE = B v dx = B (\\omega x) dx$. Total emf $E = \\int_0^l B \\omega x dx = \\frac{1}{2} B \\omega l^2$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Electromagnetism', topic: ['Alternating Current'],
    questionIntent: 'Calculate resonant frequency in LCR circuit',
    questionText: 'In a series LCR circuit, the voltage across the resistance, capacitance, and inductance is $10\\text{V}$ each. If the capacitance is short-circuited, the voltage across the inductance will be:',
    options: ['$10\\text{V}$', '$10\\sqrt{2}\\text{V}$', '$10/\\sqrt{2}\\text{V}$', '$20\\text{V}$'],
    correctOption: '$10/\\sqrt{2}\\text{V}$',
    solutionText: 'Initially $V_R = V_L = V_C = 10\\text{V}$. Supply voltage $V = \\sqrt{V_R^2 + (V_L - V_C)^2} = 10\\text{V}$. Since $V_L = V_C$, $X_L = X_C$, so $R = X_L$. When C is short-circuited, the circuit is RL series. New impedance $Z = \\sqrt{R^2 + X_L^2} = \\sqrt{R^2 + R^2} = R\\sqrt{2}$. Current $I\' = V / (R\\sqrt{2})$. Voltage across inductance $V_L\' = I\' X_L = (V / R\\sqrt{2}) \\times R = V / \\sqrt{2} = 10 / \\sqrt{2} \\text{ V}$.',
    isEmbedded: false
  },

  // OPTICS
  {
    instituteId, subject: 'Physics', chapter: 'Optics', topic: ['Geometrical Optics'],
    questionIntent: 'Calculate apparent depth',
    questionText: 'A vessel of depth $2d$ is half filled with a liquid of refractive index $\\mu_1$ and the upper half with a liquid of refractive index $\\mu_2$. The apparent depth of the vessel seen perpendicularly is:',
    options: ['$d \\left(\\frac{1}{\\mu_1} + \\frac{1}{\\mu_2}\\right)$', '$d \\left(\\frac{\\mu_1 \\mu_2}{\\mu_1 + \\mu_2}\\right)$', '$d \\left(\\frac{\\mu_1 + \\mu_2}{\\mu_1 \\mu_2}\\right)$', '$2d \\left(\\frac{1}{\\mu_1} + \\frac{1}{\\mu_2}\\right)$'],
    correctOption: '$d \\left(\\frac{1}{\\mu_1} + \\frac{1}{\\mu_2}\\right)$',
    solutionText: 'Apparent depth $h\' = \\frac{h_1}{\\mu_1} + \\frac{h_2}{\\mu_2}$. Here $h_1 = h_2 = d$. So $h\' = \\frac{d}{\\mu_1} + \\frac{d}{\\mu_2} = d \\left(\\frac{1}{\\mu_1} + \\frac{1}{\\mu_2}\\right)$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Optics', topic: ['Interference (YDSE)'],
    questionIntent: 'Calculate fringe width in different media',
    questionText: 'In a Young\'s double slit experiment, the fringe width is $\\beta$. If the entire arrangement is placed in a liquid of refractive index $n$, the fringe width becomes:',
    options: ['$\\beta / n$', '$n \\beta$', '$\\beta / (n-1)$', '$\\beta / \\sqrt{n}$'],
    correctOption: '$\\beta / n$',
    solutionText: 'Fringe width $\\beta = \\frac{\\lambda D}{d}$. In a medium of refractive index $n$, the wavelength becomes $\\lambda\' = \\lambda / n$. Thus, the new fringe width $\\beta\' = \\frac{\\lambda\' D}{d} = \\frac{\\beta}{n}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Optics', topic: ['Lens Maker Formula'],
    questionIntent: 'Apply Lens Maker Formula for silvered lens',
    questionText: 'An equiconvex lens of focal length $f$ is cut into two equal halves along a plane perpendicular to the principal axis. The focal length of each half will be:',
    options: ['$f$', '$f/2$', '$2f$', '$f/4$'],
    correctOption: '$2f$',
    solutionText: 'For equiconvex lens: $1/f = (\\mu - 1)(1/R - (-1/R)) = 2(\\mu - 1)/R$. When cut perpendicularly, it becomes a plano-convex lens with $R_1 = R, R_2 = \\infty$. $1/f\' = (\\mu - 1)(1/R - 0) = (\\mu - 1)/R = 1/(2f) \\implies f\' = 2f$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Optics', topic: ['Diffraction'],
    questionIntent: 'Calculate position of minima',
    questionText: 'In a single slit diffraction experiment, the first minimum for red light ($\\lambda = 660 \\text{ nm}$) coincides with the first maximum of some other wavelength $\\lambda\'$. What is the value of $\\lambda\'$?',
    options: ['$440 \\text{ nm}$', '$330 \\text{ nm}$', '$220 \\text{ nm}$', '$550 \\text{ nm}$'],
    correctOption: '$440 \\text{ nm}$',
    solutionText: 'First minimum for $\\lambda$: $\\sin\\theta = \\lambda / a$. First maximum for $\\lambda\'$: $\\sin\\theta = \\frac{3\\lambda\'}{2a}$. Equating them: $\\frac{\\lambda}{a} = \\frac{3\\lambda\'}{2a} \\implies \\lambda\' = \\frac{2}{3} \\lambda = \\frac{2}{3}(660) = 440 \\text{ nm}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Optics', topic: ['Polarization'],
    questionIntent: 'Use Malus Law',
    questionText: 'Two polaroids are placed in the path of unpolarized beam of intensity $I_0$ such that no light is emitted from the second polaroid. If a third polaroid whose polarization axis makes an angle $\\theta$ with the polarization axis of the first polaroid, is placed between these polaroids, then the intensity of light emerging from the last polaroid will be:',
    options: ['$(\\frac{I_0}{8}) \\sin^2 2\\theta$', '$(\\frac{I_0}{4}) \\sin^2 2\\theta$', '$(\\frac{I_0}{2}) \\cos^4 \\theta$', '$I_0 \\cos^2 \\theta$'],
    correctOption: '$(\\frac{I_0}{8}) \\sin^2 2\\theta$',
    solutionText: 'Intensity after first polaroid $I_1 = I_0 / 2$. After the inserted polaroid (angle $\\theta$): $I_2 = (I_0 / 2) \\cos^2\\theta$. The third polaroid is crossed with the first, so its angle is $90^\\circ$. The angle between second and third is $90^\\circ - \\theta$. Intensity after third: $I_3 = I_2 \\cos^2(90^\\circ - \\theta) = (I_0 / 2) \\cos^2\\theta \\sin^2\\theta = \\frac{I_0}{8} (2\\sin\\theta\\cos\\theta)^2 = \\frac{I_0}{8} \\sin^2 2\\theta$.',
    isEmbedded: false
  },

  // MODERN PHYSICS
  {
    instituteId, subject: 'Physics', chapter: 'Modern Physics', topic: ['Photoelectric Effect'],
    questionIntent: 'Use Einstein Photoelectric equation',
    questionText: 'When a metallic surface is illuminated with radiation of wavelength $\\lambda$, the stopping potential is $V$. If the same surface is illuminated with radiation of wavelength $2\\lambda$, the stopping potential is $V/4$. The threshold wavelength for the metallic surface is:',
    options: ['$5\\lambda/2$', '$3\\lambda$', '$4\\lambda$', '$5\\lambda$'],
    correctOption: '$3\\lambda$',
    solutionText: '$eV = hc/\\lambda - hc/\\lambda_0$ (1). $e(V/4) = hc/(2\\lambda) - hc/\\lambda_0$ (2). Multiply (2) by 4: $eV = 2hc/\\lambda - 4hc/\\lambda_0$. Equate with (1): $hc/\\lambda - hc/\\lambda_0 = 2hc/\\lambda - 4hc/\\lambda_0 \\implies 3hc/\\lambda_0 = hc/\\lambda \\implies \\lambda_0 = 3\\lambda$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Modern Physics', topic: ['Bohr Model'],
    questionIntent: 'Calculate wavelength of emitted photon',
    questionText: 'If the electron in a hydrogen atom jumps from the 3rd orbit to the 2nd orbit, it emits a photon of wavelength $\\lambda$. When it jumps from the 4th orbit to the 3rd orbit, the corresponding wavelength of the photon will be:',
    options: ['$\\frac{16}{25} \\lambda$', '$\\frac{20}{7} \\lambda$', '$\\frac{20}{13} \\lambda$', '$\\frac{7}{5} \\lambda$'],
    correctOption: '$\\frac{20}{7} \\lambda$',
    solutionText: '$1/\\lambda = R (1/2^2 - 1/3^2) = R (1/4 - 1/9) = 5R/36$. $1/\\lambda\' = R (1/3^2 - 1/4^2) = R (1/9 - 1/16) = 7R/144$. $\\lambda\' / \\lambda = (5R/36) / (7R/144) = (5/36) \\times (144/7) = 20/7 \\implies \\lambda\' = \\frac{20}{7} \\lambda$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Modern Physics', topic: ['Radioactivity'],
    questionIntent: 'Calculate half life and activity',
    questionText: 'A radioactive material has a half-life of 10 days. What fraction of the material would remain after 30 days?',
    options: ['$0.5$', '$0.25$', '$0.125$', '$0.0625$'],
    correctOption: '$0.125$',
    solutionText: 'Number of half-lives $n = t / T_{1/2} = 30 / 10 = 3$. Fraction remaining = $(1/2)^n = (1/2)^3 = 1/8 = 0.125$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Modern Physics', topic: ['De Broglie Wavelength'],
    questionIntent: 'Relate wavelength to accelerating potential',
    questionText: 'An electron is accelerated from rest through a potential difference of $V$ volt. If the de Broglie wavelength of the electron is $1.227 \\times 10^{-2} \\text{ nm}$, the potential difference is:',
    options: ['$10^2 \\text{ V}$', '$10^3 \\text{ V}$', '$10^4 \\text{ V}$', '$10^5 \\text{ V}$'],
    correctOption: '$10^4 \\text{ V}$',
    solutionText: 'De Broglie wavelength of electron $\\lambda = \\frac{1.227}{\\sqrt{V}} \\text{ nm}$. Given $\\lambda = 1.227 \\times 10^{-2} \\text{ nm} = 1.227 / \\sqrt{V}$. Therefore, $\\sqrt{V} = 1 / 10^{-2} = 100$. $V = 100^2 = 10^4 \\text{ V}$.',
    isEmbedded: false
  },
  {
    instituteId, subject: 'Physics', chapter: 'Modern Physics', topic: ['Nuclear Physics'],
    questionIntent: 'Mass defect and binding energy',
    questionText: 'If $M(A; Z)$, $m_p$ and $m_n$ denote the masses of the nucleus ${}^A_Z X$, proton and neutron respectively in units of $u$ ($1 u = 931.5 \\text{ MeV/c}^2$) and $BE$ represents its binding energy in MeV, then:',
    options: ['$M(A; Z) = Z m_p + (A - Z) m_n - BE/c^2$', '$M(A; Z) = Z m_p + (A - Z) m_n + BE/c^2$', '$M(A; Z) = Z m_p + (A - Z) m_n - BE$', '$M(A; Z) = Z m_p + (A - Z) m_n + BE$'],
    correctOption: '$M(A; Z) = Z m_p + (A - Z) m_n - BE/c^2$',
    solutionText: 'Binding energy $BE = [Z m_p + (A - Z) m_n - M(A; Z)] c^2$. Rearranging for $M(A; Z)$: $M(A; Z) = Z m_p + (A - Z) m_n - BE/c^2$.',
    isEmbedded: false
  }
];

const runSeed = async () => {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cognitest";
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");
    
    // Clear existing mocked physics questions to remove the 200 variants
    await PhysicsQuestion.deleteMany({ instituteId });
    console.log("Cleared existing mock physics questions.");

    console.log(`Prepared ${mockQuestions.length} base physics questions for insertion.`);

    await PhysicsQuestion.insertMany(mockQuestions);
    console.log(`Successfully seeded ${mockQuestions.length} realistic Physics questions into MongoDB!`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
};

runSeed();
