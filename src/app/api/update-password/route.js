import { admin } from '../../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { uid, password } = await req.json();

    if (!uid || !password) {
      return NextResponse.json({ error: 'Missing uid or password' }, { status: 400 });
    }

    // Update user password with Firebase Admin SDK
    await admin.auth().updateUser(uid, { password });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Admin password update error:', error);

    // Return error message for better debugging
    return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500 });
  }
}
