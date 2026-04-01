import localforage from 'localforage';

const imageStore = localforage.createInstance({
  name: 'CanvasImageStore'
});

export const saveImageToDB = async (id: string, base64: string): Promise<void> => {
  try {
    await imageStore.setItem(id, base64);
  } catch (err) {
    console.error(`Failed to save image ${id} to IndexedDB`, err);
  }
};

export const loadImageFromDB = async (id: string): Promise<string | null> => {
  try {
    return await imageStore.getItem<string>(id);
  } catch (err) {
    console.error(`Failed to load image ${id} from IndexedDB`, err);
    return null;
  }
};

export const deleteImageFromDB = async (id: string): Promise<void> => {
  try {
    await imageStore.removeItem(id);
  } catch (err) {
    console.error(`Failed to delete image ${id} from IndexedDB`, err);
  }
};

export const clearImageDB = async (): Promise<void> => {
  try {
    await imageStore.clear();
  } catch (err) {
    console.error('Failed to clear Image IndexedDB', err);
  }
};
