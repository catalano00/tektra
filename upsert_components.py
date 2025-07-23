import pandas as pd
import numpy as np
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
CSV_FILE = "data/Component_rows (5).csv"  # Update if your filename changes

# Load the CSV
df = pd.read_csv(CSV_FILE)

# Strip whitespace from string columns
for col in df.select_dtypes(include='object').columns:
    df[col] = df[col].str.strip()

# Replace NaN, NaT, inf, -inf with None for JSON serialization
df = df.replace([pd.NA, pd.NaT, np.nan, np.inf, -np.inf], None)

# Convert DataFrame to list of dicts
records = df.to_dict(orient="records")

# Supabase REST endpoint and headers
table_name = "Component"
url = f"{SUPABASE_URL}/rest/v1/{table_name}"

headers = {
    "apikey": SUPABASE_API_KEY,
    "Authorization": f"Bearer {SUPABASE_API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # Enables UPSERT
}

# Upload in batches
batch_size = 50
for i in range(0, len(records), batch_size):
    batch = records[i:i+batch_size]
    response = requests.post(url, json=batch, headers=headers)

    if response.status_code >= 400:
        print(f"❌ Error on batch {i}–{i+batch_size}: {response.text}")
    else:
        print(f"✅ Batch {i}–{i+batch_size} upserted successfully.")
