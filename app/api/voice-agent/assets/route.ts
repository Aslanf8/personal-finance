import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('current_value', { ascending: false });

    // Filter out liabilities for this endpoint
    const physicalAssets = (assets || []).filter(a => !a.is_liability && a.category !== 'liability');

    // Group by category
    const byCategory: Record<string, { total: number; count: number; items: typeof physicalAssets }> = {};
    
    physicalAssets.forEach(asset => {
      const cat = asset.category || 'other';
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, count: 0, items: [] };
      }
      byCategory[cat].total += Number(asset.current_value);
      byCategory[cat].count += 1;
      byCategory[cat].items.push(asset);
    });

    // Calculate totals and appreciation
    const totalValue = physicalAssets.reduce((sum, a) => sum + Number(a.current_value), 0);
    const totalPurchasePrice = physicalAssets.reduce((sum, a) => sum + (Number(a.purchase_price) || 0), 0);
    const totalAppreciation = totalValue - totalPurchasePrice;

    // Real estate breakdown
    const realEstateAssets = physicalAssets.filter(a => a.category === 'real_estate');
    const realEstateTotal = realEstateAssets.reduce((sum, a) => sum + Number(a.current_value), 0);

    // Vehicle breakdown
    const vehicleAssets = physicalAssets.filter(a => a.category === 'vehicle');
    const vehicleTotal = vehicleAssets.reduce((sum, a) => sum + Number(a.current_value), 0);

    // Other assets
    const otherAssets = physicalAssets.filter(a => 
      !['real_estate', 'vehicle'].includes(a.category)
    );
    const otherTotal = otherAssets.reduce((sum, a) => sum + Number(a.current_value), 0);

    // Format assets for response
    const formattedAssets = physicalAssets.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      subcategory: a.subcategory,
      currentValue: Math.round(Number(a.current_value) * 100) / 100,
      purchasePrice: a.purchase_price ? Math.round(Number(a.purchase_price) * 100) / 100 : null,
      purchaseDate: a.purchase_date,
      appreciation: a.purchase_price 
        ? Math.round((Number(a.current_value) - Number(a.purchase_price)) * 100) / 100 
        : null,
      appreciationPercent: a.purchase_price 
        ? Math.round(((Number(a.current_value) - Number(a.purchase_price)) / Number(a.purchase_price)) * 1000) / 10 
        : null,
      address: a.address,
      propertyType: a.property_type,
      year: a.year,
      make: a.make,
      model: a.model,
      institution: a.institution,
    }));

    return NextResponse.json({
      assets: formattedAssets,
      totalValue: Math.round(totalValue * 100) / 100,
      totalPurchasePrice: Math.round(totalPurchasePrice * 100) / 100,
      totalAppreciation: Math.round(totalAppreciation * 100) / 100,
      totalAppreciationPercent: totalPurchasePrice > 0 
        ? Math.round((totalAppreciation / totalPurchasePrice) * 1000) / 10 
        : 0,
      assetCount: physicalAssets.length,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
      })),
      breakdown: {
        realEstate: {
          total: Math.round(realEstateTotal * 100) / 100,
          count: realEstateAssets.length,
          properties: realEstateAssets.map(a => ({
            name: a.name,
            value: Math.round(Number(a.current_value) * 100) / 100,
            type: a.property_type,
            address: a.address,
          })),
        },
        vehicles: {
          total: Math.round(vehicleTotal * 100) / 100,
          count: vehicleAssets.length,
          vehicles: vehicleAssets.map(a => ({
            name: a.name,
            value: Math.round(Number(a.current_value) * 100) / 100,
            details: [a.year, a.make, a.model].filter(Boolean).join(' '),
          })),
        },
        other: {
          total: Math.round(otherTotal * 100) / 100,
          count: otherAssets.length,
        },
      },
    });

  } catch (error) {
    console.error('Assets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

