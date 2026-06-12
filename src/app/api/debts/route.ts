import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'semua';
    const type = searchParams.get('type') || 'semua';
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter status: lunas (settled_at is not null), belum (settled_at is null)
    if (status === 'lunas') {
      query = query.not('settled_at', 'is', null);
    } else if (status === 'belum') {
      query = query.is('settled_at', null);
    }

    // Filter type: dihutang (owed_to_me), hutang (i_owe)
    if (type === 'dihutang') {
      query = query.eq('type', 'owed_to_me');
    } else if (type === 'hutang') {
      query = query.eq('type', 'i_owe');
    }

    // Optional Search counterpart name
    if (search.trim()) {
      query = query.ilike('counterpart_name', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Gagal mengambil data: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('API GET error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, counterpart_name, amount, due_date, note } = body;

    // Validation
    if (!type || !['owed_to_me', 'i_owe'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipe transaksi tidak valid. Harus "owed_to_me" (Dihutang ke saya) atau "i_owe" (Saya hutang).' },
        { status: 400 }
      );
    }

    if (!counterpart_name || typeof counterpart_name !== 'string' || counterpart_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nama orang wajib diisi.' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
      return NextResponse.json(
        { error: 'Jumlah uang harus berupa angka bulat positif.' },
        { status: 400 }
      );
    }

    if (note && typeof note === 'string' && note.length > 200) {
      return NextResponse.json(
        { error: 'Catatan tidak boleh melebihi 200 karakter.' },
        { status: 400 }
      );
    }

    // Insert to DB
    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: user.id,
        type,
        counterpart_name: counterpart_name.trim(),
        amount: parsedAmount,
        due_date: due_date || new Date().toISOString().split('T')[0],
        note: note ? note.trim() : null,
        settled_at: null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Gagal menyimpan data: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    console.error('API POST error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
