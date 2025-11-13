// Supabase Edge Function: Weekly Plan Adjustment
// Deploy: supabase functions deploy weekly_adjust

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o';

serve(async (req) => {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current plan
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .select('plan')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !planData) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get last week's reflections
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: reflections } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Adjust plan based on reflections (simplified logic for now)
    const adjustedPlan = { ...planData.plan };
    
    if (OPENAI_API_KEY && reflections && reflections.length > 0) {
      // Use AI to adjust based on feedback
      // TODO: Implement AI-based adjustment
    } else {
      // Simple adjustment: maintain current plan
      // In production, adjust volume/intensity based on reflections
    }

    // Update plan
    const { error: updateError } = await supabase
      .from('workout_plans')
      .update({
        plan: adjustedPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, plan: adjustedPlan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

