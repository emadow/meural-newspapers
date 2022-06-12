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

  throw new Error('stopping here');

  // Log into Meural
  if (!config.meural_email || !config.meural_password)
    throw new Error('Missing Meural credentials');
  const meuralClient = new MeuralClient(config.meural_email, config.meural_password);
  await meuralClient.authenticate();

  const galleries = await meuralClient.getUserGalleries();

  if (!config.meural_gallery_name) throw new Error('Missing Meural gallery name');

  let galleryId;
  let existingImageIds;
  for (const gallery of galleries) {
    if (gallery.name === config.meural_gallery_name) {
      galleryId = gallery.id;
    }
  }

  if (!galleryId) {
    // create a new gallery
    const createGalleryResponse = await meuralClient.createGallery(
      config.meural_gallery_name,
      'newspapers',
      'vertical'
    );
    galleryId = createGalleryResponse.id;
  } else {
    // clear out the existing gallery
    const existingImages = await meuralClient.getGalleryItems(galleryId);
    if (existingImages.length > 0) {
      existingImageIds = existingImages.map(image => image.id);

      const deletePromises: any[] = [];
      existingImageIds.forEach((imageId: number) => {
        deletePromises.push(meuralClient.deleteItem.call(meuralClient, imageId));
      });
      await Promise.all(deletePromises);
    }
  }

  // Upload all the images to Meural
  const jpgs = await getDirectoryContents(`${NEWSPAPAPER_CACHE_PATH}/jpgs`);

  for (const jpg of jpgs) {
    // upload it
    const uploadImageResult = await meuralClient.createItem(
      `${NEWSPAPAPER_CACHE_PATH}/jpgs/${jpg}`
    );
    // add it to the gallery
    await meuralClient.createGalleryItem(galleryId, uploadImageResult.id);
  }
})();
