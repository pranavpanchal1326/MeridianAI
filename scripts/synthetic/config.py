# scripts/synthetic/config.py
# Configuration for 200k synthetic case generation
# All distributions calibrated to real Indian legal system data
# NEVER modify feature vector order - matches Section 07 exactly

import numpy as np

# -- CASE MIX -------------------------------------------------------
# Based on India family court filing statistics
CASE_TYPE_DISTRIBUTION = {
	'divorce':     0.58,   # 58% - largest category by far
	'inheritance': 0.16,   # 16% - second most common
	'property':    0.14,   # 14% - property disputes
	'business':    0.08,   # 8%  - partnership/business dissolution
	'nri':         0.04,   # 4%  - NRI cross-border cases
}

CASE_TYPE_ENCODING = {
	'divorce': 0, 'inheritance': 1,
	'property': 2, 'business': 3, 'nri': 4,
}

# -- CITY DISTRIBUTION ----------------------------------------------
# Weighted by metro population + court filing volume
CITY_DISTRIBUTION = {
	'Mumbai':    0.22,
	'Delhi':     0.20,
	'Bangalore': 0.16,
	'Pune':      0.13,
	'Hyderabad': 0.12,
	'Chennai':   0.09,
	'Ahmedabad': 0.08,
}

CITY_ENCODING = {
	'Mumbai': 0, 'Delhi': 1, 'Bangalore': 2,
	'Pune': 3, 'Hyderabad': 4, 'Chennai': 5, 'Ahmedabad': 6,
}

# -- COURT BACKLOG (MONTHS) ----------------------------------------
# Source: National Judicial Data Grid 2024 averages
COURT_BACKLOG = {
	'Mumbai':    18.0,
	'Delhi':     16.5,
	'Bangalore': 13.0,
	'Pune':      11.0,
	'Hyderabad': 10.5,
	'Chennai':    9.0,
	'Ahmedabad':  8.5,
}

# -- FILING SEASON SCORES ------------------------------------------
FILING_SEASON = {
	1:  1.20,   # January  - fresh docket, faster
	2:  1.05,   # February
	3:  1.00,   # March
	4:  1.00,   # April
	5:  1.00,   # May
	6:  0.95,   # June     - pre-monsoon slowdown
	7:  0.95,   # July
	8:  1.00,   # August
	9:  1.05,   # September
	10: 1.00,   # October
	11: 0.75,   # November - holiday slowdown begins
	12: 0.65,   # December - courts drain before year end
}

# -- OUTCOME PARAMETERS BY PATH -------------------------------------
# Three resolution paths: collaborative, mediation, court
# Each path has its own duration and cost distributions

OUTCOME_PARAMS = {

	'collab': {
		# Mutual consent - fastest, cheapest
		# Indian law: minimum 6 months cooling period for mutual divorce
		'base_duration_months': {
			'divorce':     (1.8, 0.8),
			'inheritance': (2.4, 1.0),
			'property':    (2.8, 1.2),
			'business':    (2.6, 1.1),
			'nri':         (3.6, 1.5),
		},
		'base_cost_inr': {
			'divorce':     (85000,  35000),
			'inheritance': (70000,  30000),
			'property':    (90000,  40000),
			'business':    (110000, 50000),
			'nri':         (180000, 80000),
		},
		'success_prob_base': {
			'divorce':     0.72,
			'inheritance': 0.65,
			'property':    0.60,
			'business':    0.55,
			'nri':         0.50,
		},
	},

	'mediation': {
		# Professional mediator involved - middle path
		'base_duration_months': {
			'divorce':     (3.7, 1.5),
			'inheritance': (4.9, 1.9),
			'property':    (5.5, 2.2),
			'business':    (4.7, 1.8),
			'nri':         (6.8, 2.8),
		},
		'base_cost_inr': {
			'divorce':     (220000, 90000),
			'inheritance': (190000, 80000),
			'property':    (250000, 100000),
			'business':    (300000, 120000),
			'nri':         (480000, 200000),
		},
		'success_prob_base': {
			'divorce':     0.61,
			'inheritance': 0.55,
			'property':    0.52,
			'business':    0.48,
			'nri':         0.44,
		},
	},

	'court': {
		# Full litigation - slowest, most expensive
		'base_duration_months': {
			'divorce':     (10.5, 4.0),
			'inheritance': (24.0, 9.5),
			'property':    (28.0, 11.0),
			'business':    (19.0, 7.8),
			'nri':         (34.0, 13.0),
		},
		'base_cost_inr': {
			'divorce':     (520000, 220000),
			'inheritance': (620000, 280000),
			'property':    (750000, 350000),
			'business':    (680000, 300000),
			'nri':         (1200000, 500000),
		},
		'success_prob_base': {
			'divorce':     0.48,
			'inheritance': 0.42,
			'property':    0.40,
			'business':    0.38,
			'nri':         0.35,
		},
	},
}

# -- COMPLEXITY MULTIPLIERS -----------------------------------------
# Each factor adds to duration and cost multiplicatively

COMPLEXITY_FACTORS = {
	# Duration multipliers (applied to base_duration)
	'duration': {
		'children_contested':    1.35,  # Contested custody
		'children_amicable':     1.08,  # Agreed custody
		'business_ownership':    1.28,  # Business valuation needed
		'nri_factor':            1.45,  # Cross-border jurisdiction
		'asset_above_2cr':       1.22,  # Forensic valuation required
		'asset_above_5cr':       1.35,  # Complex forensic + multiple valuators
		'domestic_violence':     1.40,  # DV allegations - protection orders
		'multiple_contested':    1.15,  # Per additional contested item
		'long_marriage_15plus':  1.12,  # 15+ years - more to untangle
		'high_backlog_city':     1.20,  # Mumbai/Delhi: backlog > 14mo
		'medium_backlog_city':   1.10,  # Bangalore/Pune: backlog 10-14mo
		'nov_dec_filing':        1.20,  # Holiday season penalty
		'jan_filing':            0.90,  # January benefit
	},
	# Cost multipliers
	'cost': {
		'children_contested':    1.30,
		'children_amicable':     1.05,
		'business_ownership':    1.45,
		'nri_factor':            1.60,
		'asset_above_2cr':       1.25,
		'asset_above_5cr':       1.50,
		'domestic_violence':     1.35,
		'multiple_contested':    1.12,
		'long_marriage_15plus':  1.08,
		'high_backlog_city':     1.15,
	},
}

# -- ASSET VALUE DISTRIBUTIONS (INR) --------------------------------
# By city - real estate + movable assets typical ranges
# Calibrated to Indian urban property + savings data

ASSET_DISTRIBUTIONS = {
	'Mumbai': {
		'mean':  14500000,   # INR 1.45 Cr - 1BHK in suburbs
		'std':    8000000,
		'min':    800000,
		'max':   80000000,
	},
	'Delhi': {
		'mean':  13000000,
		'std':    7500000,
		'min':    700000,
		'max':   70000000,
	},
	'Bangalore': {
		'mean':  11000000,
		'std':    6000000,
		'min':    600000,
		'max':   60000000,
	},
	'Pune': {
		'mean':   9500000,
		'std':    5000000,
		'min':    500000,
		'max':   50000000,
	},
	'Hyderabad': {
		'mean':   9000000,
		'std':    4800000,
		'min':    450000,
		'max':   45000000,
	},
	'Chennai': {
		'mean':   8500000,
		'std':    4500000,
		'min':    400000,
		'max':   42000000,
	},
	'Ahmedabad': {
		'mean':   7500000,
		'std':    4000000,
		'min':    350000,
		'max':   38000000,
	},
}

# -- MARRIAGE DURATION (DIVORCE CASES) ------------------------------
# Mean: 10 years, right-skewed (more short marriages filing)
MARRIAGE_DURATION_PARAMS = {
	'mean':  9.8,
	'std':   6.2,
	'min':   0.5,
	'max':  38.0,
}

# -- PETITIONER AGE --------------------------------------------------
PETITIONER_AGE_PARAMS = {
	'mean':  36.5,
	'std':    9.0,
	'min':   21.0,
	'max':   72.0,
}

# -- CHILDREN COUNT --------------------------------------------------
# Weighted - most Indian couples have 1 or 2 children
CHILDREN_DISTRIBUTION = {
	0: 0.30,
	1: 0.38,
	2: 0.26,
	3: 0.06,
}

# -- PROFESSIONAL COUNT ----------------------------------------------
# How many professionals assigned per case type
PROFESSIONAL_COUNT_PARAMS = {
	'divorce':     {'mean': 4.5, 'std': 1.2, 'min': 2, 'max': 7},
	'inheritance': {'mean': 3.8, 'std': 1.0, 'min': 2, 'max': 6},
	'property':    {'mean': 3.5, 'std': 1.0, 'min': 2, 'max': 6},
	'business':    {'mean': 4.2, 'std': 1.1, 'min': 2, 'max': 7},
	'nri':         {'mean': 5.2, 'std': 1.3, 'min': 3, 'max': 8},
}

# -- URGENCY DISTRIBUTION --------------------------------------------
URGENCY_DISTRIBUTION = {
	'low':      0.30,
	'medium':   0.45,
	'high':     0.18,
	'critical': 0.07,
}

URGENCY_ENCODING = {
	'low': 0, 'medium': 1, 'high': 2, 'critical': 3,
}

# -- COMPLEXITY SCORE PARAMS -----------------------------------------
# Derived: asset_types + jurisdictions + contested_items
COMPLEXITY_SCORE_PARAMS = {
	'mean':  3.8,
	'std':   1.9,
	'min':   1.0,
	'max':  10.0,
}

# -- GENERATION CONFIG -----------------------------------------------
TOTAL_CASES = 200_000
RANDOM_SEED = 42
OUTPUT_DIR = 'scripts/synthetic/output'
OUTPUT_FILE = 'stage1_cases.jsonl'
SAMPLE_SIZE = 500  # For case_metadata_sample.json
VALIDATION_TOLERANCE = 0.05  # +/-5% distribution tolerance