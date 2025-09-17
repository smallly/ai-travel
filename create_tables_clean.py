#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Supabase Database Table Creation Script
Creates user_trips and trip_activities tables for the travel assistant app
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def create_tables():
    """Create necessary database tables"""

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY', os.getenv('SUPABASE_ANON_KEY'))

    if not supabase_url or not supabase_key:
        print("Error: Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables")
        return False

    try:
        print("Connecting to Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)

        # Create user_trips table SQL
        create_user_trips_sql = """
        CREATE TABLE IF NOT EXISTS user_trips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            destination VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            budget DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'planned',
            cover_image TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """

        # Create trip_activities table SQL
        create_trip_activities_sql = """
        CREATE TABLE IF NOT EXISTS trip_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id UUID NOT NULL,
            day_number INTEGER NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            location VARCHAR(200),
            start_time TIME,
            end_time TIME,
            estimated_cost DECIMAL(8,2),
            activity_type VARCHAR(50) DEFAULT 'sightseeing',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """

        # Create indexes
        create_indexes = [
            "CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);",
            "CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);"
        ]

        # Execute SQL using RPC
        print("Creating user_trips table...")
        try:
            result = supabase.rpc('exec', {'sql': create_user_trips_sql}).execute()
            print("user_trips table created successfully")
        except Exception as e:
            print(f"Creating user_trips table failed: {e}")
            # Check if table already exists
            try:
                # Try to query the table to see if it exists
                supabase.table('user_trips').select('id').limit(1).execute()
                print("user_trips table already exists")
            except:
                print("user_trips table creation failed completely")
                return False

        print("Creating trip_activities table...")
        try:
            result = supabase.rpc('exec', {'sql': create_trip_activities_sql}).execute()
            print("trip_activities table created successfully")
        except Exception as e:
            print(f"Creating trip_activities table failed: {e}")
            try:
                supabase.table('trip_activities').select('id').limit(1).execute()
                print("trip_activities table already exists")
            except:
                print("trip_activities table creation failed completely")
                return False

        print("Creating indexes...")
        for index_sql in create_indexes:
            try:
                supabase.rpc('exec', {'sql': index_sql}).execute()
            except Exception as e:
                print(f"Creating index failed: {e}")

        print("All database tables created successfully!")
        return True

    except Exception as e:
        print(f"General error: {e}")
        return False

def test_tables():
    """Test database table access"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY', os.getenv('SUPABASE_ANON_KEY'))

    try:
        supabase: Client = create_client(supabase_url, supabase_key)

        print("Testing table access...")

        # Test user_trips table
        result = supabase.table('user_trips').select('id').limit(1).execute()
        print("✓ user_trips table accessible")

        # Test trip_activities table
        result = supabase.table('trip_activities').select('id').limit(1).execute()
        print("✓ trip_activities table accessible")

        return True
    except Exception as e:
        print(f"Table testing failed: {e}")
        return False

if __name__ == "__main__":
    print("=== Supabase Database Table Setup ===")
    print()

    if create_tables():
        print("\nTesting tables...")
        if test_tables():
            print("\n✓ All tables created and accessible! Ready for use.")
        else:
            print("\n✗ Table creation succeeded but testing failed. Please check manually.")
    else:
        print("\nTable creation failed.")
        print("\nManual steps:")
        print("1. Go to https://app.supabase.com")
        print("2. Select your project")
        print("3. Go to 'SQL Editor'")
        print("4. Run the SQL commands from SUPABASE_SETUP.md")