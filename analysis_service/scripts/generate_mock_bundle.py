#!/usr/bin/env python3
"""
Generates a realistic, deterministic, schema-valid prepared-data bundle
for CogniTest remediation verification (Phases R0-R6).

Outputs six files to private_data/mock-jee-01/:
  - manifest.json
  - questions.json
  - answer_key.json
  - students.json
  - responses.json
  - recommendations.json
"""

import argparse
import json
import os
import random
import sys
from typing import Any, Dict, List, Optional, Set

# Ensure app imports succeed
try:
    from app.config import settings
    from app.domain.analytics import format_decimal
    from app.domain.insights import build_insights
    from app.domain.results import build_question_results
    from app.services.bundle import BundleValidationError, RawBundle, validate_bundle
except ImportError:
    # If run outside PYTHONPATH=.
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from app.config import settings
    from app.domain.analytics import format_decimal
    from app.domain.insights import build_insights
    from app.domain.results import build_question_results
    from app.services.bundle import BundleValidationError, RawBundle, validate_bundle


def build_taxonomy() -> Dict[str, Dict[str, Dict[str, List[str]]]]:
    """
    Taxonomy per Section 1.2:
    Subject -> Unit -> Chapter -> List[Topic]
    """
    return {
        "Physics": {
            "Mechanics": {
                "Kinematics": ["Projectile Motion"],
                "Laws of Motion": ["Friction", "Equilibrium"],
                "Work, Energy and Power": ["Conservation of Energy"],
            },
            "Electricity & Magnetism": {
                "Electrostatics": ["Coulomb's Law", "Capacitance"],
                "Current Electricity": ["Ohm's Law"],
            },
            "Modern Physics": {
                "Atoms": ["Bohr Model"],
                "Nuclei": ["Radioactivity"],
            },
        },
        "Chemistry": {
            "Physical": {
                "Thermodynamics": ["Enthalpy"],
                "Chemical Equilibrium": ["Equilibrium", "Le Chatelier"],
            },
            "Organic": {
                "Hydrocarbons": ["Isomerism"],
                "Alcohols": ["Reaction Mechanisms"],
            },
            "Inorganic": {
                "Periodic Table": ["Periodicity"],
                "Chemical Bonding": ["Hybridisation"],
            },
        },
        "Mathematics": {
            "Algebra": {
                "Quadratic Equations": ["Nature of Roots", "Equilibrium"],
                "Sequences and Series": ["Arithmetic Progression"],
            },
            "Calculus": {
                "Derivatives": ["Power Rule", "Chain Rule"],
                "Integrals": ["Definite Integrals"],
            },
            "Coordinate Geometry": {
                "Straight Lines": ["Slope"],
                "Circles": ["Tangents"],
            },
        },
    }


def build_questions(rng: random.Random) -> List[Dict[str, Any]]:
    """
    Builds exactly 75 questions (25 Physics, 25 Chemistry, 25 Mathematics).
    Q1-Q20 MCQ, Q21-Q25 Numerical (Physics)
    Q26-Q45 MCQ, Q46-Q50 Numerical (Chemistry)
    Q51-Q70 MCQ, Q71-Q75 Numerical (Mathematics)
    """
    questions: List[Dict[str, Any]] = []

    # SVG content from spec: well-formed minimal SVG
    minimal_svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
        '<circle cx="20" cy="20" r="15" fill="none" stroke="black"/></svg>'
    )

    # 1. Physics (Q1 - Q25)
    # 10 Easy (Q1-Q10), 10 Medium (Q11-Q20), 5 Hard (Q21-Q25 Numerical)
    # Q1..Q4: topic "Equilibrium" (Mechanics -> Laws of Motion)
    # Q5..Q8: topic "Friction" (Mechanics -> Laws of Motion)
    # Q9: overlap topic ["Projectile Motion", "Conservation of Energy"], overlap chapter ["Kinematics", "Laws of Motion"]
    # Q10: overlap topic ["Friction", "Conservation of Energy"], overlap chapter ["Laws of Motion", "Work, Energy and Power"]

    physics_specs = [
        # Q1-Q4: Equilibrium (Easy)
        {"qNo": 1, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Equilibrium"],
         "intent": "Equilibrium of concurrent forces", "latex": "Three coplanar forces satisfy $\\sum \\vec{F} = 0$. Find the equilibrant force magnitude."},
        {"qNo": 2, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Equilibrium"],
         "intent": "Lami's theorem application", "latex": "A body suspended by two strings is in static equilibrium: $\\frac{P}{\\sin \\alpha} = \\frac{Q}{\\sin \\beta} = \\frac{R}{\\sin \\gamma}$."},
        {"qNo": 3, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Equilibrium"],
         "intent": "Translational equilibrium", "latex": "For a block resting on an incline, resolve forces along the plane: $N = mg \\cos \\theta$."},
        {"qNo": 4, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Equilibrium"],
         "intent": "Equilibrium under gravity", "latex": "A point mass suspended under gravity satisfies $T = mg$ in equilibrium."},
        # Q5-Q8: Friction (Easy)
        {"qNo": 5, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Friction"],
         "intent": "Static friction threshold", "latex": "The limiting friction is $f_s \\le \\mu_s N$. Determine the coefficient $\\mu_s$."},
        {"qNo": 6, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Friction"],
         "intent": "Kinetic friction on plane", "latex": "Calculate acceleration when friction opposes motion: $a = g(\\sin \\theta - \\mu_k \\cos \\theta)$."},
        {"qNo": 7, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Friction"],
         "intent": "Angle of repose", "latex": "At the angle of repose $\\theta$, we have $\\tan \\theta = \\mu_s$. Find $\\theta$."},
        {"qNo": 8, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion"], "top": ["Friction"],
         "intent": "Work done against friction", "latex": "Work done against friction over distance $d$ is $W = f_k d = \\mu_k N d$."},
        # Q9-Q10: Overlap questions (Easy)
        {"qNo": 9, "diff": "easy", "unit": "Mechanics", "chap": ["Kinematics", "Laws of Motion"], "top": ["Projectile Motion", "Conservation of Energy"],
         "intent": "Energy in projectile motion", "latex": "At peak height $H = \\frac{u^2 \\sin^2 \\theta}{2g}$, compute mechanical energy $E = K + U$."},
        {"qNo": 10, "diff": "easy", "unit": "Mechanics", "chap": ["Laws of Motion", "Work, Energy and Power"], "top": ["Friction", "Conservation of Energy"],
         "intent": "Work-energy theorem with friction", "latex": "By work-energy theorem, $\\Delta K = W_{\\text{net}} = W_{\\text{ext}} - f_k d$."},
        # Q11-Q20: Medium MCQs
        {"qNo": 11, "diff": "medium", "unit": "Mechanics", "chap": ["Kinematics"], "top": ["Projectile Motion"],
         "intent": "Horizontal range of projectile", "latex": "The range formula $R = \\frac{u^2 \\sin(2\\theta)}{g}$ yields maximum range at $\\theta = 45^\\circ$."},
        {"qNo": 12, "diff": "medium", "unit": "Mechanics", "chap": ["Work, Energy and Power"], "top": ["Conservation of Energy"],
         "intent": "Potential energy of spring", "latex": "Elastic potential energy stored in a spring is $U = \\frac{1}{2}kx^2$."},
        {"qNo": 13, "diff": "medium", "unit": "Electricity & Magnetism", "chap": ["Electrostatics"], "top": ["Coulomb's Law"],
         "intent": "Electrostatic force between charges", "latex": "Coulomb force is given by $F = \\frac{1}{4\\pi \\varepsilon_0} \\frac{|q_1 q_2|}{r^2}$."},
        {"qNo": 14, "diff": "medium", "unit": "Electricity & Magnetism", "chap": ["Electrostatics"], "top": ["Capacitance"],
         "intent": "Parallel plate capacitance", "latex": "Capacitance of a parallel plate capacitor is $C = \\frac{\\varepsilon_0 A}{d}$."},
        {"qNo": 15, "diff": "medium", "unit": "Electricity & Magnetism", "chap": ["Current Electricity"], "top": ["Ohm's Law"],
         "intent": "Ohm's law resistance", "latex": "Resistance relates to resistivity by $R = \\rho \\frac{L}{A}$."},
        {"qNo": 16, "diff": "medium", "unit": "Electricity & Magnetism", "chap": ["Current Electricity"], "top": ["Ohm's Law"],
         "intent": "Electric power dissipation", "latex": "Power dissipated in resistor is $P = I^2 R = \\frac{V^2}{R}$."},
        {"qNo": 17, "diff": "medium", "unit": "Electricity & Magnetism", "chap": ["Electrostatics"], "top": ["Capacitance"],
         "intent": "Energy stored in capacitor", "latex": "Energy density of electric field is $u = \\frac{1}{2}\\varepsilon_0 E^2$."},
        {"qNo": 18, "diff": "medium", "unit": "Modern Physics", "chap": ["Atoms"], "top": ["Bohr Model"],
         "intent": "Bohr radius calculation", "latex": "Radius of $n$-th Bohr orbit is $r_n = \\frac{n^2 h^2 \\varepsilon_0}{\\pi m e^2}$."},
        {"qNo": 19, "diff": "medium", "unit": "Modern Physics", "chap": ["Atoms"], "top": ["Bohr Model"],
         "intent": "Energy levels of hydrogen", "latex": "Hydrogen energy level is $E_n = -\\frac{13.6}{n^2} \\text{ eV}$."},
        {"qNo": 20, "diff": "medium", "unit": "Modern Physics", "chap": ["Nuclei"], "top": ["Radioactivity"],
         "intent": "Radioactive decay law", "latex": "Number of surviving nuclei is $N(t) = N_0 e^{-\\lambda t}$."},
        # Q21-Q25: Hard Numericals
        {"qNo": 21, "diff": "hard", "unit": "Electricity & Magnetism", "chap": ["Current Electricity"], "top": ["Ohm's Law"],
         "intent": "Wheatstone bridge balance", "latex": "In a balanced Wheatstone bridge $\\frac{R_1}{R_2} = \\frac{R_3}{R_4}$, find galvanometer current."},
        {"qNo": 22, "diff": "hard", "unit": "Mechanics", "chap": ["Kinematics"], "top": ["Projectile Motion"],
         "intent": "Time of flight calculation", "latex": "Time of flight is $T = \\frac{2u \\sin \\theta}{g}$. Calculate $T$ in seconds."},
        {"qNo": 23, "diff": "hard", "unit": "Modern Physics", "chap": ["Nuclei"], "top": ["Radioactivity"],
         "intent": "Half life activity", "latex": "Activity is $A = \\lambda N = \\frac{\\ln 2}{T_{1/2}} N$. Compute the activity ratio."},
        {"qNo": 24, "diff": "hard", "unit": "Electricity & Magnetism", "chap": ["Electrostatics"], "top": ["Coulomb's Law"],
         "intent": "Electric potential difference", "latex": "Work required to move charge $q$ is $W = q\\Delta V$."},
        {"qNo": 25, "diff": "hard", "unit": "Mechanics", "chap": ["Work, Energy and Power"], "top": ["Conservation of Energy"],
         "intent": "Collisions in one dimension", "latex": "Coefficient of restitution is $e = \\frac{v_2 - v_1}{u_1 - u_2}$."},
    ]

    # 2. Chemistry (Q26 - Q50)
    # 10 Easy (Q26-Q35), 10 Medium (Q36-Q45), 5 Hard (Q46-Q50 Numerical)
    # Q26..Q29: topic "Equilibrium" (Physical -> Chemical Equilibrium)
    # Q30: overlap chapter ["Thermodynamics", "Chemical Equilibrium"], overlap topic ["Enthalpy", "Le Chatelier"]
    # Q35: overlap topic ["Isomerism", "Reaction Mechanisms"]

    chemistry_specs = [
        # Q26-Q29: Equilibrium (Easy)
        {"qNo": 26, "diff": "easy", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Equilibrium"],
         "intent": "Chemical equilibrium constant", "latex": "Equilibrium expression $K_c = \\frac{[C]^c [D]^d}{[A]^a [B]^b}$ for general reaction."},
        {"qNo": 27, "diff": "easy", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Equilibrium"],
         "intent": "Reaction quotient comparison", "latex": "When $Q_c < K_c$, reaction proceeds in the forward direction."},
        {"qNo": 28, "diff": "easy", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Equilibrium"],
         "intent": "Homogeneous gas equilibrium", "latex": "Relation between $K_p$ and $K_c$ is $K_p = K_c (RT)^{\\Delta n_g}$."},
        {"qNo": 29, "diff": "easy", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Equilibrium"],
         "intent": "Degree of dissociation", "latex": "Degree of dissociation $\\alpha = \\frac{D - d}{(n-1)d}$ from vapour density."},
        # Q30: Overlap question (Easy)
        {"qNo": 30, "diff": "easy", "unit": "Physical", "chap": ["Thermodynamics", "Chemical Equilibrium"], "top": ["Enthalpy", "Le Chatelier"],
         "intent": "van 't Hoff equation", "latex": "van 't Hoff equation: $\\frac{d \\ln K}{dT} = \\frac{\\Delta H^\\circ}{RT^2}$."},
        # Q31-Q34: Easy MCQs
        {"qNo": 31, "diff": "easy", "unit": "Physical", "chap": ["Thermodynamics"], "top": ["Enthalpy"],
         "intent": "Hess's law of constant heat", "latex": "Standard enthalpy change is $\\Delta H^\\circ = \\sum \\Delta H_f^\\circ(\\text{products}) - \\sum \\Delta H_f^\\circ(\\text{reactants})$."},
        {"qNo": 32, "diff": "easy", "unit": "Inorganic", "chap": ["Periodic Table"], "top": ["Periodicity"],
         "intent": "Ionization enthalpy trend", "latex": "Ionization energy generally increases across a period due to increasing $Z_{\\text{eff}}$."},
        {"qNo": 33, "diff": "easy", "unit": "Inorganic", "chap": ["Periodic Table"], "top": ["Periodicity"],
         "intent": "Electronegativity trend", "latex": "Pauling electronegativity difference relates to bond polarity."},
        {"qNo": 34, "diff": "easy", "unit": "Organic", "chap": ["Hydrocarbons"], "top": ["Isomerism"],
         "intent": "Structural isomerism in alkanes", "latex": "Butane $C_4H_{10}$ exhibits chain isomerism."},
        # Q35: Overlap topic (Easy)
        {"qNo": 35, "diff": "easy", "unit": "Organic", "chap": ["Alcohols"], "top": ["Isomerism", "Reaction Mechanisms"],
         "intent": "Alcohol dehydration mechanism", "latex": "Acid-catalyzed dehydration of alcohols follows an $E1$ mechanism."},
        # Q36-Q45: Medium MCQs
        {"qNo": 36, "diff": "medium", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Le Chatelier"],
         "intent": "Le Chatelier principle on pressure", "latex": "Increasing pressure shifts equilibrium towards fewer moles of gas."},
        {"qNo": 37, "diff": "medium", "unit": "Physical", "chap": ["Thermodynamics"], "top": ["Enthalpy"],
         "intent": "First law of thermodynamics", "latex": "First law: $\\Delta U = q + w = q - P\\Delta V$."},
        {"qNo": 38, "diff": "medium", "unit": "Organic", "chap": ["Hydrocarbons"], "top": ["Reaction Mechanisms"],
         "intent": "Electrophilic addition to alkenes", "latex": "Markovnikov addition of $HBr$ proceeds via carbocation intermediate."},
        {"qNo": 39, "diff": "medium", "unit": "Organic", "chap": ["Alcohols"], "top": ["Reaction Mechanisms"],
         "intent": "Nucleophilic substitution in alcohols", "latex": "Lucas test distinguishes primary, secondary, and tertiary alcohols."},
        {"qNo": 40, "diff": "medium", "unit": "Organic", "chap": ["Alcohols"], "top": ["Isomerism"],
         "intent": "Optical activity of chiral alcohols", "latex": "A molecule with a stereocenter rotates plane-polarized light."},
        {"qNo": 41, "diff": "medium", "unit": "Inorganic", "chap": ["Chemical Bonding"], "top": ["Hybridisation"],
         "intent": "VSEPR geometry of molecules", "latex": "Predict geometry of $SF_6$ using $sp^3d^2$ hybridisation."},
        {"qNo": 42, "diff": "medium", "unit": "Inorganic", "chap": ["Chemical Bonding"], "top": ["Hybridisation"],
         "intent": "Bond order from molecular orbital", "latex": "Bond order is $\\text{BO} = \\frac{N_b - N_a}{2}$ for diatomic species."},
        {"qNo": 43, "diff": "medium", "unit": "Inorganic", "chap": ["Chemical Bonding"], "top": ["Hybridisation"],
         "intent": "Dipole moments of polyatomic molecules", "latex": "Net dipole moment is vector sum $\\vec{\\mu} = \\sum \\vec{\\mu}_i$."},
        {"qNo": 44, "diff": "medium", "unit": "Inorganic", "chap": ["Periodic Table"], "top": ["Periodicity"],
         "intent": "Atomic radii variation", "latex": "Lanthanoid contraction causes similar radii for $Zr$ and $Hf$."},
        {"qNo": 45, "diff": "medium", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Le Chatelier"],
         "intent": "Temperature effect on exothermic reaction", "latex": "For exothermic reaction $\\Delta H < 0$, increasing temperature lowers $K_c$."},
        # Q46-Q50: Hard Numericals
        {"qNo": 46, "diff": "hard", "unit": "Physical", "chap": ["Chemical Equilibrium"], "top": ["Le Chatelier"],
         "intent": "Equilibrium yield calculation", "latex": "Calculate equilibrium moles of product in $A + B \\rightleftharpoons 2C$."},
        {"qNo": 47, "diff": "hard", "unit": "Physical", "chap": ["Thermodynamics"], "top": ["Enthalpy"],
         "intent": "Enthalpy of combustion", "latex": "Calculate standard heat of formation from combustion enthalpies."},
        {"qNo": 48, "diff": "hard", "unit": "Inorganic", "chap": ["Chemical Bonding"], "top": ["Hybridisation"],
         "intent": "Number of lone pairs in interhalogen", "latex": "Determine total non-bonding electron pairs in $IF_7$."},
        {"qNo": 49, "diff": "hard", "unit": "Organic", "chap": ["Hydrocarbons"], "top": ["Isomerism"],
         "intent": "Total stereoisomers count", "latex": "Calculate number of stereoisomers for tartaric acid."},
        {"qNo": 50, "diff": "hard", "unit": "Inorganic", "chap": ["Periodic Table"], "top": ["Periodicity"],
         "intent": "Effective nuclear charge calculation", "latex": "Apply Slater rules to determine effective nuclear charge $Z^*$."},
    ]

    # 3. Mathematics (Q51 - Q75)
    # 10 Easy (Q51-Q60), 10 Medium (Q61-Q70), 5 Hard (Q71-Q75 Numerical)
    # Q51..Q54: topic "Equilibrium" (Algebra -> Quadratic Equations)
    # Q55: overlap chapter ["Quadratic Equations", "Sequences and Series"], overlap topic ["Nature of Roots", "Arithmetic Progression"]
    # Q65: overlap topic ["Power Rule", "Chain Rule"]

    math_specs = [
        # Q51-Q54: Equilibrium (Easy)
        {"qNo": 51, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Equilibrium"],
         "intent": "Equilibrium point of quadratic map", "latex": "Find the fixed point equilibrium where $x^2 - 3x + 3 = x$."},
        {"qNo": 52, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Equilibrium"],
         "intent": "Stability of quadratic roots", "latex": "The equilibrium condition for $f(x) = x$ gives roots of $x^2 - 5x + 4 = 0$."},
        {"qNo": 53, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Equilibrium"],
         "intent": "Symmetric equilibrium in polynomials", "latex": "Symmetric roots satisfy $\\alpha + \\beta = -b/a$ and $\\alpha\\beta = c/a$."},
        {"qNo": 54, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Equilibrium"],
         "intent": "Discriminant at equilibrium threshold", "latex": "At marginal equilibrium the discriminant vanishes: $\\Delta = b^2 - 4ac = 0$."},
        # Q55: Overlap question (Easy)
        {"qNo": 55, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations", "Sequences and Series"], "top": ["Nature of Roots", "Arithmetic Progression"],
         "intent": "Roots forming an AP", "latex": "If the roots of $x^3 - 6x^2 + 11x - 6 = 0$ form an AP, find the common difference."},
        # Q56-Q60: Easy MCQs
        {"qNo": 56, "diff": "easy", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Nature of Roots"],
         "intent": "Nature of quadratic roots", "latex": "For real unequal roots of $ax^2 + bx + c = 0$, discriminant $\\Delta > 0$."},
        {"qNo": 57, "diff": "easy", "unit": "Algebra", "chap": ["Sequences and Series"], "top": ["Arithmetic Progression"],
         "intent": "Sum of first n terms of AP", "latex": "Sum of an AP is $S_n = \\frac{n}{2}[2a + (n-1)d]$."},
        {"qNo": 58, "diff": "easy", "unit": "Coordinate Geometry", "chap": ["Straight Lines"], "top": ["Slope"],
         "intent": "Slope of perpendicular lines", "latex": "Perpendicular lines satisfy $m_1 m_2 = -1$."},
        {"qNo": 59, "diff": "easy", "unit": "Coordinate Geometry", "chap": ["Circles"], "top": ["Tangents"],
         "intent": "Condition of tangency to circle", "latex": "Line $y = mx + c$ touches circle $x^2 + y^2 = r^2$ if $c^2 = r^2(1 + m^2)$."},
        {"qNo": 60, "diff": "easy", "unit": "Calculus", "chap": ["Derivatives"], "top": ["Power Rule"],
         "intent": "Basic polynomial derivative", "latex": "Compute derivative using power rule: $\\frac{d}{dx}(x^n) = n x^{n-1}$."},
        # Q61-Q70: Medium MCQs
        {"qNo": 61, "diff": "medium", "unit": "Calculus", "chap": ["Derivatives"], "top": ["Chain Rule"],
         "intent": "Chain rule for composite functions", "latex": "Chain rule: $\\frac{d}{dx} f(g(x)) = f'(g(x)) g'(x)$."},
        {"qNo": 62, "diff": "medium", "unit": "Calculus", "chap": ["Integrals"], "top": ["Definite Integrals"],
         "intent": "Fundamental theorem of calculus", "latex": "Evaluate definite integral $\\int_a^b f(x) dx = F(b) - F(a)$."},
        {"qNo": 63, "diff": "medium", "unit": "Calculus", "chap": ["Integrals"], "top": ["Definite Integrals"],
         "intent": "Definite integral symmetry property", "latex": "Property $\\int_0^a f(x) dx = \\int_0^a f(a - x) dx$ for trigonometric integrals."},
        {"qNo": 64, "diff": "medium", "unit": "Coordinate Geometry", "chap": ["Straight Lines"], "top": ["Slope"],
         "intent": "Angle between two intersecting lines", "latex": "Angle between lines is $\\tan \\theta = \\left|\\frac{m_1 - m_2}{1 + m_1 m_2}\\right|$."},
        {"qNo": 65, "diff": "medium", "unit": "Calculus", "chap": ["Derivatives"], "top": ["Power Rule", "Chain Rule"],
         "intent": "Derivative of power of composite function", "latex": "Differentiate $y = (3x^2 + 5)^4$ using power and chain rules."},
        {"qNo": 66, "diff": "medium", "unit": "Coordinate Geometry", "chap": ["Circles"], "top": ["Tangents"],
         "intent": "Length of tangent from external point", "latex": "Length of tangent from $(x_1, y_1)$ to circle $S=0$ is $\\sqrt{S_1}$."},
        {"qNo": 67, "diff": "medium", "unit": "Algebra", "chap": ["Sequences and Series"], "top": ["Arithmetic Progression"],
         "intent": "Arithmetic mean between two numbers", "latex": "Insert $n$ arithmetic means between $a$ and $b$."},
        {"qNo": 68, "diff": "medium", "unit": "Calculus", "chap": ["Integrals"], "top": ["Definite Integrals"],
         "intent": "Area bounded by curve and axis", "latex": "Area under curve is $A = \\int_a^b y \\, dx$."},
        {"qNo": 69, "diff": "medium", "unit": "Coordinate Geometry", "chap": ["Straight Lines"], "top": ["Slope"],
         "intent": "Distance of point from a line", "latex": "Distance formula: $d = \\frac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}}$."},
        {"qNo": 70, "diff": "medium", "unit": "Coordinate Geometry", "chap": ["Circles"], "top": ["Tangents"],
         "intent": "Equation of tangent at a point", "latex": "Tangent to circle at $(x_1, y_1)$ is $xx_1 + yy_1 = r^2$."},
        # Q71-Q75: Hard Numericals
        {"qNo": 71, "diff": "hard", "unit": "Algebra", "chap": ["Quadratic Equations"], "top": ["Nature of Roots"],
         "intent": "Product of roots under parameter", "latex": "Determine integral parameter $k$ for which quadratic roots are integers."},
        {"qNo": 72, "diff": "hard", "unit": "Algebra", "chap": ["Sequences and Series"], "top": ["Arithmetic Progression"],
         "intent": "Common difference of AP", "latex": "Given $S_{2n} = 3S_n$, determine ratio or common difference."},
        {"qNo": 73, "diff": "hard", "unit": "Calculus", "chap": ["Derivatives"], "top": ["Chain Rule"],
         "intent": "Critical point calculation", "latex": "Find the critical point $x$ where $f'(x) = 0$ for polynomial degree 4."},
        {"qNo": 74, "diff": "hard", "unit": "Calculus", "chap": ["Integrals"], "top": ["Definite Integrals"],
         "intent": "Definite integral of greatest integer function", "latex": "Evaluate $\\int_0^3 [x] \\, dx$ where $[\\cdot]$ is floor function."},
        {"qNo": 75, "diff": "hard", "unit": "Coordinate Geometry", "chap": ["Circles"], "top": ["Tangents"],
         "intent": "Chord of contact length", "latex": "Compute length of chord of contact drawn from point $(p, q)$ to circle."},
    ]

    all_specs = [("Physics", physics_specs), ("Chemistry", chemistry_specs), ("Mathematics", math_specs)]

    # Exactly 8 MCQ questions with distractor explanations
    distractor_q_nos = {3, 12, 18, 27, 33, 41, 55, 63}
    # Exactly 3 questions with image URL
    image_q_nos = {7, 35, 60}
    # Exactly 2 questions with diagram SVG
    svg_q_nos = {15, 65}

    for subj, specs in all_specs:
        for item in specs:
            q_no = item["qNo"]
            is_mcq = q_no not in {21, 22, 23, 24, 25, 46, 47, 48, 49, 50, 71, 72, 73, 74, 75}
            q_type = "multiple_choice" if is_mcq else "numerical"

            q_dict: Dict[str, Any] = {
                "questionNo": q_no,
                "subject": subj,
                "unit": item["unit"],
                "chapter": item["chap"],
                "topic": item["top"],
                "questionType": q_type,
                "difficulty": item["diff"],
                "questionIntent": item["intent"],
                "questionText": item["latex"],
                "solutionText": f"Detailed step-by-step solution for {subj} question {q_no}.",
            }

            if is_mcq:
                q_dict["options"] = [
                    f"Option A for Q{q_no}",
                    f"Option B for Q{q_no}",
                    f"Option C for Q{q_no}",
                    f"Option D for Q{q_no}",
                ]

            if q_no in distractor_q_nos:
                # Provide distractor explanations for options B and C (assuming correct will be A or D)
                q_dict["distractorExplanations"] = {
                    "B": f"Common misconception: ignores constraints in Q{q_no}.",
                    "C": f"Incorrect formula application in Q{q_no}.",
                }

            if q_no in image_q_nos:
                q_dict["imageUrl"] = f"https://example.com/mock/q{q_no}.png"

            if q_no in svg_q_nos:
                q_dict["diagramSvg"] = minimal_svg

            questions.append(q_dict)

    # Validate constraints with assertions
    assert len(questions) == 75, f"Expected 75 questions, got {len(questions)}"
    for subj in ["Physics", "Chemistry", "Mathematics"]:
        subj_qs = [q for q in questions if q["subject"] == subj]
        assert len(subj_qs) == 25, f"Expected 25 questions in {subj}, got {len(subj_qs)}"
        easy_cnt = sum(1 for q in subj_qs if q["difficulty"] == "easy")
        med_cnt = sum(1 for q in subj_qs if q["difficulty"] == "medium")
        hard_cnt = sum(1 for q in subj_qs if q["difficulty"] == "hard")
        assert easy_cnt == 10, f"{subj} easy count expected 10, got {easy_cnt}"
        assert med_cnt == 10, f"{subj} medium count expected 10, got {med_cnt}"
        assert hard_cnt == 5, f"{subj} hard count expected 5, got {hard_cnt}"
        mcq_cnt = sum(1 for q in subj_qs if q["questionType"] == "multiple_choice")
        num_cnt = sum(1 for q in subj_qs if q["questionType"] == "numerical")
        assert mcq_cnt == 20, f"{subj} MCQ count expected 20, got {mcq_cnt}"
        assert num_cnt == 5, f"{subj} numerical count expected 5, got {num_cnt}"
        # All numericals are hard
        for q in subj_qs:
            if q["questionType"] == "numerical":
                assert q["difficulty"] == "hard", f"Numerical Q{q['questionNo']} must be hard"

    # Equilibrium count per subject
    for subj in ["Physics", "Chemistry", "Mathematics"]:
        eq_cnt = sum(1 for q in questions if q["subject"] == subj and "Equilibrium" in q["topic"])
        assert eq_cnt == 4, f"Expected 4 Equilibrium questions in {subj}, got {eq_cnt}"

    # Friction count in Physics
    fric_cnt = sum(1 for q in questions if q["subject"] == "Physics" and "Friction" in q["topic"])
    assert fric_cnt >= 4, f"Expected >= 4 Friction questions in Physics, got {fric_cnt}"

    # Overlap count
    two_topics_cnt = sum(1 for q in questions if len(q["topic"]) == 2)
    two_chaps_cnt = sum(1 for q in questions if len(q["chapter"]) == 2)
    assert two_topics_cnt >= 6, f"Expected >= 6 questions with 2 topics, got {two_topics_cnt}"
    assert two_chaps_cnt >= 4, f"Expected >= 4 questions with 2 chapters, got {two_chaps_cnt}"

    # Distractor, image, svg counts
    distractor_cnt = sum(1 for q in questions if q.get("distractorExplanations") is not None)
    assert distractor_cnt == 8, f"Expected exactly 8 questions with distractorExplanations, got {distractor_cnt}"
    img_cnt = sum(1 for q in questions if q.get("imageUrl") is not None)
    assert img_cnt == 3, f"Expected exactly 3 questions with imageUrl, got {img_cnt}"
    svg_cnt = sum(1 for q in questions if q.get("diagramSvg") is not None)
    assert svg_cnt == 2, f"Expected exactly 2 questions with diagramSvg, got {svg_cnt}"

    # LaTeX count
    latex_cnt = sum(1 for q in questions if "$" in q["questionText"])
    assert latex_cnt >= 10, f"Expected >= 10 questions with LaTeX, got {latex_cnt}"

    return questions


def build_answer_key(rng: random.Random, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Builds the answer key for all 75 questions.
    MCQs: roughly 15 each of A, B, C, D across the 60 MCQs.
    Distractor explanations MUST NOT cover the correct option!
    Numericals: includes required values 0, negative (-3), two-digit (12), 7, etc.
    """
    answer_key: List[Dict[str, Any]] = []

    # Pre-defined numerical answers to satisfy:
    # - at least one 0
    # - at least one negative (e.g. -3)
    # - at least one two-digit (e.g. 12)
    # - specifically: 7, 0, 12 for student ALPHA-006!
    # Q21=0, Q22=7, Q23=12, Q24=-3, Q25=15
    # Q46=2, Q47=4, Q48=8, Q49=-1, Q50=10
    # Q71=5, Q72=0, Q73=14, Q74=-5, Q75=18
    numerical_keys = {
        21: 0,
        22: 7,
        23: 12,
        24: -3,
        25: 15,
        46: 2,
        47: 4,
        48: 8,
        49: -1,
        50: 10,
        71: 5,
        72: 0,
        73: 14,
        74: -5,
        75: 18,
    }

    # Generate roughly 15 of each letter across 60 MCQs
    # Distractor questions (3, 12, 18, 27, 33, 41, 55, 63) have distractors for "B" and "C",
    # so their correctOption must be chosen from ["A", "D"].
    mcq_letters = ["A"] * 15 + ["B"] * 15 + ["C"] * 15 + ["D"] * 15
    rng.shuffle(mcq_letters)

    mcq_idx = 0
    for q in questions:
        q_no = q["questionNo"]
        if q["questionType"] == "multiple_choice":
            distractors = q.get("distractorExplanations") or {}
            # If current letter is in distractors, pick an allowed letter and swap
            chosen = mcq_letters[mcq_idx]
            if chosen in distractors:
                # Find an allowed letter later in the list and swap
                swap_idx = None
                for candidate_idx in range(mcq_idx + 1, len(mcq_letters)):
                    if mcq_letters[candidate_idx] not in distractors:
                        swap_idx = candidate_idx
                        break
                assert swap_idx is not None, f"Could not find valid letter swap for Q{q_no}"
                mcq_letters[mcq_idx], mcq_letters[swap_idx] = mcq_letters[swap_idx], mcq_letters[mcq_idx]
                chosen = mcq_letters[mcq_idx]

            assert chosen not in distractors, f"Correct option {chosen} in distractors for Q{q_no}"
            answer_key.append({"questionNo": q_no, "correctOption": chosen})
            mcq_idx += 1
        else:
            ans = numerical_keys[q_no]
            answer_key.append({"questionNo": q_no, "numericalAnswer": ans})

    # Assertions
    assert len(answer_key) == 75, f"Expected 75 answer key entries, got {len(answer_key)}"
    num_vals = [ak["numericalAnswer"] for ak in answer_key if "numericalAnswer" in ak]
    assert 0 in num_vals, "Answer key must contain 0"
    assert any(x < 0 for x in num_vals), "Answer key must contain a negative key"
    assert any(x >= 10 for x in num_vals), "Answer key must contain a two-digit key"
    assert 7 in num_vals, "Answer key must contain 7 (for ALPHA-006)"
    assert 12 in num_vals, "Answer key must contain 12 (for ALPHA-006)"

    return answer_key


def build_roster(rng: random.Random) -> List[Dict[str, Any]]:
    """
    Builds the roster of 32 students:
    - 15 in Alpha (JEE-ALPHA-001 to JEE-ALPHA-015)
    - 1 in Alpha (JEE-ALPHA-016, absentee)
    - 15 in Beta (JEE-BETA-001 to JEE-BETA-015)
    - 1 in Gamma (JEE-GAMMA-001)
    Two students must share the exact same full name (e.g. JEE-ALPHA-003 and JEE-BETA-007).
    """
    roster: List[Dict[str, Any]] = []

    first_names = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
                   "Priya", "Ananya", "Diya", "Isha", "Rhea", "Kavya", "Sneha", "Pooja", "Neha", "Tanvi"]
    last_names = ["Patel", "Sharma", "Nair", "Iyer", "Verma", "Rao", "Gupta", "Mehta", "Singh", "Reddy"]

    # Pre-generate unique names using rng
    all_names = [f"{fn} {ln}" for fn in first_names for ln in last_names]
    rng.shuffle(all_names)

    # Reserve "Aarav Patel" for the duplicate name scenario
    duplicate_name = "Aarav Patel"
    other_names = [n for n in all_names if n != duplicate_name]

    name_idx = 0

    # Alpha: 16 students
    for i in range(1, 17):
        enrollment = f"JEE-ALPHA-{i:03d}"
        if i == 3:
            name = duplicate_name
        else:
            name = other_names[name_idx]
            name_idx += 1
        entry: Dict[str, Any] = {
            "enrollmentNo": enrollment,
            "name": name,
            "batch": "Alpha",
        }
        # Email on roughly half
        if i % 2 == 1:
            entry["email"] = f"{enrollment.lower()}@example.com"
        roster.append(entry)

    # Beta: 15 students
    for i in range(1, 16):
        enrollment = f"JEE-BETA-{i:03d}"
        if i == 7:
            name = duplicate_name  # Identical to JEE-ALPHA-003
        else:
            name = other_names[name_idx]
            name_idx += 1
        entry = {
            "enrollmentNo": enrollment,
            "name": name,
            "batch": "Beta",
        }
        if i % 2 == 0:
            entry["email"] = f"{enrollment.lower()}@example.com"
        roster.append(entry)

    # Gamma: 1 student
    enrollment = "JEE-GAMMA-001"
    name = other_names[name_idx]
    entry = {
        "enrollmentNo": enrollment,
        "name": name,
        "batch": "Gamma",
        "email": f"{enrollment.lower()}@example.com",
    }
    roster.append(entry)

    # Assertions
    assert len(roster) == 32, f"Expected 32 roster entries, got {len(roster)}"
    alpha_cnt = sum(1 for s in roster if s["batch"] == "Alpha")
    beta_cnt = sum(1 for s in roster if s["batch"] == "Beta")
    gamma_cnt = sum(1 for s in roster if s["batch"] == "Gamma")
    assert alpha_cnt == 16, f"Expected 16 in Alpha, got {alpha_cnt}"
    assert beta_cnt == 15, f"Expected 15 in Beta, got {beta_cnt}"
    assert gamma_cnt == 1, f"Expected 1 in Gamma, got {gamma_cnt}"

    # Name duplicate assertion
    names = [s["name"] for s in roster]
    duplicate_students = [s["enrollmentNo"] for s in roster if s["name"] == duplicate_name]
    assert len(duplicate_students) == 2, f"Expected 2 students with name '{duplicate_name}', found {duplicate_students}"
    assert "JEE-ALPHA-003" in duplicate_students and "JEE-BETA-007" in duplicate_students

    return roster


def build_responses(
    rng: random.Random,
    questions: List[Dict[str, Any]],
    answer_key: List[Dict[str, Any]],
    roster: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Builds student responses for exactly 31 evaluated students.
    (JEE-ALPHA-016 is absent and excluded from responses.json).
    Engineered students implemented per Section 2.2.
    """
    responses: List[Dict[str, Any]] = []
    key_by_no = {ak["questionNo"]: ak for ak in answer_key}
    q_by_no = {q["questionNo"]: q for q in questions}

    # Helper to get wrong MCQ option
    def wrong_mcq(q_no: int) -> str:
        correct = key_by_no[q_no]["correctOption"]
        choices = [c for c in ["A", "B", "C", "D"] if c != correct]
        return rng.choice(choices)

    # Helper to get wrong numerical
    def wrong_num(q_no: int) -> int:
        correct = key_by_no[q_no]["numericalAnswer"]
        return correct + rng.choice([1, -1, 10])

    # 1. JEE-ALPHA-001: 100% correct
    ans_alpha_001 = []
    for q_no in range(1, 76):
        k = key_by_no[q_no]
        val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
        ans_alpha_001.append({"questionNo": q_no, "answer": val})
    responses.append({"enrollmentNo": "JEE-ALPHA-001", "answers": ans_alpha_001})

    # 2. JEE-ALPHA-002: Identical to ALPHA-001 (Joint topper)
    ans_alpha_002 = [{"questionNo": a["questionNo"], "answer": a["answer"]} for a in ans_alpha_001]
    responses.append({"enrollmentNo": "JEE-ALPHA-002", "answers": ans_alpha_002})

    # 3. JEE-ALPHA-003: All 75 skipped (null)
    ans_alpha_003 = [{"questionNo": q_no, "answer": None} for q_no in range(1, 76)]
    responses.append({"enrollmentNo": "JEE-ALPHA-003", "answers": ans_alpha_003})

    # 4. JEE-ALPHA-004: All 60 MCQs wrong, all 15 numericals wrong -> Score -60.00
    ans_alpha_004 = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        if q["questionType"] == "multiple_choice":
            ans_alpha_004.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
        else:
            ans_alpha_004.append({"questionNo": q_no, "answer": wrong_num(q_no)})
    responses.append({"enrollmentNo": "JEE-ALPHA-004", "answers": ans_alpha_004})

    # 5. JEE-ALPHA-005: Correct on every Equilibrium question in all 3 subjects (12 questions total), wrong on rest
    # Equilibrium questions: Q1..Q4 (Physics), Q26..Q29 (Chemistry), Q51..Q54 (Mathematics)
    equilibrium_q_nos = {1, 2, 3, 4, 26, 27, 28, 29, 51, 52, 53, 54}
    ans_alpha_005 = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        if q_no in equilibrium_q_nos:
            k = key_by_no[q_no]
            val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
            ans_alpha_005.append({"questionNo": q_no, "answer": val})
        else:
            if q["questionType"] == "multiple_choice":
                ans_alpha_005.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
            else:
                ans_alpha_005.append({"questionNo": q_no, "answer": wrong_num(q_no)})
    responses.append({"enrollmentNo": "JEE-ALPHA-005", "answers": ans_alpha_005})

    # 6. JEE-ALPHA-006: Formatted strings for numericals ("+07", "-0", " 12 "), 50% MCQs correct
    ans_alpha_006 = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        if q["questionType"] == "numerical":
            k_val = key_by_no[q_no]["numericalAnswer"]
            if k_val == 7:
                ans_alpha_006.append({"questionNo": q_no, "answer": "+07"})
            elif k_val == 0:
                ans_alpha_006.append({"questionNo": q_no, "answer": "-0"})
            elif k_val == 12:
                ans_alpha_006.append({"questionNo": q_no, "answer": " 12 "})
            else:
                ans_alpha_006.append({"questionNo": q_no, "answer": k_val})
        else:
            # 50% correct: first 10 of each subject correct, second 10 wrong
            # Physics MCQs: Q1-Q10 correct, Q11-Q20 wrong
            # Chemistry MCQs: Q26-Q35 correct, Q36-Q45 wrong
            # Mathematics MCQs: Q51-Q60 correct, Q61-Q70 wrong
            if q_no in range(1, 11) or q_no in range(26, 36) or q_no in range(51, 61):
                ans_alpha_006.append({"questionNo": q_no, "answer": key_by_no[q_no]["correctOption"]})
            else:
                ans_alpha_006.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
    responses.append({"enrollmentNo": "JEE-ALPHA-006", "answers": ans_alpha_006})

    # 7. JEE-ALPHA-007: Skips all 25 Chemistry questions (Q26-Q50), answers rest ~70% correct
    ans_alpha_007 = []
    for q_no in range(1, 76):
        if 26 <= q_no <= 50:
            ans_alpha_007.append({"questionNo": q_no, "answer": None})
        else:
            # 70% correct deterministically: if q_no % 10 in {1, 2, 3, 4, 5, 6, 7} -> correct, else wrong
            if (q_no % 10) in {1, 2, 3, 4, 5, 6, 7}:
                k = key_by_no[q_no]
                val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
                ans_alpha_007.append({"questionNo": q_no, "answer": val})
            else:
                q = q_by_no[q_no]
                if q["questionType"] == "multiple_choice":
                    ans_alpha_007.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
                else:
                    ans_alpha_007.append({"questionNo": q_no, "answer": wrong_num(q_no)})
    responses.append({"enrollmentNo": "JEE-ALPHA-007", "answers": ans_alpha_007})

    # 8. JEE-ALPHA-008: Exactly 2 questions attempted per topic where possible, rest skipped
    topic_attempts: Dict[str, int] = {}
    ans_alpha_008 = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        can_attempt = all(topic_attempts.get(t, 0) < 2 for t in q["topic"])
        if can_attempt:
            for t in q["topic"]:
                topic_attempts[t] = topic_attempts.get(t, 0) + 1
            k = key_by_no[q_no]
            val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
            ans_alpha_008.append({"questionNo": q_no, "answer": val})
        else:
            ans_alpha_008.append({"questionNo": q_no, "answer": None})
    responses.append({"enrollmentNo": "JEE-ALPHA-008", "answers": ans_alpha_008})

    # 9. JEE-ALPHA-009: On Physics::Friction (Q5, Q6, Q7, Q8), 3 correct, 1 wrong -> Developing label!
    # Rest RNG driven
    ans_alpha_009 = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        if q_no in {5, 6, 7}:  # 3 correct on Friction
            ans_alpha_009.append({"questionNo": q_no, "answer": key_by_no[q_no]["correctOption"]})
        elif q_no == 8:  # 1 wrong on Friction
            ans_alpha_009.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
        else:
            # Standard probabilities: 0.55 correct, 0.30 wrong, 0.15 skipped
            p = rng.random()
            if p < 0.55:
                k = key_by_no[q_no]
                val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
                ans_alpha_009.append({"questionNo": q_no, "answer": val})
            elif p < 0.85:
                if q["questionType"] == "multiple_choice":
                    ans_alpha_009.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
                else:
                    ans_alpha_009.append({"questionNo": q_no, "answer": wrong_num(q_no)})
            else:
                ans_alpha_009.append({"questionNo": q_no, "answer": None})
    responses.append({"enrollmentNo": "JEE-ALPHA-009", "answers": ans_alpha_009})

    # 10. JEE-ALPHA-010 to JEE-ALPHA-015: RNG driven
    for idx in range(10, 16):
        enrollment = f"JEE-ALPHA-{idx:03d}"
        ans_rng = []
        for q_no in range(1, 76):
            q = q_by_no[q_no]
            p = rng.random()
            if p < 0.55:
                k = key_by_no[q_no]
                val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
                ans_rng.append({"questionNo": q_no, "answer": val})
            elif p < 0.85:
                if q["questionType"] == "multiple_choice":
                    ans_rng.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
                else:
                    ans_rng.append({"questionNo": q_no, "answer": wrong_num(q_no)})
            else:
                ans_rng.append({"questionNo": q_no, "answer": None})
        responses.append({"enrollmentNo": enrollment, "answers": ans_rng})

    # 11. JEE-BETA-001: 100% correct (Beta's sole topper)
    ans_beta_001 = [{"questionNo": a["questionNo"], "answer": a["answer"]} for a in ans_alpha_001]
    responses.append({"enrollmentNo": "JEE-BETA-001", "answers": ans_beta_001})

    # 12. JEE-BETA-002 to JEE-BETA-015: RNG driven
    for idx in range(2, 16):
        enrollment = f"JEE-BETA-{idx:03d}"
        ans_rng = []
        for q_no in range(1, 76):
            q = q_by_no[q_no]
            p = rng.random()
            if p < 0.55:
                k = key_by_no[q_no]
                val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
                ans_rng.append({"questionNo": q_no, "answer": val})
            elif p < 0.85:
                if q["questionType"] == "multiple_choice":
                    ans_rng.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
                else:
                    ans_rng.append({"questionNo": q_no, "answer": wrong_num(q_no)})
            else:
                ans_rng.append({"questionNo": q_no, "answer": None})
        responses.append({"enrollmentNo": enrollment, "answers": ans_rng})

    # 13. JEE-GAMMA-001: ~60% correct
    ans_gamma = []
    for q_no in range(1, 76):
        q = q_by_no[q_no]
        # Deterministic 60% pattern: 3 correct, 1 wrong, 1 skipped out of every 5
        rem = q_no % 5
        if rem in {1, 2, 3}:
            k = key_by_no[q_no]
            val = k["correctOption"] if "correctOption" in k else k["numericalAnswer"]
            ans_gamma.append({"questionNo": q_no, "answer": val})
        elif rem == 4:
            if q["questionType"] == "multiple_choice":
                ans_gamma.append({"questionNo": q_no, "answer": wrong_mcq(q_no)})
            else:
                ans_gamma.append({"questionNo": q_no, "answer": wrong_num(q_no)})
        else:
            ans_gamma.append({"questionNo": q_no, "answer": None})
    responses.append({"enrollmentNo": "JEE-GAMMA-001", "answers": ans_gamma})

    # Assertions
    assert len(responses) == 31, f"Expected 31 evaluated responses, got {len(responses)}"
    resp_enrollments = {r["enrollmentNo"] for r in responses}
    assert "JEE-ALPHA-016" not in resp_enrollments, "Absentee JEE-ALPHA-016 must not have a response entry"
    for r in responses:
        assert len(r["answers"]) == 75, f"Student {r['enrollmentNo']} must have exactly 75 answers"

    # Verify Developing insight on ALPHA-009 using the domain logic
    from decimal import Decimal
    marking_by_type = {
        "multiple_choice": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
        "numerical": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("0")},
    }
    placeholder_ids = {q["questionNo"]: "id" for q in questions}
    placeholder_hashes = {q["questionNo"]: "hash" for q in questions}
    placeholder_practice_counts = {q["questionNo"]: 3 for q in questions}

    alpha_009_resp = next(r for r in responses if r["enrollmentNo"] == "JEE-ALPHA-009")
    q_results = build_question_results(
        questions=questions,
        answer_key=answer_key,
        response=alpha_009_resp,
        marking_by_type=marking_by_type,
        question_ids=placeholder_ids,
        content_hashes=placeholder_hashes,
        practice_counts=placeholder_practice_counts,
    )
    insights = build_insights(q_results)
    friction_insight = next((ins for ins in insights if ins.key == "Physics::Friction"), None)
    assert friction_insight is not None, "Physics::Friction insight missing for ALPHA-009"
    assert friction_insight.label == "Developing", (
        f"Expected Developing label for Physics::Friction on ALPHA-009, got {friction_insight.label} "
        f"(attempted={friction_insight.attempted}, correct={friction_insight.correct}, accuracyPct={friction_insight.accuracyPct})"
    )

    return responses


def build_recommendations(rng: random.Random, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Builds practice questions in recommendations.json:
    - Exactly 75 entries, one per originalQuestionNo
    - Exactly 3 practice questions per entry (225 total)
    - sourceKey formatted as 'q{qNo:02d}-p{k}'
    - Cycles easy, medium, hard
    - Exactly 5 practice MCQs have distractorExplanations
    - Exactly 2 practice questions have imageUrl
    """
    recommendations: List[Dict[str, Any]] = []

    # Choose 5 practice MCQs to carry distractorExplanations
    # e.g. q01-p1, q02-p1, q26-p1, q27-p1, q51-p1
    practice_distractor_keys = {"q01-p1", "q02-p1", "q26-p1", "q27-p1", "q51-p1"}
    # Choose 2 practice questions to carry imageUrl
    # e.g. q07-p1, q35-p1
    practice_image_keys = {"q07-p1", "q35-p1"}

    diff_cycle = ["easy", "medium", "hard"]

    for q in questions:
        q_no = q["questionNo"]
        q_type = q["questionType"]
        practice_items: List[Dict[str, Any]] = []

        for k in (1, 2, 3):
            src_key = f"q{q_no:02d}-p{k}"
            diff = diff_cycle[k - 1]
            p_dict: Dict[str, Any] = {
                "sourceKey": src_key,
                "subject": q["subject"],
                "unit": q["unit"],
                "chapter": q["chapter"],
                "topic": q["topic"],
                "questionType": q_type,
                "difficulty": diff,
                "questionIntent": f"Practice {k} on {q['questionIntent']}",
                "questionText": f"Practice {src_key}: variant question for {q['subject']} ({q['topic'][0]}).",
                "solutionText": f"Step-by-step resolution for practice question {src_key}.",
            }

            if q_type == "multiple_choice":
                p_dict["options"] = [
                    f"Choice A for {src_key}",
                    f"Choice B for {src_key}",
                    f"Choice C for {src_key}",
                    f"Choice D for {src_key}",
                ]
                # Pick correct option
                if src_key in practice_distractor_keys:
                    p_dict["distractorExplanations"] = {
                        "B": f"Common error in {src_key}: ignores boundary.",
                        "C": f"Incorrect sign in {src_key}.",
                    }
                    p_dict["correctOption"] = "A"
                else:
                    p_dict["correctOption"] = rng.choice(["A", "B", "C", "D"])
            else:
                p_dict["numericalAnswer"] = rng.randint(-5, 20)

            if src_key in practice_image_keys:
                p_dict["imageUrl"] = f"https://example.com/mock/{src_key}.png"

            practice_items.append(p_dict)

        recommendations.append({
            "originalQuestionNo": q_no,
            "recommendations": practice_items,
        })

    # Assertions
    assert len(recommendations) == 75, f"Expected 75 recommendation entries, got {len(recommendations)}"
    total_practice = sum(len(r["recommendations"]) for r in recommendations)
    assert total_practice == 225, f"Expected 225 practice questions, got {total_practice}"

    all_keys = [pq["sourceKey"] for r in recommendations for pq in r["recommendations"]]
    assert len(set(all_keys)) == 225, "Practice question sourceKey values must be unique across file"

    p_distractor_cnt = sum(
        1 for r in recommendations for pq in r["recommendations"] if pq.get("distractorExplanations") is not None
    )
    assert p_distractor_cnt == 5, f"Expected 5 practice MCQs with distractorExplanations, got {p_distractor_cnt}"

    p_img_cnt = sum(
        1 for r in recommendations for pq in r["recommendations"] if pq.get("imageUrl") is not None
    )
    assert p_img_cnt == 2, f"Expected 2 practice questions with imageUrl, got {p_img_cnt}"

    return recommendations


def build_manifest(questions: List[Dict[str, Any]], responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Builds manifest.json per Section 1.1:
    - instituteId: read from os.environ["INSTITUTE_ID"]
    """
    institute_id = os.environ.get("INSTITUTE_ID")
    if not institute_id:
        institute_id = getattr(settings, "institute_id", None)
    if not institute_id:
        raise RuntimeError("INSTITUTE_ID environment variable is required")

    return {
        "schemaVersion": "1.0",
        "instituteId": institute_id,
        "testKey": "mock-jee-01",
        "title": "JEE Mock Test 01",
        "date": "2026-09-20T09:00:00+00:00",
        "examType": "JEE",
        "expectedQuestionCount": len(questions),
        "expectedStudentCount": len(responses),
        "markingByType": {
            "multiple_choice": {"correctMarks": 4, "incorrectPenalty": 1},
            "numerical": {"correctMarks": 4, "incorrectPenalty": 0},
        },
        "comparisonPolicy": "batch",
        "recommendationsPerQuestion": 3,
    }


def write_bundle(
    out_dir: str,
    manifest: Dict[str, Any],
    questions: List[Dict[str, Any]],
    answer_key: List[Dict[str, Any]],
    roster: List[Dict[str, Any]],
    responses: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]],
) -> None:
    """
    Writes all six bundle files with:
    json.dump(obj, fh, indent=2, sort_keys=True, ensure_ascii=False) + trailing newline
    """
    os.makedirs(out_dir, exist_ok=True)
    files = [
        ("manifest.json", manifest),
        ("questions.json", questions),
        ("answer_key.json", answer_key),
        ("students.json", roster),
        ("responses.json", responses),
        ("recommendations.json", recommendations),
    ]
    for filename, data in files:
        filepath = os.path.join(out_dir, filename)
        with open(filepath, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, sort_keys=True, ensure_ascii=False)
            fh.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic mock bundle for CogniTest")
    parser.add_argument("--out", default=os.path.join("private_data", "mock-jee-01"), help="Output directory")
    parser.add_argument("--seed", type=int, default=20260913, help="Random seed for deterministic generation")
    parser.add_argument("--skip-pre-validate", action="store_true", help="Skip pre-write validation (used only for intentional corruption tests)")
    args = parser.parse_args()

    rng = random.Random(args.seed)

    print(f"Building mock bundle with seed={args.seed}...")
    questions = build_questions(rng)
    answer_key = build_answer_key(rng, questions)
    roster = build_roster(rng)
    responses = build_responses(rng, questions, answer_key, roster)
    recommendations = build_recommendations(rng, questions)
    manifest = build_manifest(questions, responses)

    # Validate bundle before writing to disk unless explicitly skipped
    if not args.skip_pre_validate:
        raw = RawBundle(
            manifest=manifest,
            questions=questions,
            answer_key=answer_key,
            roster=roster,
            responses=responses,
            recommendations=recommendations,
        )
        print("Validating bundle through app.services.bundle.validate_bundle...")
        try:
            validated = validate_bundle(raw)
            print("Pre-write validation passed!")
        except BundleValidationError as exc:
            print("PRE-WRITE VALIDATION FAILED:")
            for err in exc.errors:
                print(f"  - {err}")
            sys.exit(1)

    print(f"Writing files to {args.out}...")
    write_bundle(args.out, manifest, questions, answer_key, roster, responses, recommendations)
    print(f"Bundle successfully written to {args.out}\n")

    # Print summary block matching required format
    mcq_count = sum(1 for q in questions if q["questionType"] == "multiple_choice")
    num_count = sum(1 for q in questions if q["questionType"] == "numerical")
    subjects = sorted(list({q["subject"] for q in questions}))
    batches = sorted(list({s["batch"] for s in roster}))
    practice_count = sum(len(r["recommendations"]) for r in recommendations)

    print("DELIVERABLE: mock bundle generator")
    print("STATUS: COMPLETE")
    print("\nBundle summary:")
    print(f"- questions: {len(questions)} (MCQ: {mcq_count}, numerical: {num_count}) across subjects {subjects}")
    print(f"- students in roster: {len(roster)}; evaluated (responses): {len(responses)}; batches: {batches}")
    print(f"- practice questions: {practice_count} (exactly 3 per original)")


if __name__ == "__main__":
    main()
