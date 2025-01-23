import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('access_token');

    if (!authToken) {
        return new Response(JSON.stringify({ message: 'No authentication token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // ユーザー認証ロジック
        const user = {}; // ユーザー情報をここに取得
        return new Response(JSON.stringify(user), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ message: 'Invalid authentication' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
