export const storageService = {
  async upload(fileName: string) {
    return { fileName, url: `https://example.com/${fileName}` };
  }
};

