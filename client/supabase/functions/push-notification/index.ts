import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import WebPush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

WebPush.setVapidDetails(
  "mailto:support@fitforge.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record;

    if (!notification) {
      return new Response("No record found", { status: 400 });
    }

    // Fetch subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", notification.user_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No subscriptions found", { status: 200 });
    }

    const pushPayload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      route: notification.route
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        WebPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        )
      )
    );

    // Cleanup dead subscriptions
    const deadSubscriptions = results
      .map((res, i) => (res.status === "rejected" && (res.reason.statusCode === 410 || res.reason.statusCode === 404) ? subscriptions[i].id : null))
      .filter(Boolean);

    if (deadSubscriptions.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", deadSubscriptions);
    }

    return new Response(JSON.stringify({ success: true, sent: results.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
