
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  data?: any
}

interface PushRequest {
  userId?: string
  userIds?: string[]
  notification: NotificationPayload
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, userIds, notification }: PushRequest = await req.json()

    let targetUserIds: string[] = []
    if (userId) {
      targetUserIds = [userId]
    } else if (userIds) {
      targetUserIds = userIds
    } else {
      return new Response(
        JSON.stringify({ error: 'Either userId or userIds must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get push subscriptions for target users
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured')
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Send push notifications
    for (const subscription of subscriptions) {
      try {
        const pushPayload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192.png',
          badge: notification.badge || '/icon-192.png',
          tag: notification.tag,
          url: notification.url,
          actions: notification.actions,
          data: notification.data
        })

        // Import web-push dynamically
        const webPush = await import('https://esm.sh/web-push@3.6.6')
        
        webPush.setVapidDetails(
          'mailto:support@palmcacia.com',
          vapidPublicKey,
          vapidPrivateKey
        )

        const pushSubscription = {
          endpoint: subscription.subscription_data.endpoint,
          keys: subscription.subscription_data.keys
        }

        await webPush.sendNotification(pushSubscription, pushPayload)
        results.push({ userId: subscription.user_id, status: 'sent' })
        
      } catch (error) {
        console.error(`Failed to send notification to user ${subscription.user_id}:`, error)
        results.push({ userId: subscription.user_id, status: 'failed', error: error.message })
        
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id)
        }
      }
    }

    return new Response(
      JSON.stringify({ results, totalSent: results.filter(r => r.status === 'sent').length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
