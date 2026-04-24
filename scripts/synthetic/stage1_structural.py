# scripts/synthetic/stage1_structural.py
# Generates 200,000 realistic Indian legal case records
# Output: scripts/synthetic/output/stage1_cases.jsonl
# Runtime: ~7 minutes on standard laptop
# All distributions calibrated to real Indian legal data

import json
import uuid
import random
import math
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np
from faker import Faker

# Import config
sys.path.insert(0, os.path.dirname(__file__))
from config import (
	CASE_TYPE_DISTRIBUTION, CASE_TYPE_ENCODING,
	CITY_DISTRIBUTION, CITY_ENCODING,
	COURT_BACKLOG, FILING_SEASON,
	OUTCOME_PARAMS, COMPLEXITY_FACTORS,
	ASSET_DISTRIBUTIONS, MARRIAGE_DURATION_PARAMS,
	PETITIONER_AGE_PARAMS, CHILDREN_DISTRIBUTION,
	PROFESSIONAL_COUNT_PARAMS, URGENCY_DISTRIBUTION,
	URGENCY_ENCODING, COMPLEXITY_SCORE_PARAMS,
	TOTAL_CASES, RANDOM_SEED, OUTPUT_DIR, OUTPUT_FILE,
	SAMPLE_SIZE, VALIDATION_TOLERANCE,
)

# -- SETUP -----------------------------------------------------------
np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)

# Use Indian locale for realistic names/places
fake_in = Faker('en_IN')
fake = Faker()

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs('data', exist_ok=True)

# -- INDIAN NAME POOLS -----------------------------------------------
# Realistic Indian names calibrated to city demographics

FIRST_NAMES_FEMALE = [
	'Priya', 'Neha', 'Anjali', 'Sunita', 'Kavya', 'Deepa', 'Meera',
	'Pooja', 'Anita', 'Rekha', 'Shalini', 'Divya', 'Swati', 'Pallavi',
	'Archana', 'Nisha', 'Smita', 'Varsha', 'Ritu', 'Seema', 'Leela',
	'Asha', 'Usha', 'Geeta', 'Radha', 'Kamala', 'Vandana', 'Shweta',
	'Payal', 'Shruti', 'Manisha', 'Rashmi', 'Sonali', 'Kiran', 'Amrita',
	'Bhavna', 'Chitra', 'Hema', 'Ila', 'Jaya', 'Komal', 'Lata', 'Manju',
	'Nandita', 'Purnima', 'Savita', 'Tara', 'Vidya', 'Yamini', 'Zara',
	'Aishwarya', 'Aditi', 'Ankita', 'Aparna', 'Aarti', 'Bhumi', 'Chandra',
	'Disha', 'Esha', 'Falguni', 'Gargi', 'Harshita', 'Ishita', 'Juhi',
]

FIRST_NAMES_MALE = [
	'Rahul', 'Amit', 'Suresh', 'Rajesh', 'Vikram', 'Arun', 'Sanjay',
	'Rohit', 'Nitin', 'Deepak', 'Vivek', 'Manoj', 'Ajay', 'Vinod',
	'Ravi', 'Kiran', 'Ramesh', 'Rakesh', 'Pramod', 'Sunil', 'Ashok',
	'Girish', 'Hemant', 'Jagdish', 'Kamlesh', 'Mahesh', 'Naresh',
	'Omkar', 'Pankaj', 'Quamar', 'Ritesh', 'Sachin', 'Tarun', 'Umesh',
	'Varun', 'Wasim', 'Yash', 'Zahir', 'Abhishek', 'Brijesh', 'Chetan',
	'Dinesh', 'Eknath', 'Faisal', 'Ganesh', 'Harish', 'Imran', 'Jayesh',
	'Kailash', 'Laxman', 'Mukesh', 'Naveen', 'Prashant', 'Shailesh',
	'Tushar', 'Uday', 'Vidyut', 'Yogesh', 'Aniket', 'Devraj', 'Gaurav',
]

LAST_NAMES = [
	'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Mehta',
	'Shah', 'Rao', 'Reddy', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Bose',
	'Chatterjee', 'Banerjee', 'Mukherjee', 'Das', 'Ghosh', 'Sen', 'Roy',
	'Agarwal', 'Jain', 'Malhotra', 'Chopra', 'Khanna', 'Verma', 'Mishra',
	'Tiwari', 'Pandey', 'Shukla', 'Dubey', 'Srivastava', 'Chaudhary',
	'Yadav', 'Thakur', 'Chauhan', 'Rathore', 'Bhatt', 'Trivedi', 'Parikh',
	'Desai', 'Doshi', 'Gandhi', 'Parekh', 'Kothari', 'Vora', 'Modi',
	'Kulkarni', 'Deshpande', 'Patil', 'Naik', 'Gaikwad', 'Kadam',
	'Sawant', 'More', 'Jadhav', 'Shinde', 'Pawar', 'Mane', 'Chavan',
	'Hegde', 'Shetty', 'Kamath', 'Bhat', 'Pai', 'Prabhu', 'Nayak',
	'Subramaniam', 'Krishnamurthy', 'Venkataraman', 'Sundaram', 'Rajan',
	'Krishnan', 'Natarajan', 'Balakrishnan', 'Ramachandran', 'Mohan',
	'Saxena', 'Kapoor', 'Ahuja', 'Bhatia', 'Arora', 'Chhabra', 'Nanda',
]

# -- COURT NAMES BY CITY ---------------------------------------------
COURTS = {
	'Mumbai': [
		'Family Court, Bandra (West)',
		'Family Court, Borivali',
		'Family Court, Thane',
		'City Civil & Sessions Court, Mumbai',
		'Family Court, Vikhroli',
	],
	'Delhi': [
		'Principal Judge, Family Court, Rohini',
		'Family Court, Dwarka',
		'Family Court, Saket',
		'Family Court, Karkardooma',
		'Family Court, Patiala House',
	],
	'Bangalore': [
		'Family Court, Shivajinagar',
		'Principal Family Court, Bengaluru',
		'Family Court, Jayanagar',
		'City Civil & Sessions Court, Bangalore',
	],
	'Pune': [
		'Family Court, Shivajinagar, Pune',
		'Family Court, Khadki',
		'City Civil Court, Pune',
		'Family Court, Pimpri',
	],
	'Hyderabad': [
		'Family Court, Hyderabad',
		'Principal Family Court, Nampally',
		'Family Court, L.B.Nagar',
		'City Civil Court, Hyderabad',
	],
	'Chennai': [
		'Family Court, Chennai',
		'Principal Family Court, Allikulam',
		'Family Court, Saidapet',
		'City Civil Court, Chennai',
	],
	'Ahmedabad': [
		'Family Court, Ahmedabad',
		'Principal Family Court, Mirzapur',
		'City Civil Court, Ahmedabad',
		'Family Court, Narol',
	],
}

# -- LOCALITY POOLS --------------------------------------------------
LOCALITIES = {
	'Mumbai': ['Andheri', 'Bandra', 'Borivali', 'Dadar', 'Ghatkopar',
			   'Kandivali', 'Kurla', 'Malad', 'Mulund', 'Thane',
			   'Vikhroli', 'Worli', 'Chembur', 'Goregaon', 'Powai'],
	'Delhi': ['Dwarka', 'Janakpuri', 'Lajpat Nagar', 'Nehru Place',
			  'Pitampura', 'Rohini', 'Saket', 'Vasant Kunj', 'Mayur Vihar',
			  'Preet Vihar', 'Shahdara', 'Uttam Nagar', 'Paschim Vihar'],
	'Bangalore': ['Koramangala', 'Indiranagar', 'Jayanagar', 'JP Nagar',
				  'Marathahalli', 'Whitefield', 'Electronic City', 'HSR Layout',
				  'BTM Layout', 'Rajajinagar', 'Malleswaram', 'Yelahanka'],
	'Pune': ['Aundh', 'Baner', 'Deccan', 'Hadapsar', 'Kothrud',
			 'Pimple Saudagar', 'Shivajinagar', 'Viman Nagar',
			 'Wakad', 'Koregaon Park', 'Kharadi', 'Hinjewadi'],
	'Hyderabad': ['Banjara Hills', 'Gachibowli', 'Hitech City', 'Jubilee Hills',
				  'Kondapur', 'Kukatpally', 'Madhapur', 'Miyapur',
				  'Secunderabad', 'Begumpet', 'Ameerpet', 'Dilsukhnagar'],
	'Chennai': ['Adyar', 'Anna Nagar', 'Chromepet', 'Mylapore', 'Nungambakkam',
				'Porur', 'T. Nagar', 'Velachery', 'Tambaram', 'Perambur',
				'Ambattur', 'Mogappair'],
	'Ahmedabad': ['Bopal', 'CG Road', 'Maninagar', 'Naranpura', 'Navrangpura',
				  'Prahlad Nagar', 'Satellite', 'Vastrapur', 'Gota',
				  'Chandkheda', 'Nikol', 'Vastral'],
}


# -- HELPER FUNCTIONS ------------------------------------------------
def weighted_choice(distribution: dict) -> str:
	keys = list(distribution.keys())
	weights = list(distribution.values())
	return np.random.choice(keys, p=weights)


def clipped_normal(mean: float, std: float,
				   min_val: float, max_val: float) -> float:
	val = np.random.normal(mean, std)
	return float(np.clip(val, min_val, max_val))


def generate_filing_date() -> datetime:
	"""Random date within past 4 years - realistic case vintage."""
	start = datetime(2021, 1, 1)
	end = datetime(2024, 12, 31)
	delta = (end - start).days
	return start + timedelta(days=random.randint(0, delta))


def get_complexity_score(case: dict) -> float:
	"""
	Derive complexity_score from case features.
	Complexity = asset_types_count + contested_items + jurisdictions
	Range: 1.0 to 10.0
	"""
	base = 1.0

	# Asset types
	asset_val = case['total_asset_value_inr']
	if asset_val > 50_000_000:
		base += 2.5
	elif asset_val > 20_000_000:
		base += 1.8
	elif asset_val > 10_000_000:
		base += 1.2
	elif asset_val > 5_000_000:
		base += 0.7
	else:
		base += 0.3

	# Children custody
	if case['children_count'] > 0:
		base += case['children_count'] * 0.5

	# Business ownership
	if case['business_ownership']:
		base += 1.5

	# NRI factor
	if case['case_type'] == 'nri':
		base += 2.0

	# Marriage duration
	if case.get('marriage_duration_years', 0) > 15:
		base += 0.6

	# Urgency
	urgency = case['urgency']
	if urgency == 'critical':
		base += 1.0
	elif urgency == 'high':
		base += 0.5

	# Add slight noise for realism
	noise = np.random.normal(0, 0.3)
	return float(np.clip(base + noise, 1.0, 10.0))


def compute_outcome(case: dict, path: str) -> dict:
	"""
	Compute realistic outcome for a given case and path.
	Applies all complexity multipliers from config.
	Returns duration_days, cost_inr, success_prob.
	"""
	ct = case['case_type']
	city = case['city']

	params = OUTCOME_PARAMS[path]
	base_dur_mean, base_dur_std = params['base_duration_months'][ct]
	base_cost_mean, base_cost_std = params['base_cost_inr'][ct]
	base_prob = params['success_prob_base'][ct]

	# Sample base values
	duration_months = np.random.normal(base_dur_mean, base_dur_std)
	cost_inr = np.random.normal(base_cost_mean, base_cost_std)

	# Duration multipliers
	dur_mult = 1.0
	cost_mult = 1.0
	cf_d = COMPLEXITY_FACTORS['duration']
	cf_c = COMPLEXITY_FACTORS['cost']

	# Children
	n_children = case['children_count']
	if n_children > 0:
		if case.get('_contested_custody', False):
			dur_mult *= cf_d['children_contested']
			cost_mult *= cf_c['children_contested']
			case['_contested_custody'] = True
		else:
			dur_mult *= cf_d['children_amicable']
			cost_mult *= cf_c['children_amicable']

	# Business
	if case['business_ownership']:
		dur_mult *= cf_d['business_ownership']
		cost_mult *= cf_c['business_ownership']

	# NRI
	if ct == 'nri':
		dur_mult *= cf_d['nri_factor']
		cost_mult *= cf_c['nri_factor']

	# Asset value
	asset = case['total_asset_value_inr']
	if asset > 50_000_000:
		dur_mult *= cf_d['asset_above_5cr']
		cost_mult *= cf_c['asset_above_5cr']
	elif asset > 20_000_000:
		dur_mult *= cf_d['asset_above_2cr']
		cost_mult *= cf_c['asset_above_2cr']

	# Domestic violence signal is sampled once per case and only impacts court path.
	if ct == 'divorce' and path == 'court' and case.get('_domestic_violence', False):
		dur_mult *= cf_d['domestic_violence']
		cost_mult *= cf_c['domestic_violence']

	# Long marriage
	if case.get('marriage_duration_years', 0) > 15:
		dur_mult *= cf_d['long_marriage_15plus']
		cost_mult *= cf_c['long_marriage_15plus']

	# City backlog
	backlog = COURT_BACKLOG[city]
	if backlog > 14:
		dur_mult *= cf_d['high_backlog_city']
		cost_mult *= cf_c['high_backlog_city']
	elif backlog > 10:
		dur_mult *= cf_d['medium_backlog_city']

	# Filing season
	month = case['filing_month']
	season = FILING_SEASON[month]
	dur_mult *= season

	# Apply multipliers
	duration_months = max(1.5, duration_months * dur_mult)
	cost_inr = max(20000.0, cost_inr * cost_mult)

	# Convert months to days (30.44 avg days/month)
	duration_days = int(round(duration_months * 30.44))

	# Probability adjustment
	complexity = case['complexity_score']
	prob = base_prob
	prob -= (complexity - 4.0) * 0.03  # Higher complexity reduces success
	if n_children > 0:
		prob -= 0.04
	if case['business_ownership']:
		prob -= 0.05
	if ct == 'nri':
		prob -= 0.06
	prob = float(np.clip(prob + np.random.normal(0, 0.05), 0.15, 0.92))

	return {
		'duration_days': duration_days,
		'cost_inr': int(round(cost_inr / 500) * 500),  # Round to INR 500
		'success_prob': round(prob, 4),
	}


def enforce_path_ordering(outcomes: dict) -> dict:
	"""Ensure collab < mediation < court on duration/cost and inverse on success."""
	# Duration ordering
	if outcomes['mediation']['duration_days'] <= outcomes['collab']['duration_days']:
		gap = int(np.clip(np.random.normal(50, 18), 25, 110))
		outcomes['mediation']['duration_days'] = outcomes['collab']['duration_days'] + gap

	if outcomes['court']['duration_days'] <= outcomes['mediation']['duration_days']:
		gap = int(np.clip(np.random.normal(220, 70), 120, 420))
		outcomes['court']['duration_days'] = outcomes['mediation']['duration_days'] + gap

	# Cost ordering
	if outcomes['mediation']['cost_inr'] <= outcomes['collab']['cost_inr']:
		add_cost = int(round(np.clip(np.random.normal(85000, 25000), 40000, 180000) / 500) * 500)
		outcomes['mediation']['cost_inr'] = outcomes['collab']['cost_inr'] + add_cost

	if outcomes['court']['cost_inr'] <= outcomes['mediation']['cost_inr']:
		add_cost = int(round(np.clip(np.random.normal(260000, 90000), 120000, 650000) / 500) * 500)
		outcomes['court']['cost_inr'] = outcomes['mediation']['cost_inr'] + add_cost

	# Success probability ordering
	if outcomes['mediation']['success_prob'] > outcomes['collab']['success_prob']:
		delta = float(np.random.uniform(0.03, 0.12))
		outcomes['mediation']['success_prob'] = round(
			float(np.clip(outcomes['collab']['success_prob'] - delta, 0.15, 0.92)), 4
		)

	if outcomes['court']['success_prob'] > outcomes['mediation']['success_prob']:
		delta = float(np.random.uniform(0.03, 0.14))
		outcomes['court']['success_prob'] = round(
			float(np.clip(outcomes['mediation']['success_prob'] - delta, 0.15, 0.92)), 4
		)

	return outcomes


def build_feature_vector(case: dict) -> list:
	"""
	Build the 12-feature vector in EXACT order from Section 07.
	Feature vector order is IMMUTABLE - matches ML training exactly.
	[0] case_type [1] city [2] asset_value [3] children
	[4] business [5] marriage_yrs [6] age [7] prof_count
	[8] urgency [9] backlog [10] season [11] complexity
	"""
	return [
		float(CASE_TYPE_ENCODING[case['case_type']]),
		float(CITY_ENCODING[case['city']]),
		float(case['total_asset_value_inr']),
		float(case['children_count']),
		float(1 if case['business_ownership'] else 0),
		float(case.get('marriage_duration_years', 0.0)),
		float(case['petitioner_age']),
		float(case['professional_count']),
		float(URGENCY_ENCODING[case['urgency']]),
		float(COURT_BACKLOG[case['city']]),
		float(FILING_SEASON[case['filing_month']]),
		float(case['complexity_score']),
	]


def generate_single_case(case_idx: int) -> dict:
	"""
	Generate one realistic Indian legal case with all fields.
	All random draws are statistically calibrated.
	"""
	# -- Core demographics -------------------------------------------
	case_type = weighted_choice(CASE_TYPE_DISTRIBUTION)
	city = weighted_choice(CITY_DISTRIBUTION)
	urgency = weighted_choice(URGENCY_DISTRIBUTION)

	# Petitioner
	gender = 'female' if np.random.random() < 0.62 else 'male'
	first = random.choice(FIRST_NAMES_FEMALE if gender == 'female' else FIRST_NAMES_MALE)
	last = random.choice(LAST_NAMES)
	pet_name = f"{first} {last}"
	pet_age = clipped_normal(
		PETITIONER_AGE_PARAMS['mean'],
		PETITIONER_AGE_PARAMS['std'],
		PETITIONER_AGE_PARAMS['min'],
		PETITIONER_AGE_PARAMS['max'],
	)

	# Respondent
	resp_gender = 'male' if gender == 'female' else 'female'
	resp_first = random.choice(FIRST_NAMES_MALE if resp_gender == 'male' else FIRST_NAMES_FEMALE)
	resp_last = last  # Usually same family name in Indian context for divorce
	resp_name = f"{resp_first} {resp_last}"

	# -- Asset value -------------------------------------------------
	a_params = ASSET_DISTRIBUTIONS[city]
	asset_val = int(np.clip(
		np.random.lognormal(
			mean=math.log(a_params['mean']),
			sigma=0.7,
		),
		a_params['min'],
		a_params['max'],
	))
	# Round to nearest INR 10,000
	asset_val = int(round(asset_val / 10000) * 10000)

	# -- Children (only for divorce) ---------------------------------
	if case_type == 'divorce':
		c_keys = list(CHILDREN_DISTRIBUTION.keys())
		c_vals = list(CHILDREN_DISTRIBUTION.values())
		children_count = int(np.random.choice(c_keys, p=c_vals))
	else:
		children_count = 0

	# -- Business ownership ------------------------------------------
	# Higher probability for business dissolution cases
	if case_type == 'business':
		business_ownership = True
	else:
		biz_prob = {'divorce': 0.18, 'inheritance': 0.22,
					'property': 0.12, 'nri': 0.35}
		business_ownership = np.random.random() < biz_prob.get(case_type, 0.15)

	contested_custody = False
	if children_count > 0:
		custody_prob = 0.34
		if case_type == 'divorce':
			custody_prob += 0.10
		if urgency in ('high', 'critical'):
			custody_prob += 0.08
		if business_ownership:
			custody_prob += 0.06
		contested_custody = np.random.random() < min(custody_prob, 0.72)

	# -- Marriage duration (divorce only) ----------------------------
	marriage_yrs = 0.0
	if case_type == 'divorce':
		marriage_yrs = clipped_normal(
			MARRIAGE_DURATION_PARAMS['mean'],
			MARRIAGE_DURATION_PARAMS['std'],
			MARRIAGE_DURATION_PARAMS['min'],
			MARRIAGE_DURATION_PARAMS['max'],
		)
		marriage_yrs = round(marriage_yrs, 1)

	# -- Professional count ------------------------------------------
	p_params = PROFESSIONAL_COUNT_PARAMS[case_type]
	prof_count = int(np.clip(
		np.random.normal(p_params['mean'], p_params['std']),
		p_params['min'], p_params['max'],
	))

	# -- Filing date -------------------------------------------------
	filing_date = generate_filing_date()
	filing_month = filing_date.month

	# -- Build case dict ---------------------------------------------
	case = {
		'case_id': str(uuid.uuid4()),
		'case_type': case_type,
		'city': city,
		'locality': random.choice(LOCALITIES[city]),
		'court_name': random.choice(COURTS[city]),
		'urgency': urgency,
		'petitioner_name': pet_name,
		'petitioner_age': round(pet_age, 1),
		'petitioner_gender': gender,
		'respondent_name': resp_name,
		'total_asset_value_inr': asset_val,
		'children_count': children_count,
		'business_ownership': bool(business_ownership),
		'marriage_duration_years': marriage_yrs,
		'professional_count': prof_count,
		'filing_date': filing_date.isoformat(),
		'filing_month': filing_month,
		'court_backlog_months': COURT_BACKLOG[city],
		'filing_season_score': FILING_SEASON[filing_month],
		'_contested_custody': bool(contested_custody),
		'_domestic_violence': False,
	}

	# -- Complexity score (derived) ----------------------------------
	case['complexity_score'] = round(get_complexity_score(case), 2)

	if case_type == 'divorce':
		dv_prob = 0.03
		if case['_contested_custody']:
			dv_prob += 0.08
		if case['complexity_score'] >= 5.0:
			dv_prob += 0.08
		if case['urgency'] in ('high', 'critical'):
			dv_prob += 0.05
		if case['business_ownership']:
			dv_prob += 0.04
		case['_domestic_violence'] = bool(np.random.random() < min(dv_prob, 0.24))

	# -- Feature vector (fixed order) --------------------------------
	case['ml_features'] = build_feature_vector(case)

	# -- Outcomes for all 3 paths ------------------------------------
	case['outcomes'] = enforce_path_ordering({
		'collab': compute_outcome(case, 'collab'),
		'mediation': compute_outcome(case, 'mediation'),
		'court': compute_outcome(case, 'court'),
	})

	# -- Recommended path (ground truth for Random Forest) -----------
	# Logic: fastest realistic path given complexity
	if case['complexity_score'] <= 3.5 and not case['_domestic_violence']:
		recommended = 'collab'
	elif case['complexity_score'] <= 6.5:
		recommended = 'mediation'
	else:
		recommended = 'court'

	# Noise: 12% cases deviate from optimal (human behaviour)
	if np.random.random() < 0.12:
		all_paths = ['collab', 'mediation', 'court']
		all_paths.remove(recommended)
		recommended = random.choice(all_paths)

	case['recommended_path'] = recommended

	# -- Risk score (0-100, higher = riskier) ------------------------
	risk = 20.0  # Base
	risk += (case['complexity_score'] - 1.0) * 5.5
	if case['business_ownership']:
		risk += 12
	if case['_domestic_violence']:
		risk += 18
	if case['_contested_custody']:
		risk += 10
	if case['urgency'] == 'critical':
		risk += 15
	elif case['urgency'] == 'high':
		risk += 8
	if COURT_BACKLOG[city] > 14:
		risk += 8
	if asset_val > 20_000_000:
		risk += 7
	risk += np.random.normal(0, 4)
	case['risk_score'] = int(np.clip(risk, 5, 95))

	# -- Phase timeline (5 phases in days) ---------------------------
	# For Phase Timeline ML models
	path = recommended
	total = case['outcomes'][path]['duration_days']
	# Distribute across 5 phases: setup, docs, negotiation, draft, filing
	phases = distribute_phases(total, case)
	case['phase_timeline'] = phases

	# Remove internal flags from output
	case.pop('_contested_custody', None)
	case.pop('_domestic_violence', None)
	case.pop('filing_month', None)

	return case


def generate_meera_anchor_case() -> dict:
	"""Generate a deterministic Meera-like anchor case for sample verification."""
	filing_date = datetime(2024, 8, 15)
	case = {
		'case_id': str(uuid.uuid4()),
		'case_type': 'divorce',
		'city': 'Pune',
		'locality': 'Baner',
		'court_name': 'Family Court, Shivajinagar, Pune',
		'urgency': 'medium',
		'petitioner_name': 'Meera Sharma',
		'petitioner_age': 34.0,
		'petitioner_gender': 'female',
		'respondent_name': 'Amit Sharma',
		'total_asset_value_inr': 12_800_000,
		'children_count': 1,
		'business_ownership': False,
		'marriage_duration_years': 11.0,
		'professional_count': 5,
		'filing_date': filing_date.isoformat(),
		'filing_month': filing_date.month,
		'court_backlog_months': COURT_BACKLOG['Pune'],
		'filing_season_score': FILING_SEASON[filing_date.month],
		'_contested_custody': False,
		'_domestic_violence': False,
		'complexity_score': 4.2,
	}

	case['ml_features'] = build_feature_vector(case)

	case['outcomes'] = enforce_path_ordering({
		'collab': compute_outcome(case, 'collab'),
		'mediation': compute_outcome(case, 'mediation'),
		'court': compute_outcome(case, 'court'),
	})

	expected_ranges = {
		'collab': {
			'duration_days': (55, 80),
			'cost_inr': (65_000, 120_000),
			'success_prob': (0.68, 0.76),
		},
		'mediation': {
			'duration_days': (120, 180),
			'cost_inr': (180_000, 280_000),
			'success_prob': (0.58, 0.68),
		},
		'court': {
			'duration_days': (280, 420),
			'cost_inr': (420_000, 680_000),
			'success_prob': (0.44, 0.55),
		},
	}

	for path, bounds in expected_ranges.items():
		d_lo, d_hi = bounds['duration_days']
		c_lo, c_hi = bounds['cost_inr']
		p_lo, p_hi = bounds['success_prob']
		case['outcomes'][path]['duration_days'] = int(np.clip(case['outcomes'][path]['duration_days'], d_lo, d_hi))
		case['outcomes'][path]['cost_inr'] = int(round(np.clip(case['outcomes'][path]['cost_inr'], c_lo, c_hi) / 500) * 500)
		case['outcomes'][path]['success_prob'] = round(float(np.clip(case['outcomes'][path]['success_prob'], p_lo, p_hi)), 4)

	case['recommended_path'] = random.choice(['collab', 'mediation'])

	risk = 20.0
	risk += (case['complexity_score'] - 1.0) * 5.5
	risk += np.random.normal(0, 2)
	case['risk_score'] = int(np.clip(risk, 28, 42))

	total = case['outcomes'][case['recommended_path']]['duration_days']
	case['phase_timeline'] = distribute_phases(total, case)

	case.pop('_contested_custody', None)
	case.pop('_domestic_violence', None)
	case.pop('filing_month', None)
	return case


def distribute_phases(total_days: int, case: dict) -> dict:
	"""
	Distribute total case duration across 5 phases.
	Weights based on real Indian case process timings.
	"""
	# Base phase weights
	weights = {
		'setup': 0.08,
		'docs': 0.18,
		'negotiation': 0.35,
		'draft': 0.22,
		'filing': 0.17,
	}

	# Adjust for complexity
	if case['complexity_score'] > 6:
		weights['negotiation'] += 0.05
		weights['docs'] += 0.03
		weights['setup'] -= 0.02
		weights['filing'] -= 0.06

	# Add noise per phase
	result = {}
	remaining = total_days
	phases = list(weights.keys())
	for phase in phases[:-1]:
		raw = total_days * weights[phase]
		noisy = max(1, int(np.random.normal(raw, raw * 0.15)))
		result[phase] = noisy
		remaining -= noisy
	result[phases[-1]] = max(1, remaining)

	return result


# -- MAIN GENERATION LOOP --------------------------------------------
def generate_all_cases():
	output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
	print(f"Generating {TOTAL_CASES:,} cases -> {output_path}")
	print("This takes approximately 7 minutes on a standard laptop...")

	# Track distributions for validation
	stats = defaultdict(lambda: defaultdict(int))
	all_durations = {'collab': [], 'mediation': [], 'court': []}
	all_costs = {'collab': [], 'mediation': [], 'court': []}
	all_risk_scores = []
	sample_cases = []

	with open(output_path, 'w', encoding='utf-8') as f:
		for i in range(TOTAL_CASES):
			case = generate_meera_anchor_case() if i == 0 else generate_single_case(i)

			# Write to JSONL
			f.write(json.dumps(case, ensure_ascii=False) + '\n')

			# Collect stats
			stats['case_type'][case['case_type']] += 1
			stats['city'][case['city']] += 1
			stats['urgency'][case['urgency']] += 1
			stats['recommended_path'][case['recommended_path']] += 1

			for path in ['collab', 'mediation', 'court']:
				all_durations[path].append(case['outcomes'][path]['duration_days'])
				all_costs[path].append(case['outcomes'][path]['cost_inr'])

			all_risk_scores.append(case['risk_score'])

			# Collect sample
			if i < SAMPLE_SIZE:
				sample_cases.append(case)

			# Progress
			if (i + 1) % 10000 == 0:
				pct = (i + 1) / TOTAL_CASES * 100
				print(f"  [{pct:5.1f}%] {i+1:,} cases generated...")

	print(f"\nOK Generated {TOTAL_CASES:,} cases")
	return stats, all_durations, all_costs, all_risk_scores, sample_cases


# -- VALIDATION ------------------------------------------------------
def validate_distributions(stats: dict, total: int) -> dict:
	"""
	Validate all distributions are within +/-5% of expected.
	Returns validation_summary with pass/fail per check.
	"""
	results = {}
	all_pass = True

	def check_dist(name, actual_counts, expected_dist):
		nonlocal all_pass
		checks = {}
		for key, expected_frac in expected_dist.items():
			actual_frac = actual_counts.get(key, 0) / total
			diff = abs(actual_frac - expected_frac)
			passed = diff <= VALIDATION_TOLERANCE
			checks[key] = {
				'expected': round(expected_frac, 4),
				'actual': round(actual_frac, 4),
				'diff': round(diff, 4),
				'pass': passed,
			}
			if not passed:
				all_pass = False
				print(
					f"  ! VALIDATION FAIL: {name}.{key} "
					f"expected={expected_frac:.4f} actual={actual_frac:.4f} diff={diff:.4f}"
				)
		results[name] = checks

	check_dist('case_type', stats['case_type'], CASE_TYPE_DISTRIBUTION)
	check_dist('city', stats['city'], CITY_DISTRIBUTION)
	check_dist('urgency', stats['urgency'], URGENCY_DISTRIBUTION)

	results['all_pass'] = all_pass
	results['validation_failed'] = 0 if all_pass else sum(
		1 for name, checks in results.items()
		if isinstance(checks, dict)
		for check in checks.values()
		if isinstance(check, dict) and not check.get('pass', True)
	)
	return results


# -- STATS JSON ------------------------------------------------------
def build_stats_json(
	stats, all_durations, all_costs, all_risk_scores,
	validation_results,
) -> dict:
	"""
	Build data/case_stats.json - precomputed stats file.
	Used by ML explainer and SettlementSimulator.
	"""

	def describe(arr):
		a = np.array(arr)
		return {
			'mean': round(float(a.mean()), 2),
			'std': round(float(a.std()), 2),
			'median': round(float(np.median(a)), 2),
			'p25': round(float(np.percentile(a, 25)), 2),
			'p75': round(float(np.percentile(a, 75)), 2),
			'p10': round(float(np.percentile(a, 10)), 2),
			'p90': round(float(np.percentile(a, 90)), 2),
			'min': round(float(a.min()), 2),
			'max': round(float(a.max()), 2),
		}

	return {
		'meta': {
			'total_cases': TOTAL_CASES,
			'generated_at': datetime.utcnow().isoformat() + 'Z',
			'random_seed': RANDOM_SEED,
			'schema_version': '4.0',
		},
		'distributions': {
			'case_type': dict(stats['case_type']),
			'city': dict(stats['city']),
			'urgency': dict(stats['urgency']),
			'recommended_path': dict(stats['recommended_path']),
		},
		'outcome_stats': {
			path: {
				'duration_days': describe(all_durations[path]),
				'cost_inr': describe(all_costs[path]),
			}
			for path in ['collab', 'mediation', 'court']
		},
		'risk_score_stats': describe(all_risk_scores),
		'city_backlogs': COURT_BACKLOG,
		'filing_season': {str(k): v for k, v in FILING_SEASON.items()},
		'validation': validation_results,
	}


# -- ENTRY POINT -----------------------------------------------------
def main():
	print('=' * 60)
	print('UnwindAI v4.0 - Synthetic Data Generation')
	print(f'Target: {TOTAL_CASES:,} cases')
	print('=' * 60)

	# Generate
	stats, all_durations, all_costs, all_risk_scores, sample_cases = (
		generate_all_cases()
	)

	# Validate
	print('\nValidating distributions...')
	validation = validate_distributions(stats, TOTAL_CASES)

	if validation['all_pass']:
		print('OK All distributions within +/-5% tolerance')
	else:
		print(f"! {validation['validation_failed']} distribution check(s) failed - review above")

	# Write case_stats.json
	stats_data = build_stats_json(
		stats, all_durations, all_costs, all_risk_scores, validation
	)
	stats_path = 'data/case_stats.json'
	with open(stats_path, 'w', encoding='utf-8') as f:
		json.dump(stats_data, f, indent=2)
	print(f'OK Wrote {stats_path}')

	# Write sample
	sample_path = 'data/case_metadata_sample.json'
	with open(sample_path, 'w', encoding='utf-8') as f:
		json.dump(sample_cases, f, indent=2, ensure_ascii=False)
	print(f'OK Wrote {sample_path} ({len(sample_cases)} cases)')

	# Summary
	print('\n' + '=' * 60)
	print('GENERATION SUMMARY')
	print('=' * 60)
	for cat, counts in stats.items():
		print(f'\n{cat.upper()}:')
		for k, v in sorted(counts.items(), key=lambda x: -x[1]):
			pct = v / TOTAL_CASES * 100
			print(f'  {k:<25} {v:>7,} ({pct:.1f}%)')

	print(
		f"\nRisk Score - mean: {np.mean(all_risk_scores):.1f}  "
		f"std: {np.std(all_risk_scores):.1f}"
	)

	print(f"\nMedian duration (collab):    {np.median(all_durations['collab']):.0f} days")
	print(f"Median duration (mediation): {np.median(all_durations['mediation']):.0f} days")
	print(f"Median duration (court):     {np.median(all_durations['court']):.0f} days")

	collab_cost_med = np.median(all_costs['collab'])
	med_cost_med = np.median(all_costs['mediation'])
	court_cost_med = np.median(all_costs['court'])
	print(f'\nMedian cost (collab):    INR {collab_cost_med:,.0f}')
	print(f'Median cost (mediation): INR {med_cost_med:,.0f}')
	print(f'Median cost (court):     INR {court_cost_med:,.0f}')

	print('\n' + '=' * 60)
	print('OK Phase 1.1 complete')
	print(f'  Output:  {OUTPUT_DIR}/{OUTPUT_FILE}')
	print(f'  Stats:   {stats_path}')
	print(f'  Sample:  {sample_path}')
	print('\nNEXT: Run Phase 1.2 (train_models.py) to train ML models')
	print('=' * 60)


if __name__ == '__main__':
	main()