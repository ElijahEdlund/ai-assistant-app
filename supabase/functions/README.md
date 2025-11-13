# Supabase Edge Functions

This directory contains Edge Functions for the AI Assistant App.

## Setup

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Environment Variables

Set secrets in Supabase Dashboard or via CLI:

```bash
# Set OpenAI API Key
supabase secrets set OPENAI_API_KEY=your_openai_api_key

# Optional: Set OpenAI Model (default: gpt-4o)
supabase secrets set OPENAI_MODEL=gpt-4o
```

## Deploy Functions

### Generate Plan Function

Generates a personalized 12-week workout plan based on user assessment.

```bash
supabase functions deploy generate_plan
```

**Usage:**
```typescript
const { data, error } = await supabase.functions.invoke('generate_plan', {
  body: { user_id: userId, assessment: assessmentData }
});
```

### Weekly Adjust Function

Adjusts the workout plan based on user reflections and progress.

```bash
supabase functions deploy weekly_adjust
```

**Usage:**
```typescript
const { data, error } = await supabase.functions.invoke('weekly_adjust', {
  body: { user_id: userId }
});
```

## Local Development

Run functions locally:

```bash
supabase functions serve generate_plan
```

## Notes

- Functions use Deno runtime
- Service role key is automatically injected
- OpenAI integration is optional (falls back to mock plans if not configured)

