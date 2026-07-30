import { customFetch, ApiError } from "@workspace/api-client-react";

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await customFetch<{ url: string }>("/api/uploads", {
      method: "POST",
      body: formData,
    });
    return data.url;
  } catch (err) {
    throw new Error(err instanceof ApiError ? err.message : "Upload failed");
  }
}