import { supabase } from '../lib/supabaseClient';
import { Logger } from '../utils/logger';

export async function registerDeviceToken(userId: string, token: string) {
  try {
    // Upsert the device token for the user.
    // If the token already exists, nothing bad happens, but if we want to ensure
    // a user only has unique active tokens, upsert by user_id and device_token is safe.
    const { error } = await supabase
      .from('user_devices')
      .upsert(
        { user_id: userId, device_token: token, created_at: new Date().toISOString() },
        { onConflict: 'device_token' } // Requires unique constraint on device_token
      );
      
    // If onConflict fails because of schema, fallback to basic check
    if (error && error.code === '42P10') {
       // fallback manual logic
       const { data } = await supabase.from('user_devices').select('id').eq('device_token', token).single();
       if (!data) {
           await supabase.from('user_devices').insert({ user_id: userId, device_token: token });
       } else {
           await supabase.from('user_devices').update({ user_id: userId }).eq('id', data.id);
       }
       return;
    }

    if (error) throw error;
  } catch (error) {
    Logger.error('Device token registration failed', error, { source: 'notificationService' });
  }
}

export async function unregisterDeviceToken(token: string) {
  try {
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('device_token', token);

    if (error) throw error;
  } catch (error) {
    Logger.error('Device token unregistration failed', error, { source: 'notificationService' });
  }
}
