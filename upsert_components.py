import pandas as pd
import numpy as np
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

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

# List your timestamp columns here
timestamp_columns = ["createdAt", "updatedAt", "completedAt"]

for col in timestamp_columns:
    if col in df.columns:
        df[col] = df[col].apply(
            lambda x: x if pd.isna(x) or (isinstance(x, str) and len(x) >= 10) else None
        )

# --- FIX: Parse and format dateshipped and datedelivered ---
for col in ["dateshipped", "datedelivered"]:
    if col in df.columns:
        # Parse with pandas, coerce errors to NaT, then format as YYYY-MM-DD
        df[col] = pd.to_datetime(df[col], errors='coerce')
        df[col] = df[col].dt.strftime('%Y-%m-%d')
        df[col] = df[col].where(pd.notnull(df[col]), None)

# Fill missing createdAt with current timestamp (ISO format)
if "createdAt" in df.columns:
    df["createdAt"] = df["createdAt"].apply(
        lambda x: x if x is not None else datetime.now(timezone.utc).isoformat()
    )

# Always update updatedAt to current timestamp (ISO format)
if "updatedAt" in df.columns:
    df["updatedAt"] = datetime.now(timezone.utc).isoformat()

# Remove rows with missing id or auto-generate new UUIDs
if "id" in df.columns:
    # Uncomment the next line to auto-generate missing ids:
    df["id"] = df["id"].apply(lambda x: x if pd.notnull(x) else str(uuid.uuid4()))
    df = df[df["id"].notnull()]

# Convert DataFrame to list of dicts (must be after all cleaning)
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
        print(f"✅ Batch {i}–{i+batch_size} upserted successfully. Response: {response.text}")

print(df[["id", "dateshipped", "datedelivered"]].head(10))
