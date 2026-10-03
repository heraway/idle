import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

// expo-image-picker 15.x (Expo SDK 51) wants MediaTypeOptions.Images, while
// 16+ wants ["images"]. Pick whichever the installed version understands so
// the gallery picker works either way.
export function imageMediaTypes(): any {
  const IP: any = ImagePicker;
  if (IP.MediaTypeOptions?.Images !== undefined) return IP.MediaTypeOptions.Images;
  return ["images"];
}

function guessMime(asset: { uri: string; mimeType?: string | null }) {
  if (asset.mimeType) return asset.mimeType;
  const ext = asset.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

function extFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "jpg";
}

// Appends a picked/captured image to a FormData in the way each platform
// actually understands:
//  - Android/iOS (React Native): the classic { uri, name, type } part. This is
//    what makes the multipart part carry a filename, which multer on the
//    server requires before it treats the part as a file. (Appending a Blob
//    on RN drops the filename — the server then reports "No photo uploaded".)
//  - Web: a real Blob/File fetched from the object URL.
export async function appendImage(
  form: FormData,
  field: string,
  asset: { uri: string; mimeType?: string | null },
  baseName = "photo"
) {
  const type = guessMime(asset);
  const name = `${baseName}-${Date.now()}.${extFor(type)}`;
  if (Platform.OS === "web") {
    const blob = await (await fetch(asset.uri)).blob();
    form.append(field, new File([blob], name, { type }));
    return;
  }
  form.append(field, { uri: asset.uri, name, type } as any);
}
