import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.scoutCompetitor.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Competitor deleted successfully' });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return NextResponse.json({ message: 'Failed to delete competitor' }, { status: 500 });
  }
}
