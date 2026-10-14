"""
Automated Migration Runner for Supabase Project uptezhanqndjuxysrygu.
Executes supabase/ALL_MIGRATIONS.sql against the live database instance.
"""
import os
import sys
import psycopg2

HOST = "aws-0-ap-northeast-1.pooler.supabase.com"
PORT = 5432
USER = "postgres.uptezhanqndjuxysrygu"
DBNAME = "postgres"
MIGRATIONS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "supabase", "ALL_MIGRATIONS.sql"))

def run_migrations(password: str):
    print(f"Connecting to Supabase PostgreSQL at {HOST}:{PORT}...")
    try:
        conn = psycopg2.connect(
            host=HOST,
            port=PORT,
            user=USER,
            password=password,
            dbname=DBNAME,
            sslmode="require",
            connect_timeout=10,
        )
        conn.autocommit = True
        print("[+] Connected successfully to Supabase database!")

        with open(MIGRATIONS_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        print(f"[+] Executing ALL_MIGRATIONS.sql ({len(sql_content):,} bytes)...")
        with conn.cursor() as cur:
            cur.execute(sql_content)

        print("[+] Master migration executed successfully!")
        
        # Verify created tables
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
            tables = [r[0] for r in cur.fetchall()]
            print(f"[+] Verified {len(tables)} public tables created in Supabase:")
            for t in tables:
                print(f"    - {t}")

        conn.close()
        print("\n[SUCCESS] Supabase database is now 100% migrated and active!")
        return True
    except psycopg2.OperationalError as e:
        print(f"[-] Connection or authentication error: {e}")
        return False
    except Exception as e:
        print(f"[-] Migration error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pwd = sys.argv[1]
    else:
        pwd = os.environ.get("SUPABASE_DB_PASSWORD")
    
    if not pwd:
        print("Usage: python scripts/apply_supabase_migrations.py <SUPABASE_DB_PASSWORD>")
        sys.exit(1)
        
    success = run_migrations(pwd)
    sys.exit(0 if success else 1)
