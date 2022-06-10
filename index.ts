import config from './config.json';
import {
  clearDirectory,
  downloadNewspaperPDFs,
  getDirectoryContents,
  NEWSPAPAPER_CACHE_PATH,
  processPdf,
} from './newspapers';

import {MeuralClient} from './meural';

(async function () {
  // Clean up our local cache
  await clearDirectory(NEWSPAPAPER_CACHE_PATH);
  await clearDirectory(NEWSPAPAPER_CACHE_PATH + '/jpgs');
  await downloadNewspaperPDFs();
  const pdfs = await getDirectoryContents(NEWSPAPAPER_CACHE_PATH);

  // Convert each PDF to a JPEG, resize if needed
  for (const pdf of pdfs) {
    await processPdf(
      `${NEWSPAPAPER_CACHE_PATH}/${pdf}`,
      `${NEWSPAPAPER_CACHE_PATH}/jpgs/${pdf.replace('.pdf', '.jpg')}`
    );
  }

  // Log into Meural
  const meuralClient = new MeuralClient(config.meural_email, config.meural_password);
  await meuralClient.authenticate();

  const galleries = await meuralClient.getUserGalleries();

  // See if there's an existing gallery to use
  let galleryId;
  let existingImageIds;
  for (const gallery of galleries) {
    if (gallery.name === config.meural_gallery_name) {
      galleryId = gallery.id;
    }
  }

  if (galleryId) {
    const existingImages = await meuralClient.getGalleryItems(galleryId);
    existingImageIds = existingImages.map(image => image.id);

    // remove existing images
    const deletePromises: any[] = [];
    existingImageIds.forEach(imageId => {
      deletePromises.push(meuralClient.deleteImage.call(meuralClient, imageId));
    });
    await Promise.all(deletePromises);
  }
})();
