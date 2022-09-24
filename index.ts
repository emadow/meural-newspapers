import config from './config.json';
import pLimit from 'p-limit';
import {
  clearDirectory,
  downloadNewspaperPDFs,
  getDirectoryContents,
  NEWSPAPAPER_CACHE_PATH,
  processPdf,
} from './newspapers';

import {logger} from './logger';
import {MeuralClient, MeuralDevice} from './meural';

(async function () {
  // Clean up our local cache
  logger('Clearing Local Cache');
  await clearDirectory(NEWSPAPAPER_CACHE_PATH);
  await clearDirectory(NEWSPAPAPER_CACHE_PATH + '/jpgs');

  await downloadNewspaperPDFs();
  const pdfs = await getDirectoryContents(NEWSPAPAPER_CACHE_PATH);

  // Convert each PDF to a JPEG, resize if needed
  const limit = pLimit(config.concurrent_image_processing);
  const throttledProcessingTasks = [];
  for (const pdf of pdfs) {
    throttledProcessingTasks.push(
      limit(() =>
        processPdf(
          `${NEWSPAPAPER_CACHE_PATH}/${pdf}`,
          `${NEWSPAPAPER_CACHE_PATH}/jpgs/${pdf.replace('.pdf', '.jpg')}`
        )
      )
    );
  }
  await Promise.all(throttledProcessingTasks);

  // Log into Meural
  if (!config.meural_email || !config.meural_password)
    throw new Error('Missing Meural credentials');
  const meuralClient = new MeuralClient(config.meural_email, config.meural_password);
  await meuralClient.authenticate();

  const devices = await meuralClient.getUserDevices();
  const targetDevice =
    devices.find((d: MeuralDevice) => d.alias === config.meural_device_alias) || devices[0];
  if (!targetDevice) throw new Error('No target Meural device found');
  const galleries = await meuralClient.getUserGalleries();

  if (!config.meural_gallery_name) throw new Error('Missing Meural gallery name');

  let galleryId;
  let existingImageIds;
  for (const gallery of galleries) {
    if (gallery.name === config.meural_gallery_name) {
      logger(`Found existing gallery ${gallery.name}`, {sentiment: 'positive'});
      galleryId = gallery.id;
    }
  }

  if (!galleryId) {
    // create a new gallery
    logger('Creating a new Meural gallery');
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
      await Promise.allSettled(deletePromises);
      logger(`Deleted existing images: ${existingImageIds.toString()}`, {
        processLevel: 2,
        sentiment: 'positive',
      });
    }
  }

  // Upload all the images to Meural
  const jpgs = await getDirectoryContents(`${NEWSPAPAPER_CACHE_PATH}/jpgs`);

  for (const jpg of jpgs) {
    logger(`Uploading: ${jpg}`);
    const uploadImageResult = await meuralClient.createItem(
      `${NEWSPAPAPER_CACHE_PATH}/jpgs/${jpg}`
    );

    logger('Upload complete', {sentiment: 'positive', processLevel: 2});

    // add it to the gallery
    await meuralClient.createGalleryItem(galleryId, uploadImageResult.id);
    logger('Added to gallery', {sentiment: 'positive', processLevel: 2});
  }

  logger('Pushing gallery to device');
  await meuralClient.pushGalleryToDevice(targetDevice.id, galleryId);

  logger('Process complete', {sentiment: 'positive'});
})();
