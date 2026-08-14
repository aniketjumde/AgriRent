import sqlite3
import os

db_path = 'backend/db.sqlite3'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, title, category, image_url FROM api_equipment")
        rows = cursor.fetchall()
        print("Equipment in Database:")
        for r in rows:
            print(f"ID: {r[0]} | Title: {r[1]} | Category: {r[2]} | Image: {r[3]}")
    except Exception as e:
        print("Error reading api_equipment:", e)
    conn.close()
else:
    print(f"Database not found at {db_path}")
