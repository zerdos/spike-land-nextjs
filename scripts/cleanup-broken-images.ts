import prisma from '../src/lib/prisma'

async function cleanupBrokenImages() {
  try {
    console.log('Fetching all enhanced images...')
    const images = await prisma.enhancedImage.findMany({
      include: {
        enhancementJobs: true,
      },
    })

    console.log(`Found ${images.length} images`)

    for (const image of images) {
      console.log(`\nDeleting image: ${image.name} (${image.id})`)

      // Delete all enhancement jobs first
      if (image.enhancementJobs.length > 0) {
        await prisma.imageEnhancementJob.deleteMany({
          where: { imageId: image.id },
        })
        console.log(`  Deleted ${image.enhancementJobs.length} enhancement jobs`)
      }

      // Delete the image
      await prisma.enhancedImage.delete({
        where: { id: image.id },
      })
      console.log(`  Deleted image`)
    }

    console.log(`\n✅ Cleanup complete! Deleted ${images.length} images`)
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupBrokenImages()
