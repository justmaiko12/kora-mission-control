import { NextRequest, NextResponse } from 'next/server';
import { invoicerSupabase } from '@/lib/invoicerSupabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    // Fetch invoice from Supabase
    const { data: invoice, error } = await invoicerSupabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
