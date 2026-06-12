import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi tidak valid.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, counterpart_name, amount, due_date, note, settled } = body;

    // Build update payload
    const updatePayload: Record<string, unknown> = {};

    if (type !== undefined) {
      if (!['owed_to_me', 'i_owe'].includes(type)) {
        return NextResponse.json(
          { error: 'Tipe transaksi tidak valid. Harus "owed_to_me" atau "i_owe".' },
          { status: 400 }
        );
      }
      updatePayload.type = type;
    }

    if (counterpart_name !== undefined) {
      if (typeof counterpart_name !== 'string' || counterpart_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Nama orang wajib diisi.' },
          { status: 400 }
        );
      }
      updatePayload.counterpart_name = counterpart_name.trim();
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
        return NextResponse.json(
          { error: 'Jumlah uang harus berupa angka bulat positif.' },
          { status: 400 }
        );
      }
      updatePayload.amount = parsedAmount;
    }

    if (due_date !== undefined) {
      updatePayload.due_date = due_date;
    }

    if (note !== undefined) {
      if (note !== null && typeof note === 'string' && note.length > 200) {
        return NextResponse.json(
          { error: 'Catatan tidak boleh melebihi 200 karakter.' },
          { status: 400 }
        );
      }
      updatePayload.note = note ? note.trim() : null;
    }

    if (settled !== undefined) {
      updatePayload.settled_at = settled ? new Date().toISOString() : null;
    }

    // Update DB
    const { data, error } = await supabase
      .from('debts')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure security check
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Gagal memperbarui data: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('API PATCH error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi tidak valid.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    // Delete from DB
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure security check

    if (error) {
      return NextResponse.json(
        { error: `Gagal menghapus data: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (err: unknown) {
    console.error('API DELETE error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
