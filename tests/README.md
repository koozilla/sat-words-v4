# Test Scripts

This directory contains various test and utility scripts for the SAT Vocabulary App.

## Database Setup Scripts

### `create-test-user.js`
Creates a test user in the database with the email `test@example.com` and adds 5 words to their active pool.

**Usage:**
```bash
NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2) SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2) node tests/create-test-user.js
```

### `create-review-test-data-simple.js`
Adds 3 words (Abate, Adversity, Aesthetic) to the test user's progress in 'ready' state for review testing.

**Usage:**
```bash
NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2) SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2) node tests/create-review-test-data-simple.js
```

## Debugging Scripts

### `debug-review.js`
Debug script to check what words are available for review and verify database queries.

### `test-auth.js`
Tests Supabase authentication with the test user credentials.

## Utility Scripts

### `insert-existing-data.js`
Script to insert existing generated word data into the database. Originally used for bulk data insertion.

### `add-test-words-admin.js`
Admin script to add test words to user progress using service role key.

### `create-test-user-auth.js`
Attempts to create a test user with proper Supabase Auth integration.

### `create-review-test-data.js`
Alternative version of the review test data creation script.

## Environment Setup

All scripts require the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for auth operations)

## Notes

- These scripts are primarily for development and testing purposes
- The service role key bypasses Row Level Security (RLS) policies
- Test user ID: `11111111-1111-1111-1111-111111111111`
- Test user email: `test@example.com`
