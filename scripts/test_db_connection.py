import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Test direct connection
db_urls = [
    "postgresql+asyncpg://postgres:aTAGJW%21%40%23123@db.gpnhdrsjferyxxmktmgj.supabase.co:5432/postgres",
    "postgresql+asyncpg://postgres.gpnhdrsjferyxxmktmgj:aTAGJW%21%40%23123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    "postgresql+asyncpg://postgres.gpnhdrsjferyxxmktmgj:aTAGJW%21%40%23123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
]

async def test_conn():
    for url in db_urls:
        print(f"\nAttempting connection to: {url.split('@')[1]}...")
        try:
            engine = create_async_engine(url, connect_args={"timeout": 10})
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT version();"))
                version = res.scalar()
                print(f"SUCCESS! Connected to Supabase PostgreSQL:")
                print(f"Version: {version}")
                await engine.dispose()
                return url
        except Exception as e:
            print(f"Connection failed: {e}")
            await engine.dispose()
    return None

if __name__ == "__main__":
    success_url = asyncio.run(test_conn())
    if success_url:
        print(f"\n Working DATABASE_URL found: {success_url}")
    else:
        print("\n Could not connect with the tested URLs.")
