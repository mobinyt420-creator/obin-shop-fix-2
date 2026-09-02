import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app } from "./config";

export const storage = getStorage(app);

/**
 * Uploads an image directly to Firebase Storage and returns the public URL.
 * This completely replaces the previous ImgBB implementation.
 */
export const uploadImage = async (file: File, path: string = 'products'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileName = `${new Date().getTime()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress.toFixed(2) + '% done');
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
